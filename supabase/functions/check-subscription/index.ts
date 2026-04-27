// Syncs the caller's Stripe subscription status into the subscribers table and returns it.
// Useful as a fallback when webhooks haven't fired yet (e.g. right after checkout).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const PRICE_MONTHLY = "price_1TQZsB2dkJ1qD1DrJCV0cKe1";
const PRICE_ANNUAL = "price_1TQZsB2dkJ1qD1DrX8YSj0W1";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user?.email) throw new Error("User not authenticated");
    const user = userData.user;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      await adminClient.from("subscribers").upsert({
        user_id: user.id,
        email: user.email,
        plan: "free",
        status: "inactive",
        stripe_customer_id: null,
        stripe_subscription_id: null,
        trial_end: null,
        current_period_end: null,
        cancel_at_period_end: false,
      }, { onConflict: "user_id" });
      return new Response(JSON.stringify({ premium: false, plan: "free", status: "inactive" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = customers.data[0].id;
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 5,
    });

    // Pick the most relevant subscription (active/trialing first, then most recent)
    const ranked = subs.data.sort((a, b) => {
      const score = (s: Stripe.Subscription) =>
        s.status === "active" ? 3 : s.status === "trialing" ? 2 : s.status === "past_due" ? 1 : 0;
      const diff = score(b) - score(a);
      return diff !== 0 ? diff : (b.created - a.created);
    });
    const sub = ranked[0];

    let plan: "free" | "monthly" | "annual" = "free";
    let status = "inactive";
    let subId: string | null = null;
    let trialEnd: string | null = null;
    let periodEnd: string | null = null;
    let cancelAtPeriodEnd = false;

    if (sub) {
      subId = sub.id;
      status = sub.status;
      cancelAtPeriodEnd = sub.cancel_at_period_end;
      trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
      periodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null;
      const priceId = sub.items.data[0]?.price.id;
      if (priceId === PRICE_ANNUAL) plan = "annual";
      else if (priceId === PRICE_MONTHLY) plan = "monthly";
    }

    // Clear stale rows from previous (deleted) users that share the same Stripe
    // customer_id or subscription_id. Prevents unique-constraint failures when
    // an email is reused after account deletion.
    const orFilter = subId
      ? `stripe_customer_id.eq.${customerId},stripe_subscription_id.eq.${subId}`
      : `stripe_customer_id.eq.${customerId}`;
    await adminClient
      .from("subscribers")
      .delete()
      .or(orFilter)
      .neq("user_id", user.id);

    await adminClient.from("subscribers").upsert({
      user_id: user.id,
      email: user.email,
      stripe_customer_id: customerId,
      stripe_subscription_id: subId,
      plan,
      status,
      trial_end: trialEnd,
      current_period_end: periodEnd,
      cancel_at_period_end: cancelAtPeriodEnd,
    }, { onConflict: "user_id" });

    const premium = status === "active" || status === "trialing";
    return new Response(JSON.stringify({
      premium, plan, status, trial_end: trialEnd, current_period_end: periodEnd,
      cancel_at_period_end: cancelAtPeriodEnd,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("check-subscription error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

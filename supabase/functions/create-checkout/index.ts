// Creates a Stripe Checkout Session for monthly or annual plan with 7-day trial.
// Caller must be authenticated. Returns { url } to redirect the browser to.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const PRICE_MONTHLY = "price_1TQZsB2dkJ1qD1DrJCV0cKe1";
const PRICE_ANNUAL = "price_1TQZsB2dkJ1qD1DrX8YSj0W1";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user?.email) {
      throw new Error("User not authenticated");
    }
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const plan = body?.plan === "annual" ? "annual" : "monthly";
    const priceId = plan === "annual" ? PRICE_ANNUAL : PRICE_MONTHLY;

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    // Reuse customer if exists
    const { data: existing } = await supabase
      .from("subscribers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = existing?.stripe_customer_id ?? undefined;
    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") ?? "https://example.com";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { user_id: user.id, plan },
      },
      allow_promotion_codes: true,
      success_url: `${origin}/?subscription=success`,
      cancel_url: `${origin}/?subscription=canceled`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-checkout error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

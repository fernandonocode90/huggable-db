// User self-cancels their own subscription. Account is kept (free tier).
// Stripe: cancels immediately via API.
// Apple/Google: cannot be canceled server-side — we mark our record canceled
// and return needs_store_cancel=true so the UI can warn the user.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: sub } = await admin
      .from("subscribers")
      .select("provider, stripe_subscription_id, status")
      .eq("user_id", userId)
      .maybeSingle();

    if (!sub) return json({ ok: true, no_subscription: true });

    let stripeCanceled = false;
    let needsStoreCancel = false;

    if (sub.provider === "stripe" && sub.stripe_subscription_id) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) return json({ error: "Stripe not configured" }, 500);
      const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
      try {
        await stripe.subscriptions.cancel(sub.stripe_subscription_id);
        stripeCanceled = true;
      } catch (e) {
        console.warn("stripe cancel error", e);
      }
    } else if (sub.provider === "apple" || sub.provider === "google") {
      needsStoreCancel = true;
    }

    // Mark canceled in our DB regardless
    await admin
      .from("subscribers")
      .update({
        status: "canceled",
        cancel_at_period_end: false,
        current_period_end: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    return json({
      ok: true,
      provider: sub.provider,
      stripe_canceled: stripeCanceled,
      needs_store_cancel: needsStoreCancel,
    });
  } catch (e) {
    console.error("cancel-my-subscription fatal", e);
    return json({ error: (e as Error).message ?? "unknown" }, 500);
  }
});

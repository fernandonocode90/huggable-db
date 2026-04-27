// Returns whether the authenticated user is eligible for the 7-day free trial.
// Mirrors the anti–trial-abuse rule in `create-checkout`: any prior subscription
// (any status) on a Stripe customer with this email disqualifies the user.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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
    if (userError || !userData.user?.email) throw new Error("User not authenticated");
    const user = userData.user;

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    // Look up any Stripe customer for this email.
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ eligible: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prior = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: "all",
      limit: 1,
    });

    return new Response(JSON.stringify({ eligible: prior.data.length === 0 }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-trial-eligibility error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    // Default to "ineligible" on error so we don't promise something we can't deliver.
    return new Response(JSON.stringify({ eligible: false, error: message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

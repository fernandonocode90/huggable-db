// Admin: cancela uma assinatura Stripe IMEDIATAMENTE (sem esperar fim do período).
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

    // Caller (admin) client to verify role
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) throw new Error("Not authenticated");

    const { data: roles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const targetUserId = body.user_id as string | undefined;
    if (!targetUserId) throw new Error("Missing user_id");

    // Service client to read subscription + mark canceled
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: sub } = await admin
      .from("subscribers")
      .select("stripe_subscription_id, provider")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (!sub) throw new Error("Subscription not found");

    if (sub.provider === "stripe" && sub.stripe_subscription_id) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
      try {
        await stripe.subscriptions.cancel(sub.stripe_subscription_id);
      } catch (e) {
        // If already canceled / missing, swallow but log
        console.warn("stripe cancel error:", e);
      }
    }

    // Mark canceled in DB so app revoga acesso na hora
    await userClient.rpc("admin_mark_subscription_canceled", { _user_id: targetUserId });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-cancel-subscription error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

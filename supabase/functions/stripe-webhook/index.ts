// Stripe webhook handler. Updates the `subscribers` table on subscription lifecycle events.
// Configured with verify_jwt = false. Validates Stripe signature instead.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const PRICE_MONTHLY = "price_1TQZsB2dkJ1qD1DrJCV0cKe1";
const PRICE_ANNUAL = "price_1TQZsB2dkJ1qD1DrX8YSj0W1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "stripe-signature, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response("Missing Stripe configuration", { status: 500, headers: cors });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400, headers: cors });

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Bad signature: ${err}`, { status: 400, headers: cors });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const upsertFromSubscription = async (
    sub: Stripe.Subscription,
    fallbackUserId?: string,
    fallbackEmail?: string,
  ) => {
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

    // Resolve user_id + email
    let userId = fallbackUserId ?? (sub.metadata?.user_id as string | undefined);
    let email = fallbackEmail;

    if (!userId || !email) {
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted) {
        email ??= customer.email ?? undefined;
        if (!userId) {
          const { data } = await admin
            .from("subscribers")
            .select("user_id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();
          userId = data?.user_id;
        }
      }
    }

    if (!userId) {
      console.warn("Webhook: cannot resolve user_id for subscription", sub.id);
      return;
    }

    const priceId = sub.items.data[0]?.price.id;
    const plan: "free" | "monthly" | "annual" =
      priceId === PRICE_ANNUAL ? "annual" : priceId === PRICE_MONTHLY ? "monthly" : "free";

    await admin.from("subscribers").upsert({
      user_id: userId,
      email: email ?? "unknown@unknown",
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      plan,
      status: sub.status,
      trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      current_period_end: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: sub.cancel_at_period_end,
    }, { onConflict: "user_id" });
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          await upsertFromSubscription(
            sub,
            (session.client_reference_id ?? undefined) as string | undefined,
            session.customer_email ?? undefined,
          );
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await upsertFromSubscription(sub);
        break;
      }
      default:
        // ignore
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response(`Handler error: ${err}`, { status: 500, headers: cors });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});

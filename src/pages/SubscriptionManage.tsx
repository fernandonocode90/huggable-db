import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, ExternalLink, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/swc/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SubscriptionManage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const sub = useSubscription();
  const [opening, setOpening] = useState(false);

  const openPortal = async () => {
    setOpening(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else throw new Error("No portal URL returned");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not open billing portal";
      toast({ title: "Could not open portal", description: msg, variant: "destructive" });
    } finally {
      setOpening(false);
    }
  };

  const isPaidPremium = sub.premium && !sub.grandfathered;
  const periodEndDate = sub.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const planLabel =
    sub.plan === "annual" ? "Premium Annual" : sub.plan === "monthly" ? "Premium Monthly" : "Free";

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-6">
        <button
          onClick={() => navigate("/profile")}
          className="mb-6 inline-flex items-center gap-2 text-base text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" /> Back to Profile
        </button>

        <h1 className="font-display text-3xl text-foreground">Subscription</h1>
        <p className="mt-2 text-base text-muted-foreground">
          View your plan, update payment, or cancel.
        </p>

        {sub.loading ? (
          <Card className="mt-6 p-5">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-6 w-6 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-40 animate-pulse rounded bg-muted" />
                <div className="h-4 w-56 animate-pulse rounded bg-muted/70" />
                <div className="h-4 w-32 animate-pulse rounded bg-muted/70" />
              </div>
            </div>
          </Card>
        ) : (
        <>

        {/* Status card */}
        <Card className="mt-6 p-5">
          <div className="flex items-start gap-3">
            <Crown className="mt-1 h-6 w-6 text-primary" />
            <div className="flex-1">
              <div className="text-lg font-semibold text-foreground">{planLabel}</div>
              {sub.grandfathered && (
                <p className="mt-1 text-sm text-muted-foreground">
                  🎁 You have free lifetime access as a founding user.
                </p>
              )}
              {isPaidPremium && (
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <div className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>
                      Status:{" "}
                      <span className="font-medium text-foreground capitalize">{sub.status}</span>
                    </span>
                  </div>
                  {periodEndDate && (
                    <div>
                      {sub.cancelAtPeriodEnd ? (
                        <span className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400">
                          <AlertCircle className="h-4 w-4" />
                          Cancels on {periodEndDate}
                        </span>
                      ) : (
                        <span>Renews on {periodEndDate}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
              {!sub.premium && (
                <p className="mt-1 text-sm text-muted-foreground">
                  You're on the free plan.
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Action: Stripe Portal (for anyone who paid via Stripe) */}
        {isPaidPremium && (
          <Card className="mt-4 p-5">
            <h2 className="text-lg font-semibold text-foreground">Manage your subscription</h2>
            <p className="mt-2 text-base text-muted-foreground">
              Your subscription is billed through Stripe. Use the secure billing portal to:
            </p>
            <ul className="mt-3 space-y-2 text-base text-muted-foreground">
              <li>• Update your payment method</li>
              <li>• Download invoices and receipts</li>
              <li>• Switch between Monthly and Annual</li>
              <li>
                • <span className="font-medium text-foreground">Cancel your subscription</span> (you
                keep access until the end of the period)
              </li>
            </ul>
            <Button
              onClick={openPortal}
              disabled={opening}
              size="lg"
              className="mt-5 w-full text-base"
            >
              {opening ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Opening…
                </>
              ) : (
                <>
                  Open billing portal <ExternalLink className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              You'll be redirected to Stripe's secure page. You can come back anytime.
            </p>
          </Card>
        )}

        {/* For free / non-premium users */}
        {!isPaidPremium && !sub.grandfathered && (
          <Card className="mt-4 p-5">
            <h2 className="text-lg font-semibold text-foreground">Go Premium</h2>
            <p className="mt-2 text-base text-muted-foreground">
              Unlock daily audios and unlimited calculator scenarios. 7 days free, cancel anytime.
            </p>
            <Button
              onClick={() => navigate("/upgrade")}
              size="lg"
              className="mt-4 w-full text-base"
            >
              See Premium plans
            </Button>
          </Card>
        )}
        </>
        )}
      </div>
    </AppShell>
  );
};

export default SubscriptionManage;

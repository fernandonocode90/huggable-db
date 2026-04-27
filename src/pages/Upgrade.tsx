import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useTrialEligibility } from "@/hooks/useTrialEligibility";
import { toast } from "@/hooks/use-toast";
import { Check, Loader2 } from "lucide-react";

const Upgrade = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sub = useSubscription();
  const trialEligible = useTrialEligibility();
  const [loadingPlan, setLoadingPlan] = useState<null | "monthly" | "annual">(null);
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    if (!user) navigate("/auth");
  }, [user, navigate]);

  const startCheckout = async (plan: "monthly" | "annual") => {
    setLoadingPlan(plan);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else throw new Error("No checkout URL returned");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start checkout";
      toast({ title: "Checkout failed", description: msg, variant: "destructive" });
    } finally {
      setLoadingPlan(null);
    }
  };

  const openPortal = async () => {
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not open billing portal";
      toast({ title: "Portal failed", description: msg, variant: "destructive" });
    } finally {
      setOpeningPortal(false);
    }
  };

  const isPremium = sub.premium && !sub.grandfathered;

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back
        </button>

        <h1 className="text-3xl font-semibold tracking-tight">Go Premium</h1>
        <p className="mt-2 text-muted-foreground">
          Unlock daily audios and save unlimited calculator scenarios.
          {trialEligible ? " 7 days free, cancel anytime." : " Cancel anytime."}
        </p>

        {sub.grandfathered && (
          <Card className="mt-6 border-primary/40 bg-primary/5 p-4 text-sm">
            🎁 You have free lifetime access to daily audios as a founding user.
            Upgrade only if you also want to save calculator scenarios.
          </Card>
        )}

        {isPremium && (
          <Card className="mt-6 border-primary/40 bg-primary/5 p-4 text-sm">
            <div className="font-medium">
              You're on {sub.plan === "annual" ? "Premium Annual" : "Premium Monthly"}
              {sub.status === "trialing" && " (trial)"}
            </div>
            {sub.currentPeriodEnd && (
              <div className="mt-1 text-muted-foreground">
                {sub.cancelAtPeriodEnd ? "Ends" : "Renews"} on{" "}
                {new Date(sub.currentPeriodEnd).toLocaleDateString()}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={openPortal}
              disabled={openingPortal}
            >
              {openingPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : "Manage subscription"}
            </Button>
          </Card>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <PlanCard
            title="Monthly"
            price="$4.99"
            period="/ month"
            features={[
              "Daily audios",
              "Save unlimited scenarios",
              ...(trialEligible ? ["7-day free trial"] : []),
            ]}
            cta={trialEligible ? "Start 7-day free trial" : "Subscribe"}
            onClick={() => startCheckout("monthly")}
            loading={loadingPlan === "monthly"}
            disabled={isPremium}
          />
          <PlanCard
            title="Annual"
            price="$49.99"
            period="/ year"
            badge="Save 17%"
            highlighted
            features={[
              "Everything in Monthly",
              "2 months free",
              ...(trialEligible ? ["7-day free trial"] : []),
            ]}
            cta={trialEligible ? "Start 7-day free trial" : "Subscribe"}
            onClick={() => startCheckout("annual")}
            loading={loadingPlan === "annual"}
            disabled={isPremium}
          />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {trialEligible
            ? "Secure payment via Stripe. You won't be charged during your 7-day trial."
            : "Secure payment via Stripe. You'll be charged immediately."}
        </p>
      </div>
    </div>
  );
};

interface PlanCardProps {
  title: string;
  price: string;
  period: string;
  features: string[];
  badge?: string;
  highlighted?: boolean;
  loading?: boolean;
  disabled?: boolean;
  cta: string;
  onClick: () => void;
}

const PlanCard = ({
  title,
  price,
  period,
  features,
  badge,
  highlighted,
  loading,
  disabled,
  cta,
  onClick,
}: PlanCardProps) => (
  <Card
    className={`relative p-5 ${highlighted ? "border-primary/60 ring-1 ring-primary/30" : ""}`}
  >
    {badge && (
      <span className="absolute -top-2 right-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
        {badge}
      </span>
    )}
    <div className="text-sm font-medium text-muted-foreground">{title}</div>
    <div className="mt-2 flex items-baseline gap-1">
      <span className="text-3xl font-semibold">{price}</span>
      <span className="text-sm text-muted-foreground">{period}</span>
    </div>
    <ul className="mt-4 space-y-2 text-sm">
      {features.map((f) => (
        <li key={f} className="flex items-start gap-2">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>{f}</span>
        </li>
      ))}
    </ul>
    <Button
      className="mt-5 w-full"
      onClick={onClick}
      disabled={loading || disabled}
      variant={highlighted ? "default" : "outline"}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : disabled ? (
        "Current plan"
      ) : (
        cta
      )}
    </Button>
  </Card>
);

export default Upgrade;

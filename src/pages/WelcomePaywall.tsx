import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NightBackground } from "@/components/swc/NightBackground";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTrialEligibility } from "@/hooks/useTrialEligibility";
import { toast } from "@/hooks/use-toast";

const BASE_BENEFITS = [
  "Unlock every daily audio devotional",
  "Save unlimited calculator scenarios",
  "Track your spiritual & financial progress",
  "Premium tools: Budget, Debt Payoff, Goals",
];

const WelcomePaywall = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plan, setPlan] = useState<"monthly" | "annual">("annual");
  const [loading, setLoading] = useState(false);

  const [dismissing, setDismissing] = useState(false);

  // Mark as seen as soon as the screen loads — even if user dismisses.
  useEffect(() => {
    if (!user) return;
    void supabase
      .from("profiles")
      .update({ paywall_last_seen_at: new Date().toISOString() })
      .eq("id", user.id);
  }, [user]);

  const close = async () => {
    if (dismissing) return;
    setDismissing(true);
    if (user) {
      await supabase
        .from("profiles")
        .update({ paywall_last_seen_at: new Date().toISOString() })
        .eq("id", user.id);
    }
    navigate("/", { replace: true });
  };

  const startCheckout = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <NightBackground>
      <div
        className="relative mx-auto flex min-h-screen max-w-md flex-col px-6 py-8"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 2rem)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)",
        }}
      >
        <button
          type="button"
          onClick={close}
          onTouchEnd={(e) => {
            e.preventDefault();
            void close();
          }}
          aria-label="Close"
          className="fixed right-3 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-foreground/15 text-foreground backdrop-blur-sm transition-colors hover:bg-foreground/25 active:bg-foreground/30"
          style={{
            top: "calc(env(safe-area-inset-top) + 0.75rem)",
            WebkitTapHighlightColor: "transparent",
            touchAction: "manipulation",
          }}
        >
          <X className="h-6 w-6" strokeWidth={2} />
        </button>

        <div className="flex flex-1 flex-col justify-center animate-fade-up">
          <div className="text-center">
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/30"
              style={{ boxShadow: "0 0 40px hsl(var(--primary) / 0.35)" }}
            >
              <Sparkles className="h-7 w-7 text-primary" strokeWidth={1.6} />
            </div>
            <p className="mt-5 text-[11px] uppercase tracking-[0.28em] text-primary">
              Welcome
            </p>
            <h1 className="mt-2 font-display text-3xl text-foreground">
              Try Premium free for 7 days
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Get full access to every daily audio and unlock all premium tools.
            </p>
          </div>

          {/* Plan toggle */}
          <div className="mt-8 grid grid-cols-2 gap-3">
            <PlanOption
              active={plan === "monthly"}
              title="Monthly"
              price="$4.99"
              period="/month"
              onClick={() => setPlan("monthly")}
            />
            <PlanOption
              active={plan === "annual"}
              title="Annual"
              price="$49.99"
              period="/year"
              badge="Save 17%"
              onClick={() => setPlan("annual")}
            />
          </div>

          {/* Benefits */}
          <ul className="mt-8 space-y-3">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-3 text-sm text-foreground/90">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <Check className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <Button
            onClick={startCheckout}
            disabled={loading}
            size="lg"
            className="mt-8 w-full"
            style={{ boxShadow: "0 0 30px hsl(var(--primary) / 0.45)" }}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Start 7-day free trial"
            )}
          </Button>

          <button
            type="button"
            onClick={close}
            className="mt-4 mx-auto block rounded-full px-6 py-3 text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground hover:bg-foreground/5"
          >
            Maybe later
          </button>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            You won't be charged during your 7-day trial. Cancel anytime.
          </p>
        </div>
      </div>
    </NightBackground>
  );
};

interface PlanOptionProps {
  active: boolean;
  title: string;
  price: string;
  period: string;
  badge?: string;
  onClick: () => void;
}

const PlanOption = ({ active, title, price, period, badge, onClick }: PlanOptionProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative rounded-2xl border p-4 text-left transition-all ${
      active
        ? "border-primary bg-primary/10 ring-1 ring-primary/40"
        : "border-foreground/10 bg-foreground/5 hover:border-foreground/20"
    }`}
  >
    {badge && (
      <span className="absolute -top-2 right-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
        {badge}
      </span>
    )}
    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {title}
    </div>
    <div className="mt-1 flex items-baseline gap-1">
      <span className="text-xl font-semibold text-foreground">{price}</span>
      <span className="text-xs text-muted-foreground">{period}</span>
    </div>
  </button>
);

export default WelcomePaywall;

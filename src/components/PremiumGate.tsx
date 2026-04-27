import { ArrowRight, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/swc/AppShell";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useTrialEligibility } from "@/hooks/useTrialEligibility";
import { Skeleton } from "@/components/ui/skeleton";

interface PremiumGateProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export const PremiumGate = ({
  children,
  title = "Premium feature",
  description = "Subscribe to unlock this content.",
}: PremiumGateProps) => {
  const navigate = useNavigate();
  const { loading, premium } = useSubscription();
  const { isAdmin } = useAuth();

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-48 w-full rounded-3xl" />
        </div>
      </AppShell>
    );
  }

  if (premium || isAdmin) return <>{children}</>;

  return (
    <AppShell>
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center animate-fade-up">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/30"
          style={{ boxShadow: "0 0 40px hsl(var(--primary) / 0.35)" }}
        >
          <Lock className="h-9 w-9 text-primary" strokeWidth={1.6} />
        </div>

        <p className="mt-6 text-[11px] uppercase tracking-[0.28em] text-primary">
          Premium
        </p>
        <h1 className="mt-2 font-display text-3xl text-foreground">{title}</h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>

        <button
          type="button"
          onClick={() => navigate("/upgrade")}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          style={{ boxShadow: "0 0 30px hsl(var(--primary) / 0.45)" }}
        >
          Start 7-day free trial
          <ArrowRight className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
        >
          Go back
        </button>
      </div>
    </AppShell>
  );
};

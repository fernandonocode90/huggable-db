import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { isOnboardingComplete } from "@/lib/onboarding";

// Show the welcome paywall again every N days while user is still free.
const PAYWALL_REPEAT_DAYS = 1;

// Routes that should NEVER be intercepted by the paywall redirect.
const PAYWALL_EXEMPT_ROUTES = new Set<string>([
  "/welcome-paywall",
  "/onboarding",
  "/upgrade",
  "/check-email",
  "/profile/privacy",
  "/privacy-policy",
  "/terms",
]);

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const sub = useSubscription();
  const location = useLocation();
  const [paywallDecision, setPaywallDecision] = useState<"pending" | "show" | "skip">("pending");

  useEffect(() => {
    let cancelled = false;
    const decide = async () => {
      if (!user) {
        setPaywallDecision("skip");
        return;
      }
      // Wait for subscription state to load before deciding.
      if (sub.loading) return;
      // Premium / grandfathered users never see it.
      if (sub.premium) {
        if (!cancelled) setPaywallDecision("skip");
        return;
      }
      // Don't show before onboarding is done.
      if (!isOnboardingComplete(user.id)) {
        if (!cancelled) setPaywallDecision("skip");
        return;
      }
      // Don't show on exempt routes (but keep decision pending so we re-evaluate on nav).
      if (PAYWALL_EXEMPT_ROUTES.has(location.pathname)) {
        if (!cancelled) setPaywallDecision("skip");
        return;
      }
      try {
        const { data } = await supabase
          .from("profiles")
          .select("paywall_last_seen_at")
          .eq("id", user.id)
          .maybeSingle();
        const last = data?.paywall_last_seen_at ? new Date(data.paywall_last_seen_at) : null;
        const now = Date.now();
        const shouldShow =
          !last ||
          now - last.getTime() > PAYWALL_REPEAT_DAYS * 24 * 60 * 60 * 1000;
        if (!cancelled) setPaywallDecision(shouldShow ? "show" : "skip");
      } catch {
        if (!cancelled) setPaywallDecision("skip");
      }
    };
    void decide();
    return () => {
      cancelled = true;
    };
  }, [user, sub.loading, sub.premium, location.pathname]);

  // Wait for both auth AND subscription to finish before rendering anything.
  // Rendering early causes a brief flash of the wrong UI (e.g. "Free" state)
  // before the real data arrives — particularly noticeable on installed PWAs
  // after a cold start.
  if (loading || (user && sub.loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  if (paywallDecision === "show") {
    return <Navigate to="/welcome-paywall" replace />;
  }

  return <>{children}</>;
};

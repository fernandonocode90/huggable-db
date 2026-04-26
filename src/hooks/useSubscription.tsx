import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface SubscriptionState {
  loading: boolean;
  premium: boolean;
  plan: "free" | "monthly" | "annual";
  status: string;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  grandfathered: boolean;
}

const DEFAULT: SubscriptionState = {
  loading: true,
  premium: false,
  plan: "free",
  status: "inactive",
  trialEnd: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  grandfathered: false,
};

export const useSubscription = () => {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>(DEFAULT);

  const refresh = useCallback(async () => {
    if (!user) {
      setState({ ...DEFAULT, loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));

    // Read DB row first (cheap, instant)
    const [{ data: sub }, { data: cutoffRow }] = await Promise.all([
      supabase
        .from("subscribers")
        .select("plan,status,trial_end,current_period_end,cancel_at_period_end")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("app_settings")
        .select("value")
        .eq("key", "premium_grandfather_cutoff")
        .maybeSingle(),
    ]);

    let grandfathered = false;
    const cutoffStr = cutoffRow?.value as string | null | undefined;
    if (cutoffStr && user.created_at) {
      grandfathered = new Date(user.created_at) < new Date(cutoffStr);
    }

    const status = sub?.status ?? "inactive";
    const subPremium = (status === "active" || status === "trialing") &&
      (!sub?.current_period_end || new Date(sub.current_period_end) > new Date());

    setState({
      loading: false,
      premium: subPremium || grandfathered,
      plan: (sub?.plan as SubscriptionState["plan"]) ?? "free",
      status,
      trialEnd: sub?.trial_end ?? null,
      currentPeriodEnd: sub?.current_period_end ?? null,
      cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
      grandfathered,
    });
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Re-sync from Stripe (slower; calls edge function). Use after returning from checkout.
  const syncFromStripe = useCallback(async () => {
    if (!user) return;
    try {
      await supabase.functions.invoke("check-subscription");
    } catch (e) {
      console.warn("syncFromStripe failed", e);
    }
    await refresh();
  }, [user, refresh]);

  return { ...state, refresh, syncFromStripe };
};

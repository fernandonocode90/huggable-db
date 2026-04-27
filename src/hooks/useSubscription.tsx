import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
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

// Cache static cutoff in localStorage — value rarely changes.
const CUTOFF_CACHE_KEY = "premium_cutoff_v1";
const CUTOFF_TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface CutoffCache {
  value: string | null;
  fetchedAt: number;
}

const readCutoffCache = (): CutoffCache | null => {
  try {
    const raw = localStorage.getItem(CUTOFF_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CutoffCache;
    if (!parsed || typeof parsed.fetchedAt !== "number") return null;
    if (Date.now() - parsed.fetchedAt > CUTOFF_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeCutoffCache = (value: string | null) => {
  try {
    localStorage.setItem(
      CUTOFF_CACHE_KEY,
      JSON.stringify({ value, fetchedAt: Date.now() } satisfies CutoffCache),
    );
  } catch {
    // ignore quota / private mode
  }
};

const fetchCutoff = async (): Promise<string | null> => {
  const cached = readCutoffCache();
  if (cached) return cached.value;
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "premium_grandfather_cutoff")
    .maybeSingle();
  const value = (data?.value as string | null | undefined) ?? null;
  writeCutoffCache(value);
  return value;
};

interface Ctx extends SubscriptionState {
  refresh: () => Promise<void>;
  syncFromStripe: () => Promise<void>;
}

const SubscriptionContext = createContext<Ctx>({
  ...DEFAULT,
  refresh: async () => {},
  syncFromStripe: async () => {},
});

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>(DEFAULT);

  const refresh = useCallback(async () => {
    if (!user) {
      setState({ ...DEFAULT, loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));

    const [{ data: sub }, cutoffStr] = await Promise.all([
      supabase
        .from("subscribers")
        .select("plan,status,trial_end,current_period_end,cancel_at_period_end")
        .eq("user_id", user.id)
        .maybeSingle(),
      fetchCutoff(),
    ]);

    let grandfathered = false;
    if (cutoffStr && user.created_at) {
      grandfathered = new Date(user.created_at) < new Date(cutoffStr);
    }

    const status = sub?.status ?? "inactive";
    const subPremium =
      (status === "active" || status === "trialing") &&
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

  const syncFromStripe = useCallback(async () => {
    if (!user) return;
    try {
      await supabase.functions.invoke("check-subscription");
    } catch (e) {
      console.warn("syncFromStripe failed", e);
    }
    await refresh();
  }, [user, refresh]);

  return (
    <SubscriptionContext.Provider value={{ ...state, refresh, syncFromStripe }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => useContext(SubscriptionContext);

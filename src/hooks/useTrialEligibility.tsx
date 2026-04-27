import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

// Returns whether the current user is eligible for the 7-day free trial.
// `null` while loading. Defaults to `false` on error so the UI never overpromises.
export const useTrialEligibility = () => {
  const { user } = useAuth();
  const [eligible, setEligible] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setEligible(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-trial-eligibility");
        if (cancelled) return;
        if (error) {
          setEligible(false);
          return;
        }
        setEligible(Boolean(data?.eligible));
      } catch {
        if (!cancelled) setEligible(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return eligible;
};

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ProgressState {
  loading: boolean;
  currentDay: number;
  streak: number;
  completedCount: number;
  totalDays: number;
  journeyCompletions: number;
  /** True when the user has finished the 365-day journey at least once. */
  isVeteran: boolean;
  /** True when the user is currently past day 365 and has not yet restarted. */
  hasFinishedCurrentJourney: boolean;
  refresh: () => Promise<void>;
  restartJourney: () => Promise<void>;
}

const CACHE_KEY = "swc:progress";
const TOTAL_DAYS = 365;

type CachedProgress = {
  userId: string;
  currentDay: number;
  streak: number;
  completedCount: number;
  totalDays: number;
  journeyCompletions: number;
};

const readCache = (): CachedProgress | null => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedProgress) : null;
  } catch {
    return null;
  }
};

const writeCache = (data: CachedProgress) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
};

export const useProgress = (): ProgressState => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [initial] = useState(() => {
    const c = readCache();
    return c && (!userId || c.userId === userId) ? c : null;
  });
  const [loading, setLoading] = useState(!initial);
  const [rawCurrentDay, setRawCurrentDay] = useState(initial?.currentDay ?? 1);
  const [streak, setStreak] = useState(initial?.streak ?? 0);
  const [completedCount, setCompletedCount] = useState(initial?.completedCount ?? 0);
  const [journeyCompletions, setJourneyCompletions] = useState(initial?.journeyCompletions ?? 0);

  const refresh = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const [
      { data: day },
      { data: streakVal },
      { count: completed },
      { data: profile },
    ] = await Promise.all([
      supabase.rpc("get_current_day", { _user_id: userId }),
      supabase.rpc("get_user_streak", { _user_id: userId }),
      supabase
        .from("audio_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("completed", true),
      supabase
        .from("profiles")
        .select("journey_completions")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    const nextDay = typeof day === "number" ? day : 1;
    const nextStreak = typeof streakVal === "number" ? streakVal : 0;
    const nextCompleted = completed ?? 0;
    const nextCompletions =
      (profile as { journey_completions?: number } | null)?.journey_completions ?? 0;

    setRawCurrentDay(nextDay);
    setStreak(nextStreak);
    setCompletedCount(nextCompleted);
    setJourneyCompletions(nextCompletions);
    writeCache({
      userId,
      currentDay: nextDay,
      streak: nextStreak,
      completedCount: nextCompleted,
      totalDays: TOTAL_DAYS,
      journeyCompletions: nextCompletions,
    });
    setLoading(false);
  }, [userId]);

  const restartJourney = useCallback(async () => {
    const { error } = await supabase.rpc("restart_journey");
    if (error) throw error;
    // Clear cache so the next refresh has fresh values immediately.
    try { sessionStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
    await refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Cap displayed currentDay at 365 so the UI never shows "Day 400 / 365".
  const currentDay = Math.min(rawCurrentDay, TOTAL_DAYS);
  const hasFinishedCurrentJourney = rawCurrentDay > TOTAL_DAYS || (rawCurrentDay === TOTAL_DAYS && false);
  // Treat "past day 365" as the trigger for the celebration screen.
  const finished = rawCurrentDay > TOTAL_DAYS;

  return {
    loading,
    currentDay,
    streak,
    completedCount,
    totalDays: TOTAL_DAYS,
    journeyCompletions,
    isVeteran: journeyCompletions >= 1,
    hasFinishedCurrentJourney: finished,
    refresh,
    restartJourney,
  };
};

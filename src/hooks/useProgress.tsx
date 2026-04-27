import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ProgressState {
  loading: boolean;
  /** Visible day, capped at 365 — never shows "Day 400 / 365" in the UI. */
  currentDay: number;
  streak: number;
  completedCount: number;
  totalDays: number;
  journeyCompletions: number;
  /** True when the user has finished the 365-day journey at least once. */
  isVeteran: boolean;
  /**
   * True when the user is ready for the celebration screen — i.e. they've
   * reached day 365 AND completed the day-365 audio. This is the only
   * condition that should reveal the restart flow, so the user never loses
   * the chance to actually consume the final day's content.
   */
  hasFinishedCurrentJourney: boolean;
  /** True when the user is on/past day 365 but hasn't completed the day-365 audio yet. */
  awaitingFinalAudio: boolean;
  /** True when the calendar has already moved past day 365 without the final audio being completed. */
  finalAudioOverdue: boolean;
  /**
   * True when the user finished day 365 and is waiting for tomorrow's reset
   * (post-celebration "victory lap" state). Used to show the congrats banner.
   */
  journeyJustCompleted: boolean;
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
  finalDayCompleted: boolean;
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
  const [finalDayCompleted, setFinalDayCompleted] = useState(initial?.finalDayCompleted ?? false);

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
      { data: finalDay },
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
      supabase
        .from("audio_progress")
        .select("completed")
        .eq("user_id", userId)
        .eq("day_number", TOTAL_DAYS)
        .eq("completed", true)
        .maybeSingle(),
    ]);

    const nextDay = typeof day === "number" ? day : 1;
    const nextStreak = typeof streakVal === "number" ? streakVal : 0;
    const nextCompleted = completed ?? 0;
    const nextCompletions =
      (profile as { journey_completions?: number } | null)?.journey_completions ?? 0;
    const nextFinalDayDone = !!finalDay;

    setRawCurrentDay(nextDay);
    setStreak(nextStreak);
    setCompletedCount(nextCompleted);
    setJourneyCompletions(nextCompletions);
    setFinalDayCompleted(nextFinalDayDone);
    writeCache({
      userId,
      currentDay: nextDay,
      streak: nextStreak,
      completedCount: nextCompleted,
      totalDays: TOTAL_DAYS,
      journeyCompletions: nextCompletions,
      finalDayCompleted: nextFinalDayDone,
    });
    setLoading(false);
  }, [userId]);

  const restartJourney = useCallback(async () => {
    const { error } = await supabase.rpc("restart_journey");
    if (error) throw error;
    try {
      sessionStorage.removeItem(CACHE_KEY);
      // Also clear the Home page cache so it doesn't briefly show the old day.
      sessionStorage.removeItem("swc:home");
    } catch { /* ignore */ }
    await refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // UI never shows beyond the final day.
  const currentDay = Math.min(rawCurrentDay, TOTAL_DAYS);

  // Celebration is only revealed AFTER the user has actually completed the
  // day-365 audio. Until then they keep seeing day 365 and can finish it.
  const finished = rawCurrentDay >= TOTAL_DAYS && finalDayCompleted;

  // Banner appears any time the user reaches day 365 without having completed
  // the day-365 audio in the current cycle — including veterans on a new run.
  const awaitingFinalAudio = !finished && rawCurrentDay >= TOTAL_DAYS;
  const finalAudioOverdue = awaitingFinalAudio && rawCurrentDay > TOTAL_DAYS;

  // Post-celebration state: day 365 finished, waiting for tomorrow's Day 1.
  const journeyJustCompleted = finished;

  return {
    loading,
    currentDay,
    streak,
    completedCount,
    totalDays: TOTAL_DAYS,
    journeyCompletions,
    isVeteran: journeyCompletions >= 1,
    hasFinishedCurrentJourney: finished,
    awaitingFinalAudio,
    finalAudioOverdue,
    journeyJustCompleted,
    refresh,
    restartJourney,
  };
};

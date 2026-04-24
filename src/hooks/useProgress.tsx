import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ProgressState {
  loading: boolean;
  currentDay: number;
  streak: number;
  completedCount: number;
  totalDays: number;
  refresh: () => Promise<void>;
}

const CACHE_KEY = "swc:progress";

type CachedProgress = {
  userId: string;
  currentDay: number;
  streak: number;
  completedCount: number;
  totalDays: number;
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

  // Read cache only on initial mount to avoid recomputing on every render.
  const [initial] = useState(() => {
    const c = readCache();
    return c && (!userId || c.userId === userId) ? c : null;
  });
  const [loading, setLoading] = useState(!initial);
  const [currentDay, setCurrentDay] = useState(initial?.currentDay ?? 1);
  const [streak, setStreak] = useState(initial?.streak ?? 0);
  const [completedCount, setCompletedCount] = useState(initial?.completedCount ?? 0);
  const [totalDays, setTotalDays] = useState(initial?.totalDays ?? 365);

  const refresh = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const [{ data: day }, { data: streakVal }, { count: completed }] = await Promise.all([
      supabase.rpc("get_current_day", { _user_id: userId }),
      supabase.rpc("get_user_streak", { _user_id: userId }),
      supabase
        .from("audio_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("completed", true),
    ]);

    const nextDay = typeof day === "number" ? day : 1;
    const nextStreak = typeof streakVal === "number" ? streakVal : 0;
    const nextCompleted = completed ?? 0;
    const nextTotal = 365;
    setCurrentDay(nextDay);
    setStreak(nextStreak);
    setCompletedCount(nextCompleted);
    setTotalDays(nextTotal);
    writeCache({
      userId,
      currentDay: nextDay,
      streak: nextStreak,
      completedCount: nextCompleted,
      totalDays: nextTotal,
    });
    setLoading(false);
  }, [userId]);

  // Depend on userId (stable string) instead of user object to avoid refetches
  // every time onAuthStateChange emits a new User reference.
  useEffect(() => {
    refresh();
  }, [refresh]);

  return { loading, currentDay, streak, completedCount, totalDays, refresh };
};

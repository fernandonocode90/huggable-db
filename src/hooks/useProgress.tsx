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
  const cached = readCache();
  const hasUsableCache = !!cached && (!user || cached.userId === user.id);
  const [loading, setLoading] = useState(!hasUsableCache);
  const [currentDay, setCurrentDay] = useState(hasUsableCache ? cached!.currentDay : 1);
  const [streak, setStreak] = useState(hasUsableCache ? cached!.streak : 0);
  const [completedCount, setCompletedCount] = useState(hasUsableCache ? cached!.completedCount : 0);
  const [totalDays, setTotalDays] = useState(hasUsableCache ? cached!.totalDays : 365);

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const [{ data: day }, { data: streakVal }, { count: completed }] = await Promise.all([
      supabase.rpc("get_current_day", { _user_id: user.id }),
      supabase.rpc("get_user_streak", { _user_id: user.id }),
      supabase
        .from("audio_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
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
      userId: user.id,
      currentDay: nextDay,
      streak: nextStreak,
      completedCount: nextCompleted,
      totalDays: nextTotal,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { loading, currentDay, streak, completedCount, totalDays, refresh };
};

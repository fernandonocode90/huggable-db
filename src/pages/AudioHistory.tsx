import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Check, Circle, Lock, Loader2, Play } from "lucide-react";
import { AppShell } from "@/components/swc/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProgress } from "@/hooks/useProgress";

/**
 * Audio History — paginated by month so we never load the full catalog.
 * We fetch only the audios whose day_number falls within the visible month
 * window (computed from the user's start_date), plus the matching progress
 * rows. One small query per page = friendly to the database.
 */

interface AudioRow {
  id: string;
  day_number: number | null;
  title: string;
  subtitle: string | null;
}

interface ProgressRow {
  day_number: number;
  completed: boolean;
  progress_pct: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const AudioHistory = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { currentDay } = useProgress();

  const [startDate, setStartDate] = useState<Date | null>(null);
  // monthOffset 0 = current month, -1 = previous, etc.
  const [monthOffset, setMonthOffset] = useState(0);
  const [audios, setAudios] = useState<AudioRow[]>([]);
  const [progress, setProgress] = useState<Record<number, ProgressRow>>({});
  const [loading, setLoading] = useState(true);

  // Load the user's journey start date once — used to map calendar months
  // back into day_numbers.
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("start_date")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.start_date) setStartDate(new Date(data.start_date + "T00:00:00"));
      });
  }, [user]);

  // Compute the visible month and the day_number range it spans.
  const monthInfo = useMemo(() => {
    const today = new Date();
    const target = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const monthStart = new Date(target.getFullYear(), target.getMonth(), 1);
    const monthEnd = new Date(target.getFullYear(), target.getMonth() + 1, 0);

    if (!startDate) {
      return { label: `${MONTH_NAMES[target.getMonth()]} ${target.getFullYear()}`, fromDay: 0, toDay: 0 };
    }
    const msPerDay = 1000 * 60 * 60 * 24;
    const fromDay = Math.max(1, Math.floor((monthStart.getTime() - startDate.getTime()) / msPerDay) + 1);
    const toDay = Math.floor((monthEnd.getTime() - startDate.getTime()) / msPerDay) + 1;
    return {
      label: `${MONTH_NAMES[target.getMonth()]} ${target.getFullYear()}`,
      fromDay,
      toDay,
    };
  }, [monthOffset, startDate]);

  // Fetch audios + progress for the visible month range only.
  // Cache results per (user, month) in sessionStorage so revisits are instant.
  useEffect(() => {
    if (!user || !startDate) return;
    if (monthInfo.toDay < 1) {
      setAudios([]);
      setProgress({});
      setLoading(false);
      return;
    }
    const cacheKey = `swc:audioHistory:${user.id}:${monthInfo.fromDay}-${monthInfo.toDay}`;
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { audios: AudioRow[]; progress: Record<number, ProgressRow> };
        setAudios(parsed.audios);
        setProgress(parsed.progress);
        setLoading(false);
        return;
      }
    } catch { /* ignore */ }
    setLoading(true);
    (async () => {
      const [aRes, pRes] = await Promise.all([
        supabase
          .from("daily_audios")
          .select("id, day_number, title, subtitle")
          .gte("day_number", monthInfo.fromDay)
          .lte("day_number", monthInfo.toDay)
          .order("day_number", { ascending: true }),
        supabase
          .from("audio_progress")
          .select("day_number, completed, progress_pct")
          .eq("user_id", user.id)
          .gte("day_number", monthInfo.fromDay)
          .lte("day_number", monthInfo.toDay),
      ]);

      const audiosList = (aRes.data ?? []) as AudioRow[];
      const map: Record<number, ProgressRow> = {};
      (pRes.data ?? []).forEach((p) => {
        map[p.day_number] = p as ProgressRow;
      });
      setAudios(audiosList);
      setProgress(map);
      setLoading(false);
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({ audios: audiosList, progress: map }));
      } catch { /* ignore */ }
    })();
  }, [user, startDate, monthInfo.fromDay, monthInfo.toDay]);

  const stats = useMemo(() => {
    const unlocked = audios.filter((a) => (a.day_number ?? 0) <= currentDay);
    const listened = unlocked.filter((a) => progress[a.day_number ?? -1]?.completed).length;
    return { total: unlocked.length, listened };
  }, [audios, progress, currentDay]);

  // Disable "next" when we've reached the current calendar month.
  const canGoNext = monthOffset < 0;
  // Disable "previous" when there's no earlier month with content.
  const canGoPrev = monthInfo.fromDay > 1;

  return (
    <AppShell>
      <header className="flex items-center justify-between animate-fade-up">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="rounded-full p-2 text-foreground/80 transition-colors hover:text-primary"
        >
          <ChevronLeft className="h-6 w-6" strokeWidth={1.6} />
        </button>
        <h1 className="font-display text-xl gold-text">Audio History</h1>
        <span className="w-10" />
      </header>

      <div
        className="glass-card mt-4 flex items-center justify-between rounded-2xl px-4 py-3 animate-fade-up"
        style={{ animationDelay: "60ms" }}
      >
        <button
          type="button"
          onClick={() => setMonthOffset((o) => o - 1)}
          disabled={!canGoPrev}
          className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <div className="font-display text-base text-foreground">{monthInfo.label}</div>
          <div className="mt-0.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {stats.listened} of {stats.total} listened
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMonthOffset((o) => Math.min(0, o + 1))}
          disabled={!canGoNext}
          className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <ul className="mt-4 space-y-2 animate-fade-up" style={{ animationDelay: "120ms" }}>
        {loading && (
          <li className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </li>
        )}

        {!loading && audios.length === 0 && (
          <li className="glass-card rounded-2xl px-5 py-8 text-center text-sm text-muted-foreground">
            No audios released in this month.
          </li>
        )}

        {!loading && audios.map((a) => {
          const day = a.day_number ?? 0;
          const isUnlocked = isAdmin || day <= currentDay;
          const p = progress[day];
          const isDone = !!p?.completed;
          const isStarted = !isDone && (p?.progress_pct ?? 0) > 0;
          return (
            <li key={a.id}>
              <button
                onClick={() => isUnlocked && navigate(`/audio?day=${day}`)}
                disabled={!isUnlocked}
                className={`glass-card flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-transform ${
                  isUnlocked ? "hover:scale-[1.01]" : "opacity-60 cursor-not-allowed"
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    isDone
                      ? "bg-primary/20 text-primary"
                      : isUnlocked
                      ? "bg-primary/10 text-primary"
                      : "bg-foreground/5 text-foreground/50"
                  }`}
                >
                  {!isUnlocked ? (
                    <Lock className="h-4 w-4" strokeWidth={1.6} />
                  ) : isDone ? (
                    <Check className="h-5 w-5" strokeWidth={2.2} />
                  ) : isStarted ? (
                    <Play className="h-4 w-4 fill-current" />
                  ) : (
                    <Circle className="h-4 w-4" strokeWidth={1.6} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    Day {day}
                    {isDone ? " · Listened" : isStarted ? ` · ${Math.round(p?.progress_pct ?? 0)}%` : !isUnlocked ? " · Locked" : " · Not listened"}
                  </div>
                  <div className="truncate text-sm text-foreground">{a.title}</div>
                  {a.subtitle && (
                    <div className="truncate text-xs text-muted-foreground">{a.subtitle}</div>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
};

export default AudioHistory;
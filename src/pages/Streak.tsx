import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BellRing, Clock, Flame, Headphones, RotateCcw, Trophy } from "lucide-react";
import { AppShell } from "@/components/swc/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useProgress } from "@/hooks/useProgress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type DayCell = {
  date: Date;
  dayNumber: number;
  status: "none" | "partial" | "done";
  pct: number;
};

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const Streak = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentDay, streak, refresh } = useProgress();
  const { toast } = useToast();

  const [bestStreak, setBestStreak] = useState(0);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("08:00");
  const [savingReminder, setSavingReminder] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [progressMap, setProgressMap] = useState<
    Record<number, { pct: number; completed: boolean }>
  >({});
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [history, setHistory] = useState<
    Array<{ day_number: number; title: string | null; completed_at: string }>
  >([]);

  // Load profile + progress (one combined query for audio_progress instead of two)
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [profileRes, detailedRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("best_streak, reminder_enabled, reminder_time, start_date")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("audio_progress")
          .select(
            "day_number, progress_pct, completed, completed_at, last_position_seconds, daily_audios(title, duration_seconds)",
          )
          .eq("user_id", user.id),
      ]);

      const profile = profileRes.data;
      if (profile) {
        setBestStreak(profile.best_streak ?? 0);
        setReminderEnabled(!!profile.reminder_enabled);
        if (profile.reminder_time)
          setReminderTime(String(profile.reminder_time).slice(0, 5));
        if (profile.start_date)
          setStartDate(new Date(`${profile.start_date}T00:00:00`));
      }

      const detailed = detailedRes.data ?? [];

      const map: Record<number, { pct: number; completed: boolean }> = {};
      detailed.forEach((r) => {
        map[r.day_number] = {
          pct: Number(r.progress_pct ?? 0),
          completed: !!r.completed,
        };
      });
      setProgressMap(map);

      let seconds = 0;
      const completedRows: Array<{
        day_number: number;
        title: string | null;
        completed_at: string;
      }> = [];
      detailed.forEach((r) => {
        const audio = (r as unknown as {
          daily_audios: { title: string | null; duration_seconds: number | null } | null;
        }).daily_audios;
        const dur = audio?.duration_seconds ?? 0;
        const pct = Number(r.progress_pct ?? 0);
        const live = Number(r.last_position_seconds ?? 0);
        const listened = dur > 0
          ? Math.min(dur, Math.max(live, Math.round((pct / 100) * dur)))
          : live;
        seconds += listened;
        if (r.completed && r.completed_at) {
          completedRows.push({
            day_number: r.day_number,
            title: audio?.title ?? null,
            completed_at: r.completed_at,
          });
        }
      });
      completedRows.sort(
        (a, b) => +new Date(b.completed_at) - +new Date(a.completed_at),
      );
      setTotalMinutes(Math.round(seconds / 60));
      setHistory(completedRows.slice(0, 10));
    })();
  }, [user]);

  // Persist best streak if exceeded
  useEffect(() => {
    if (!user) return;
    if (streak > bestStreak) {
      setBestStreak(streak);
      supabase
        .from("profiles")
        .update({ best_streak: streak })
        .eq("id", user.id)
        .then(() => {});
    }
  }, [streak, bestStreak, user]);

  // Build last 14 days bars + last 90 days heatmap
  const { bars, heatmap } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const buildCell = (offset: number): DayCell => {
      const date = new Date(today);
      date.setDate(today.getDate() - offset);
      let dayNumber = 0;
      if (startDate) {
        const diffMs = date.getTime() - startDate.getTime();
        dayNumber = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
      }
      const entry = progressMap[dayNumber];
      const pct = entry?.pct ?? 0;
      const completed = entry?.completed ?? false;
      const status: DayCell["status"] = completed
        ? "done"
        : pct > 0
          ? "partial"
          : "none";
      return { date, dayNumber, status, pct };
    };

    const bars: DayCell[] = [];
    for (let i = 13; i >= 0; i--) bars.push(buildCell(i));

    const heatmap: DayCell[] = [];
    for (let i = 89; i >= 0; i--) heatmap.push(buildCell(i));

    return { bars, heatmap };
  }, [progressMap, startDate]);

  const saveReminder = async () => {
    if (!user) return;
    setSavingReminder(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        reminder_enabled: reminderEnabled,
        reminder_time: reminderEnabled ? `${reminderTime}:00` : null,
      })
      .eq("id", user.id);
    setSavingReminder(false);
    if (error) {
      toast({
        title: "Couldn't save reminder",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Reminder saved" });
    }
  };

  const resetJourney = async () => {
    if (!user) return;
    setResetting(true);
    try {
      // Wipe all audio progress so the user truly starts over
      const { error: delError } = await supabase
        .from("audio_progress")
        .delete()
        .eq("user_id", user.id);
      if (delError) throw delError;

      // Reset start_date to today and clear best streak
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const { error: updError } = await supabase
        .from("profiles")
        .update({ start_date: todayStr, best_streak: 0 })
        .eq("id", user.id);
      if (updError) throw updError;

      // Clear cached progress so the UI doesn't flash old values
      try {
        sessionStorage.removeItem("swc:progress");
      } catch {
        /* ignore */
      }

      setBestStreak(0);
      setProgressMap({});
      setStartDate(new Date(`${todayStr}T00:00:00`));
      await refresh();
      toast({
        title: "Journey reset",
        description: "You are back at Day 1. Previously unlocked audios are locked again.",
      });
      navigate("/");
    } catch (err) {
      toast({
        title: "Couldn't reset journey",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  };

  const dayLabel = (d: Date) =>
    d.toLocaleDateString("en-US", { weekday: "short" })[0];

  const statusColor = (s: DayCell["status"]) => {
    if (s === "done") return "bg-primary";
    if (s === "partial") return "bg-primary/40";
    return "bg-muted/30";
  };

  return (
    <AppShell>
      <header className="animate-fade-up flex items-center justify-between gap-3">
        <button
          onClick={() => navigate("/profile")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/30 text-foreground transition-colors hover:bg-muted/50"
          aria-label="Back to profile"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Your practice
          </p>
          <h1 className="mt-1 font-display text-2xl">
            <span className="gold-text">Streak</span>{" "}
            <span className="text-foreground">& Activity</span>
          </h1>
        </div>
        <div className="h-10 w-10" />
      </header>

      {/* Streak hero */}
      <section className="mt-6 grid animate-fade-up grid-cols-2 gap-3">
        <div className="glass-card flex flex-col items-center rounded-3xl p-5 text-center">
          <Flame className="h-7 w-7 text-primary" strokeWidth={1.6} />
          <div className="mt-2 font-display text-4xl gold-text">{streak}</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Current streak
          </div>
        </div>
        <div className="glass-card flex flex-col items-center rounded-3xl p-5 text-center">
          <Trophy className="h-7 w-7 text-primary" strokeWidth={1.6} />
          <div className="mt-2 font-display text-4xl text-foreground">
            {Math.max(bestStreak, streak)}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Best streak
          </div>
        </div>
      </section>

      {/* Weekly bars */}
      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <h2 className="font-display text-lg text-foreground">Last 14 days</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Bar height shows how far you got each day.
        </p>
        <div className="mt-5 flex h-32 items-end justify-between gap-1.5">
          {bars.map((c, i) => (
            <div
              key={i}
              className="flex flex-1 flex-col items-center gap-1.5"
              title={`${dayKey(c.date)} — ${c.status === "done" ? "completed" : c.status === "partial" ? `${Math.round(c.pct)}%` : "no activity"}`}
            >
              <div className="flex h-full w-full items-end">
                <div
                  className={`w-full rounded-t-md transition-all ${statusColor(c.status)}`}
                  style={{
                    height: `${Math.max(6, c.status === "done" ? 100 : c.pct)}%`,
                  }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">
                {dayLabel(c.date)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Heatmap */}
      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <h2 className="font-display text-lg text-foreground">Last 90 days</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Each square is a day. Brighter means more progress.
        </p>
        <div className="mt-4 grid grid-flow-col grid-rows-7 gap-1">
          {heatmap.map((c, i) => (
            <div
              key={i}
              title={`${dayKey(c.date)} — ${c.status === "done" ? "completed" : c.status === "partial" ? `${Math.round(c.pct)}%` : "no activity"}`}
              className={`aspect-square w-full rounded-sm ${statusColor(c.status)}`}
            />
          ))}
        </div>
        <div className="mt-4 flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
          <span>Less</span>
          <span className="h-3 w-3 rounded-sm bg-muted/30" />
          <span className="h-3 w-3 rounded-sm bg-primary/40" />
          <span className="h-3 w-3 rounded-sm bg-primary" />
          <span>More</span>
        </div>
      </section>

      {/* Lifetime stats */}
      <section className="mt-6 grid animate-fade-up grid-cols-2 gap-3">
        <div className="glass-card flex flex-col items-center rounded-3xl p-5 text-center">
          <Headphones className="h-7 w-7 text-primary" strokeWidth={1.6} />
          <div className="mt-2 font-display text-3xl text-foreground">
            {history.length > 0 ? Object.values(progressMap).filter((p) => p.completed).length : 0}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Audios completed
          </div>
        </div>
        <div className="glass-card flex flex-col items-center rounded-3xl p-5 text-center">
          <Clock className="h-7 w-7 text-primary" strokeWidth={1.6} />
          <div className="mt-2 font-display text-3xl text-foreground">
            {totalMinutes < 60
              ? `${totalMinutes}m`
              : `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Time listened
          </div>
        </div>
      </section>

      {/* Recent history */}
      {history.length > 0 && (
        <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
          <h2 className="font-display text-lg text-foreground">Recently completed</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Your last {history.length} finished audio{history.length === 1 ? "" : "s"}.
          </p>
          <ul className="mt-4 space-y-2">
            {history.map((h) => (
              <li key={`${h.day_number}-${h.completed_at}`}>
                <button
                  onClick={() => navigate(`/audio?day=${h.day_number}`)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-muted/20 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <span className="font-display text-xs font-semibold">
                      {h.day_number}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-foreground">
                      {h.title ?? `Day ${h.day_number}`}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(h.completed_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Reminder */}
      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <BellRing className="h-5 w-5 text-primary" strokeWidth={1.6} />
            </div>
            <div>
              <div className="font-display text-base text-foreground">
                Daily reminder
              </div>
              <p className="text-xs text-muted-foreground">
                Choose your sacred hour.
              </p>
            </div>
          </div>
          <Switch
            checked={reminderEnabled}
            onCheckedChange={setReminderEnabled}
          />
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 space-y-1.5 min-w-0">
            <Label htmlFor="reminder-time">Time</Label>
            <Input
              id="reminder-time"
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              disabled={!reminderEnabled}
              className={cn(
                "flex w-full max-w-full h-11 px-3 py-0 items-center",
                "text-base sm:text-sm tabular-nums",
                "appearance-none [-webkit-appearance:none]",
                // Center the value vertically across iOS/Android/desktop
                "[&::-webkit-date-and-time-value]:text-left",
                "[&::-webkit-date-and-time-value]:m-0",
                "[&::-webkit-date-and-time-value]:p-0",
                "[&::-webkit-date-and-time-value]:min-h-0",
                "[&::-webkit-date-and-time-value]:leading-[2.5rem]",
                "[&::-webkit-datetime-edit]:p-0",
                "[&::-webkit-datetime-edit]:h-full",
                "[&::-webkit-datetime-edit]:inline-flex",
                "[&::-webkit-datetime-edit]:items-center",
                "[&::-webkit-datetime-edit-fields-wrapper]:p-0",
                "[&::-webkit-datetime-edit-fields-wrapper]:inline-flex",
                "[&::-webkit-datetime-edit-fields-wrapper]:items-center",
                "[&::-webkit-calendar-picker-indicator]:ml-auto",
                "[&::-webkit-calendar-picker-indicator]:opacity-70",
                "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
              )}
            />
          </div>
          <Button
            onClick={saveReminder}
            disabled={savingReminder}
            className="w-full sm:w-auto sm:shrink-0"
          >
            {savingReminder ? "Saving…" : "Save"}
          </Button>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Notifications are coming soon — your preference is saved.
        </p>
      </section>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        Today is day {currentDay} of your journey.
      </p>

      {/* Reset journey */}
      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5 border border-destructive/20">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/15">
            <RotateCcw className="h-5 w-5 text-destructive" strokeWidth={1.6} />
          </div>
          <div className="flex-1">
            <div className="font-display text-base text-foreground">
              Reset journey
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Start over from Day 1. All your progress, streak, and unlocked audios will be cleared.
            </p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              className="mt-4 w-full"
              disabled={resetting}
            >
              {resetting ? "Resetting…" : "Reset Streak & Activity"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset your journey?</AlertDialogTitle>
              <AlertDialogDescription>
                You will start over at <strong>Day 1</strong>. All completed audios will be cleared,
                your streak resets to zero, and previously unlocked audios will be locked again
                until you reach those days. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={resetJourney}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Yes, reset everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </AppShell>
  );
};

export default Streak;
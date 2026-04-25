import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Calculator,
  Flame,
  Headphones,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/swc/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import scriptureBg from "@/assets/scripture-bg.jpg";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProgress } from "@/hooks/useProgress";
import { isOnboardingComplete } from "@/lib/onboarding";

type Devotional = {
  verse_reference: string | null;
  verse_text: string | null;
  reflection_text: string | null;
  book_key: string | null;
  chapter: number | null;
  verse_start: number | null;
  translation: string | null;
};

type WeekPreviewItem = {
  day_number: number;
  title: string;
  subtitle: string;
};

const HOME_CACHE_KEY = "swc:home";

type HomeCache = {
  userId: string;
  day: number;
  devotional: Devotional | null;
  weekPreview: WeekPreviewItem[];
};

const readHomeCache = (userId: string | null, day: number): HomeCache | null => {
  if (!userId) return null;
  try {
    const raw = sessionStorage.getItem(HOME_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HomeCache;
    if (parsed.userId !== userId || parsed.day !== day) return null;
    return parsed;
  } catch { return null; }
};

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    loading: progressLoading,
    currentDay,
    streak,
    completedCount,
    totalDays,
  } = useProgress();
  const userId = user?.id ?? null;
  const [cached] = useState(() => readHomeCache(userId, currentDay));
  const [contentLoading, setContentLoading] = useState(!cached);
  const [devotional, setDevotional] = useState<Devotional | null>(cached?.devotional ?? null);
  const [weekPreview, setWeekPreview] = useState<WeekPreviewItem[]>(cached?.weekPreview ?? []);

  const onboardingComplete = user ? isOnboardingComplete(user.id) : true;

  useEffect(() => {
    if (!userId || progressLoading || !onboardingComplete) return;

    let cancelled = false;

    (async () => {
      const [devotionalResult, previewResult] = await Promise.all([
        supabase
          .from("daily_devotionals")
          .select(
            "verse_reference, verse_text, reflection_text, book_key, chapter, verse_start, translation",
          )
          .eq("day_number", currentDay)
          .maybeSingle(),
        supabase.rpc("get_week_preview", {
          _from_day: currentDay,
          _to_day: Math.min(currentDay + 6, totalDays),
        }),
      ]);

      if (cancelled) return;

      const dev = (devotionalResult.data as Devotional | null) ?? null;
      const preview = (previewResult.data as WeekPreviewItem[] | null) ?? [];
      setDevotional(dev);
      setWeekPreview(preview);
      setContentLoading(false);
      try {
        sessionStorage.setItem(
          HOME_CACHE_KEY,
          JSON.stringify({ userId, day: currentDay, devotional: dev, weekPreview: preview } satisfies HomeCache),
        );
      } catch { /* ignore */ }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, progressLoading, onboardingComplete, currentDay, totalDays]);

  const greetingName = useMemo(() => {
    const raw = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "traveler";
    return String(raw).split(" ")[0];
  }, [user]);

  const reflectionExcerpt = useMemo(() => {
    const text = devotional?.reflection_text?.trim();
    if (!text) return "Return to your daily teaching and keep the rhythm of the journey alive.";
    return text.length > 180 ? `${text.slice(0, 177).trim()}...` : text;
  }, [devotional]);

  if (user && !onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <AppShell>
      <header className="animate-fade-up">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
          Daily sanctuary
        </p>
        <h1 className="mt-2 font-display text-4xl leading-tight text-foreground">
          Welcome back, <span className="gold-text">{greetingName}</span>
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-foreground/80">
          Keep today simple: listen, reflect, and move one more step in the journey.
        </p>
      </header>

      <section
        className="glass-card mt-7 overflow-hidden rounded-3xl p-5 animate-fade-up"
        style={{ animationDelay: "80ms" }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-80"
          style={{ background: "var(--gradient-radial-glow)" }}
          aria-hidden
        />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-primary">
                Today’s focus
              </p>
              <div className="mt-2 flex items-end gap-3">
                <span className="font-display text-5xl leading-none gold-text">{currentDay}</span>
                <span className="pb-1 text-sm text-muted-foreground">of {totalDays} days</span>
              </div>
            </div>
            <div className="rounded-2xl bg-primary/15 p-3 ring-1 ring-primary/30">
              <Headphones className="h-6 w-6 text-primary" strokeWidth={1.6} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2">
            {[
              { label: "Streak", value: String(streak), icon: Flame },
              { label: "Done", value: String(completedCount), icon: Sparkles },
              { label: "Next", value: `Day ${Math.min(currentDay + 1, totalDays)}`, icon: ArrowRight },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl bg-background/25 px-3 py-3 text-center ring-1 ring-border/50">
                <Icon className="mx-auto h-4 w-4 text-primary" strokeWidth={1.7} />
                <div className="mt-2 text-sm font-medium text-foreground">{value}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {label}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex gap-3">
            <Button className="flex-1 gap-2" onClick={() => navigate(`/audio?day=${currentDay}`)}>
              <Headphones className="h-4 w-4" />
              Listen now
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => navigate("/audio/history")}>
              <ArrowRight className="h-4 w-4" />
              History
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-6 animate-fade-up" style={{ animationDelay: "130ms" }}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Today’s reading</p>
            <h2 className="mt-1 font-display text-2xl text-foreground">Scripture & reflection</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              if (devotional?.book_key && devotional.chapter) {
                const params = new URLSearchParams({
                  book: devotional.book_key,
                  chapter: String(devotional.chapter),
                });
                if (devotional.verse_start) params.set("verse", String(devotional.verse_start));
                if (devotional.translation) params.set("translation", devotional.translation);
                navigate(`/read?${params.toString()}`);
                return;
              }
              navigate("/read");
            }}
            className="text-xs uppercase tracking-[0.18em] text-primary transition-colors hover:text-foreground"
          >
            Open
          </button>
        </div>

        <div className="relative overflow-hidden rounded-3xl glass-card p-6 sm:p-7">
          {/* Subtle starfield/parchment background */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-screen"
            style={{
              backgroundImage: `url(${scriptureBg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            aria-hidden
          />
          {/* Soft golden vignette */}
          <div
            className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full opacity-60 blur-3xl"
            style={{ background: "hsl(var(--primary) / 0.35)" }}
            aria-hidden
          />

          <div className="relative">
            {progressLoading || contentLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-11/12" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            ) : devotional ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/50 to-primary/50" />
                  <p className="text-[11px] uppercase tracking-[0.32em] text-primary">
                    {devotional.verse_reference || `Day ${currentDay}`}
                  </p>
                  <span className="h-px flex-1 bg-gradient-to-l from-transparent via-primary/50 to-primary/50" />
                </div>

                <blockquote className="relative mt-5 px-2 text-center">
                  <span
                    className="absolute -left-1 -top-3 font-display text-5xl leading-none text-primary/40"
                    aria-hidden
                  >
                    “
                  </span>
                  <p className="font-display text-xl italic leading-relaxed text-foreground sm:text-2xl">
                    {devotional.verse_text || "Your verse for today will appear here as soon as it is published."}
                  </p>
                  <span
                    className="absolute -right-1 -bottom-6 font-display text-5xl leading-none text-primary/40"
                    aria-hidden
                  >
                    ”
                  </span>
                </blockquote>

                {/* Ornamental divider */}
                <div className="my-5 flex items-center justify-center gap-3">
                  <span className="h-px w-12 bg-primary/30" />
                  <span className="text-primary/60">✦</span>
                  <span className="h-px w-12 bg-primary/30" />
                </div>

                <p className="text-[15px] leading-[1.75] text-foreground/85" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
                  {reflectionExcerpt}
                </p>
              </>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Today’s devotional is not published yet, but you can continue from your last reading and keep the streak alive.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 animate-fade-up" style={{ animationDelay: "180ms" }}>
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Quick actions</p>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {[
            {
              title: "Read",
              note: "Open Scripture",
              icon: BookOpen,
              onClick: () => navigate("/read"),
            },
            {
              title: "Tools",
              note: "Plan with clarity",
              icon: Calculator,
              onClick: () => navigate("/tools"),
            },
          ].map(({ title, note, icon: Icon, onClick }) => (
            <button
              key={title}
              type="button"
              onClick={onClick}
              className="glass-card flex min-h-32 flex-col items-start justify-between rounded-3xl p-4 text-left transition-transform hover:scale-[1.02]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15">
                <Icon className="h-5 w-5 text-primary" strokeWidth={1.6} />
              </div>
              <div>
                <div className="font-display text-lg text-foreground">{title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{note}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6 animate-fade-up" style={{ animationDelay: "230ms" }}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">This week</p>
            <h2 className="mt-1 font-display text-2xl text-foreground">Journey preview</h2>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          {(progressLoading || contentLoading
            ? Array.from({ length: 4 }, (_, index) => ({ skeleton: true, key: index }))
            : weekPreview.map((item) => ({ ...item, skeleton: false })))
            .map((item) => {
              if (item.skeleton) {
                return (
                  <div key={item.key} className="glass-card rounded-2xl p-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="mt-3 h-5 w-10/12" />
                    <Skeleton className="mt-2 h-4 w-7/12" />
                  </div>
                );
              }

              const unlocked = item.day_number <= currentDay;

              return (
                <button
                  key={item.day_number}
                  type="button"
                  onClick={() => navigate(unlocked ? `/audio?day=${item.day_number}` : "/audio")}
                  className="glass-card flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-4 text-left transition-transform hover:scale-[1.01]"
                >
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      Day {item.day_number}
                    </p>
                    <div className="mt-1 text-sm font-medium text-foreground">{item.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.subtitle}</div>
                  </div>
                  <div className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em] ring-1 ring-border/60">
                    {unlocked ? "Open" : "Soon"}
                  </div>
                </button>
              );
            })}
        </div>
      </section>
    </AppShell>
  );
};

export default Index;

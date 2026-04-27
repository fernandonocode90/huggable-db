import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Calculator,
  Crown,
  Flame,
  Headphones,
  Lock,
  Share2,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/swc/AppShell";

import { Skeleton } from "@/components/ui/skeleton";
import scriptureBg from "@/assets/scripture-bg.jpg";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProgress } from "@/hooks/useProgress";
import { useSubscription } from "@/hooks/useSubscription";
import { isOnboardingComplete } from "@/lib/onboarding";
import { generateVerseImage, shareOrDownloadVerse } from "@/lib/verseImage";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/use-toast";
import { VeteranCrown } from "@/components/swc/VeteranCrown";
import { JourneyCompleteCelebration } from "@/components/swc/JourneyCompleteCelebration";
import { FinalDayBanner } from "@/components/swc/FinalDayBanner";
import { JourneyCompleteBanner } from "@/components/swc/JourneyCompleteBanner";

type TodayAudio = {
  title: string | null;
  duration_seconds: number | null;
};

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
  todayAudio: TodayAudio | null;
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
    isVeteran,
    journeyCompletions,
    hasFinishedCurrentJourney,
    awaitingFinalAudio,
    finalAudioOverdue,
    journeyJustCompleted,
  } = useProgress();
  const [celebrationDismissed, setCelebrationDismissed] = useState(false);
  const userId = user?.id ?? null;
  const [cached] = useState(() => readHomeCache(userId, currentDay));
  const [contentLoading, setContentLoading] = useState(!cached);
  const [devotional, setDevotional] = useState<Devotional | null>(cached?.devotional ?? null);
  const [weekPreview, setWeekPreview] = useState<WeekPreviewItem[]>(cached?.weekPreview ?? []);
  const [todayAudio, setTodayAudio] = useState<TodayAudio | null>(cached?.todayAudio ?? null);
  const [sharingDevotional, setSharingDevotional] = useState(false);
  const { theme } = useTheme();
  const { toast } = useToast();
  const subscription = useSubscription();
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle return from Stripe Checkout
  useEffect(() => {
    const status = searchParams.get("subscription");
    if (!status) return;
    if (status === "success") {
      // Sync first, then show a toast that reflects whether a trial was granted.
      void (async () => {
        await subscription.syncFromStripe();
        const isTrial = subscription.status === "trialing";
        toast({
          title: "Welcome to Premium 🎉",
          description: isTrial
            ? "Your 7-day free trial has started."
            : "Your subscription is now active.",
        });
      })();
    } else if (status === "canceled") {
      toast({ title: "Checkout canceled", description: "No charge was made." });
    }
    searchParams.delete("subscription");
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onboardingComplete = user ? isOnboardingComplete(user.id) : true;

  useEffect(() => {
    if (!userId || progressLoading || !onboardingComplete) return;

    let cancelled = false;

    (async () => {
      const [devotionalResult, previewResult, audioResult] = await Promise.all([
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
        supabase
          .from("daily_audios")
          .select("title, duration_seconds")
          .eq("day_number", currentDay)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      const dev = (devotionalResult.data as Devotional | null) ?? null;
      const preview = (previewResult.data as WeekPreviewItem[] | null) ?? [];
      const audio = (audioResult.data as TodayAudio | null) ?? null;
      setDevotional(dev);
      setWeekPreview(preview);
      setTodayAudio(audio);
      setContentLoading(false);
      try {
        sessionStorage.setItem(
          HOME_CACHE_KEY,
          JSON.stringify({ userId, day: currentDay, devotional: dev, weekPreview: preview, todayAudio: audio } satisfies HomeCache),
        );
      } catch { /* ignore */ }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, progressLoading, onboardingComplete, currentDay, totalDays]);

  const [profileName, setProfileName] = useState<string | null>(() => {
    try {
      const raw = sessionStorage.getItem("swc:profile");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { display_name: string | null };
      return parsed?.display_name ?? null;
    } catch { return null; }
  });
  useEffect(() => {
    const onUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail as { display_name?: string } | undefined;
      if (detail?.display_name) setProfileName(detail.display_name);
    };
    window.addEventListener("swc:display-name-updated", onUpdated);
    return () => window.removeEventListener("swc:display-name-updated", onUpdated);
  }, []);
  const greetingName = useMemo(() => {
    const raw = profileName || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "traveler";
    return String(raw).split(" ")[0];
  }, [user, profileName]);

  const reflectionText = useMemo(() => {
    const text = devotional?.reflection_text?.trim();
    if (!text) return "Return to your daily teaching and keep the rhythm of the journey alive.";
    return text;
  }, [devotional]);

  if (user && !onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <AppShell>
      {hasFinishedCurrentJourney && !celebrationDismissed && (
        <JourneyCompleteCelebration onClose={() => setCelebrationDismissed(true)} />
      )}

      {/* Compact greeting */}
      <header className="animate-fade-up">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
          Daily sanctuary
        </p>
        <h1 className="mt-2 font-display text-3xl leading-tight text-foreground">
          Peace be with you,{" "}
          <span className="gold-text">{greetingName}</span>
          {isVeteran && (
            <VeteranCrown className="ml-2" count={journeyCompletions} size={20} />
          )}
        </h1>
      </header>

      {/* Upgrade nudge — only when user is non-premium */}
      {!subscription.loading && !subscription.premium && (
        <button
          type="button"
          onClick={() => navigate("/upgrade")}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-left transition hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <Crown className="h-5 w-5 shrink-0 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Unlock daily audios — 7 days free</p>
            <p className="text-[11px] text-muted-foreground">From $4.99 / month · cancel anytime</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      {journeyJustCompleted ? (
        <JourneyCompleteBanner />
      ) : (
        awaitingFinalAudio && <FinalDayBanner overdue={finalAudioOverdue} />
      )}

      {/* HERO — Today's audio (dominant card) */}
      <section
        className="relative mt-6 animate-fade-up"
        style={{ animationDelay: "60ms" }}
      >
        <button
          type="button"
          onClick={() => navigate(`/audio?day=${currentDay}`)}
          className="glass-card relative w-full overflow-hidden rounded-[2rem] p-7 text-left transition-transform hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          aria-label={`Open today's audio — Day ${currentDay}`}
        >
          {/* Layered radial glow */}
          <div
            className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full opacity-70 blur-3xl"
            style={{ background: "hsl(var(--primary) / 0.45)" }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-screen"
            style={{
              backgroundImage: `url(${scriptureBg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            aria-hidden
          />

          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.28em] text-primary">
                Today’s teaching
              </p>
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Day {currentDay} / {totalDays}
              </span>
            </div>

            {/* Editorial composition: oversized day number + play CTA */}
            <div className="mt-7 flex items-center gap-5">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                  Day
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-7xl leading-none gold-text">
                    {currentDay}
                  </span>
                  <span className="text-sm text-muted-foreground">/ {totalDays}</span>
                </div>
                <p className="mt-3 text-sm leading-snug text-foreground/85 line-clamp-2">
                  {todayAudio?.title ?? "Tap to begin"}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {awaitingFinalAudio ? "Last audio of your journey" : "Keeps your streak alive"}
                </p>
              </div>

              {/* Premium play button — pulses on the final day to draw the eye */}
              <div
                className={`relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground ${
                  awaitingFinalAudio ? "animate-breathe" : ""
                }`}
                style={
                  awaitingFinalAudio
                    ? undefined
                    : {
                        boxShadow:
                          "0 0 35px hsl(var(--primary) / 0.55), inset 0 -6px 14px hsl(var(--primary-deep) / 0.4)",
                      }
                }
                aria-hidden
              >
                {!subscription.loading && !subscription.premium ? (
                  <Lock className="h-8 w-8" strokeWidth={1.8} />
                ) : (
                  <Headphones className="h-8 w-8" strokeWidth={1.8} />
                )}
              </div>
            </div>

            {/* Stats strip */}
            <div className="mt-6 grid grid-cols-3 gap-2">
              {[
                { label: "Streak", value: String(streak), icon: Flame },
                { label: "Done", value: String(completedCount), icon: Sparkles },
                { label: "Next", value: `Day ${Math.min(currentDay + 1, totalDays)}`, icon: ArrowRight },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-2xl bg-background/25 px-3 py-2.5 text-center ring-1 ring-border/50">
                  <Icon className="mx-auto h-3.5 w-3.5 text-primary" strokeWidth={1.7} />
                  <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
                  <div className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </button>

        {/* Secondary action below hero */}
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate("/audio/history"); }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-primary"
          >
            View history
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </section>

      <section className="mt-6 animate-fade-up" style={{ animationDelay: "130ms" }}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Today’s reading</p>
            <h2 className="mt-1 font-display text-2xl text-foreground">Scripture & reflection</h2>
          </div>
          <span className="text-xs uppercase tracking-[0.18em] text-primary/70">
            Tap to read
          </span>
        </div>

        <div
          role="button"
          tabIndex={0}
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
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              (e.currentTarget as HTMLDivElement).click();
            }
          }}
          aria-label="Open today's scripture in the reader"
          className="relative overflow-hidden rounded-3xl glass-card p-6 sm:p-7 cursor-pointer transition-transform hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
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

                <p
                  className="text-[16px] leading-[1.85] text-foreground/85 first-letter:font-display first-letter:text-3xl first-letter:font-semibold first-letter:text-primary first-letter:mr-1 first-letter:float-left first-letter:leading-none first-letter:mt-1"
                  style={{ fontFamily: "'Lora', Georgia, serif" }}
                >
                  {reflectionText}
                </p>

                {devotional.verse_text && (
                  <div className="mt-6 flex justify-center">
                    <button
                      type="button"
                      disabled={sharingDevotional}
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!devotional.verse_text) return;
                        setSharingDevotional(true);
                        try {
                          const blob = await generateVerseImage({
                            reference: devotional.verse_reference || `Day ${currentDay}`,
                            text: devotional.verse_text,
                            translation: (devotional.translation || "BSB").toUpperCase(),
                            theme,
                          });
                          const filename = `devotional-day-${currentDay}.png`;
                          const result = await shareOrDownloadVerse(blob, filename);
                          toast({
                            title:
                              result === "shared"
                                ? "Verse shared"
                                : "Verse image downloaded",
                          });
                        } catch (err) {
                          toast({
                            title: "Couldn't create image",
                            description: (err as Error).message,
                            variant: "destructive",
                          });
                        } finally {
                          setSharingDevotional(false);
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-primary transition-all hover:bg-primary/20 hover:border-primary/60 disabled:opacity-60"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      {sharingDevotional ? "Creating image…" : "Share as image"}
                    </button>
                  </div>
                )}
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

import { useEffect, useState } from "react";
import { Crown, Sparkles, Flame, CheckCircle2 } from "lucide-react";
import { useProgress } from "@/hooks/useProgress";
import { useToast } from "@/hooks/use-toast";
import scriptureBg from "@/assets/scripture-bg.jpg";

interface JourneyCompleteCelebrationProps {
  onClose: () => void;
}

/**
 * Full-screen celebration shown when the user finishes the 365-day journey.
 * On close, restarts the journey automatically and unlocks every audio.
 */
export const JourneyCompleteCelebration = ({ onClose }: JourneyCompleteCelebrationProps) => {
  const { streak, completedCount, journeyCompletions, restartJourney } = useProgress();
  const [restarting, setRestarting] = useState(false);
  const { toast } = useToast();

  // Lock body scroll while the modal is up.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handleClose = async () => {
    if (restarting) return;
    setRestarting(true);
    try {
      await restartJourney();
      toast({
        title: "A new journey begins ✨",
        description: "Day 1 unlocks tomorrow. All 365 days are already yours to explore.",
      });
      onClose();
    } catch (err) {
      toast({
        title: "Couldn't restart journey",
        description: (err as Error).message,
        variant: "destructive",
      });
      setRestarting(false);
    }
  };

  const isReturningVeteran = journeyCompletions >= 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-background/95 px-5 py-8 backdrop-blur-xl animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebration-title"
    >
      {/* Background atmosphere */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20 mix-blend-screen"
        style={{
          backgroundImage: `url(${scriptureBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-3xl"
        style={{ background: "hsl(var(--primary) / 0.45)" }}
        aria-hidden
      />

      <div className="relative w-full max-w-md text-center">
        {/* Crown */}
        <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/40 animate-fade-up">
          <Crown
            className="h-14 w-14 text-primary drop-shadow-[0_0_18px_hsl(var(--primary)/0.7)]"
            strokeWidth={1.6}
            fill="currentColor"
          />
        </div>

        <p
          className="mt-6 text-[11px] uppercase tracking-[0.32em] text-primary animate-fade-up"
          style={{ animationDelay: "60ms" }}
        >
          {isReturningVeteran ? "Another journey complete" : "365 days complete"}
        </p>
        <h1
          id="celebration-title"
          className="mt-3 font-display text-4xl leading-tight text-foreground animate-fade-up"
          style={{ animationDelay: "120ms" }}
        >
          You walked the <span className="gold-text">whole path</span>
        </h1>
        <p
          className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-foreground/80 animate-fade-up"
          style={{ animationDelay: "180ms" }}
        >
          You stayed the course for an entire year. The teachings are yours now —
          carry them forward, and walk them again whenever you wish.
        </p>

        {/* Stats */}
        <div
          className="mt-7 grid grid-cols-3 gap-2 animate-fade-up"
          style={{ animationDelay: "240ms" }}
        >
          <div className="rounded-2xl bg-background/40 px-3 py-3 ring-1 ring-border/60">
            <CheckCircle2 className="mx-auto h-4 w-4 text-primary" strokeWidth={1.7} />
            <div className="mt-1.5 font-display text-xl text-foreground">{completedCount}</div>
            <div className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              Done
            </div>
          </div>
          <div className="rounded-2xl bg-background/40 px-3 py-3 ring-1 ring-border/60">
            <Flame className="mx-auto h-4 w-4 text-primary" strokeWidth={1.7} />
            <div className="mt-1.5 font-display text-xl text-foreground">{streak}</div>
            <div className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              Streak
            </div>
          </div>
          <div className="rounded-2xl bg-background/40 px-3 py-3 ring-1 ring-border/60">
            <Crown className="mx-auto h-4 w-4 text-primary" strokeWidth={1.7} fill="currentColor" />
            <div className="mt-1.5 font-display text-xl text-foreground">
              {journeyCompletions + 1}
            </div>
            <div className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              Journeys
            </div>
          </div>
        </div>

        <div
          className="mt-7 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-left animate-fade-up"
          style={{ animationDelay: "300ms" }}
        >
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.7} />
            <div>
              <p className="text-sm font-medium text-foreground">A gift for finishing</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                Your next journey unlocks every day at once. Listen in any order,
                revisit favorites, or set your own rhythm.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          disabled={restarting}
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-sm font-medium uppercase tracking-[0.2em] text-primary-foreground shadow-[0_0_30px_hsl(var(--primary)/0.45)] transition hover:scale-[1.01] disabled:opacity-60 animate-fade-up"
          style={{ animationDelay: "360ms" }}
        >
          {restarting ? "Beginning…" : "Begin again"}
        </button>

        <p
          className="mt-4 text-[11px] uppercase tracking-[0.22em] text-muted-foreground animate-fade-up"
          style={{ animationDelay: "420ms" }}
        >
          Your new Day 1 begins tomorrow
        </p>
      </div>
    </div>
  );
};

import { Crown, Sparkles } from "lucide-react";

interface FinalDayBannerProps {
  /** True when the calendar has already passed day 365 but the audio is still pending. */
  overdue?: boolean;
}

/**
 * Highlights that the user has reached the very last audio of the 365-day
 * journey and still needs to listen to it in order to unlock the celebration
 * + restart flow. Shown above the "Today's audio" hero on the home screen.
 */
export const FinalDayBanner = ({ overdue = false }: FinalDayBannerProps) => {
  return (
    <div
      className="relative mt-5 overflow-hidden rounded-2xl border border-primary/60 px-4 py-4 animate-fade-up"
      style={{
        background:
          "linear-gradient(135deg, hsl(var(--primary) / 0.28) 0%, hsl(var(--primary) / 0.08) 50%, hsl(var(--primary-deep) / 0.18) 100%)",
        boxShadow:
          "0 0 0 1px hsl(var(--primary) / 0.25), 0 18px 40px -18px hsl(var(--primary) / 0.55)",
      }}
      role="status"
      aria-live="polite"
    >
      {/* Pulsing glow */}
      <div
        className="pointer-events-none absolute -top-12 -right-8 h-40 w-40 rounded-full blur-3xl animate-glow-pulse"
        style={{ background: "hsl(var(--primary) / 0.55)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-8 h-40 w-40 rounded-full blur-3xl animate-glow-pulse"
        style={{ background: "hsl(var(--primary) / 0.35)", animationDelay: "1.2s" }}
        aria-hidden
      />
      {/* Shimmer sweep */}
      <div
        className="pointer-events-none absolute inset-0 opacity-50 animate-shimmer"
        style={{
          backgroundImage:
            "linear-gradient(110deg, transparent 30%, hsl(var(--primary) / 0.18) 50%, transparent 70%)",
          backgroundSize: "200% 100%",
        }}
        aria-hidden
      />

      <div className="relative flex items-start gap-3">
        <div
          className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/30 ring-2 ring-primary/60 animate-glow-pulse"
        >
          <Crown className="h-5 w-5 text-primary" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-primary animate-twinkle" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
              {overdue ? "One step away" : "Final day · 365 / 365"}
            </p>
          </div>
          <p className="mt-1.5 text-base font-semibold leading-snug text-foreground">
            {overdue
              ? "Don't stop now — finish your last audio."
              : "You've reached the last day of your journey."}
          </p>
          <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
            Listen to today's teaching to complete all 365 days and earn your crown.
          </p>
        </div>
      </div>
    </div>
  );
};

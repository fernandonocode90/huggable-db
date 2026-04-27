import { Sparkles } from "lucide-react";

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
      className="relative mt-4 overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent px-4 py-3.5 animate-fade-up"
      role="status"
      aria-live="polite"
    >
      <div
        className="pointer-events-none absolute -top-10 -right-6 h-32 w-32 rounded-full opacity-60 blur-3xl"
        style={{ background: "hsl(var(--primary) / 0.45)" }}
        aria-hidden
      />
      <div className="relative flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 ring-1 ring-primary/40">
          <Sparkles className="h-4.5 w-4.5 text-primary" strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.24em] text-primary">
            {overdue ? "One step away" : "Final day"}
          </p>
          <p className="mt-1 text-sm font-medium leading-snug text-foreground">
            {overdue
              ? "You still need to listen to Day 365 to complete your journey."
              : "You've reached the last audio of your 365-day journey."}
          </p>
          <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
            Listen to today's teaching to unlock your celebration and begin again.
          </p>
        </div>
      </div>
    </div>
  );
};

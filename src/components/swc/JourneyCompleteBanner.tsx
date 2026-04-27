import { Crown, Sparkles, Sunrise } from "lucide-react";

/**
 * Shown on the home screen after the user has completed the day-365 audio
 * and is waiting for the new journey to start tomorrow. Replaces the
 * "Final day" banner once the audio is done.
 */
export const JourneyCompleteBanner = () => {
  return (
    <div
      className="relative mt-5 overflow-hidden rounded-2xl border border-primary/60 px-5 py-5 animate-fade-up"
      style={{
        background:
          "linear-gradient(135deg, hsl(var(--primary) / 0.32) 0%, hsl(var(--primary) / 0.10) 50%, hsl(var(--primary-deep) / 0.22) 100%)",
        boxShadow:
          "0 0 0 1px hsl(var(--primary) / 0.30), 0 22px 50px -20px hsl(var(--primary) / 0.65)",
      }}
      role="status"
      aria-live="polite"
    >
      {/* Pulsing glow */}
      <div
        className="pointer-events-none absolute -top-16 -right-10 h-44 w-44 rounded-full blur-3xl animate-glow-pulse"
        style={{ background: "hsl(var(--primary) / 0.55)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full blur-3xl animate-glow-pulse"
        style={{ background: "hsl(var(--primary) / 0.35)", animationDelay: "1.4s" }}
        aria-hidden
      />
      {/* Shimmer sweep */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40 animate-shimmer"
        style={{
          backgroundImage:
            "linear-gradient(110deg, transparent 30%, hsl(var(--primary) / 0.22) 50%, transparent 70%)",
          backgroundSize: "200% 100%",
        }}
        aria-hidden
      />

      <div className="relative">
        {/* Header — celebratory */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/30 ring-2 ring-primary/60 animate-glow-pulse">
            <Crown
              className="h-6 w-6 text-primary drop-shadow-[0_0_10px_hsl(var(--primary)/0.7)]"
              strokeWidth={1.8}
              fill="currentColor"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary animate-twinkle" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
                365 / 365 complete
              </p>
            </div>
            <h3 className="mt-1 font-display text-xl leading-tight text-foreground">
              Congratulations — you walked the <span className="gold-text">whole path</span>
            </h3>
          </div>
        </div>

        {/* Body — what comes next */}
        <div className="mt-4 space-y-2.5 rounded-xl bg-background/30 p-3.5 ring-1 ring-primary/20">
          <div className="flex items-start gap-2.5">
            <Sunrise className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.8} />
            <p className="text-[13px] leading-snug text-foreground/90">
              <span className="font-semibold text-foreground">Your new Day 1 begins tomorrow.</span>{" "}
              Rest tonight — the next chapter is already written.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <Crown
              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
              strokeWidth={1.8}
              fill="currentColor"
            />
            <p className="text-[13px] leading-snug text-foreground/90">
              <span className="font-semibold text-foreground">All 365 audios are unlocked.</span>{" "}
              Tomorrow you can listen, revisit, and explore freely — no waiting between days.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

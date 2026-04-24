import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Calculator as CalcIcon,
  Headphones,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { markOnboardingComplete } from "@/lib/onboarding";

interface Slide {
  icon: typeof Sparkles;
  eyebrow: string;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    icon: Sparkles,
    eyebrow: "Welcome",
    title: "Solomon Wealth Code",
    body: "A 365-day journey to align your inner life and your finances with timeless wisdom.",
  },
  {
    icon: Headphones,
    eyebrow: "Daily teaching",
    title: "One audio every day",
    body: "A short, focused teaching unlocks each day. Listen anywhere — even offline — and your streak grows.",
  },
  {
    icon: BookOpen,
    eyebrow: "Sacred reading",
    title: "The Bible, integrated",
    body: "Highlight verses, save favorites, take notes, and search across the entire Scripture in three translations.",
  },
  {
    icon: CalcIcon,
    eyebrow: "Practical tools",
    title: "See your wealth grow",
    body: "A compound-interest calculator turns intention into a clear, visual plan you can save and revisit.",
  },
  {
    icon: ShieldCheck,
    eyebrow: "A gentle note",
    title: "Wisdom, not advice",
    body: "Solomon Wealth Code offers biblical teachings and educational tools — not professional financial, legal, or spiritual advice. Always consult a qualified expert for personal decisions.",
  },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [index, setIndex] = useState(0);

  const finish = () => {
    if (user) markOnboardingComplete(user.id);
    navigate("/");
  };

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;
  const Icon = slide.icon;

  return (
    <div className="bg-night relative flex min-h-screen flex-col px-6 py-10 text-foreground">
      {/* Soft radial glow backdrop */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--gradient-radial-glow)" }}
        aria-hidden
      />

      <div className="relative flex justify-end">
        <button
          onClick={finish}
          className="text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
        >
          Skip
        </button>
      </div>

      <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center text-center">
        <div
          key={index}
          className="animate-fade-up flex flex-col items-center"
        >
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/15 ring-1 ring-primary/40 shadow-[0_0_40px_hsl(var(--primary)/0.4)]">
            <Icon className="h-11 w-11 text-primary" strokeWidth={1.4} />
          </div>
          <p className="mt-8 text-[11px] uppercase tracking-[0.28em] text-primary">
            {slide.eyebrow}
          </p>
          <h1 className="mt-3 font-display text-4xl leading-tight">
            <span className="gold-text">{slide.title}</span>
          </h1>
          <p className="mt-5 max-w-xs text-base leading-relaxed text-foreground/85">
            {slide.body}
          </p>
        </div>
      </main>

      <footer className="relative mx-auto w-full max-w-md">
        {/* Dots */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-8 bg-primary" : "w-2 bg-foreground/25"
              }`}
            />
          ))}
        </div>

        <Button
          onClick={() => (isLast ? finish() : setIndex(index + 1))}
          className="h-12 w-full rounded-full text-base"
        >
          {isLast ? "Begin the journey" : "Next"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </footer>
    </div>
  );
};

export default Onboarding;
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Heart,
  Brain,
  Sprout,
  Coins,
  Compass,
  Sunrise,
  Sun,
  Moon,
  Star,
  Sparkles,
  Mountain,
  Flame,
  ShieldCheck,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  markOnboardingComplete,
  persistOnboardingToDb,
  saveOnboardingProfile,
  type OnboardingProfile,
} from "@/lib/onboarding";

type Option = {
  id: string;
  label: string;
  desc: string;
  icon: typeof Heart;
};

type Step =
  | { kind: "intro" }
  | { kind: "question"; key: keyof OnboardingProfile; eyebrow: string; title: string; subtitle: string; options: Option[] }
  | { kind: "disclaimer" };

const STEPS: Step[] = [
  { kind: "intro" },
  {
    kind: "question",
    key: "intent",
    eyebrow: "Question 1 of 5",
    title: "What brings you here?",
    subtitle: "We'll tailor your daily journey to what matters most to you.",
    options: [
      { id: "anxiety", label: "Peace from money anxiety", desc: "Quiet the noise. Find rest in stewardship.", icon: Heart },
      { id: "wisdom", label: "Wisdom for decisions", desc: "Solomon's clarity for real choices.", icon: Brain },
      { id: "habit", label: "A daily spiritual habit", desc: "Show up for 5 minutes. Every day.", icon: Sprout },
      { id: "generosity", label: "Live with open hands", desc: "Generosity as a way of life.", icon: Coins },
    ],
  },
  {
    kind: "question",
    key: "seasonOfLife",
    eyebrow: "Question 2 of 5",
    title: "Where are you right now?",
    subtitle: "Your season shapes the practice we suggest.",
    options: [
      { id: "starting", label: "Just starting out", desc: "Building foundations.", icon: Sunrise },
      { id: "building", label: "Building & growing", desc: "Career, family, momentum.", icon: Mountain },
      { id: "rebuilding", label: "Rebuilding from a setback", desc: "A reset, with grace.", icon: Compass },
      { id: "established", label: "Established, refining", desc: "Stewarding what's been entrusted.", icon: Crown },
    ],
  },
  {
    kind: "question",
    key: "experience",
    eyebrow: "Question 3 of 5",
    title: "How familiar are you with biblical wisdom on money?",
    subtitle: "We'll meet you exactly where you are.",
    options: [
      { id: "new", label: "New to it", desc: "Curious and open.", icon: Sprout },
      { id: "some", label: "Some familiarity", desc: "I've heard the verses.", icon: Star },
      { id: "deep", label: "I study it regularly", desc: "Give me depth.", icon: Brain },
    ],
  },
  {
    kind: "question",
    key: "practice",
    eyebrow: "Question 4 of 5",
    title: "When will you practice?",
    subtitle: "Choosing a time triples your odds of staying with it.",
    options: [
      { id: "morning", label: "Morning", desc: "Set the tone for the day.", icon: Sunrise },
      { id: "midday", label: "Midday", desc: "A pause in the noise.", icon: Sun },
      { id: "evening", label: "Evening", desc: "Reflect before resting.", icon: Moon },
      { id: "flexible", label: "Whenever I can", desc: "I'll find the moment.", icon: Sparkles },
    ],
  },
  {
    kind: "question",
    key: "commitment",
    eyebrow: "Question 5 of 5",
    title: "What's a realistic daily commitment?",
    subtitle: "Small and consistent beats heroic and rare.",
    options: [
      { id: "5", label: "5 minutes", desc: "One audio. That's enough.", icon: Flame },
      { id: "10", label: "10 minutes", desc: "Audio + a verse to sit with.", icon: Star },
      { id: "20", label: "20 minutes", desc: "Audio, scripture, and reflection.", icon: Brain },
    ],
  },
  { kind: "disclaimer" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [index, setIndex] = useState(0);
  const [profile, setProfile] = useState<OnboardingProfile>({});

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  const finish = () => {
    if (user) {
      saveOnboardingProfile(user.id, profile);
      markOnboardingComplete(user.id);
      // Final write — stamps completed_at so the dashboard counts this user as completed.
      void persistOnboardingToDb(user.id, profile, true).catch(() => { /* best-effort */ });
    }
    // After onboarding, send the user to the welcome paywall.
    // The paywall page itself decides whether to show or skip (premium / recently seen).
    navigate("/welcome-paywall", { replace: true });
  };

  const goNext = () => (isLast ? finish() : setIndex((i) => i + 1));

  const select = (key: keyof OnboardingProfile, value: string) => {
    const next = { ...profile, [key]: value };
    setProfile(next);
    // Persist the partial answer so we still capture data even if the user drops off.
    if (user) {
      void persistOnboardingToDb(user.id, next, false).catch(() => { /* best-effort */ });
    }
    // Auto-advance after a short beat for tactile feedback
    setTimeout(() => setIndex((i) => Math.min(i + 1, STEPS.length - 1)), 220);
  };

  const progress = ((index + 1) / STEPS.length) * 100;

  return (
    <div className="bg-night relative flex min-h-[100dvh] w-full max-w-full flex-col overflow-x-hidden px-6 py-6 text-foreground">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--gradient-radial-glow)" }}
        aria-hidden
      />

      {/* Progress + skip */}
      <div className="relative flex items-center gap-4">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%`, boxShadow: "0 0 10px hsl(var(--primary) / 0.7)" }}
          />
        </div>
        {index > 0 && !isLast && (
          <button
            onClick={finish}
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip
          </button>
        )}
      </div>

      <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
        {step.kind === "intro" && (
          <div key="intro" className="animate-fade-up flex flex-col items-center text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/15 ring-1 ring-primary/40 shadow-[0_0_40px_hsl(var(--primary)/0.4)]">
              <Sparkles className="h-11 w-11 text-primary" strokeWidth={1.4} />
            </div>
            <p className="mt-8 text-[11px] uppercase tracking-[0.28em] text-primary">
              Welcome
            </p>
            <h1 className="mt-3 font-display text-4xl leading-tight">
              <span className="gold-text">Solomon Wealth Code</span>
            </h1>
            <p className="mt-5 max-w-xs text-base leading-relaxed text-foreground/85">
              Five quick questions to shape your daily journey — so every audio, verse, and tool
              meets you where you are.
            </p>
          </div>
        )}

        {step.kind === "question" && (
          <div key={`q-${index}`} className="animate-fade-up">
            <p className="text-[11px] uppercase tracking-[0.28em] text-primary text-center">
              {step.eyebrow}
            </p>
            <h2 className="mt-3 text-center font-display text-3xl leading-tight">
              {step.title}
            </h2>
            <p className="mt-3 text-center text-sm leading-relaxed text-foreground/75">
              {step.subtitle}
            </p>

            <div className="mt-7 space-y-3">
              {step.options.map((opt) => {
                const Icon = opt.icon;
                const selected = profile[step.key] === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => select(step.key, opt.id)}
                    className={`glass-card flex w-full items-center gap-4 rounded-2xl p-4 text-left transition-all hover:scale-[1.01] ${
                      selected
                        ? "ring-2 ring-primary shadow-[0_0_30px_hsl(var(--primary)/0.35)]"
                        : "ring-1 ring-border/50"
                    }`}
                  >
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors ${
                        selected ? "bg-primary/25" : "bg-primary/10"
                      }`}
                    >
                      <Icon className="h-5 w-5 text-primary" strokeWidth={1.6} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-base text-foreground">{opt.label}</div>
                      <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {opt.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step.kind === "disclaimer" && (
          <div key="disc" className="animate-fade-up flex flex-col items-center text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/15 ring-1 ring-primary/40 shadow-[0_0_40px_hsl(var(--primary)/0.4)]">
              <ShieldCheck className="h-11 w-11 text-primary" strokeWidth={1.4} />
            </div>
            <p className="mt-8 text-[11px] uppercase tracking-[0.28em] text-primary">
              A gentle note
            </p>
            <h2 className="mt-3 font-display text-3xl leading-tight">
              <span className="gold-text">Wisdom, not advice</span>
            </h2>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-foreground/85">
              Solomon Wealth Code offers biblical teachings and educational tools — not professional
              financial, legal, or spiritual advice. For personal decisions, consult a qualified expert.
            </p>
          </div>
        )}
      </main>

      <footer className="relative mx-auto w-full max-w-md">
        {(step.kind === "intro" || step.kind === "disclaimer") && (
          <Button
            onClick={goNext}
            className="h-12 w-full rounded-full text-base"
          >
            {step.kind === "intro" ? "Begin" : "Enter the sanctuary"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </footer>
    </div>
  );
};

export default Onboarding;

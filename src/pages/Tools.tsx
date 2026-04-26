import {
  Calculator as CalculatorIcon,
  Home,
  Hourglass,
  PieChart,
  Scale,
  Shield,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/swc/AppShell";
import { Disclaimer } from "@/components/Disclaimer";

type Tool = {
  icon: typeof CalculatorIcon;
  title: string;
  desc: string;
  to: string;
};

type Category = {
  eyebrow: string;
  title: string;
  blurb: string;
  tools: Tool[];
};

const CATEGORIES: Category[] = [
  {
    eyebrow: "Pillar I",
    title: "Wealth Building",
    blurb: "Plant seeds today. Watch them multiply.",
    tools: [
      {
        icon: CalculatorIcon,
        title: "Compound Interest",
        desc: "Plan investments with inflation in mind.",
        to: "/tools/calculator",
      },
      {
        icon: Hourglass,
        title: "Rule of 72",
        desc: "How fast your money doubles.",
        to: "/tools/rule-of-72",
      },
      {
        icon: Scale,
        title: "Net Worth",
        desc: "The cold mirror of true wealth.",
        to: "/tools/net-worth",
      },
    ],
  },
  {
    eyebrow: "Pillar II",
    title: "Protection & Stewardship",
    blurb: "Build the fortress before the storm comes.",
    tools: [
      {
        icon: Shield,
        title: "Emergency Fund",
        desc: "Build the fortress before the storm.",
        to: "/tools/emergency-fund",
      },
      {
        icon: Home,
        title: "Mortgage + Extra",
        desc: "Simulate financing with extra amortization.",
        to: "/tools/mortgage",
      },
    ],
  },
  {
    eyebrow: "Pillar III",
    title: "Daily Wisdom",
    blurb: "Order your house before you order your wealth.",
    tools: [
      {
        icon: PieChart,
        title: "Budget 50/30/20",
        desc: "Split your income with steward's wisdom.",
        to: "/tools/budget",
      },
    ],
  },
];

const Tools = () => {
  const navigate = useNavigate();

  return (
    <AppShell>
      <header className="animate-fade-up">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
          Sanctuary Toolkit
        </p>
        <h1 className="mt-2 font-display text-4xl">
          <span className="gold-text">Tools</span>{" "}
          <span className="text-foreground">& Practice</span>
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-foreground/75">
          Six instruments, three pillars. Each one turns biblical wisdom into a practical step.
        </p>
      </header>

      {CATEGORIES.map((cat, ci) => (
        <section
          key={cat.title}
          className="mt-10 animate-fade-up"
          style={{ animationDelay: `${80 + ci * 70}ms` }}
        >
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-primary">
                {cat.eyebrow}
              </p>
              <h2 className="mt-1 font-display text-2xl text-foreground">
                {cat.title}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {cat.blurb}
              </p>
            </div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {cat.tools.length} tool{cat.tools.length > 1 ? "s" : ""}
            </span>
          </div>

          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {cat.tools.map((t, i) => (
              <li
                key={t.title}
                className="animate-fade-up"
                style={{ animationDelay: `${120 + ci * 70 + i * 50}ms` }}
              >
                <button
                  onClick={() => navigate(t.to)}
                  className="glass-card flex h-full w-full flex-col items-start gap-3 rounded-3xl p-5 text-left transition-transform hover:scale-[1.03]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
                    <t.icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="font-display text-lg text-foreground">
                      {t.title}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {t.desc}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <Disclaimer variant="financial" />
    </AppShell>
  );
};

export default Tools;

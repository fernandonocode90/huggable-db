import {
  Calculator as CalculatorIcon,
  Home,
  Hourglass,
  PieChart,
  Scale,
  Shield,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/swc/AppShell";
import { Disclaimer } from "@/components/Disclaimer";

type ToolCard =
  | {
      kind: "active";
      icon: typeof CalculatorIcon;
      title: string;
      desc: string;
      to: string;
    }
  | { kind: "soon" };

const tools: ToolCard[] = [
  {
    kind: "active",
    icon: CalculatorIcon,
    title: "Compound Interest",
    desc: "Plan investments with inflation in mind.",
    to: "/tools/calculator",
  },
  {
    kind: "active",
    icon: Home,
    title: "Mortgage + Extra",
    desc: "Simulate financing with extra amortization.",
    to: "/tools/mortgage",
  },
  {
    kind: "active",
    icon: PieChart,
    title: "Budget 50/30/20",
    desc: "Split your income with steward's wisdom.",
    to: "/tools/budget",
  },
  {
    kind: "active",
    icon: Shield,
    title: "Emergency Fund",
    desc: "Build the fortress before the storm.",
    to: "/tools/emergency-fund",
  },
  {
    kind: "active",
    icon: Scale,
    title: "Net Worth",
    desc: "The cold mirror of true wealth.",
    to: "/tools/net-worth",
  },
  {
    kind: "active",
    icon: Hourglass,
    title: "Rule of 72",
    desc: "How fast your money doubles.",
    to: "/tools/rule-of-72",
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
      </header>

      <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {tools.map((t, i) => (
          <li
            key={i}
            className="animate-fade-up"
            style={{ animationDelay: `${80 + i * 60}ms` }}
          >
            {t.kind === "active" ? (
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
            ) : (
              <div
                aria-disabled="true"
                className="glass-card flex h-full w-full cursor-not-allowed flex-col items-start gap-3 rounded-3xl p-5 text-left opacity-50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/30">
                  <Sparkles
                    className="h-6 w-6 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <div className="font-display text-sm uppercase tracking-[0.18em] text-muted-foreground">
                    Coming Soon
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <Disclaimer variant="financial" />
    </AppShell>
  );
};

export default Tools;

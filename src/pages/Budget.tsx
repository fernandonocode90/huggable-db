import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, RotateCcw, PieChart as PieIcon } from "lucide-react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { AppShell } from "@/components/swc/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatCurrency } from "@/lib/compoundInterest";
import { SavedScenarios } from "@/components/SavedScenarios";

interface BudgetInputs { income: string }
interface BudgetSnapshot { income: number; needs: number; wants: number; savings: number }

const DEFAULT_INCOME = 5000;

const num = (v: string) => {
  const n = Number(v.replace(/,/g, "."));
  return isFinite(n) && n >= 0 ? n : 0;
};

const Budget = () => {
  const navigate = useNavigate();
  const [income, setIncome] = useState(String(DEFAULT_INCOME));

  const value = num(income);

  const split = useMemo(
    () => ({
      needs: value * 0.5,
      wants: value * 0.3,
      savings: value * 0.2,
    }),
    [value],
  );

  const fmt = (n: number) => formatCurrency(n, "USD");

  const reset = () => setIncome(String(DEFAULT_INCOME));

  const data = [
    { name: "Needs", value: split.needs, color: "hsl(var(--primary))" },
    { name: "Wants", value: split.wants, color: "hsl(var(--accent))" },
    { name: "Savings & Debt", value: split.savings, color: "hsl(var(--muted-foreground))" },
  ];

  return (
    <AppShell>
      <header className="animate-fade-up flex items-center justify-between gap-3">
        <button
          onClick={() => navigate("/tools")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/30 text-foreground transition-colors hover:bg-muted/50"
          aria-label="Back to tools"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            The Steward's Budget
          </p>
          <h1 className="mt-1 font-display text-2xl">
            <span className="gold-text">50/30/20</span>{" "}
            <span className="text-foreground">Rule</span>
          </h1>
        </div>
        <HelpDialog />
      </header>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15">
            <PieIcon className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-display text-base text-foreground">Your income</h2>
            <p className="text-xs text-muted-foreground">
              Enter your monthly take-home pay.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-1.5">
          <Label htmlFor="income">Monthly after-tax income (USD)</Label>
          <Input
            id="income"
            type="number"
            inputMode="decimal"
            min={0}
            value={income}
            onChange={(e) => setIncome(e.target.value)}
          />
        </div>

        <div className="mt-5 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={reset}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </section>

      <section className="mt-6 grid animate-fade-up grid-cols-1 gap-3 sm:grid-cols-3">
        <SliceCard
          label="50% Needs"
          value={fmt(split.needs)}
          desc="Rent, utilities, groceries, transport, insurance — the essentials you cannot skip."
          accent="primary"
        />
        <SliceCard
          label="30% Wants"
          value={fmt(split.wants)}
          desc="Dining out, hobbies, streaming, travel — things that bring joy but are optional."
          accent="accent"
        />
        <SliceCard
          label="20% Savings & Debt"
          value={fmt(split.savings)}
          desc="Emergency fund, investments, retirement and extra debt payments. Pay your future self first."
          accent="gold"
        />
      </section>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <h2 className="font-display text-lg text-foreground">Your monthly slices</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          A visual breakdown of where every dollar should land.
        </p>
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                stroke="hsl(var(--background))"
                strokeWidth={2}
              >
                {data.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  color: "hsl(var(--popover-foreground))",
                  fontSize: 12,
                }}
                formatter={(v: number, n) => [fmt(v), n]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <h2 className="font-display text-base text-foreground">A note on stewardship</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Wealth begins with the careful order of what you already have. The
          50/30/20 rule is a starting point, not a cage — adjust the slices as
          your season of life requires, but never let <em>wants</em> consume what
          belongs to your future.
        </p>
      </section>
    </AppShell>
  );
};

const SliceCard = ({
  label,
  value,
  desc,
  accent,
}: {
  label: string;
  value: string;
  desc: string;
  accent: "primary" | "accent" | "gold";
}) => {
  const ring =
    accent === "primary"
      ? "ring-primary/40"
      : accent === "accent"
        ? "ring-accent/40"
        : "ring-primary/40";
  return (
    <div className={`glass-card rounded-2xl p-4 ring-1 ${ring}`}>
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1.5 font-display text-xl ${accent === "gold" ? "gold-text" : "text-foreground"}`}
      >
        {value}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
};

const HelpDialog = () => (
  <Dialog>
    <DialogTrigger asChild>
      <button
        className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/30 text-foreground transition-colors hover:bg-muted/50"
        aria-label="How it works"
      >
        <HelpCircle className="h-5 w-5" strokeWidth={1.5} />
      </button>
    </DialogTrigger>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="font-display text-xl">
          About this calculator
        </DialogTitle>
        <DialogDescription className="text-sm leading-relaxed">
          The 50/30/20 rule is a simple framework for dividing your monthly
          take-home income.
          <br />
          <br />
          <strong>50% — Needs.</strong> Essentials: rent, utilities, groceries,
          insurance, minimum debt payments.
          <br />
          <strong>30% — Wants.</strong> Lifestyle: dining out, hobbies,
          subscriptions, travel.
          <br />
          <strong>20% — Savings &amp; Debt.</strong> Emergency fund,
          investments, retirement, extra debt payoff.
          <br />
          <br />
          It's a starting point. The principle is <em>order before increase</em>{" "}
          — knowing where every dollar goes is the first act of stewardship.
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
);

export default Budget;

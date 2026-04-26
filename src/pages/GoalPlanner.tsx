import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, RotateCcw, Target } from "lucide-react";
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
import { Disclaimer } from "@/components/Disclaimer";
import { formatCurrency } from "@/lib/compoundInterest";

const num = (v: string) => {
  const n = Number(v.replace(/,/g, "."));
  return isFinite(n) && n >= 0 ? n : 0;
};

/**
 * Solve for required monthly contribution given a future value goal.
 * FV = P*(1+r)^n + PMT * [((1+r)^n - 1) / r]
 * → PMT = (FV - P*(1+r)^n) * r / ((1+r)^n - 1)
 */
const requiredMonthly = (fv: number, principal: number, annualRate: number, years: number) => {
  const n = years * 12;
  const r = annualRate / 100 / 12;
  if (n <= 0) return Infinity;
  const grown = principal * Math.pow(1 + r, n);
  const remaining = fv - grown;
  if (remaining <= 0) return 0;
  if (r === 0) return remaining / n;
  return (remaining * r) / (Math.pow(1 + r, n) - 1);
};

const GoalPlanner = () => {
  const navigate = useNavigate();
  const [goal, setGoal] = useState("100000");
  const [years, setYears] = useState("10");
  const [principal, setPrincipal] = useState("0");
  const [rate, setRate] = useState("8");

  const g = num(goal);
  const y = Math.max(0.1, num(years));
  const p = num(principal);
  const r = num(rate);

  const monthly = useMemo(() => requiredMonthly(g, p, r, y), [g, p, r, y]);
  const totalContrib = monthly * y * 12;
  const interestEarned = g - p - totalContrib;

  const fmt = (n: number) => formatCurrency(n, "USD");

  const reset = () => {
    setGoal("100000"); setYears("10"); setPrincipal("0"); setRate("8");
  };

  return (
    <AppShell>
      <header className="animate-fade-up flex items-center justify-between gap-3">
        <button onClick={() => navigate("/tools")} className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/30 text-foreground transition-colors hover:bg-muted/50" aria-label="Back to tools">
          <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Vision</p>
          <h1 className="mt-1 font-display text-2xl">
            <span className="gold-text">Goal</span> <span className="text-foreground">Planner</span>
          </h1>
        </div>
        <HelpDialog />
      </header>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15">
            <Target className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-display text-base text-foreground">Define the destination</h2>
            <p className="text-xs text-muted-foreground">How much, by when, starting from where?</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="goal">Goal amount (USD)</Label>
            <Input id="goal" type="number" inputMode="decimal" min={0} value={goal} onChange={(e) => setGoal(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="years">Years to reach it</Label>
            <Input id="years" type="number" inputMode="decimal" min={0.1} value={years} onChange={(e) => setYears(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prin">Already saved (USD)</Label>
            <Input id="prin" type="number" inputMode="decimal" min={0} value={principal} onChange={(e) => setPrincipal(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rate">Expected return (%/yr)</Label>
            <Input id="rate" type="number" inputMode="decimal" min={0} value={rate} onChange={(e) => setRate(e.target.value)} />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={reset} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </div>
      </section>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-6 ring-1 ring-primary/40">
        <p className="text-[11px] uppercase tracking-[0.18em] text-primary text-center">You need to save</p>
        <p className="mt-2 text-center font-display text-5xl gold-text">
          {monthly === Infinity ? "—" : fmt(monthly)}
        </p>
        <p className="mt-1 text-center text-xs text-muted-foreground">per month</p>
      </section>

      <section className="mt-6 grid gap-3 md:grid-cols-2">
        <div className="glass-card rounded-2xl p-5 animate-fade-up">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Total you'll contribute</p>
          <p className="mt-1 font-display text-2xl text-foreground">{fmt(Math.max(0, totalContrib))}</p>
        </div>
        <div className="glass-card rounded-2xl p-5 animate-fade-up">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Earned in interest</p>
          <p className="mt-1 font-display text-2xl text-foreground">{fmt(Math.max(0, interestEarned))}</p>
        </div>
      </section>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <h2 className="font-display text-base text-foreground">A vision needs a plan</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground italic">
          "The plans of the diligent lead surely to abundance, but everyone who is hasty comes only
          to poverty." — Proverbs 21:5
        </p>
      </section>

      <Disclaimer variant="financial" />
    </AppShell>
  );
};

const HelpDialog = () => (
  <Dialog>
    <DialogTrigger asChild>
      <button className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/30 text-foreground transition-colors hover:bg-muted/50" aria-label="How it works">
        <HelpCircle className="h-5 w-5" strokeWidth={1.5} />
      </button>
    </DialogTrigger>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="font-display text-xl">About this calculator</DialogTitle>
        <DialogDescription className="text-sm leading-relaxed">
          Tells you the monthly contribution needed to reach a future financial goal — given your
          starting amount, time horizon, and expected annual return.
          <br /><br />
          A typical balanced portfolio returns 6-8% per year over the long run. Be conservative.
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
);

export default GoalPlanner;

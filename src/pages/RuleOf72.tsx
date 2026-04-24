import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, Hourglass, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/swc/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/compoundInterest";

const DEFAULT_RATE = 8;
const DEFAULT_AMOUNT = 10000;

const num = (v: string) => {
  const n = Number(v.replace(/,/g, "."));
  return isFinite(n) ? n : 0;
};

const RuleOf72 = () => {
  const navigate = useNavigate();
  const [rate, setRate] = useState(String(DEFAULT_RATE));
  const [amount, setAmount] = useState(String(DEFAULT_AMOUNT));

  const r = Math.max(0.01, num(rate));
  const a = Math.max(0, num(amount));

  const yearsToDouble = useMemo(() => 72 / r, [r]);

  const milestones = useMemo(
    () =>
      [1, 2, 3, 4, 5].map((n) => ({
        multiple: Math.pow(2, n),
        years: yearsToDouble * n,
        value: a * Math.pow(2, n),
      })),
    [a, yearsToDouble],
  );

  const fmt = (n: number) => formatCurrency(n, "USD");

  const reset = () => {
    setRate(String(DEFAULT_RATE));
    setAmount(String(DEFAULT_AMOUNT));
  };

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
            Time to Double
          </p>
          <h1 className="mt-1 font-display text-2xl">
            <span className="gold-text">Rule</span>{" "}
            <span className="text-foreground">of 72</span>
          </h1>
        </div>
        <HelpDialog />
      </header>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15">
            <Hourglass className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-display text-base text-foreground">Your rate</h2>
            <p className="text-xs text-muted-foreground">
              The expected annual return on your money.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="rate">Annual interest rate (%)</Label>
              <span className="font-display text-base text-foreground">
                {r.toFixed(2)}%
              </span>
            </div>
            <Slider
              value={[Math.min(30, Math.max(0.5, r))]}
              min={0.5}
              max={30}
              step={0.1}
              onValueChange={(v) => setRate(String(v[0]))}
            />
            <Input
              id="rate"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amount">Starting amount (USD, optional)</Label>
            <Input
              id="amount"
              type="number"
              inputMode="decimal"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={reset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </section>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Your money doubles every
        </p>
        <p className="mt-2 font-display text-6xl gold-text">
          {yearsToDouble.toFixed(1)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">years</p>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          At <strong className="text-foreground">{r.toFixed(2)}%</strong> per
          year, every dollar you invest today becomes two in roughly{" "}
          <strong className="text-foreground">
            {Math.round(yearsToDouble)} years
          </strong>
          .
        </p>
      </section>

      {a > 0 && (
        <section className="mt-6 animate-fade-up">
          <h2 className="font-display text-base text-foreground">
            Growth milestones
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            What {fmt(a)} becomes if left untouched.
          </p>
          <ul className="mt-4 space-y-2">
            {milestones.map((m, i) => (
              <li
                key={i}
                className="glass-card flex items-center justify-between rounded-2xl p-4"
                style={{ animationDelay: `${80 + i * 50}ms` }}
              >
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    ×{m.multiple} in {m.years.toFixed(1)}y
                  </p>
                  <p className="mt-0.5 font-display text-lg text-foreground">
                    {fmt(m.value)}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-display text-sm text-primary">
                  ×{m.multiple}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <h2 className="font-display text-base text-foreground">An ancient code</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Divide 72 by your annual return, and the answer is the number of
          years for your money to double. A simple bit of arithmetic that
          reveals the most savage truth in finance: <em>time</em> is the most
          expensive ingredient — and the one you cannot buy back.
        </p>
      </section>
    </AppShell>
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
          The Rule of 72 is a mental shortcut for compound interest. Divide{" "}
          <strong>72</strong> by an annual return, and the result is roughly the
          number of years it takes for an investment to double.
          <br />
          <br />
          Examples:
          <br />• At <strong>6%</strong>, money doubles every <strong>12 years</strong>.
          <br />• At <strong>8%</strong>, every <strong>9 years</strong>.
          <br />• At <strong>12%</strong>, every <strong>6 years</strong>.
          <br />
          <br />
          The rule is an approximation — it works best for rates between 4% and
          15%. For exact results use the Compound Interest calculator.
          <br />
          <br />
          The deeper lesson: the difference between a 6% and a 9% return is not
          a few percentage points — it is decades of doublings. <em>Rate</em>{" "}
          and <em>time</em> compound on each other.
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
);

export default RuleOf72;

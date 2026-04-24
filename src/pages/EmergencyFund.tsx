import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, RotateCcw, Shield } from "lucide-react";
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

const DEFAULT_EXPENSES = 2500;
const DEFAULT_SAVED = 0;

const num = (v: string) => {
  const n = Number(v.replace(/,/g, "."));
  return isFinite(n) && n >= 0 ? n : 0;
};

const EmergencyFund = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState(String(DEFAULT_EXPENSES));
  const [saved, setSaved] = useState(String(DEFAULT_SAVED));
  const [monthlyContribution, setMonthlyContribution] = useState("300");

  const e = num(expenses);
  const s = num(saved);
  const c = num(monthlyContribution);

  const targets = useMemo(
    () => ({
      minimum: e * 3,
      ideal: e * 6,
      fortress: e * 12,
    }),
    [e],
  );

  const fmt = (n: number) => formatCurrency(n, "USD");

  const monthsToReach = (target: number) => {
    if (s >= target) return 0;
    if (c <= 0) return Infinity;
    return Math.ceil((target - s) / c);
  };

  const reset = () => {
    setExpenses(String(DEFAULT_EXPENSES));
    setSaved(String(DEFAULT_SAVED));
    setMonthlyContribution("300");
  };

  const tiers = [
    {
      label: "Minimum — 3 months",
      sub: "Survive a short job loss or unexpected hit.",
      target: targets.minimum,
      tone: "muted" as const,
    },
    {
      label: "Ideal — 6 months",
      sub: "The standard recommended buffer for most households.",
      target: targets.ideal,
      tone: "primary" as const,
    },
    {
      label: "Fortress — 12 months",
      sub: "Total peace of mind. The unbreachable wall.",
      target: targets.fortress,
      tone: "gold" as const,
    },
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
            The Fortress
          </p>
          <h1 className="mt-1 font-display text-2xl">
            <span className="gold-text">Emergency</span>{" "}
            <span className="text-foreground">Fund</span>
          </h1>
        </div>
        <HelpDialog />
      </header>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15">
            <Shield className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-display text-base text-foreground">Your shelter</h2>
            <p className="text-xs text-muted-foreground">
              Tell us your essential monthly burn.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="expenses">Monthly essential expenses (USD)</Label>
            <Input
              id="expenses"
              type="number"
              inputMode="decimal"
              min={0}
              value={expenses}
              onChange={(ev) => setExpenses(ev.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="saved">Already saved (USD)</Label>
            <Input
              id="saved"
              type="number"
              inputMode="decimal"
              min={0}
              value={saved}
              onChange={(ev) => setSaved(ev.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="contrib">Monthly contribution (USD)</Label>
            <Input
              id="contrib"
              type="number"
              inputMode="decimal"
              min={0}
              value={monthlyContribution}
              onChange={(ev) => setMonthlyContribution(ev.target.value)}
            />
          </div>
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

      <section className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {tiers.map((t, i) => {
          const pct = t.target > 0 ? Math.min(100, (s / t.target) * 100) : 0;
          const months = monthsToReach(t.target);
          const eta =
            months === 0
              ? "Reached ✓"
              : months === Infinity
                ? "Set a contribution"
                : months < 12
                  ? `${months} mo to go`
                  : `${Math.floor(months / 12)}y ${months % 12}m to go`;
          return (
            <div
              key={i}
              className={`glass-card animate-fade-up rounded-2xl p-5 ${
                t.tone === "gold"
                  ? "ring-1 ring-primary/40"
                  : t.tone === "primary"
                    ? "ring-1 ring-primary/20"
                    : ""
              }`}
              style={{ animationDelay: `${80 + i * 60}ms` }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {t.label}
                  </p>
                  <p
                    className={`mt-1 font-display text-2xl ${t.tone === "gold" ? "gold-text" : "text-foreground"}`}
                  >
                    {fmt(t.target)}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{eta}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t.sub}</p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted/30">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-[width] duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                <span>{fmt(s)} saved</span>
                <span>{pct.toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <h2 className="font-display text-base text-foreground">Joseph's principle</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          In the years of plenty, gather. In the years of famine, you will not
          be moved. An emergency fund is not a luxury — it is the wall that
          stands between your peace and the storm.
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
          An emergency fund is liquid cash set aside to cover essential expenses
          when income stops or an unexpected cost arrives.
          <br />
          <br />
          Enter your <strong>monthly essential expenses</strong> — the bills you
          must pay no matter what (rent, utilities, food, insurance, transport,
          minimum debt). Skip the wants.
          <br />
          <br />
          You'll see three classic targets:
          <br />
          <strong>3 months</strong> — minimum survival buffer.
          <br />
          <strong>6 months</strong> — the recommended ideal.
          <br />
          <strong>12 months</strong> — total fortress for high-volatility
          incomes or single-earner homes.
          <br />
          <br />
          Keep the fund in a high-yield savings or money-market account — safe,
          liquid, and separate from your daily checking.
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
);

export default EmergencyFund;

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, Plus, Trash2, TrendingDown } from "lucide-react";
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
import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard, tooltipStyle } from "@/components/charts/ChartTheme";

interface Debt {
  id: string;
  name: string;
  balance: string;
  rate: string;
  minPayment: string;
}

type Strategy = "snowball" | "avalanche";

const num = (v: string) => {
  const n = Number(String(v).replace(/,/g, "."));
  return isFinite(n) && n >= 0 ? n : 0;
};

const newDebt = (name = "Debt"): Debt => ({
  id: Math.random().toString(36).slice(2, 9),
  name,
  balance: "1000",
  rate: "15",
  minPayment: "50",
});

/** Simulate payoff with the given strategy. Returns months + total interest. */
const simulate = (debts: Debt[], strategy: Strategy, extra: number) => {
  const list = debts
    .map((d) => ({
      name: d.name,
      balance: num(d.balance),
      rate: num(d.rate) / 100 / 12,
      min: num(d.minPayment),
    }))
    .filter((d) => d.balance > 0);

  if (!list.length) return { months: 0, totalInterest: 0, valid: false };

  // Sort by strategy
  list.sort((a, b) =>
    strategy === "snowball" ? a.balance - b.balance : b.rate - a.rate,
  );

  let months = 0;
  let totalInterest = 0;
  const MAX_MONTHS = 12 * 60; // 60-year safety cap

  while (list.some((d) => d.balance > 0) && months < MAX_MONTHS) {
    months++;
    let pool = extra;

    // Accrue interest first
    for (const d of list) {
      if (d.balance <= 0) continue;
      const interest = d.balance * d.rate;
      d.balance += interest;
      totalInterest += interest;
    }

    // Pay minimums
    for (const d of list) {
      if (d.balance <= 0) continue;
      const pay = Math.min(d.min, d.balance);
      d.balance -= pay;
    }

    // Apply extra to top debt
    for (const d of list) {
      if (d.balance > 0 && pool > 0) {
        const pay = Math.min(pool, d.balance);
        d.balance -= pay;
        pool -= pay;
      }
    }

    // Spill freed minimums of paid-off debts into pool for next month
    const freed = list.filter((d) => d.balance <= 0).reduce((s, d) => s + d.min, 0);
    extra = num(String(extra)) > 0 || freed > 0 ? (extra ? extra : 0) + freed : extra;
  }

  return { months, totalInterest, valid: true };
};

const DebtSnowball = () => {
  const navigate = useNavigate();
  const [debts, setDebts] = useState<Debt[]>([
    { ...newDebt("Credit card"), balance: "3500", rate: "22", minPayment: "100" },
    { ...newDebt("Car loan"), balance: "12000", rate: "8", minPayment: "350" },
    { ...newDebt("Student loan"), balance: "18000", rate: "5", minPayment: "200" },
  ]);
  const [extra, setExtra] = useState("200");
  const [strategy, setStrategy] = useState<Strategy>("snowball");

  const totalBalance = debts.reduce((s, d) => s + num(d.balance), 0);

  const snowball = useMemo(() => simulate(debts, "snowball", num(extra)), [debts, extra]);
  const avalanche = useMemo(() => simulate(debts, "avalanche", num(extra)), [debts, extra]);
  const active = strategy === "snowball" ? snowball : avalanche;
  const savings = Math.abs(snowball.totalInterest - avalanche.totalInterest);
  const fasterStrategy =
    snowball.months < avalanche.months ? "Snowball" : avalanche.months < snowball.months ? "Avalanche" : "Tied";

  const fmt = (n: number) => formatCurrency(n, "USD");

  const update = (id: string, key: keyof Debt, val: string) =>
    setDebts((ds) => ds.map((d) => (d.id === id ? { ...d, [key]: val } : d)));

  const ordered = useMemo(() => {
    const arr = [...debts];
    arr.sort((a, b) =>
      strategy === "snowball"
        ? num(a.balance) - num(b.balance)
        : num(b.rate) - num(a.rate),
    );
    return arr;
  }, [debts, strategy]);

  return (
    <AppShell>
      <header className="animate-fade-up flex items-center justify-between gap-3">
        <button onClick={() => navigate("/tools")} className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/30 text-foreground transition-colors hover:bg-muted/50" aria-label="Back to tools">
          <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Break the Yoke</p>
          <h1 className="mt-1 font-display text-2xl">
            <span className="gold-text">Debt</span> <span className="text-foreground">Payoff</span>
          </h1>
        </div>
        <HelpDialog />
      </header>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15">
              <TrendingDown className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-display text-base text-foreground">Your debts</h2>
              <p className="text-xs text-muted-foreground">{fmt(totalBalance)} total</p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setDebts((d) => [...d, newDebt(`Debt ${d.length + 1}`)])} className="gap-1">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>

        <div className="mt-5 space-y-3">
          {debts.map((d) => (
            <div key={d.id} className="rounded-2xl border border-border/50 bg-background/20 p-3">
              <div className="flex items-center gap-2">
                <Input value={d.name} onChange={(e) => update(d.id, "name", e.target.value)} className="flex-1" placeholder="Name" />
                <button onClick={() => setDebts((ds) => ds.filter((x) => x.id !== d.id))} className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:text-destructive" aria-label="Remove debt">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <div><Label className="text-[10px]">Balance</Label><Input type="number" inputMode="decimal" value={d.balance} onChange={(e) => update(d.id, "balance", e.target.value)} /></div>
                <div><Label className="text-[10px]">APR %</Label><Input type="number" inputMode="decimal" value={d.rate} onChange={(e) => update(d.id, "rate", e.target.value)} /></div>
                <div><Label className="text-[10px]">Min/mo</Label><Input type="number" inputMode="decimal" value={d.minPayment} onChange={(e) => update(d.id, "minPayment", e.target.value)} /></div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <Label htmlFor="extra">Extra payment per month (USD)</Label>
          <Input id="extra" type="number" inputMode="decimal" value={extra} onChange={(e) => setExtra(e.target.value)} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {(["snowball", "avalanche"] as Strategy[]).map((s) => (
            <button
              key={s}
              onClick={() => setStrategy(s)}
              className={`rounded-2xl border p-3 text-left transition-colors ${
                strategy === s
                  ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                  : "border-border/50 hover:bg-muted/20"
              }`}
            >
              <p className="font-display text-base capitalize text-foreground">{s}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {s === "snowball" ? "Smallest balance first — quick wins" : "Highest rate first — least interest"}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-6 ring-1 ring-primary/40">
        <p className="text-[11px] uppercase tracking-[0.18em] text-primary text-center">Debt-free in</p>
        <p className="mt-2 text-center font-display text-5xl gold-text">
          {active.valid ? `${Math.floor(active.months / 12)}y ${active.months % 12}m` : "—"}
        </p>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          {active.valid ? `${fmt(active.totalInterest)} in total interest` : "Add a debt to begin"}
        </p>
      </section>

      {snowball.valid && avalanche.valid && (
        <section className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="glass-card rounded-2xl p-4 animate-fade-up">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Snowball</p>
            <p className="mt-1 font-display text-xl text-foreground">{Math.floor(snowball.months / 12)}y {snowball.months % 12}m</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{fmt(snowball.totalInterest)} interest</p>
          </div>
          <div className="glass-card rounded-2xl p-4 animate-fade-up">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Avalanche</p>
            <p className="mt-1 font-display text-xl text-foreground">{Math.floor(avalanche.months / 12)}y {avalanche.months % 12}m</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{fmt(avalanche.totalInterest)} interest</p>
          </div>
          <div className="glass-card rounded-2xl p-4 animate-fade-up md:col-span-2">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">{fasterStrategy}</strong> is faster.
              The mathematical avalanche saves <strong className="gold-text">{fmt(savings)}</strong> in interest —
              but the snowball delivers the psychological wins that keep most people in the fight.
            </p>
          </div>
        </section>
      )}

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-primary">Payoff order ({strategy})</p>
        <ol className="mt-3 space-y-1.5 text-sm text-foreground">
          {ordered.map((d, i) => (
            <li key={d.id} className="flex items-center justify-between gap-3">
              <span><strong className="text-primary">{i + 1}.</strong> {d.name}</span>
              <span className="text-xs text-muted-foreground">{fmt(num(d.balance))} · {num(d.rate)}%</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <h2 className="font-display text-base text-foreground">The borrower is slave to the lender</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground italic">
          "The rich rule over the poor, and the borrower is slave to the lender." — Proverbs 22:7
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
        <DialogTitle className="font-display text-xl">Snowball vs Avalanche</DialogTitle>
        <DialogDescription className="text-sm leading-relaxed">
          <strong>Snowball:</strong> pay smallest balance first. Quick wins build momentum.
          Most people stick with it longer — proven by Northwestern + HBS research.
          <br /><br />
          <strong>Avalanche:</strong> pay highest interest rate first. Mathematically saves the
          most money. Better for the disciplined.
          <br /><br />
          Add every debt with its balance, APR, and minimum payment. Add an extra payment you can
          commit each month. We simulate both side-by-side.
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
);

export default DebtSnowball;

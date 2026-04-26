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
import { SavedScenarios } from "@/components/SavedScenarios";

interface DebtInputs { debts: Debt[]; extra: string; strategy: Strategy }
interface DebtSnapshot { months: number; totalInterest: number; strategy: Strategy }

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

/**
 * Simulate debt payoff with the chosen strategy.
 *
 * Snowball  → pay minimums on all, throw extra at the SMALLEST balance first.
 * Avalanche → pay minimums on all, throw extra at the HIGHEST APR first.
 *
 * When a debt hits zero, its minimum payment "rolls over" and is added to the
 * extra pool from the next month forward — this is the actual snowball effect.
 *
 * Monthly order of operations (industry-standard):
 *   1. Accrue interest on each debt's outstanding balance
 *   2. Pay each debt's minimum (capped at balance)
 *   3. Apply the available extra pool to the top-priority debt
 *   4. Add any newly-freed minimums to the extra pool for next month
 */
const simulate = (debts: Debt[], strategy: Strategy, baseExtra: number) => {
  const list = debts
    .map((d) => ({
      name: d.name,
      balance: num(d.balance),
      rate: num(d.rate) / 100 / 12,
      min: num(d.minPayment),
      paidOff: false,
    }))
    .filter((d) => d.balance > 0);

  const empty = { months: 0, totalInterest: 0, valid: false, series: [] as { month: number; balance: number }[] };
  if (!list.length) return empty;

  // Priority order, fixed for the whole simulation.
  list.sort((a, b) =>
    strategy === "snowball" ? a.balance - b.balance : b.rate - a.rate,
  );

  // Validate: minimums must at least cover monthly interest, otherwise
  // the debt grows forever (negative amortization).
  const totalMinInterest = list.reduce((s, d) => s + d.balance * d.rate, 0);
  const totalMin = list.reduce((s, d) => s + d.min, 0);
  if (totalMin + baseExtra <= totalMinInterest) {
    return { ...empty, valid: false };
  }

  let months = 0;
  let totalInterest = 0;
  let rolloverPool = baseExtra; // grows as debts are paid off
  const MAX_MONTHS = 12 * 80;
  const series: { month: number; balance: number }[] = [
    { month: 0, balance: list.reduce((s, d) => s + d.balance, 0) },
  ];

  while (list.some((d) => !d.paidOff) && months < MAX_MONTHS) {
    months++;

    // 1) Accrue interest
    for (const d of list) {
      if (d.paidOff) continue;
      const interest = d.balance * d.rate;
      d.balance += interest;
      totalInterest += interest;
    }

    // 2) Pay minimums
    for (const d of list) {
      if (d.paidOff) continue;
      const pay = Math.min(d.min, d.balance);
      d.balance -= pay;
    }

    // 3) Apply extra pool to the highest-priority debt that still has balance
    let pool = rolloverPool;
    for (const d of list) {
      if (pool <= 0) break;
      if (d.paidOff || d.balance <= 0) continue;
      const pay = Math.min(pool, d.balance);
      d.balance -= pay;
      pool -= pay;
    }

    // 4) Mark newly paid-off debts and roll their minimums into the pool
    for (const d of list) {
      if (!d.paidOff && d.balance <= 0.005) {
        d.balance = 0;
        d.paidOff = true;
        rolloverPool += d.min; // permanent boost from next month onward
      }
    }

    // Any leftover pool (we overpaid the target) also rolls forward
    if (pool > 0) {
      // pool was unused only if all debts are gone — no need to roll
    }

    series.push({ month: months, balance: list.reduce((s, d) => s + d.balance, 0) });
  }

  const valid = list.every((d) => d.paidOff);
  return { months, totalInterest, valid, series };
};

const DebtSnowball = () => {
  const navigate = useNavigate();
  const [debts, setDebts] = useState<Debt[]>([
    // Default scenario chosen so that snowball ≠ avalanche.
    // The medium balance is a low-rate auto loan, and a higher-rate credit card
    // sits on top of it — so the two strategies pick a different #2 debt.
    { ...newDebt("Store card"),  balance: "800",   rate: "26", minPayment: "30" },
    { ...newDebt("Auto loan"),   balance: "2500",  rate: "7",  minPayment: "80" },
    { ...newDebt("Credit card"), balance: "5500",  rate: "22", minPayment: "120" },
    { ...newDebt("Student loan"),balance: "18000", rate: "5",  minPayment: "200" },
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

  const chartData = useMemo(() => {
    const maxLen = Math.max(snowball.series.length, avalanche.series.length);
    const step = Math.max(1, Math.floor(maxLen / 80));
    const data: { month: number; snowball: number | null; avalanche: number | null }[] = [];
    for (let i = 0; i < maxLen; i += step) {
      data.push({
        month: i,
        snowball: snowball.series[i]?.balance ?? (i >= snowball.series.length ? 0 : null),
        avalanche: avalanche.series[i]?.balance ?? (i >= avalanche.series.length ? 0 : null),
      });
    }
    return data;
  }, [snowball, avalanche]);

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

      {snowball.valid && avalanche.valid && (
        <ChartCard title="Total balance over time" subtitle="Compare how fast each strategy crushes the total debt.">
          <LineChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="month"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${Math.round((v as number) / 12)}y`}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(v as number)}
              width={60}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number, n) => [fmt(v), n]}
              labelFormatter={(l) => `Month ${l}`}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="snowball" name="Snowball" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="avalanche" name="Avalanche" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
          </LineChart>
        </ChartCard>
      )}

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary">
            Payoff order ({strategy})
          </p>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Extra goes to #1
          </p>
        </div>
        <ol className="mt-3 space-y-1.5 text-sm text-foreground">
          {ordered.map((d, i) => (
            <li
              key={d.id}
              className={`flex items-center justify-between gap-3 rounded-xl px-2 py-1.5 ${
                i === 0 ? "bg-primary/10 ring-1 ring-primary/30" : ""
              }`}
            >
              <span>
                <strong className={i === 0 ? "gold-text" : "text-primary"}>{i + 1}.</strong>{" "}
                {d.name}
                {i === 0 && (
                  <span className="ml-2 text-[10px] uppercase tracking-[0.14em] text-primary">
                    ← extra here
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {fmt(num(d.balance))} · {num(d.rate)}%
              </span>
            </li>
          ))}
        </ol>
        {snowball.valid && avalanche.valid && snowball.months === avalanche.months && Math.abs(snowball.totalInterest - avalanche.totalInterest) < 1 && (
          <p className="mt-4 rounded-2xl border border-border/40 bg-muted/10 p-3 text-xs leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Heads up —</strong> with these debts, snowball and
            avalanche pick the <em>same</em> order, so the time and interest are identical. They
            only diverge when your smallest balance is <em>not</em> your highest-APR debt.
          </p>
        )}
      </section>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <h2 className="font-display text-base text-foreground">The borrower is slave to the lender</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground italic">
          "The rich rule over the poor, and the borrower is slave to the lender." — Proverbs 22:7
        </p>
      </section>

      <SavedScenarios<DebtInputs, DebtSnapshot>
        calculator="debt_snowball"
        currentInputs={{ debts, extra, strategy }}
        currentSnapshot={{ months: active.months, totalInterest: active.totalInterest, strategy }}
        formatSummary={(e) => {
          const m = e.snapshot?.months ?? 0;
          const interest = e.snapshot?.totalInterest ?? 0;
          const strat = e.snapshot?.strategy ?? "snowball";
          if (!m) return `${strat} · not yet computed`;
          return `${strat} · ${Math.floor(m / 12)}y ${m % 12}m · ${fmt(interest)} interest`;
        }}
        onLoad={(e) => {
          if (Array.isArray(e.inputs.debts)) setDebts(e.inputs.debts);
          if (typeof e.inputs.extra === "string") setExtra(e.inputs.extra);
          if (e.inputs.strategy === "snowball" || e.inputs.strategy === "avalanche") {
            setStrategy(e.inputs.strategy);
          }
        }}
      />

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
    <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display text-xl">How this calculator works</DialogTitle>
        <DialogDescription asChild>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <section>
              <p className="font-display text-foreground">1. The two strategies</p>
              <p className="mt-1">
                <strong className="text-foreground">Snowball</strong> — pay the
                <em> smallest balance </em> first. The early "win" of erasing a debt builds
                momentum. Northwestern + HBS research shows most people stick with this method
                longer because of the psychological boost.
              </p>
              <p className="mt-2">
                <strong className="text-foreground">Avalanche</strong> — pay the
                <em> highest interest rate (APR) </em> first. Mathematically the cheapest path:
                you stop paying the most expensive interest as fast as possible. Best when you
                trust yourself to stay disciplined without quick wins.
              </p>
            </section>

            <section>
              <p className="font-display text-foreground">2. How payments are applied each month</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5">
                <li>Interest accrues on every debt's current balance.</li>
                <li>Every debt receives its <strong>minimum payment</strong>.</li>
                <li>The full <strong>extra payment</strong> is thrown at the #1 debt for the
                  current strategy (the one marked "← extra here").</li>
                <li>When a debt hits zero, its minimum permanently <strong>rolls over</strong> and
                  joins the extra pool — that's the real "snowball effect".</li>
              </ol>
            </section>

            <section>
              <p className="font-display text-foreground">3. Why snowball and avalanche sometimes look identical</p>
              <p className="mt-1">
                If your <em>smallest</em> balance also happens to be your <em>highest</em> APR
                (very common with credit cards), both strategies pick the same order — so you'll
                see the same time and interest. They only diverge when a small low-rate debt
                competes with a big high-rate debt.
              </p>
              <p className="mt-2">
                Try the default scenario: the $800 store card (26%) is smallest <em>and</em>
                highest APR — both strategies start there. But after that, snowball jumps to the
                $5,500 card while avalanche keeps attacking by rate. The order in the
                "Payoff order" card updates live when you switch.
              </p>
            </section>

            <section>
              <p className="font-display text-foreground">4. What each result means</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li><strong>Debt-free in</strong> — months until <em>every</em> debt is at zero
                  using the currently selected strategy.</li>
                <li><strong>Total interest</strong> — every dollar you'll pay above the original
                  balances, summed across all months and all debts.</li>
                <li><strong>Snowball vs Avalanche cards</strong> — both run side by side so you
                  can see the trade-off without switching tabs.</li>
                <li><strong>Chart</strong> — total outstanding balance over time. The faster a
                  curve hits zero, the faster that strategy wins.</li>
              </ul>
            </section>

            <section>
              <p className="font-display text-foreground">5. Inputs</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li><strong>Balance</strong> — what you currently owe on each debt.</li>
                <li><strong>APR %</strong> — annual interest rate from the lender. We compound
                  monthly (APR ÷ 12).</li>
                <li><strong>Min/mo</strong> — the contractual minimum your lender requires. If the
                  total minimums don't even cover the monthly interest, no payoff is possible —
                  the calculator will flag that.</li>
                <li><strong>Extra/mo</strong> — anything above the minimums. This is the lever
                  that decides how fast you escape.</li>
              </ul>
            </section>
          </div>
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
);

export default DebtSnowball;

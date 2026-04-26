import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, RotateCcw, HandHeart } from "lucide-react";
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
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard, tooltipStyle } from "@/components/charts/ChartTheme";

const num = (v: string) => {
  const n = Number(v.replace(/,/g, "."));
  return isFinite(n) && n >= 0 ? n : 0;
};

const TIERS = [
  { pct: 1, label: "Beginner", note: "First seed of a generous heart." },
  { pct: 5, label: "Intentional", note: "A real and felt sacrifice." },
  { pct: 10, label: "Tither", note: "The biblical baseline." },
  { pct: 15, label: "Above & beyond", note: "Tithe + meaningful offering." },
  { pct: 25, label: "Steward's life", note: "Open hands as a way of being." },
];

const Generosity = () => {
  const navigate = useNavigate();
  const [income, setIncome] = useState("60000");
  const [pct, setPct] = useState("10");
  const [horizon, setHorizon] = useState("20");

  const i = num(income);
  const p = Math.max(0, Math.min(100, num(pct)));
  const h = num(horizon);

  const monthly = useMemo(() => (i * (p / 100)) / 12, [i, p]);
  const annual = monthly * 12;
  const lifetime = annual * h;

  const fmt = (n: number) => formatCurrency(n, "USD");

  const reset = () => { setIncome("60000"); setPct("10"); setHorizon("20"); };

  return (
    <AppShell>
      <header className="animate-fade-up flex items-center justify-between gap-3">
        <button onClick={() => navigate("/tools")} className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/30 text-foreground transition-colors hover:bg-muted/50" aria-label="Back to tools">
          <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">First Fruits & Open Hands</p>
          <h1 className="mt-1 font-display text-2xl">
            <span className="gold-text">Tithe</span>{" "}
            <span className="text-foreground">& Generosity</span>
          </h1>
        </div>
        <HelpDialog />
      </header>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15">
            <HandHeart className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-display text-base text-foreground">Your giving rhythm</h2>
            <p className="text-xs text-muted-foreground">Set it once. Live it daily.</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-3"><Label htmlFor="inc">Annual income (USD)</Label><Input id="inc" type="number" inputMode="decimal" value={income} onChange={(e) => setIncome(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="pct">Giving %</Label><Input id="pct" type="number" inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="hz">Years to project</Label><Input id="hz" type="number" inputMode="decimal" value={horizon} onChange={(e) => setHorizon(e.target.value)} /></div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={reset} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </div>
      </section>

      <section className="mt-6 grid gap-3 md:grid-cols-3">
        {[
          { label: "Per month", val: monthly },
          { label: "Per year", val: annual },
          { label: `Over ${h} years`, val: lifetime, gold: true },
        ].map((c, idx) => (
          <div
            key={idx}
            className={`glass-card animate-fade-up rounded-2xl p-5 ${c.gold ? "ring-1 ring-primary/40" : ""}`}
            style={{ animationDelay: `${80 + idx * 60}ms` }}
          >
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{c.label}</p>
            <p className={`mt-1 font-display text-2xl ${c.gold ? "gold-text" : "text-foreground"}`}>{fmt(c.val)}</p>
          </div>
        ))}
      </section>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-primary">Stages of generosity</p>
        <div className="mt-3 space-y-2">
          {TIERS.map((t) => {
            const active = p >= t.pct;
            return (
              <button
                key={t.pct}
                onClick={() => setPct(String(t.pct))}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                  active ? "border-primary/40 bg-primary/10" : "border-border/40 hover:bg-muted/20"
                }`}
              >
                <div>
                  <p className="font-display text-base text-foreground">{t.label} · {t.pct}%</p>
                  <p className="text-[11px] text-muted-foreground">{t.note}</p>
                </div>
                <span className="text-xs text-muted-foreground">{fmt((i * t.pct) / 100 / 12)}/mo</span>
              </button>
            );
          })}
        </div>
      </section>

      <ChartCard title={`Lifetime impact over ${h} years`} subtitle="Total given at each generosity stage. Your current pick is highlighted.">
        <BarChart
          data={TIERS.map((t) => ({ name: `${t.pct}%`, label: t.label, value: (i * t.pct / 100) * h }))}
          margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(v as number)}
            width={60}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number, _n, item: any) => [fmt(v), item?.payload?.label ?? "Total"]}
          />
          <Bar dataKey="value" radius={[10, 10, 0, 0]}>
            {TIERS.map((t) => (
              <Cell
                key={t.pct}
                fill={p >= t.pct ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.4)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartCard>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <h2 className="font-display text-base text-foreground">Honor with firstfruits — and beyond</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground italic">
          "Honor the Lord with your wealth, with the firstfruits of all your crops." — Proverbs 3:9
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground italic">
          "Each of you should give what you have decided in your heart to give, not reluctantly or
          under compulsion, for God loves a cheerful giver." — 2 Corinthians 9:7
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
          A long-horizon view of your giving. Tap any stage to test what climbing the next rung
          would cost — and what your generosity would total over a lifetime of practice.
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
);

export default Generosity;

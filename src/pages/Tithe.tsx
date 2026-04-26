import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, RotateCcw, Coins } from "lucide-react";
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
import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { ChartCard, tooltipStyle } from "@/components/charts/ChartTheme";

const num = (v: string) => {
  const n = Number(v.replace(/,/g, "."));
  return isFinite(n) && n >= 0 ? n : 0;
};

const Tithe = () => {
  const navigate = useNavigate();
  const [income, setIncome] = useState("5000");
  const [tithePct, setTithePct] = useState("10");
  const [offeringPct, setOfferingPct] = useState("2");

  const i = num(income);
  const t = Math.min(50, num(tithePct));
  const o = Math.min(50, num(offeringPct));

  const tithe = useMemo(() => (i * t) / 100, [i, t]);
  const offering = useMemo(() => (i * o) / 100, [i, o]);
  const totalGiving = tithe + offering;
  const remaining = i - totalGiving;
  const annual = totalGiving * 12;

  const fmt = (n: number) => formatCurrency(n, "USD");

  const reset = () => {
    setIncome("5000");
    setTithePct("10");
    setOfferingPct("2");
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
            First Fruits
          </p>
          <h1 className="mt-1 font-display text-2xl">
            <span className="gold-text">Tithe</span>{" "}
            <span className="text-foreground">& Offering</span>
          </h1>
        </div>
        <HelpDialog />
      </header>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15">
            <Coins className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-display text-base text-foreground">Your harvest</h2>
            <p className="text-xs text-muted-foreground">
              Tell us your monthly income.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="income">Monthly income (USD)</Label>
            <Input id="income" type="number" inputMode="decimal" min={0} value={income} onChange={(e) => setIncome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tithe">Tithe %</Label>
            <Input id="tithe" type="number" inputMode="decimal" min={0} max={50} value={tithePct} onChange={(e) => setTithePct(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="offer">Offering %</Label>
            <Input id="offer" type="number" inputMode="decimal" min={0} max={50} value={offeringPct} onChange={(e) => setOfferingPct(e.target.value)} />
          </div>
          <div className="flex items-end justify-end">
            <Button type="button" variant="outline" size="sm" onClick={reset} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-3 md:grid-cols-3">
        {[
          { label: `Tithe (${t}%)`, val: tithe, sub: "The first portion — set apart." },
          { label: `Offering (${o}%)`, val: offering, sub: "Beyond the tithe — pure gift." },
          { label: "Total giving / month", val: totalGiving, sub: `${fmt(annual)} per year`, gold: true },
        ].map((c, idx) => (
          <div
            key={idx}
            className={`glass-card animate-fade-up rounded-2xl p-5 ${c.gold ? "ring-1 ring-primary/40" : ""}`}
            style={{ animationDelay: `${80 + idx * 60}ms` }}
          >
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{c.label}</p>
            <p className={`mt-1 font-display text-2xl ${c.gold ? "gold-text" : "text-foreground"}`}>{fmt(c.val)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p>
          </div>
        ))}
      </section>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-primary">After giving</p>
        <p className="mt-1 font-display text-3xl text-foreground">{fmt(remaining)}<span className="text-base text-muted-foreground"> remains</span></p>
      </section>

      <ChartCard title="How your income flows" subtitle="Tithe, offering, and what remains.">
        <PieChart>
          <Pie
            data={[
              { name: "Tithe", value: tithe },
              { name: "Offering", value: offering },
              { name: "Remaining", value: Math.max(0, remaining) },
            ]}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={2}
            stroke="hsl(var(--background))"
            strokeWidth={2}
          >
            <Cell fill="hsl(var(--primary))" />
            <Cell fill="hsl(var(--primary) / 0.55)" />
            <Cell fill="hsl(var(--muted-foreground) / 0.35)" />
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number, n) => [fmt(v), n]}
          />
        </PieChart>
      </ChartCard>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground italic">
          "Honor the Lord with your wealth, with the firstfruits of all your crops; then your barns
          will be filled to overflowing." — Proverbs 3:9-10
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The tithe is not a tax. It is a discipline of gratitude — a weekly reminder that everything
          you hold has been entrusted, not earned alone.
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
          Enter your monthly income (gross or net — your conviction). Adjust the tithe percentage
          (the biblical baseline is 10%) and an optional offering above and beyond.
          <br /><br />
          You'll see your monthly and annual giving, plus what remains for living and saving.
          <br /><br />
          Some traditions tithe on net income, others on gross. Both are honoring — choose with prayer.
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
);

export default Tithe;

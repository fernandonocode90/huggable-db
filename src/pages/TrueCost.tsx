import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, RotateCcw, Hourglass } from "lucide-react";
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

const TrueCost = () => {
  const navigate = useNavigate();
  const [price, setPrice] = useState("1500");
  const [hourly, setHourly] = useState("30");
  const [years, setYears] = useState("20");
  const [rate, setRate] = useState("8");

  const p = num(price);
  const h = Math.max(0.01, num(hourly));
  const y = num(years);
  const r = num(rate) / 100;

  const hours = useMemo(() => p / h, [p, h]);
  const days = hours / 8;
  const futureValue = useMemo(() => p * Math.pow(1 + r, y), [p, r, y]);

  const fmt = (n: number) => formatCurrency(n, "USD");

  const reset = () => { setPrice("1500"); setHourly("30"); setYears("20"); setRate("8"); };

  return (
    <AppShell>
      <header className="animate-fade-up flex items-center justify-between gap-3">
        <button onClick={() => navigate("/tools")} className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/30 text-foreground transition-colors hover:bg-muted/50" aria-label="Back to tools">
          <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Vanity Test</p>
          <h1 className="mt-1 font-display text-2xl">
            <span className="gold-text">True Cost</span>{" "}
            <span className="text-foreground">of Purchase</span>
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
            <h2 className="font-display text-base text-foreground">Weigh before you buy</h2>
            <p className="text-xs text-muted-foreground">Time and future value — the real price.</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="price">Item price (USD)</Label><Input id="price" type="number" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="hr">Your hourly rate (after tax)</Label><Input id="hr" type="number" inputMode="decimal" value={hourly} onChange={(e) => setHourly(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="years">If invested, in how many years?</Label><Input id="years" type="number" inputMode="decimal" value={years} onChange={(e) => setYears(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="rate">Annual return %</Label><Input id="rate" type="number" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} /></div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={reset} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </div>
      </section>

      <section className="mt-6 grid gap-3 md:grid-cols-2">
        <div className="glass-card rounded-2xl p-5 animate-fade-up ring-1 ring-primary/40">
          <p className="text-[11px] uppercase tracking-[0.16em] text-primary">In hours of life</p>
          <p className="mt-1 font-display text-3xl gold-text">{hours.toFixed(1)} h</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            ≈ {days.toFixed(1)} working days at 8 h/day
          </p>
        </div>
        <div className="glass-card rounded-2xl p-5 animate-fade-up ring-1 ring-primary/40">
          <p className="text-[11px] uppercase tracking-[0.16em] text-primary">If invested instead, in {y} years</p>
          <p className="mt-1 font-display text-3xl gold-text">{fmt(futureValue)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">at {num(rate)}%/yr compounded</p>
        </div>
      </section>

      <ChartCard title="Price tag vs. opportunity cost" subtitle="What it costs today vs. what it could become.">
        <BarChart
          data={[
            { name: "Price today", value: p },
            { name: `In ${y} years`, value: futureValue },
          ]}
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
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmt(v), "Value"]} />
          <Bar dataKey="value" radius={[10, 10, 0, 0]}>
            <Cell fill="hsl(var(--muted-foreground) / 0.5)" />
            <Cell fill="hsl(var(--primary))" />
          </Bar>
        </BarChart>
      </ChartCard>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <h2 className="font-display text-base text-foreground">A pause before the purchase</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground italic">
          "Whoever loves money never has enough; whoever loves wealth is never satisfied with their
          income." — Ecclesiastes 5:10
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          This is not a verdict — it is a mirror. Some purchases are worth their hours and their
          opportunity cost. Many are not. The discipline is the pause.
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
          Translates a price tag into two truths: how many hours of your life it costs, and what
          that money could become if invested instead.
          <br /><br />
          Use your <strong>after-tax hourly rate</strong> for accuracy — that's the actual money
          your time produces.
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
);

export default TrueCost;

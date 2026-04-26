import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, RotateCcw, Crown } from "lucide-react";
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
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard, GoldGradients, tooltipStyle } from "@/components/charts/ChartTheme";

const num = (v: string) => {
  const n = Number(v.replace(/,/g, "."));
  return isFinite(n) && n >= 0 ? n : 0;
};

const Retirement = () => {
  const navigate = useNavigate();
  const [age, setAge] = useState("30");
  const [retireAge, setRetireAge] = useState("65");
  const [current, setCurrent] = useState("10000");
  const [monthly, setMonthly] = useState("500");
  const [rate, setRate] = useState("7");
  const [withdrawRate, setWithdrawRate] = useState("4");

  const a = num(age);
  const ra = num(retireAge);
  const cur = num(current);
  const mo = num(monthly);
  const r = num(rate);
  const wr = Math.max(0.1, num(withdrawRate));

  const years = Math.max(0, ra - a);

  const result = useMemo(() => {
    const months = years * 12;
    const monthlyRate = r / 100 / 12;
    const grown = cur * Math.pow(1 + monthlyRate, months);
    const future =
      monthlyRate === 0
        ? grown + mo * months
        : grown + mo * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    const annualWithdraw = (future * wr) / 100;
    const monthlyWithdraw = annualWithdraw / 12;
    return { future, annualWithdraw, monthlyWithdraw };
  }, [cur, mo, r, years, wr]);

  const chartData = useMemo(() => {
    const monthlyRate = r / 100 / 12;
    const data: { age: number; balance: number; contributed: number }[] = [];
    let totalContrib = cur;
    for (let yr = 0; yr <= years; yr++) {
      const months = yr * 12;
      const grown = cur * Math.pow(1 + monthlyRate, months);
      const contribFV =
        monthlyRate === 0
          ? mo * months
          : mo * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
      totalContrib = cur + mo * months;
      data.push({ age: a + yr, balance: grown + contribFV, contributed: totalContrib });
    }
    return data;
  }, [cur, mo, r, years, a]);

  const fmt = (n: number) => formatCurrency(n, "USD");

  const reset = () => {
    setAge("30"); setRetireAge("65"); setCurrent("10000");
    setMonthly("500"); setRate("7"); setWithdrawRate("4");
  };

  return (
    <AppShell>
      <header className="animate-fade-up flex items-center justify-between gap-3">
        <button onClick={() => navigate("/tools")} className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/30 text-foreground transition-colors hover:bg-muted/50" aria-label="Back to tools">
          <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Long Horizon</p>
          <h1 className="mt-1 font-display text-2xl">
            <span className="gold-text">Retirement</span>{" "}
            <span className="text-foreground">& Freedom</span>
          </h1>
        </div>
        <HelpDialog />
      </header>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15">
            <Crown className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-display text-base text-foreground">Your trajectory</h2>
            <p className="text-xs text-muted-foreground">Project decades ahead in seconds.</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5"><Label htmlFor="age">Current age</Label><Input id="age" type="number" inputMode="decimal" value={age} onChange={(e) => setAge(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="ra">Retire at</Label><Input id="ra" type="number" inputMode="decimal" value={retireAge} onChange={(e) => setRetireAge(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="rate">Return %/yr</Label><Input id="rate" type="number" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} /></div>
          <div className="space-y-1.5 col-span-2 sm:col-span-1"><Label htmlFor="cur">Saved today</Label><Input id="cur" type="number" inputMode="decimal" value={current} onChange={(e) => setCurrent(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="mo">Monthly add</Label><Input id="mo" type="number" inputMode="decimal" value={monthly} onChange={(e) => setMonthly(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="wr">Withdraw %</Label><Input id="wr" type="number" inputMode="decimal" value={withdrawRate} onChange={(e) => setWithdrawRate(e.target.value)} /></div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={reset} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </div>
      </section>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-6 ring-1 ring-primary/40">
        <p className="text-[11px] uppercase tracking-[0.18em] text-primary text-center">Estimated nest egg at {ra}</p>
        <p className="mt-2 text-center font-display text-5xl gold-text">{fmt(result.future)}</p>
        <p className="mt-1 text-center text-xs text-muted-foreground">in {years} years</p>
      </section>

      <section className="mt-6 grid gap-3 md:grid-cols-2">
        <div className="glass-card rounded-2xl p-5 animate-fade-up">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Annual income (at {wr}%)</p>
          <p className="mt-1 font-display text-2xl text-foreground">{fmt(result.annualWithdraw)}</p>
        </div>
        <div className="glass-card rounded-2xl p-5 animate-fade-up">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Monthly income</p>
          <p className="mt-1 font-display text-2xl text-foreground">{fmt(result.monthlyWithdraw)}</p>
        </div>
      </section>

      <ChartCard title="Wealth accumulation" subtitle="Total balance vs. what you actually contributed.">
        <AreaChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <GoldGradients />
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis dataKey="age" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}`} />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(v as number)}
            width={60}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number, n) => [fmt(v), n === "balance" ? "Nest egg" : "Contributed"]}
            labelFormatter={(l) => `Age ${l}`}
          />
          <Area type="monotone" dataKey="contributed" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} fill="url(#grad-muted)" />
          <Area type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#grad-gold)" />
        </AreaChart>
      </ChartCard>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <h2 className="font-display text-base text-foreground">A wise person leaves an inheritance</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground italic">
          "A good person leaves an inheritance for their children's children." — Proverbs 13:22
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The 4% rule (Bengen, 1994) is a planning baseline — most balanced portfolios sustain a
          4% annual withdrawal across a 30-year retirement.
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
          Projects your retirement nest egg using your current savings, monthly contribution, and
          expected annual return. Then estimates how much income that nest egg can generate using
          your chosen safe withdrawal rate (the classic 4% rule by default).
          <br /><br />
          These are estimates, not guarantees. Markets vary. Inflation matters. Consult a fiduciary
          advisor before major retirement decisions.
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
);

export default Retirement;

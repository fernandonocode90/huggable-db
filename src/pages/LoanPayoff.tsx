import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, RotateCcw, Banknote } from "lucide-react";
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

const standardPayment = (principal: number, annualRate: number, years: number) => {
  const n = years * 12;
  const r = annualRate / 100 / 12;
  if (n <= 0) return 0;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};

const simulate = (principal: number, annualRate: number, monthlyPayment: number) => {
  const r = annualRate / 100 / 12;
  let bal = principal;
  let months = 0;
  let interestPaid = 0;
  const MAX = 12 * 60;
  if (monthlyPayment <= principal * r) return { months: Infinity, interest: Infinity };
  while (bal > 0 && months < MAX) {
    months++;
    const interest = bal * r;
    interestPaid += interest;
    bal = bal + interest - monthlyPayment;
    if (bal < 0) bal = 0;
  }
  return { months, interest: interestPaid };
};

const LoanPayoff = () => {
  const navigate = useNavigate();
  const [principal, setPrincipal] = useState("15000");
  const [rate, setRate] = useState("9");
  const [years, setYears] = useState("5");
  const [extra, setExtra] = useState("100");

  const p = num(principal);
  const r = num(rate);
  const y = Math.max(0.1, num(years));
  const ex = num(extra);

  const base = useMemo(() => {
    const pmt = standardPayment(p, r, y);
    const sim = simulate(p, r, pmt);
    return { pmt, ...sim };
  }, [p, r, y]);

  const accelerated = useMemo(() => {
    const pmt = base.pmt + ex;
    const sim = simulate(p, r, pmt);
    return { pmt, ...sim };
  }, [base.pmt, ex, p, r]);

  const monthsSaved = base.months === Infinity || accelerated.months === Infinity ? 0 : base.months - accelerated.months;
  const interestSaved = base.interest === Infinity || accelerated.interest === Infinity ? 0 : base.interest - accelerated.interest;

  const fmt = (n: number) => formatCurrency(n, "USD");

  const reset = () => { setPrincipal("15000"); setRate("9"); setYears("5"); setExtra("100"); };

  return (
    <AppShell>
      <header className="animate-fade-up flex items-center justify-between gap-3">
        <button onClick={() => navigate("/tools")} className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/30 text-foreground transition-colors hover:bg-muted/50" aria-label="Back to tools">
          <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Accelerator</p>
          <h1 className="mt-1 font-display text-2xl">
            <span className="gold-text">Loan</span>{" "}
            <span className="text-foreground">Payoff</span>
          </h1>
        </div>
        <HelpDialog />
      </header>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15">
            <Banknote className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-display text-base text-foreground">Your loan</h2>
            <p className="text-xs text-muted-foreground">Car, student, personal — any installment loan.</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="prin">Loan amount (USD)</Label><Input id="prin" type="number" inputMode="decimal" value={principal} onChange={(e) => setPrincipal(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="rate">APR %</Label><Input id="rate" type="number" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="years">Original term (years)</Label><Input id="years" type="number" inputMode="decimal" value={years} onChange={(e) => setYears(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="extra">Extra payment / month</Label><Input id="extra" type="number" inputMode="decimal" value={extra} onChange={(e) => setExtra(e.target.value)} /></div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={reset} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </div>
      </section>

      <section className="mt-6 grid gap-3 md:grid-cols-2">
        <div className="glass-card rounded-2xl p-5 animate-fade-up">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Standard payment</p>
          <p className="mt-1 font-display text-2xl text-foreground">{fmt(base.pmt)}/mo</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{base.months === Infinity ? "—" : `${Math.floor(base.months / 12)}y ${base.months % 12}m`}</p>
        </div>
        <div className="glass-card rounded-2xl p-5 animate-fade-up ring-1 ring-primary/40">
          <p className="text-[11px] uppercase tracking-[0.16em] text-primary">With +{fmt(ex)} extra</p>
          <p className="mt-1 font-display text-2xl gold-text">{fmt(accelerated.pmt)}/mo</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{accelerated.months === Infinity ? "—" : `${Math.floor(accelerated.months / 12)}y ${accelerated.months % 12}m`}</p>
        </div>
      </section>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-6 ring-1 ring-primary/40 text-center">
        <p className="text-[11px] uppercase tracking-[0.18em] text-primary">You'd save</p>
        <p className="mt-2 font-display text-4xl gold-text">{fmt(interestSaved)}</p>
        <p className="mt-1 text-xs text-muted-foreground">in interest · finish {monthsSaved} months early</p>
      </section>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <h2 className="font-display text-base text-foreground">Owe no one anything</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground italic">
          "Owe no one anything, except to love each other." — Romans 13:8
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
          Shows how much faster you'll pay off any installment loan — and how much interest you'll
          save — by adding a fixed extra payment each month.
          <br /><br />
          Works for car loans, student loans, or personal loans. For mortgages, use the dedicated
          Mortgage tool which models taxes and PMI separately.
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
);

export default LoanPayoff;

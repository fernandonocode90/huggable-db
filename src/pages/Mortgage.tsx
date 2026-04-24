import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, RotateCcw, Home } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/swc/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import {
  computeMortgage,
  type AmortizationSystem,
  type ExtraEffect,
  type ExtraFrequency,
} from "@/lib/mortgage";

const DEFAULTS = {
  loanAmount: 300000,
  annualRate: 10,
  termYears: 30,
  system: "price" as AmortizationSystem,
  extraAmount: 500,
  extraFrequency: "monthly" as ExtraFrequency,
  extraStartMonth: 1,
  extraEffect: "reduce-term" as ExtraEffect,
  currency: "USD",
};

const num = (v: string) => {
  const n = Number(v.replace(/,/g, "."));
  return isFinite(n) ? n : 0;
};

const Mortgage = () => {
  const navigate = useNavigate();
  const [loanAmount, setLoanAmount] = useState(String(DEFAULTS.loanAmount));
  const [annualRate, setAnnualRate] = useState(String(DEFAULTS.annualRate));
  const [termYears, setTermYears] = useState(String(DEFAULTS.termYears));
  const [system, setSystem] = useState<AmortizationSystem>(DEFAULTS.system);
  const [extraAmount, setExtraAmount] = useState(String(DEFAULTS.extraAmount));
  const [extraFrequency, setExtraFrequency] = useState<ExtraFrequency>(
    DEFAULTS.extraFrequency,
  );
  const [extraStartMonth, setExtraStartMonth] = useState(
    String(DEFAULTS.extraStartMonth),
  );
  const [extraEffect, setExtraEffect] = useState<ExtraEffect>(
    DEFAULTS.extraEffect,
  );
  const [currency, setCurrency] = useState(DEFAULTS.currency);
  const [tableOpen, setTableOpen] = useState(false);

  const reset = () => {
    setLoanAmount(String(DEFAULTS.loanAmount));
    setAnnualRate(String(DEFAULTS.annualRate));
    setTermYears(String(DEFAULTS.termYears));
    setSystem(DEFAULTS.system);
    setExtraAmount(String(DEFAULTS.extraAmount));
    setExtraFrequency(DEFAULTS.extraFrequency);
    setExtraStartMonth(String(DEFAULTS.extraStartMonth));
    setExtraEffect(DEFAULTS.extraEffect);
    setCurrency(DEFAULTS.currency);
  };

  const result = useMemo(
    () =>
      computeMortgage({
        loanAmount: num(loanAmount),
        annualRate: num(annualRate),
        termYears: num(termYears),
        system,
        extraAmount: num(extraAmount),
        extraFrequency,
        extraStartMonth: num(extraStartMonth),
        extraEffect,
      }),
    [
      loanAmount,
      annualRate,
      termYears,
      system,
      extraAmount,
      extraFrequency,
      extraStartMonth,
      extraEffect,
    ],
  );

  const fmt = (v: number) => formatCurrency(v, currency);

  const chartData = useMemo(() => {
    const maxLen = Math.max(
      result.baseSchedule.length,
      result.newSchedule.length,
    );
    const step = Math.max(1, Math.floor(maxLen / 80));
    const data: { month: number; base: number | null; withExtra: number | null }[] = [];
    for (let i = 0; i < maxLen; i += step) {
      data.push({
        month: i + 1,
        base: result.baseSchedule[i]?.balance ?? 0,
        withExtra: result.newSchedule[i]?.balance ?? null,
      });
    }
    data.push({
      month: maxLen,
      base: result.baseSchedule[result.baseSchedule.length - 1]?.balance ?? 0,
      withExtra: 0,
    });
    return data;
  }, [result]);

  const yearlyRows = useMemo(() => {
    const rows: {
      year: number;
      payment: number;
      interest: number;
      principal: number;
      extra: number;
      balance: number;
    }[] = [];
    let acc = { payment: 0, interest: 0, principal: 0, extra: 0, balance: 0 };
    result.newSchedule.forEach((r, idx) => {
      acc.payment += r.payment;
      acc.interest += r.interest;
      acc.principal += r.principal;
      acc.extra += r.extra;
      acc.balance = r.balance;
      const isYearEnd = (idx + 1) % 12 === 0 || idx === result.newSchedule.length - 1;
      if (isYearEnd) {
        rows.push({
          year: Math.ceil((idx + 1) / 12),
          payment: acc.payment,
          interest: acc.interest,
          principal: acc.principal,
          extra: acc.extra,
          balance: acc.balance,
        });
        acc = { payment: 0, interest: 0, principal: 0, extra: 0, balance: 0 };
      }
    });
    return rows;
  }, [result.newSchedule]);

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
            Real Estate Planner
          </p>
          <h1 className="mt-1 font-display text-2xl">
            <span className="gold-text">Mortgage</span>{" "}
            <span className="text-foreground">+ Extra</span>
          </h1>
        </div>
        <HelpDialog />
      </header>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15">
            <Home className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-display text-base text-foreground">Loan details</h2>
            <p className="text-xs text-muted-foreground">Set up your financing terms.</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="loan">Loan amount</Label>
            <Input
              id="loan"
              type="number"
              inputMode="decimal"
              min={0}
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rate">Annual interest rate (%)</Label>
            <Input
              id="rate"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={annualRate}
              onChange={(e) => setAnnualRate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="term">Term (years)</Label>
            <Input
              id="term"
              type="number"
              inputMode="numeric"
              min={1}
              value={termYears}
              onChange={(e) => setTermYears(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Amortization system</Label>
            <Select
              value={system}
              onValueChange={(v) => setSystem(v as AmortizationSystem)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price">PRICE — fixed payment</SelectItem>
                <SelectItem value="sac">SAC — decreasing payment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency} disabled>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD — US Dollar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6 border-t border-border/40 pt-5">
          <h3 className="font-display text-sm uppercase tracking-[0.18em] text-muted-foreground">
            Extra amortization
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="extra">Extra amount</Label>
              <Input
                id="extra"
                type="number"
                inputMode="decimal"
                min={0}
                value={extraAmount}
                onChange={(e) => setExtraAmount(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select
                value={extraFrequency}
                onValueChange={(v) => setExtraFrequency(v as ExtraFrequency)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="monthly">Every month</SelectItem>
                  <SelectItem value="yearly">Once a year</SelectItem>
                  <SelectItem value="one-time">One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="start">Start at month</Label>
              <Input
                id="start"
                type="number"
                inputMode="numeric"
                min={1}
                value={extraStartMonth}
                onChange={(e) => setExtraStartMonth(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Effect (PRICE)</Label>
              <Select
                value={extraEffect}
                onValueChange={(v) => setExtraEffect(v as ExtraEffect)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reduce-term">Reduce term</SelectItem>
                  <SelectItem value="reduce-payment">Reduce payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

      <section className="mt-6 grid animate-fade-up grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryCard
          label="First payment"
          value={fmt(result.summary.baseFirstPayment)}
          help="The amount of your first monthly installment, before any extra payments. For SAC this is the highest installment; for PRICE it's the fixed installment."
        />
        <SummaryCard
          label="Last payment (base)"
          value={fmt(result.summary.baseLastPayment)}
          help="The last installment of the original schedule with no extra payments. With SAC this is the smallest one."
        />
        <SummaryCard
          label="Total paid (base)"
          value={fmt(result.summary.baseTotalPaid)}
          help="Total amount you'd pay over the full term without any extra amortization — installments only."
        />
        <SummaryCard
          label="Interest (base)"
          value={fmt(result.summary.baseTotalInterest)}
          help="Total interest paid to the bank over the full term, with no extra amortization."
        />
        <SummaryCard
          label="Interest saved"
          value={fmt(result.summary.interestSaved)}
          highlight
          help="How much interest you avoid by making the extra payments you set above."
        />
        <SummaryCard
          label="Time saved"
          value={`${result.summary.yearsSaved}y ${result.summary.monthsSavedRem}m`}
          highlight
          help="How much earlier you finish paying the loan thanks to the extra amortization."
        />
        <SummaryCard
          label="New term"
          value={`${Math.floor(result.summary.newMonths / 12)}y ${result.summary.newMonths % 12}m`}
          help="The remaining term after applying the extra payments."
        />
        <SummaryCard
          label="New total paid"
          value={fmt(result.summary.newTotalPaid)}
          help="Total amount you'd pay including all installments and all extra payments."
        />
        <SummaryCard
          label="New interest"
          value={fmt(result.summary.newTotalInterest)}
          help="Total interest you'd pay with extra amortization applied."
        />
      </section>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <h2 className="font-display text-lg text-foreground">
          Outstanding balance
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          How fast you pay off the loan with vs. without extra amortization.
        </p>
        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="grad-base" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="hsl(var(--muted-foreground))"
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="100%"
                    stopColor="hsl(var(--muted-foreground))"
                    stopOpacity={0.05}
                  />
                </linearGradient>
                <linearGradient id="grad-extra" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.6}
                  />
                  <stop
                    offset="100%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                opacity={0.3}
              />
              <XAxis
                dataKey="month"
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${Math.round((v as number) / 12)}y`}
                label={{
                  value: "Years",
                  position: "insideBottom",
                  offset: -2,
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 11,
                }}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) =>
                  Intl.NumberFormat("en", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(v as number)
                }
                width={60}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  color: "hsl(var(--popover-foreground))",
                  fontSize: 12,
                }}
                formatter={(value: number, name) => [fmt(value), name]}
                labelFormatter={(label) => `Month ${label}`}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="base"
                name="Without extra"
                stroke="hsl(var(--muted-foreground))"
                fill="url(#grad-base)"
                strokeWidth={1.5}
              />
              <Area
                type="monotone"
                dataKey="withExtra"
                name="With extra"
                stroke="hsl(var(--primary))"
                fill="url(#grad-extra)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <Collapsible open={tableOpen} onOpenChange={setTableOpen}>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-foreground">
              Yearly breakdown
            </h2>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {tableOpen ? "Hide" : "Show"}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <th className="py-2 pr-3 text-left font-medium">Year</th>
                    <th className="py-2 pr-3 text-right font-medium">Paid</th>
                    <th className="py-2 pr-3 text-right font-medium">Interest</th>
                    <th className="py-2 pr-3 text-right font-medium">Principal</th>
                    <th className="py-2 pr-3 text-right font-medium">Extra</th>
                    <th className="py-2 pr-0 text-right font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody className="text-foreground">
                  {yearlyRows.map((r) => (
                    <tr key={r.year} className="border-b border-border/20">
                      <td className="py-2 pr-3">{r.year}</td>
                      <td className="py-2 pr-3 text-right">{fmt(r.payment)}</td>
                      <td className="py-2 pr-3 text-right text-primary">
                        {fmt(r.interest)}
                      </td>
                      <td className="py-2 pr-3 text-right">{fmt(r.principal)}</td>
                      <td className="py-2 pr-3 text-right text-accent">
                        {fmt(r.extra)}
                      </td>
                      <td className="py-2 pr-0 text-right">{fmt(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </section>
    </AppShell>
  );
};

const SummaryCard = ({
  label,
  value,
  highlight,
  help,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  help?: string;
}) => (
  <div
    className={`glass-card rounded-2xl p-4 ${highlight ? "ring-1 ring-primary/40" : ""}`}
  >
    <div className="flex items-center gap-1.5">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      {help && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground/70 transition-colors hover:text-foreground"
              aria-label={`What is ${label}?`}
            >
              <HelpCircle className="h-3 w-3" strokeWidth={1.8} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="center"
            className="max-w-[260px] text-xs leading-relaxed"
          >
            {help}
          </PopoverContent>
        </Popover>
      )}
    </div>
    <p
      className={`mt-1.5 font-display text-lg ${highlight ? "gold-text" : "text-foreground"}`}
    >
      {value}
    </p>
  </div>
);

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
          Plan your real-estate financing with extra amortization.
          <br />
          <br />
          <strong>PRICE</strong> keeps a fixed installment for the entire term.
          <br />
          <strong>SAC</strong> uses constant principal, so installments start
          high and decrease over time.
          <br />
          <br />
          The <strong>extra amortization</strong> reduces the outstanding
          balance directly. With PRICE you can choose to either{" "}
          <strong>reduce the term</strong> (faster payoff, same installment) or{" "}
          <strong>reduce the payment</strong> (same term, smaller installment).
          For SAC, extras always reduce the term.
          <br />
          <br />
          All values are estimates and don't include insurance, fees or taxes.
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
);

export default Mortgage;

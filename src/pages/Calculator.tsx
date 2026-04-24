import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, RotateCcw } from "lucide-react";
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
import {
  computeSchedule,
  formatCurrency,
  type Compounding,
  type ContributionTiming,
} from "@/lib/compoundInterest";
import { SavedScenarios, type SavedScenario } from "@/components/calculator/SavedScenarios";

const DEFAULTS = {
  principal: 1000,
  monthlyContribution: 200,
  annualRate: 8,
  years: 10,
  months: 0,
  compounding: "monthly" as Compounding,
  contributionTiming: "end" as ContributionTiming,
  inflationRate: 4,
  currency: "USD",
};

const num = (v: string) => {
  const n = Number(v.replace(/,/g, "."));
  return isFinite(n) ? n : 0;
};

const Calculator = () => {
  const navigate = useNavigate();
  const [principal, setPrincipal] = useState(String(DEFAULTS.principal));
  const [monthlyContribution, setMonthlyContribution] = useState(
    String(DEFAULTS.monthlyContribution),
  );
  const [annualRate, setAnnualRate] = useState(String(DEFAULTS.annualRate));
  const [years, setYears] = useState(String(DEFAULTS.years));
  const [months, setMonths] = useState(String(DEFAULTS.months));
  const [compounding, setCompounding] = useState<Compounding>(
    DEFAULTS.compounding,
  );
  const [contributionTiming, setContributionTiming] =
    useState<ContributionTiming>(DEFAULTS.contributionTiming);
  const [inflationRate, setInflationRate] = useState(
    String(DEFAULTS.inflationRate),
  );
  const [currency, setCurrency] = useState(DEFAULTS.currency);
  const [tableOpen, setTableOpen] = useState(false);

  const reset = () => {
    setPrincipal(String(DEFAULTS.principal));
    setMonthlyContribution(String(DEFAULTS.monthlyContribution));
    setAnnualRate(String(DEFAULTS.annualRate));
    setYears(String(DEFAULTS.years));
    setMonths(String(DEFAULTS.months));
    setCompounding(DEFAULTS.compounding);
    setContributionTiming(DEFAULTS.contributionTiming);
    setInflationRate(String(DEFAULTS.inflationRate));
    setCurrency(DEFAULTS.currency);
  };

  const result = useMemo(
    () =>
      computeSchedule({
        principal: num(principal),
        monthlyContribution: num(monthlyContribution),
        annualRate: num(annualRate),
        years: Math.max(0, Math.floor(num(years))),
        months: Math.max(0, Math.min(11, Math.floor(num(months)))),
        compounding,
        contributionTiming,
        inflationRate: num(inflationRate),
      }),
    [
      principal,
      monthlyContribution,
      annualRate,
      years,
      months,
      compounding,
      contributionTiming,
      inflationRate,
    ],
  );

  const fmt = (v: number) => formatCurrency(v, currency);

  const chartData = useMemo(
    () => [
      {
        year: 0,
        invested: num(principal),
        nominal: num(principal),
        real: num(principal),
      },
      ...result.yearly.map((r) => ({
        year: r.year,
        invested: r.totalInvested,
        nominal: r.balance,
        real: r.realBalance,
      })),
    ],
    [result.yearly, principal],
  );

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
            Investment Planner
          </p>
          <h1 className="mt-1 font-display text-2xl">
            <span className="gold-text">Compound</span>{" "}
            <span className="text-foreground">Interest</span>
          </h1>
        </div>
        <HelpDialog />
      </header>

      {/* Inputs */}
      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="principal">Initial amount</Label>
            <Input
              id="principal"
              type="number"
              inputMode="decimal"
              min={0}
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="monthly">Monthly contribution</Label>
            <Input
              id="monthly"
              type="number"
              inputMode="decimal"
              min={0}
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(e.target.value)}
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
            <Label htmlFor="inflation">Annual inflation (%)</Label>
            <Input
              id="inflation"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={inflationRate}
              onChange={(e) => setInflationRate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="years">Years</Label>
              <Input
                id="years"
                type="number"
                inputMode="numeric"
                min={0}
                value={years}
                onChange={(e) => setYears(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="months">Months</Label>
              <Input
                id="months"
                type="number"
                inputMode="numeric"
                min={0}
                max={11}
                value={months}
                onChange={(e) => setMonths(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD — US Dollar</SelectItem>
                <SelectItem value="EUR">EUR — Euro</SelectItem>
                <SelectItem value="BRL">BRL — Brazilian Real</SelectItem>
                <SelectItem value="GBP">GBP — British Pound</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Compounding</Label>
            <Select
              value={compounding}
              onValueChange={(v) => setCompounding(v as Compounding)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Contribution timing</Label>
            <Select
              value={contributionTiming}
              onValueChange={(v) =>
                setContributionTiming(v as ContributionTiming)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="start">Start of month</SelectItem>
                <SelectItem value="end">End of month</SelectItem>
              </SelectContent>
            </Select>
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

      {/* Summary */}
      <section className="mt-6 grid animate-fade-up grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Final balance"
          value={fmt(result.summary.finalNominal)}
          highlight
          help="The total amount you'll have at the end of the period, in future money. It includes everything you put in plus all the interest earned. Inflation is NOT subtracted here."
        />
        <SummaryCard
          label="Real balance (today)"
          value={fmt(result.summary.finalReal)}
          help="The Final balance converted to today's purchasing power, after subtracting inflation. This tells you what your future money would actually buy if prices keep rising at the inflation rate you set."
        />
        <SummaryCard
          label="Total invested"
          value={fmt(result.summary.totalInvested)}
          help="The sum of every dollar you put in: your initial amount plus all monthly contributions over the period. No interest, no growth — just your own money."
        />
        <SummaryCard
          label="Interest earned"
          value={fmt(result.summary.totalInterest)}
          help="Final balance minus Total invested. This is how much money the investment generated for you on top of what you contributed."
        />
        <SummaryCard
          label="Nominal IRR / yr"
          value={`${result.summary.nominalIrrPct.toFixed(2)}%`}
          help="The actual annualized return on your cashflows (Internal Rate of Return). Because you add money over time, this is the most accurate single number to describe how the investment performed in nominal (future) terms."
        />
        <SummaryCard
          label="Real IRR / yr"
          value={`${result.summary.realIrrPct.toFixed(2)}%`}
          help="The same IRR as above, but on the inflation-adjusted (real) balance. It tells you how fast your purchasing power actually grew per year. If this is negative, inflation ate more than you earned."
        />
        <SummaryCard
          label="Real rate (Fisher)"
          value={`${result.summary.realRatePct.toFixed(2)}%`}
          help="The Fisher real rate: (1 + interest) / (1 + inflation) − 1. It's the per-year real growth rate of money already invested, ignoring contribution timing. Useful as a quick benchmark."
        />
        <SummaryCard
          label="Period"
          value={`${Math.floor(num(years))}y ${Math.floor(num(months))}m`}
          help="The total length of the investment, in years and months. All calculations run month by month over this period."
        />
      </section>

      {/* Chart */}
      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <h2 className="font-display text-lg text-foreground">Growth over time</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Nominal vs. inflation-adjusted balance compared to total invested.
        </p>
        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-nominal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="grad-real" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="grad-invested" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="year"
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 11 }}
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
                labelFormatter={(label) => `Year ${label}`}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="invested"
                name="Total invested"
                stroke="hsl(var(--muted-foreground))"
                fill="url(#grad-invested)"
                strokeWidth={1.5}
              />
              <Area
                type="monotone"
                dataKey="nominal"
                name="Nominal balance"
                stroke="hsl(var(--primary))"
                fill="url(#grad-nominal)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="real"
                name="Real balance"
                stroke="hsl(var(--accent))"
                fill="url(#grad-real)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Yearly breakdown */}
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
                    <th className="py-2 pr-3 text-right font-medium">
                      Contribution
                    </th>
                    <th className="py-2 pr-3 text-right font-medium">Interest</th>
                    <th className="py-2 pr-3 text-right font-medium">Balance</th>
                    <th className="py-2 pr-0 text-right font-medium">Real</th>
                  </tr>
                </thead>
                <tbody className="text-foreground">
                  {result.yearly.map((r) => (
                    <tr key={r.year} className="border-b border-border/20">
                      <td className="py-2 pr-3">{r.year}</td>
                      <td className="py-2 pr-3 text-right">
                        {fmt(r.contributionThisYear)}
                      </td>
                      <td className="py-2 pr-3 text-right text-primary">
                        {fmt(r.interestThisYear)}
                      </td>
                      <td className="py-2 pr-3 text-right">{fmt(r.balance)}</td>
                      <td className="py-2 pr-0 text-right text-muted-foreground">
                        {fmt(r.realBalance)}
                      </td>
                    </tr>
                  ))}
                  {result.yearly.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-4 text-center text-muted-foreground"
                      >
                        Enter a period greater than zero.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </section>

      <SavedScenarios
        current={{
          initial_amount: num(principal),
          monthly_contribution: num(monthlyContribution),
          annual_rate: num(annualRate),
          years: Math.max(1, Math.floor(num(years))),
          total_final: result.summary.finalNominal,
        }}
        formatCurrency={fmt}
        onLoad={(s: SavedScenario) => {
          setPrincipal(String(s.initial_amount));
          setMonthlyContribution(String(s.monthly_contribution));
          setAnnualRate(String(s.annual_rate));
          setYears(String(s.years));
          setMonths("0");
        }}
      />
    </AppShell>
  );
};

const SummaryCard = ({
  label,
  value,
  highlight = false,
  help,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  help?: string;
}) => (
  <div className="glass-card rounded-2xl p-4">
    <div className="flex items-start justify-between gap-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      {help && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`What is ${label}?`}
              className="-mt-1 -mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            >
              <HelpCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            className="w-64 text-xs leading-relaxed"
          >
            <div className="font-display text-sm text-foreground">{label}</div>
            <p className="mt-1.5 text-muted-foreground">{help}</p>
          </PopoverContent>
        </Popover>
      )}
    </div>
    <div
      className={`mt-1 font-display text-lg ${highlight ? "gold-text" : "text-foreground"}`}
    >
      {value}
    </div>
  </div>
);

const HelpDialog = () => (
  <Dialog>
    <DialogTrigger asChild>
      <button
        type="button"
        aria-label="How this calculator works"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/30 text-foreground transition-colors hover:bg-muted/50"
      >
        <HelpCircle className="h-5 w-5" strokeWidth={1.5} />
      </button>
    </DialogTrigger>
    <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display text-xl">
          How this calculator works
        </DialogTitle>
        <DialogDescription>
          A guide to every input, output, and the math behind them.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h3 className="font-display text-base text-foreground">
            What it does
          </h3>
          <p className="mt-1">
            It projects how an investment grows when you start with an initial
            amount, add a fixed monthly contribution, and earn a steady annual
            return. It also shows what that future money is worth in today's
            purchasing power, after inflation.
          </p>
        </section>

        <section>
          <h3 className="font-display text-base text-foreground">Inputs</h3>
          <ul className="mt-2 space-y-2">
            <li>
              <strong className="text-foreground">Initial amount</strong> — the
              lump sum you invest at the start (month 0).
            </li>
            <li>
              <strong className="text-foreground">Monthly contribution</strong>{" "}
              — a fixed amount added every month.
            </li>
            <li>
              <strong className="text-foreground">
                Annual interest rate (%)
              </strong>{" "}
              — the yearly return you expect from the investment, before
              inflation.
            </li>
            <li>
              <strong className="text-foreground">Annual inflation (%)</strong>{" "}
              — the yearly rate at which prices rise. Used only to compute the
              real (today's-money) values. Set to 0 to ignore.
            </li>
            <li>
              <strong className="text-foreground">Years and Months</strong> —
              the total length of the investment.
            </li>
            <li>
              <strong className="text-foreground">Compounding</strong> —{" "}
              <em>Monthly</em> applies one twelfth of the annual rate every
              month (most common for savings/investments).{" "}
              <em>Yearly</em> applies the full rate once a year.
            </li>
            <li>
              <strong className="text-foreground">Contribution timing</strong>{" "}
              — whether the monthly amount is added at the{" "}
              <em>start</em> (earns interest that month) or the <em>end</em>{" "}
              (does not earn interest that month). End is the default for most
              real-world cases.
            </li>
            <li>
              <strong className="text-foreground">Currency</strong> — only
              affects how numbers are formatted. The math is currency-agnostic.
            </li>
          </ul>
        </section>

        <section>
          <h3 className="font-display text-base text-foreground">Outputs</h3>
          <ul className="mt-2 space-y-2">
            <li>
              <strong className="text-foreground">Final balance</strong> — the
              total at the end, in future money.
            </li>
            <li>
              <strong className="text-foreground">Real balance (today)</strong>{" "}
              — the Final balance discounted by inflation: Final ÷ (1 +
              inflation)^years. This is what your money would actually buy
              today.
            </li>
            <li>
              <strong className="text-foreground">Total invested</strong> —
              every dollar you put in (initial + sum of contributions).
            </li>
            <li>
              <strong className="text-foreground">Interest earned</strong> —
              Final balance minus Total invested.
            </li>
            <li>
              <strong className="text-foreground">Nominal IRR / yr</strong> —
              the annualized Internal Rate of Return on your actual cashflow
              stream. Because contributions arrive over time, this is more
              accurate than dividing final by invested.
            </li>
            <li>
              <strong className="text-foreground">Real IRR / yr</strong> — the
              same IRR but on the inflation-adjusted balance. The real growth
              of your purchasing power per year.
            </li>
            <li>
              <strong className="text-foreground">Real rate (Fisher)</strong>{" "}
              — (1 + interest) ÷ (1 + inflation) − 1. The textbook real rate;
              a quick benchmark independent of contribution timing.
            </li>
          </ul>
        </section>

        <section>
          <h3 className="font-display text-base text-foreground">
            Chart and table
          </h3>
          <p className="mt-1">
            The chart plots three curves over time: total invested (your money
            in), nominal balance (future money), and real balance (today's
            money). The yearly breakdown table shows, for each year, how much
            you contributed, how much interest the investment earned, the
            running balance, and its real value.
          </p>
        </section>

        <section>
          <h3 className="font-display text-base text-foreground">Notes</h3>
          <ul className="mt-2 space-y-1.5">
            <li>All inputs use a fixed rate — real markets fluctuate.</li>
            <li>Taxes and fees are not included.</li>
            <li>
              Use the question-mark icon on each result card for a quick
              definition.
            </li>
          </ul>
        </section>
      </div>
    </DialogContent>
  </Dialog>
);

export default Calculator;
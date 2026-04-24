export type Compounding = "monthly" | "yearly";
export type ContributionTiming = "start" | "end";

export interface ComputeInput {
  principal: number;
  monthlyContribution: number;
  annualRate: number;
  years: number;
  months: number;
  compounding: Compounding;
  contributionTiming: ContributionTiming;
  inflationRate: number;
}

export interface YearRow {
  year: number;
  contributionThisYear: number;
  interestThisYear: number;
  balance: number;
  realBalance: number;
  totalInvested: number;
}

export interface ComputeSummary {
  finalNominal: number;
  finalReal: number;
  totalInvested: number;
  totalInterest: number;
  nominalIrrPct: number;
  realIrrPct: number;
  realRatePct: number;
}

export interface ComputeResult {
  yearly: YearRow[];
  summary: ComputeSummary;
}

export function computeSchedule(input: ComputeInput): ComputeResult {
  const {
    principal,
    monthlyContribution,
    annualRate,
    years,
    months,
    compounding,
    contributionTiming,
    inflationRate,
  } = input;

  const totalMonths = Math.max(0, Math.floor(years * 12 + months));
  const r = annualRate / 100;
  const i = inflationRate / 100;
  const monthlyRate = r / 12;

  let balance = principal;
  let totalInvested = principal;
  const yearly: YearRow[] = [];

  let yearStartBalance = balance;
  let yearStartInvested = totalInvested;

  for (let m = 1; m <= totalMonths; m++) {
    if (contributionTiming === "start") {
      balance += monthlyContribution;
      totalInvested += monthlyContribution;
    }

    if (compounding === "monthly") {
      balance *= 1 + monthlyRate;
    } else {
      if (m % 12 === 0) balance *= 1 + r;
    }

    if (contributionTiming === "end") {
      balance += monthlyContribution;
      totalInvested += monthlyContribution;
    }

    const isYearEnd = m % 12 === 0 || m === totalMonths;
    if (isYearEnd) {
      const yearIndex = Math.ceil(m / 12);
      const tYears = m / 12;
      const realBalance = balance / Math.pow(1 + i, tYears);
      const contributionThisYear = totalInvested - yearStartInvested;
      const interestThisYear = balance - yearStartBalance - contributionThisYear;
      yearly.push({
        year: yearIndex,
        contributionThisYear,
        interestThisYear,
        balance,
        realBalance,
        totalInvested,
      });
      yearStartBalance = balance;
      yearStartInvested = totalInvested;
    }
  }

  const tYears = totalMonths / 12;
  const finalNominal = balance;
  const finalReal = tYears > 0 ? balance / Math.pow(1 + i, tYears) : balance;
  const totalInterest = finalNominal - totalInvested;

  const cashflows: number[] = [];
  if (totalMonths === 0) {
    cashflows.push(-principal + finalNominal);
  } else {
    cashflows.push(-principal);
    for (let m = 1; m <= totalMonths; m++) {
      let cf = -monthlyContribution;
      if (m === totalMonths) cf += finalNominal;
      cashflows.push(cf);
    }
  }
  const monthlyIrrNominal = irrMonthly(cashflows);

  const cashflowsReal: number[] = [];
  if (totalMonths === 0) {
    cashflowsReal.push(-principal + finalReal);
  } else {
    cashflowsReal.push(-principal);
    for (let m = 1; m <= totalMonths; m++) {
      let cf = -monthlyContribution;
      if (m === totalMonths) cf += finalReal;
      cashflowsReal.push(cf);
    }
  }
  const monthlyIrrReal = irrMonthly(cashflowsReal);

  const nominalIrrPct = isFinite(monthlyIrrNominal) ? (Math.pow(1 + monthlyIrrNominal, 12) - 1) * 100 : 0;
  const realIrrPct = isFinite(monthlyIrrReal) ? (Math.pow(1 + monthlyIrrReal, 12) - 1) * 100 : 0;
  const realRatePct = ((1 + r) / (1 + i) - 1) * 100;

  return {
    yearly,
    summary: { finalNominal, finalReal, totalInvested, totalInterest, nominalIrrPct, realIrrPct, realRatePct },
  };
}

function irrMonthly(cashflows: number[]): number {
  if (cashflows.length < 2) return NaN;
  let rate = 0.01;
  for (let iter = 0; iter < 100; iter++) {
    let npv = 0;
    let dnpv = 0;
    for (let t = 0; t < cashflows.length; t++) {
      const denom = Math.pow(1 + rate, t);
      npv += cashflows[t] / denom;
      if (t > 0) dnpv += (-t * cashflows[t]) / Math.pow(1 + rate, t + 1);
    }
    if (Math.abs(npv) < 1e-9) return rate;
    if (dnpv === 0) return NaN;
    const next = rate - npv / dnpv;
    if (!isFinite(next)) return NaN;
    if (Math.abs(next - rate) < 1e-10) return next;
    rate = next;
    if (rate <= -0.999999) rate = -0.99;
  }
  return rate;
}

export function formatCurrency(value: number, currency: string): string {
  const localeMap: Record<string, string> = {
    USD: "en-US",
    EUR: "de-DE",
    BRL: "pt-BR",
    GBP: "en-GB",
  };
  try {
    return new Intl.NumberFormat(localeMap[currency] ?? "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(isFinite(value) ? value : 0);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

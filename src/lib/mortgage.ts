export type AmortizationSystem = "price" | "sac";
export type ExtraFrequency = "none" | "monthly" | "yearly" | "one-time";
export type ExtraEffect = "reduce-term" | "reduce-payment";

export interface MortgageInput {
  loanAmount: number;
  annualRate: number; // %
  termYears: number;
  system: AmortizationSystem;
  extraAmount: number;
  extraFrequency: ExtraFrequency;
  extraStartMonth: number; // 1-based
  extraEffect: ExtraEffect;
}

export interface MonthRow {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  extra: number;
  balance: number;
}

export interface MortgageSummary {
  baseMonths: number;
  baseTotalPaid: number;
  baseTotalInterest: number;
  baseFirstPayment: number;
  baseLastPayment: number;
  newMonths: number;
  newTotalPaid: number;
  newTotalInterest: number;
  monthsSaved: number;
  interestSaved: number;
  yearsSaved: number;
  monthsSavedRem: number;
}

export interface MortgageResult {
  baseSchedule: MonthRow[];
  newSchedule: MonthRow[];
  summary: MortgageSummary;
}

function priceInstallment(balance: number, monthlyRate: number, n: number) {
  if (n <= 0) return 0;
  if (monthlyRate === 0) return balance / n;
  const f = Math.pow(1 + monthlyRate, n);
  return (balance * monthlyRate * f) / (f - 1);
}

function buildSchedule(input: MortgageInput, withExtras: boolean): MonthRow[] {
  const totalMonths = Math.max(1, Math.floor(input.termYears * 12));
  const monthlyRate = input.annualRate / 100 / 12;
  const rows: MonthRow[] = [];

  let balance = input.loanAmount;
  let remainingMonths = totalMonths;
  let currentInstallment =
    input.system === "price"
      ? priceInstallment(balance, monthlyRate, totalMonths)
      : 0;
  const sacAmortBase = input.loanAmount / totalMonths;

  let m = 0;
  while (balance > 0.005 && m < 12 * 100) {
    m += 1;
    const interest = balance * monthlyRate;

    let payment: number;
    let principalPart: number;

    if (input.system === "price") {
      payment = currentInstallment;
      principalPart = payment - interest;
      if (principalPart > balance) {
        principalPart = balance;
        payment = principalPart + interest;
      }
    } else {
      // SAC: constant amortization
      principalPart = Math.min(sacAmortBase, balance);
      payment = principalPart + interest;
    }

    balance -= principalPart;

    // Extra payment
    let extra = 0;
    if (withExtras && input.extraAmount > 0 && m >= input.extraStartMonth) {
      const offset = m - input.extraStartMonth;
      if (input.extraFrequency === "monthly") {
        extra = input.extraAmount;
      } else if (input.extraFrequency === "yearly") {
        if (offset % 12 === 0) extra = input.extraAmount;
      } else if (input.extraFrequency === "one-time") {
        if (m === input.extraStartMonth) extra = input.extraAmount;
      }
      if (extra > balance) extra = balance;
      balance -= extra;
    }

    rows.push({
      month: m,
      payment,
      interest,
      principal: principalPart,
      extra,
      balance: Math.max(0, balance),
    });

    remainingMonths -= 1;

    // Recompute PRICE installment if extra was applied and effect = reduce-payment
    if (
      withExtras &&
      input.system === "price" &&
      extra > 0 &&
      input.extraEffect === "reduce-payment" &&
      remainingMonths > 0 &&
      balance > 0.005
    ) {
      currentInstallment = priceInstallment(balance, monthlyRate, remainingMonths);
    }

    if (balance <= 0.005) break;
  }

  return rows;
}

export function computeMortgage(input: MortgageInput): MortgageResult {
  const sanitized: MortgageInput = {
    ...input,
    loanAmount: Math.max(0, input.loanAmount),
    annualRate: Math.max(0, input.annualRate),
    termYears: Math.max(1, input.termYears),
    extraAmount: Math.max(0, input.extraAmount),
    extraStartMonth: Math.max(1, Math.floor(input.extraStartMonth || 1)),
  };

  const baseSchedule = buildSchedule(sanitized, false);
  const newSchedule = buildSchedule(sanitized, true);

  const baseTotalPaid = baseSchedule.reduce((s, r) => s + r.payment, 0);
  const baseTotalInterest = baseSchedule.reduce((s, r) => s + r.interest, 0);

  const newTotalPaid = newSchedule.reduce((s, r) => s + r.payment + r.extra, 0);
  const newTotalInterest = newSchedule.reduce((s, r) => s + r.interest, 0);

  const baseMonths = baseSchedule.length;
  const newMonths = newSchedule.length;
  const monthsSaved = Math.max(0, baseMonths - newMonths);

  return {
    baseSchedule,
    newSchedule,
    summary: {
      baseMonths,
      baseTotalPaid,
      baseTotalInterest,
      baseFirstPayment: baseSchedule[0]?.payment ?? 0,
      baseLastPayment: baseSchedule[baseSchedule.length - 1]?.payment ?? 0,
      newMonths,
      newTotalPaid,
      newTotalInterest,
      monthsSaved,
      interestSaved: Math.max(0, baseTotalInterest - newTotalInterest),
      yearsSaved: Math.floor(monthsSaved / 12),
      monthsSavedRem: monthsSaved % 12,
    },
  };
}

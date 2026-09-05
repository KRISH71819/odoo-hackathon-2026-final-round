// ── calculateProration ──────────────────────────────────────
// Pure function: computes prorated amount for a mid-cycle change.
// All values in integer minor currency units (cents). No floating-point.
//
// Formula (day-based):
//   periodDays = number of days in the full billing period
//   remainingDays = days from changeDate to periodEnd (inclusive of changeDate)
//   proratedAmount = Math.round((pricePerInterval * remainingDays) / periodDays)
//
// Returns the amount to charge for the new configuration for the
// remainder of the period.

export interface ProrationInput {
  periodStart: Date;
  periodEnd: Date;   // exclusive (first day of next period)
  changeDate: Date;
  pricePerInterval: number; // minor currency units
  prorationRule: 'DAY_BASED' | 'NONE';
}

export interface ProrationResult {
  prorationRule: string;
  periodDays: number;
  remainingDays: number;
  proratedAmount: number; // minor currency units
}

export function calculateProration(input: ProrationInput): ProrationResult {
  const { periodStart, periodEnd, changeDate, pricePerInterval, prorationRule } = input;

  if (prorationRule === 'NONE') {
    return {
      prorationRule,
      periodDays: 0,
      remainingDays: 0,
      proratedAmount: pricePerInterval,
    };
  }

  const MS_PER_DAY = 86_400_000;
  const periodDays = Math.round((periodEnd.getTime() - periodStart.getTime()) / MS_PER_DAY);
  const remainingDays = Math.max(
    0,
    Math.round((periodEnd.getTime() - changeDate.getTime()) / MS_PER_DAY),
  );

  if (periodDays <= 0) {
    return { prorationRule, periodDays: 0, remainingDays: 0, proratedAmount: 0 };
  }

  // Integer math: multiply first, divide last to avoid float errors
  const proratedAmount = Math.round((pricePerInterval * remainingDays) / periodDays);

  return { prorationRule, periodDays, remainingDays, proratedAmount };
}

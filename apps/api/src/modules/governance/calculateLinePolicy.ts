// ── calculateLinePolicy ──────────────────────────────────────
// Per-line discount policy check against tier and category ceilings.
// Pure function — takes config data, returns violation info.

export interface DiscountLimits {
  tierLimitBps: number;     // from DiscountRule
  categoryLimitBps: number; // from CategoryDiscountRule
}

export interface LinePolicyInput {
  lineId: string;
  productName: string;
  lineDiscountBps: number;
  category: string;
}

export interface LinePolicyResult {
  lineId: string;
  productName: string;
  lineDiscountBps: number;
  effectiveLimitBps: number;
  excessBps: number;
  violation: boolean;
  reasons: string[];
}

/**
 * Check a single line against its effective discount limit.
 * Effective limit = min(customerTierLimit, categoryLimit).
 */
export function calculateLinePolicy(
  line: LinePolicyInput,
  limits: DiscountLimits,
): LinePolicyResult {
  const effectiveLimitBps = Math.min(limits.tierLimitBps, limits.categoryLimitBps);
  const excessBps = Math.max(0, line.lineDiscountBps - effectiveLimitBps);
  const violation = excessBps > 0;

  const reasons: string[] = [];
  if (line.lineDiscountBps > limits.categoryLimitBps) {
    reasons.push(
      `${line.productName}: ${bpsToPercent(line.lineDiscountBps)}% discount exceeds ${line.category} category ceiling of ${bpsToPercent(limits.categoryLimitBps)}%`
    );
  }
  if (line.lineDiscountBps > limits.tierLimitBps) {
    reasons.push(
      `${line.productName}: ${bpsToPercent(line.lineDiscountBps)}% discount exceeds customer tier ceiling of ${bpsToPercent(limits.tierLimitBps)}%`
    );
  }

  return { lineId: line.lineId, productName: line.productName, lineDiscountBps: line.lineDiscountBps, effectiveLimitBps, excessBps, violation, reasons };
}

function bpsToPercent(bps: number): string {
  return (bps / 100).toFixed(1);
}

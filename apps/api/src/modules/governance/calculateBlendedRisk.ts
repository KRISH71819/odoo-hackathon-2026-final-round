// ── calculateBlendedRisk ─────────────────────────────────────
// Aggregates per-line policy violations into a single blended risk score.
// Small violations across many lines DO contribute — prevents gaming governance.
// Pure function.

import { RiskLevel } from '@dealflow360/contracts';
import { LinePolicyResult } from './calculateLinePolicy.js';

export interface BlendedRiskInput {
  lineResults: LinePolicyResult[];
  lineTotals: { lineId: string; afterDiscount: number }[];
}

export interface BlendedRiskResult {
  blendedRiskBps: number;
  riskLevel: RiskLevel;
  reasons: string[];
}

/**
 * Calculate blended discount risk.
 *
 * For each line with excess, weight the excess by the line's share of order total.
 * This means many small violations add up — you can't bypass governance by spreading
 * excess across 20 lines instead of putting it on one.
 *
 * Score scale: 0–10000 bps.
 * Risk levels: NONE (0), LOW (1–500), MEDIUM (501–1500), HIGH (>1500).
 */
export function calculateBlendedRisk(input: BlendedRiskInput): BlendedRiskResult {
  const totalAfterDiscount = input.lineTotals.reduce((sum, l) => sum + l.afterDiscount, 0);

  if (totalAfterDiscount === 0) {
    return { blendedRiskBps: 0, riskLevel: RiskLevel.NONE, reasons: [] };
  }

  let blendedRiskBps = 0;
  const reasons: string[] = [];

  for (const lineResult of input.lineResults) {
    if (lineResult.excessBps <= 0) continue;

    const lineTotal = input.lineTotals.find((l) => l.lineId === lineResult.lineId);
    if (!lineTotal) continue;

    // Weight = this line's share of order total
    const weight = lineTotal.afterDiscount / totalAfterDiscount;
    const weightedExcess = Math.floor(lineResult.excessBps * weight);
    blendedRiskBps += weightedExcess;

    reasons.push(...lineResult.reasons);
  }

  const riskLevel = scoreToRiskLevel(blendedRiskBps);

  return { blendedRiskBps, riskLevel, reasons };
}

function scoreToRiskLevel(bps: number): RiskLevel {
  if (bps === 0) return RiskLevel.NONE;
  if (bps <= 500) return RiskLevel.LOW;
  if (bps <= 1500) return RiskLevel.MEDIUM;
  return RiskLevel.HIGH;
}

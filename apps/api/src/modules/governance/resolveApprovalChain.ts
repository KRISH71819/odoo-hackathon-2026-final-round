// ── resolveApprovalChain ─────────────────────────────────────
// Maps risk level to required approver roles from DB config.
// Pure function — takes the threshold config, returns ordered roles.

import { RiskLevel } from '@dealflow360/contracts';

export interface ApprovalThresholdConfig {
  id?: string;
  riskLevel?: string;
  minRiskScore?: number;
  maxRiskScore?: number;
  requiredApprovers: string; // JSON string: '["SALES_MANAGER","FINANCE_OPS"]'
}

/**
 * Resolve which approvers are needed for a given risk level.
 * Returns an ordered array of role strings, e.g. ['SALES_MANAGER', 'FINANCE_OPS'].
 * Returns empty array if no approval is needed.
 */
export function resolveApprovalChain(
  riskLevel: RiskLevel,
  thresholds: ApprovalThresholdConfig[],
): string[] {
  // If risk is NONE, no approval needed regardless of config
  if (riskLevel === RiskLevel.NONE) return [];

  const threshold = thresholds.find(
    (t) =>
      t.riskLevel === riskLevel ||
      (riskLevel === RiskLevel.LOW && t.id === 'at-low') ||
      (riskLevel === RiskLevel.MEDIUM && t.id === 'at-medium') ||
      (riskLevel === RiskLevel.HIGH && t.id === 'at-high')
  );
  if (!threshold) return [];

  try {
    const approvers = JSON.parse(threshold.requiredApprovers);
    return Array.isArray(approvers) ? approvers : [];
  } catch {
    return [];
  }
}

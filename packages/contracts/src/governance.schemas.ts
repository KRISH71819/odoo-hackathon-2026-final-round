import { z } from 'zod';
import { ApprovalActionType, RiskLevel } from './enums.js';

// ── Approval Action Input ────────────────────────────────────

export const ApprovalActionInputSchema = z.object({
  action: z.nativeEnum(ApprovalActionType),
  reason: z.string().max(1000).optional(),
}).refine(
  (data) => {
    // Reason required for reject/return
    if (data.action === ApprovalActionType.REJECT || data.action === ApprovalActionType.RETURN_FOR_REVISION) {
      return !!data.reason && data.reason.trim().length > 0;
    }
    return true;
  },
  { message: 'Reason is required for reject and return actions', path: ['reason'] }
);

export type ApprovalActionInput = z.infer<typeof ApprovalActionInputSchema>;

// ── Risk Score Response ──────────────────────────────────────

export interface LinePolicyResult {
  lineId: string;
  productName: string;
  lineDiscountBps: number;
  effectiveLimitBps: number;
  excessBps: number;
  violation: boolean;
  reasons: string[];
}

export interface RiskScoreResult {
  blendedRiskBps: number;
  riskLevel: RiskLevel;
  lineResults: LinePolicyResult[];
  requiredApprovers: string[];
  reasons: string[];
}

// ── Discount Rule DTOs ───────────────────────────────────────

export const UpdateDiscountRuleSchema = z.object({
  maxDiscountBps: z.number().int().min(0).max(10000),
  description: z.string().max(500).optional(),
});

export type UpdateDiscountRuleInput = z.infer<typeof UpdateDiscountRuleSchema>;

// ── Tests for Core Domain Functions ──────────────────────────
// Phase 2 quality gate: all business-rule tests from the blueprint.

import { describe, it, expect } from 'vitest';
import { calculateQuoteTotals } from '../src/modules/sales/calculateQuoteTotals';
import { calculateLinePolicy, type DiscountLimits } from '../src/modules/governance/calculateLinePolicy';
import { calculateBlendedRisk } from '../src/modules/governance/calculateBlendedRisk';
import { resolveApprovalChain } from '../src/modules/governance/resolveApprovalChain';
import { RiskLevel } from '../../../packages/contracts/src/enums';

// ── calculateQuoteTotals ─────────────────────────────────────

describe('calculateQuoteTotals', () => {
  it('calculates correct line totals with discount and tax', () => {
    const result = calculateQuoteTotals([
      { id: 'l1', unitPrice: 10000, costPrice: 7000, quantity: 2, lineDiscountBps: 1000, taxRate: 1000 },
    ]);

    const line = result.lines[0];
    expect(line.subtotal).toBe(20000);           // 10000 * 2
    expect(line.discountAmount).toBe(2000);       // 20000 * 10%
    expect(line.afterDiscount).toBe(18000);       // 20000 - 2000
    expect(line.taxAmount).toBe(1800);            // 18000 * 10%
    expect(line.total).toBe(19800);               // 18000 + 1800
    expect(line.costTotal).toBe(14000);           // 7000 * 2
    expect(line.margin).toBe(4000);               // 18000 - 14000
  });

  it('handles order-level discount on top of line discount', () => {
    const result = calculateQuoteTotals(
      [{ id: 'l1', unitPrice: 10000, costPrice: 5000, quantity: 1, lineDiscountBps: 1000, taxRate: 0 }],
      500 // 5% order discount
    );

    const line = result.lines[0];
    expect(line.subtotal).toBe(10000);
    // Line discount: 10000 * 10% = 1000 → after line = 9000
    // Order discount: 9000 * 5% = 450 → after order = 8550
    expect(line.afterDiscount).toBe(8550);
    expect(line.discountAmount).toBe(1450);
  });

  it('handles empty lines array', () => {
    const result = calculateQuoteTotals([]);
    expect(result.grandTotal).toBe(0);
    expect(result.lines).toHaveLength(0);
  });

  it('calculates correct aggregate totals across multiple lines', () => {
    const result = calculateQuoteTotals([
      { id: 'l1', unitPrice: 10000, costPrice: 7000, quantity: 1, lineDiscountBps: 0, taxRate: 1000 },
      { id: 'l2', unitPrice: 5000, costPrice: 3000, quantity: 2, lineDiscountBps: 0, taxRate: 0 },
    ]);

    expect(result.subtotal).toBe(20000);          // 10000 + 10000
    expect(result.grandTotal).toBe(21000);        // (10000 + 1000) + 10000
    expect(result.totalCost).toBe(13000);         // 7000 + 6000
    expect(result.totalMargin).toBe(7000);        // 20000 - 13000
  });
});

// ── calculateLinePolicy ──────────────────────────────────────

describe('calculateLinePolicy', () => {
  it('Gold customer with allowed hardware discount passes', () => {
    const limits: DiscountLimits = { tierLimitBps: 2000, categoryLimitBps: 1500 };
    const result = calculateLinePolicy(
      { lineId: 'l1', productName: 'Server', lineDiscountBps: 1000, category: 'HARDWARE' },
      limits
    );
    expect(result.violation).toBe(false);
    expect(result.excessBps).toBe(0);
  });

  it('Service line exceeding stricter category limit triggers violation even when tier allows more', () => {
    // Gold tier allows 20%, but SERVICE category only allows 10%
    const limits: DiscountLimits = { tierLimitBps: 2000, categoryLimitBps: 1000 };
    const result = calculateLinePolicy(
      { lineId: 'l1', productName: 'Consulting', lineDiscountBps: 1500, category: 'SERVICE' },
      limits
    );
    expect(result.violation).toBe(true);
    expect(result.effectiveLimitBps).toBe(1000); // min(2000, 1000)
    expect(result.excessBps).toBe(500);           // 1500 - 1000
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('applies minimum of tier and category limits', () => {
    const limits: DiscountLimits = { tierLimitBps: 1000, categoryLimitBps: 1500 };
    const result = calculateLinePolicy(
      { lineId: 'l1', productName: 'Product', lineDiscountBps: 1200, category: 'HARDWARE' },
      limits
    );
    expect(result.effectiveLimitBps).toBe(1000);
    expect(result.violation).toBe(true);
    expect(result.excessBps).toBe(200);
  });
});

// ── calculateBlendedRisk ─────────────────────────────────────

describe('calculateBlendedRisk', () => {
  it('returns NONE when no violations', () => {
    const result = calculateBlendedRisk({
      lineResults: [
        { lineId: 'l1', productName: 'P1', lineDiscountBps: 500, effectiveLimitBps: 1000, excessBps: 0, violation: false, reasons: [] },
      ],
      lineTotals: [{ lineId: 'l1', afterDiscount: 10000 }],
    });
    expect(result.riskLevel).toBe(RiskLevel.NONE);
    expect(result.blendedRiskBps).toBe(0);
  });

  it('several small line violations produce blended risk', () => {
    const result = calculateBlendedRisk({
      lineResults: [
        { lineId: 'l1', productName: 'P1', lineDiscountBps: 1200, effectiveLimitBps: 1000, excessBps: 200, violation: true, reasons: ['P1 exceeds'] },
        { lineId: 'l2', productName: 'P2', lineDiscountBps: 1300, effectiveLimitBps: 1000, excessBps: 300, violation: true, reasons: ['P2 exceeds'] },
        { lineId: 'l3', productName: 'P3', lineDiscountBps: 1100, effectiveLimitBps: 1000, excessBps: 100, violation: true, reasons: ['P3 exceeds'] },
      ],
      lineTotals: [
        { lineId: 'l1', afterDiscount: 10000 },
        { lineId: 'l2', afterDiscount: 10000 },
        { lineId: 'l3', afterDiscount: 10000 },
      ],
    });

    // Each line has 1/3 weight. Weighted excess = 200*0.33 + 300*0.33 + 100*0.33 ≈ 200
    expect(result.blendedRiskBps).toBeGreaterThan(0);
    expect(result.riskLevel).not.toBe(RiskLevel.NONE);
    expect(result.reasons.length).toBe(3);
  });

  it('single high-excess line produces HIGH risk', () => {
    const result = calculateBlendedRisk({
      lineResults: [
        { lineId: 'l1', productName: 'P1', lineDiscountBps: 5000, effectiveLimitBps: 1000, excessBps: 4000, violation: true, reasons: ['Way over'] },
      ],
      lineTotals: [{ lineId: 'l1', afterDiscount: 10000 }],
    });

    expect(result.blendedRiskBps).toBe(4000);
    expect(result.riskLevel).toBe(RiskLevel.HIGH);
  });

  it('handles zero total gracefully', () => {
    const result = calculateBlendedRisk({
      lineResults: [],
      lineTotals: [],
    });
    expect(result.riskLevel).toBe(RiskLevel.NONE);
  });
});

// ── resolveApprovalChain ─────────────────────────────────────

describe('resolveApprovalChain', () => {
  const thresholds = [
    { riskLevel: 'NONE', requiredApprovers: '[]' },
    { riskLevel: 'LOW', requiredApprovers: '["SALES_MANAGER"]' },
    { riskLevel: 'MEDIUM', requiredApprovers: '["SALES_MANAGER"]' },
    { riskLevel: 'HIGH', requiredApprovers: '["SALES_MANAGER","FINANCE"]' },
  ];

  it('NONE risk → no approval needed', () => {
    const chain = resolveApprovalChain(RiskLevel.NONE, thresholds);
    expect(chain).toEqual([]);
  });

  it('LOW risk → manager approval', () => {
    const chain = resolveApprovalChain(RiskLevel.LOW, thresholds);
    expect(chain).toEqual(['SALES_MANAGER']);
  });

  it('HIGH risk → manager then finance', () => {
    const chain = resolveApprovalChain(RiskLevel.HIGH, thresholds);
    expect(chain).toEqual(['SALES_MANAGER', 'FINANCE']);
  });

  it('handles missing threshold gracefully', () => {
    const chain = resolveApprovalChain(RiskLevel.MEDIUM, []);
    expect(chain).toEqual([]);
  });
});

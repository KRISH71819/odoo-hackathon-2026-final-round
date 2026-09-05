// ── Phase 4 Tests ──────────────────────────────────────────────
// Unit tests for invoice lifecycle, deal health logic, and report aggregation.

import { describe, it, expect } from 'vitest';

// ── Invoice state machine ─────────────────────────────────────

describe('Invoice state machine', () => {

  function createInvoiceTransition(quoteStatus: string): { allowed: boolean; newStatus: string } {
    if (quoteStatus === 'CONFIRMED') return { allowed: true, newStatus: 'BILLED' };
    return { allowed: false, newStatus: quoteStatus };
  }

  function payInvoiceTransition(
    invoiceStatus: string,
    existingPaid: number,
    paymentAmount: number,
    invoiceTotal: number,
  ): { allowed: boolean; newInvoiceStatus: string; newQuoteStatus: string | null } {
    if (invoiceStatus === 'PAID') return { allowed: true, newInvoiceStatus: 'PAID', newQuoteStatus: null }; // idempotent
    if (invoiceStatus === 'CANCELLED') return { allowed: false, newInvoiceStatus: 'CANCELLED', newQuoteStatus: null };

    const newTotal = existingPaid + paymentAmount;
    if (newTotal >= invoiceTotal) {
      return { allowed: true, newInvoiceStatus: 'PAID', newQuoteStatus: 'PAID' };
    }
    return { allowed: true, newInvoiceStatus: 'PARTIALLY_PAID', newQuoteStatus: null };
  }

  // Test 1: Invoice can only be created from CONFIRMED status
  it('creates invoice only from CONFIRMED quotation', () => {
    expect(createInvoiceTransition('CONFIRMED').allowed).toBe(true);
    expect(createInvoiceTransition('CONFIRMED').newStatus).toBe('BILLED');
    expect(createInvoiceTransition('DRAFT').allowed).toBe(false);
    expect(createInvoiceTransition('APPROVED').allowed).toBe(false);
    expect(createInvoiceTransition('PAID').allowed).toBe(false);
  });

  // Test 2: Full payment marks invoice and quotation as PAID
  it('full payment transitions to PAID', () => {
    const result = payInvoiceTransition('SENT', 0, 10000, 10000);
    expect(result.allowed).toBe(true);
    expect(result.newInvoiceStatus).toBe('PAID');
    expect(result.newQuoteStatus).toBe('PAID');
  });

  // Test 3: Partial payment transitions to PARTIALLY_PAID
  it('partial payment transitions to PARTIALLY_PAID', () => {
    const result = payInvoiceTransition('SENT', 0, 5000, 10000);
    expect(result.allowed).toBe(true);
    expect(result.newInvoiceStatus).toBe('PARTIALLY_PAID');
    expect(result.newQuoteStatus).toBe(null); // no quote transition yet
  });

  // Test 4: Payment is idempotent when already PAID
  it('payment is idempotent when already PAID', () => {
    const result = payInvoiceTransition('PAID', 10000, 5000, 10000);
    expect(result.allowed).toBe(true); // no-op, returns current state
    expect(result.newInvoiceStatus).toBe('PAID');
    expect(result.newQuoteStatus).toBe(null);
  });

  // Test 5: Cannot pay a cancelled invoice
  it('rejects payment on cancelled invoice', () => {
    const result = payInvoiceTransition('CANCELLED', 0, 10000, 10000);
    expect(result.allowed).toBe(false);
  });

  // Test 6: Multiple partial payments accumulate correctly
  it('accumulated partial payments → eventually PAID', () => {
    const r1 = payInvoiceTransition('SENT', 0, 3000, 10000);
    expect(r1.newInvoiceStatus).toBe('PARTIALLY_PAID');

    const r2 = payInvoiceTransition('PARTIALLY_PAID', 3000, 4000, 10000);
    expect(r2.newInvoiceStatus).toBe('PARTIALLY_PAID');

    const r3 = payInvoiceTransition('PARTIALLY_PAID', 7000, 3000, 10000);
    expect(r3.newInvoiceStatus).toBe('PAID');
    expect(r3.newQuoteStatus).toBe('PAID');
  });
});

// ── Deal Health detection logic ───────────────────────────────

describe('Deal Health detection', () => {

  function isStalled(status: string, daysSinceUpdate: number, threshold = 7): boolean {
    const stalledStatuses = ['DRAFT', 'PENDING_MANAGER', 'PENDING_FINANCE', 'REVISION'];
    return stalledStatuses.includes(status) && daysSinceUpdate >= threshold;
  }

  function isDiscountAnomaly(
    quoteAvgDiscountBps: number,
    repHistoricalAvgBps: number,
    multiplier = 1.5,
  ): boolean {
    return repHistoricalAvgBps > 0 && quoteAvgDiscountBps > repHistoricalAvgBps * multiplier;
  }

  function isDeliverySlippage(
    fulfillmentStatus: string,
    quoteStatus: string,
    daysSinceCreated: number,
    threshold = 3,
  ): boolean {
    return fulfillmentStatus === 'PENDING'
      && ['CONFIRMED', 'BILLED'].includes(quoteStatus)
      && daysSinceCreated >= threshold;
  }

  // Test 7: Stalled deal detection
  it('detects stalled DRAFT quotes over threshold', () => {
    expect(isStalled('DRAFT', 10)).toBe(true);
    expect(isStalled('DRAFT', 3)).toBe(false);
    expect(isStalled('PAID', 30)).toBe(false); // terminal status
    expect(isStalled('PENDING_MANAGER', 7)).toBe(true);
    expect(isStalled('PENDING_FINANCE', 8)).toBe(true);
    expect(isStalled('CONFIRMED', 100)).toBe(false); // not a stalled status
  });

  // Test 8: Discount anomaly detection
  it('flags discount anomaly when quote exceeds rep average by multiplier', () => {
    // Rep avg 500 bps, quote avg 800 bps → 800/500 = 1.6x → anomaly
    expect(isDiscountAnomaly(800, 500)).toBe(true);
    // Rep avg 500 bps, quote avg 700 bps → 700/500 = 1.4x → not anomaly
    expect(isDiscountAnomaly(700, 500)).toBe(false);
    // Rep avg 0 → no history → never anomaly
    expect(isDiscountAnomaly(800, 0)).toBe(false);
  });

  // Test 9: Delivery slippage detection
  it('detects delivery slippage on pending fulfillment for confirmed quotes', () => {
    expect(isDeliverySlippage('PENDING', 'CONFIRMED', 5)).toBe(true);
    expect(isDeliverySlippage('PENDING', 'BILLED', 4)).toBe(true);
    expect(isDeliverySlippage('PENDING', 'CONFIRMED', 1)).toBe(false); // too soon
    expect(isDeliverySlippage('ALLOCATED', 'CONFIRMED', 10)).toBe(false); // already allocated
    expect(isDeliverySlippage('PENDING', 'DRAFT', 10)).toBe(false); // not confirmed yet
  });
});

// ── Report aggregation logic ──────────────────────────────────

describe('Report aggregation', () => {

  interface MockQuote {
    status: string;
    total: number;
    orderDiscountBps: number;
    createdAt: Date;
    updatedAt: Date;
  }

  function aggregateReports(quotes: MockQuote[]) {
    const totalRevenue = quotes
      .filter(q => q.status === 'PAID' || q.status === 'BILLED')
      .reduce((s, q) => s + q.total, 0);

    const openStatuses = ['DRAFT', 'PENDING_MANAGER', 'PENDING_FINANCE', 'REVISION'];
    const openQuotes = quotes.filter(q => openStatuses.includes(q.status)).length;

    const avgDiscountBps = quotes.length > 0
      ? Math.round(quotes.reduce((s, q) => s + q.orderDiscountBps, 0) / quotes.length)
      : 0;

    const completed = quotes.filter(q => q.status === 'PAID' || q.status === 'BILLED');
    const avgCycleDays = completed.length > 0
      ? Math.round(completed.reduce((s, q) => {
          return s + (q.updatedAt.getTime() - q.createdAt.getTime()) / 86400000;
        }, 0) / completed.length)
      : 0;

    const statusCounts: Record<string, number> = {};
    for (const q of quotes) statusCounts[q.status] = (statusCounts[q.status] || 0) + 1;

    return { totalRevenue, openQuotes, avgDiscountBps, avgCycleDays, statusCounts };
  }

  // Test 10: Aggregation produces correct totals
  it('aggregates revenue, open quotes, and discount correctly', () => {
    const quotes: MockQuote[] = [
      { status: 'PAID', total: 100000, orderDiscountBps: 500, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-10') },
      { status: 'BILLED', total: 50000, orderDiscountBps: 300, createdAt: new Date('2026-01-05'), updatedAt: new Date('2026-01-15') },
      { status: 'DRAFT', total: 20000, orderDiscountBps: 0, createdAt: new Date('2026-01-08'), updatedAt: new Date('2026-01-08') },
    ];

    const result = aggregateReports(quotes);

    expect(result.totalRevenue).toBe(150000); // 100000 + 50000 (PAID + BILLED)
    expect(result.openQuotes).toBe(1); // only DRAFT
    expect(result.avgDiscountBps).toBe(267); // (500+300+0)/3 = 266.67 → 267
    expect(result.avgCycleDays).toBe(10); // (9 + 10) / 2 = 9.5 → 10
    expect(result.statusCounts).toEqual({ PAID: 1, BILLED: 1, DRAFT: 1 });
  });

  // Test 11: Empty data returns zeros
  it('handles empty quote list gracefully', () => {
    const result = aggregateReports([]);
    expect(result.totalRevenue).toBe(0);
    expect(result.openQuotes).toBe(0);
    expect(result.avgDiscountBps).toBe(0);
    expect(result.avgCycleDays).toBe(0);
    expect(result.statusCounts).toEqual({});
  });
});

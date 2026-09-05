// ── calculateQuoteTotals ─────────────────────────────────────
// Pure function. Integer cents throughout. No floating-point money math.
// ponytail: Math.floor for all divisions. Switch to banker's rounding if sub-cent matters.

export interface LineInput {
  id: string;
  unitPrice: number;     // cents
  costPrice: number;     // cents
  quantity: number;
  lineDiscountBps: number; // basis points
  taxRate: number;         // basis points
}

export interface LineCalculated {
  lineId: string;
  subtotal: number;        // cents: unitPrice * quantity
  discountAmount: number;  // cents
  afterDiscount: number;   // cents
  taxAmount: number;       // cents
  total: number;           // cents
  costTotal: number;       // cents
  margin: number;          // cents
  marginPercent: number;   // basis points
}

export interface QuoteTotalsResult {
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  totalCost: number;
  totalMargin: number;
  marginPercent: number; // basis points
  lines: LineCalculated[];
}

/**
 * Calculate line-level and order-level totals for a quotation.
 * @param lines - Array of line inputs with prices in cents and rates in bps
 * @param orderDiscountBps - Order-level discount in basis points, applied proportionally
 */
export function calculateQuoteTotals(
  lines: LineInput[],
  orderDiscountBps: number = 0,
): QuoteTotalsResult {
  const calculatedLines: LineCalculated[] = lines.map((line) => {
    const subtotal = line.unitPrice * line.quantity;

    // Line discount
    const lineDiscountAmount = Math.floor(subtotal * line.lineDiscountBps / 10000);
    let afterDiscount = subtotal - lineDiscountAmount;

    // Order-level discount applied on top
    const orderDiscountAmount = Math.floor(afterDiscount * orderDiscountBps / 10000);
    afterDiscount = afterDiscount - orderDiscountAmount;
    const totalDiscountAmount = lineDiscountAmount + orderDiscountAmount;

    // Tax on post-discount amount
    const taxAmount = Math.floor(afterDiscount * line.taxRate / 10000);
    const total = afterDiscount + taxAmount;

    // Cost and margin
    const costTotal = line.costPrice * line.quantity;
    const margin = afterDiscount - costTotal;
    const marginPercent = afterDiscount > 0 ? Math.floor(margin * 10000 / afterDiscount) : 0;

    return {
      lineId: line.id,
      subtotal,
      discountAmount: totalDiscountAmount,
      afterDiscount,
      taxAmount,
      total,
      costTotal,
      margin,
      marginPercent,
    };
  });

  const subtotal = calculatedLines.reduce((sum, l) => sum + l.subtotal, 0);
  const totalDiscount = calculatedLines.reduce((sum, l) => sum + l.discountAmount, 0);
  const totalTax = calculatedLines.reduce((sum, l) => sum + l.taxAmount, 0);
  const grandTotal = calculatedLines.reduce((sum, l) => sum + l.total, 0);
  const totalCost = calculatedLines.reduce((sum, l) => sum + l.costTotal, 0);
  const totalMargin = calculatedLines.reduce((sum, l) => sum + l.margin, 0);
  const afterDiscountTotal = calculatedLines.reduce((sum, l) => sum + l.afterDiscount, 0);
  const marginPercent = afterDiscountTotal > 0 ? Math.floor(totalMargin * 10000 / afterDiscountTotal) : 0;

  return {
    subtotal,
    totalDiscount,
    totalTax,
    grandTotal,
    totalCost,
    totalMargin,
    marginPercent,
    lines: calculatedLines,
  };
}

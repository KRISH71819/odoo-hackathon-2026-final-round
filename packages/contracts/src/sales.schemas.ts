import { z } from 'zod';

// ── Quotation ────────────────────────────────────────────────

export const CreateQuotationSchema = z.object({
  customerId: z.string().min(1),
  title: z.string().min(1).max(200).default('New Quotation'),
  orderDiscountBps: z.number().int().min(0).max(10000).default(0),
  notes: z.string().max(2000).default(''),
});

export type CreateQuotationInput = z.infer<typeof CreateQuotationSchema>;

export const UpdateQuotationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  orderDiscountBps: z.number().int().min(0).max(10000).optional(),
  notes: z.string().max(2000).optional(),
});

export type UpdateQuotationInput = z.infer<typeof UpdateQuotationSchema>;

// ── Quotation Line ───────────────────────────────────────────

export const AddQuotationLineSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  quantity: z.number().int().min(1),
  lineDiscountBps: z.number().int().min(0).max(10000).default(0),
});

export type AddQuotationLineInput = z.infer<typeof AddQuotationLineSchema>;

export const UpdateQuotationLineSchema = z.object({
  quantity: z.number().int().min(1).optional(),
  lineDiscountBps: z.number().int().min(0).max(10000).optional(),
});

export type UpdateQuotationLineInput = z.infer<typeof UpdateQuotationLineSchema>;

// ── Quotation Filter ─────────────────────────────────────────

export const QuotationFilterSchema = z.object({
  status: z.string().optional(),
  customerId: z.string().optional(),
  salesRepId: z.string().optional(),
  search: z.string().optional(),
});

export type QuotationFilter = z.infer<typeof QuotationFilterSchema>;

// ── Totals response shape ────────────────────────────────────

export interface LineTotals {
  lineId: string;
  subtotal: number;
  discountAmount: number;
  afterDiscount: number;
  taxAmount: number;
  total: number;
  costTotal: number;
  margin: number;
  marginPercent: number;
}

export interface QuoteTotals {
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  totalCost: number;
  totalMargin: number;
  marginPercent: number;
  lines: LineTotals[];
}

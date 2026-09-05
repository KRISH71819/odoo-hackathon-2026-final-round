// ── DealFlow360 – Insights / Invoice Schemas (Phase 4) ──
import { z } from 'zod';

export const CreateInvoiceSchema = z.object({
  quotationId: z.string().min(1),
});

export const RecordPaymentSchema = z.object({
  amount: z.number().int().min(1, 'Amount must be positive'),
  method: z.string().default('BANK_TRANSFER'),
  reference: z.string().default(''),
});

export const ReportFilterSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  salesRepId: z.string().optional(),
  category: z.string().optional(),
  productId: z.string().optional(),
  status: z.string().optional(),
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>;
export type ReportFilter = z.infer<typeof ReportFilterSchema>;

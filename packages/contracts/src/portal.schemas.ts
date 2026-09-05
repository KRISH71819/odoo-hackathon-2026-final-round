// ── DealFlow360 – Portal Schemas ──
import { z } from 'zod';

export const AddNegotiationCommentSchema = z.object({
  message: z.string().min(1, 'Message required').max(2000),
  isChangeRequest: z.boolean().default(false),
});

export const SubmitCounterOfferSchema = z.object({
  proposedOrderDiscountBps: z.number().int().min(0).max(10000),
  message: z.string().max(2000).optional(),
});

export const RejectQuotationSchema = z.object({
  reason: z.string().max(2000).optional(),
});

export type AddNegotiationCommentInput = z.infer<typeof AddNegotiationCommentSchema>;
export type SubmitCounterOfferInput = z.infer<typeof SubmitCounterOfferSchema>;
export type RejectQuotationInput = z.infer<typeof RejectQuotationSchema>;


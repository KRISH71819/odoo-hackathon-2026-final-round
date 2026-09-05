// ── DealFlow360 – Billing Schemas ──
import { z } from 'zod';

export const CreateSubscriptionPlanSchema = z.object({
  name: z.string().min(1),
  interval: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']),
  pricePerInterval: z.number().int().min(0),
  prorationRule: z.enum(['DAY_BASED', 'NONE']).default('DAY_BASED'),
  cancellationPolicy: z.enum(['IMMEDIATE', 'END_OF_PERIOD']).default('IMMEDIATE'),
});

export const ProrateScheduleSchema = z.object({
  changeDate: z.string().datetime({ message: 'Must be ISO 8601 datetime' }),
  newQuantity: z.number().int().min(0),
});

export const CancelSubscriptionSchema = z.object({
  reason: z.string().min(1, 'Reason required'),
});

export const CreateCreditNoteSchema = z.object({
  amount: z.number().int().min(1, 'Amount must be positive'),
  reason: z.string().min(1, 'Reason required'),
});

export type CreateSubscriptionPlanInput = z.infer<typeof CreateSubscriptionPlanSchema>;
export type ProrateScheduleInput = z.infer<typeof ProrateScheduleSchema>;
export type CancelSubscriptionInput = z.infer<typeof CancelSubscriptionSchema>;
export type CreateCreditNoteInput = z.infer<typeof CreateCreditNoteSchema>;

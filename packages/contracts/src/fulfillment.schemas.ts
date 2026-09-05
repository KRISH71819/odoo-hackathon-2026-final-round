// ── DealFlow360 – Fulfillment Schemas ──
import { z } from 'zod';

export const OverrideFulfillmentLineSchema = z.object({
  quotationLineId: z.string(),
  warehouseId: z.string(),
  allocatedQty: z.number().int().min(0),
  isBackorder: z.boolean().optional(),
});

export const OverrideFulfillmentPlanSchema = z.object({
  lines: z.array(OverrideFulfillmentLineSchema).min(1, 'At least one line required'),
});

export type OverrideFulfillmentPlanInput = z.infer<typeof OverrideFulfillmentPlanSchema>;

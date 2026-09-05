// ── DealFlow360 – Fulfillment Module (Phase 3 skeleton) ──
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { sendSuccess } from '../../shared/response.js';

export const fulfillmentRoutes = Router();

fulfillmentRoutes.use(authMiddleware);

// Placeholder - Phase 3 will implement warehouse split and backorder
fulfillmentRoutes.get('/', (_req: Request, res: Response) => {
  sendSuccess(res, { message: 'Fulfillment module - implemented in Phase 3' });
});

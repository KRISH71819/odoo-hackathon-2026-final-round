// ── DealFlow360 – Billing Module (Phase 3 skeleton) ──
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { sendSuccess } from '../../shared/response.js';

export const billingRoutes = Router();

billingRoutes.use(authMiddleware);

// Placeholder - Phase 3 will implement subscriptions and billing
billingRoutes.get('/', (_req: Request, res: Response) => {
  sendSuccess(res, { message: 'Billing module - implemented in Phase 3' });
});

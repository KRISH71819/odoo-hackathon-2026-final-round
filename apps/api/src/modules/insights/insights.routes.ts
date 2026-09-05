// ── DealFlow360 – Insights Module (Phase 4 skeleton) ──
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { sendSuccess } from '../../shared/response.js';

export const insightsRoutes = Router();

insightsRoutes.use(authMiddleware);

// Placeholder - Phase 4 will implement deal health and reporting
insightsRoutes.get('/', (_req: Request, res: Response) => {
  sendSuccess(res, { message: 'Insights module - implemented in Phase 4' });
});

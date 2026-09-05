// ── DealFlow360 – Sales Module (Phase 2 skeleton) ──
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { sendSuccess } from '../../shared/response.js';

export const salesRoutes = Router();

salesRoutes.use(authMiddleware);

// Placeholder - Phase 2 will implement quotation list/pipeline/builder
salesRoutes.get('/', (_req: Request, res: Response) => {
  sendSuccess(res, { message: 'Sales module - implemented in Phase 2' });
});

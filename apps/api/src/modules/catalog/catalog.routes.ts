// ── DealFlow360 – Catalog Module (Phase 2 skeleton) ──
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { sendSuccess } from '../../shared/response.js';

export const catalogRoutes = Router();

catalogRoutes.use(authMiddleware);

// Placeholder - Phase 2 will implement product/price list CRUD
catalogRoutes.get('/', (_req: Request, res: Response) => {
  sendSuccess(res, { message: 'Catalog module - implemented in Phase 2' });
});

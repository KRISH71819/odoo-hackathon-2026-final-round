// ── DealFlow360 – Governance Module (Phase 2 skeleton) ──
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { sendSuccess } from '../../shared/response.js';

export const governanceRoutes = Router();

governanceRoutes.use(authMiddleware);

// Placeholder - Phase 2 will implement discount risk and approvals
governanceRoutes.get('/', (_req: Request, res: Response) => {
  sendSuccess(res, { message: 'Governance module - implemented in Phase 2' });
});

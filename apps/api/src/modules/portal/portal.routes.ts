// ── DealFlow360 – Portal Module (Phase 3 skeleton) ──
import { Router, Request, Response } from 'express';
import { portalMiddleware } from '../../middleware/portal.middleware.js';
import { sendSuccess } from '../../shared/response.js';

export const portalRoutes = Router();

// Portal uses token auth, not JWT
portalRoutes.use(portalMiddleware);

// Placeholder - Phase 3 will implement customer negotiation
portalRoutes.get('/', (_req: Request, res: Response) => {
  sendSuccess(res, { message: 'Portal module - implemented in Phase 3' });
});

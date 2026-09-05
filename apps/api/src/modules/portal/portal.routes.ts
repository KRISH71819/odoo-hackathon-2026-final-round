// ── DealFlow360 – Portal Routes ───────────────────────────────
// Customer portal endpoints. All use portal token auth (X-Portal-Token),
// not internal JWT. Every endpoint is scoped to token's customerId+quotationId.

import { Router, Request, Response, NextFunction } from 'express';
import { portalMiddleware, enforcePortalScope } from '../../middleware/portal.middleware.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/rbac.middleware.js';
import {
  UserRole,
  AddNegotiationCommentSchema,
  SubmitCounterOfferSchema,
} from '@dealflow360/contracts';
import * as portalService from './portal.service.js';

export const portalRoutes = Router();

// ── Internal: Generate portal token ──────────────────────────
// Uses JWT auth (internal), not portal token. Route placed here for
// logical grouping with portal module.

portalRoutes.post(
  '/token/:quotationId',
  authMiddleware,
  requireRole(UserRole.SALES_REP, UserRole.SALES_MANAGER, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = await portalService.generatePortalToken(
        req.params.quotationId as string,
        req.user!.userId,
      );
      res.status(201).json({ data: token });
    } catch (err) { next(err); }
  },
);

// ── Customer Portal Endpoints (portal token auth) ─────────────

// All routes below use portalMiddleware + enforcePortalScope
const customerRouter = Router();
customerRouter.use(portalMiddleware);
customerRouter.use(enforcePortalScope);

// View quotation
customerRouter.get('/quotation', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { quotationId, customerId } = req.portal!;
    const quote = await portalService.getPortalQuotation(quotationId, customerId);
    res.json({ data: quote });
  } catch (err) { next(err); }
});

// View negotiation thread
customerRouter.get('/quotation/thread', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { quotationId, customerId } = req.portal!;
    const thread = await portalService.getNegotiationThread(quotationId, customerId);
    res.json({ data: thread });
  } catch (err) { next(err); }
});

// Add comment / change request
customerRouter.post('/quotation/comments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = AddNegotiationCommentSchema.parse(req.body);
    const { quotationId, customerId } = req.portal!;
    const comment = await portalService.addNegotiationComment(quotationId, customerId, input);
    res.status(201).json({ data: comment });
  } catch (err) { next(err); }
});

// Submit counter-offer
customerRouter.post('/quotation/counter-offer', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = SubmitCounterOfferSchema.parse(req.body);
    const { quotationId, customerId } = req.portal!;
    const quote = await portalService.submitCounterOffer(quotationId, customerId, input);
    res.json({ data: quote });
  } catch (err) { next(err); }
});

// Confirm quotation
customerRouter.post('/quotation/confirm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { quotationId, customerId } = req.portal!;
    const quote = await portalService.confirmQuotation(quotationId, customerId);
    res.json({ data: quote });
  } catch (err) { next(err); }
});

// Mount customer router under /customer
portalRoutes.use('/customer', customerRouter);

export default portalRoutes;

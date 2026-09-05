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
  RejectQuotationSchema,
} from '@dealflow360/contracts';
import * as portalService from './portal.service.js';
import * as salesService from '../sales/sales.service.js';
import prisma from '../../shared/prisma.js';
import { AppError } from '../../shared/errors.js';

export const portalRoutes = Router();

// ── Customer: Request Quoted Items ───────────────────────────
// Customer submits their requirement list. Reaches sales rep with name, tier, and items.
portalRoutes.post(
  '/quote-request',
  authMiddleware,
  requireRole(UserRole.CUSTOMER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { items, notes } = req.body;
      if (!items || typeof items !== 'string' || !items.trim()) {
        return res.status(400).json({ error: { message: 'Items needed is required' } });
      }
      const quotation = await portalService.createCustomerQuoteRequest(req.user!.userId, {
        items,
        notes: typeof notes === 'string' ? notes : undefined,
      });
      res.status(201).json({ data: quotation });
    } catch (err) { next(err); }
  },
);

// ── Customer or Sales Rep: Get portal token ───────────────────
portalRoutes.get(
  '/token/:quotationId',
  authMiddleware,
  requireRole(UserRole.SALES_REP, UserRole.SALES_MANAGER, UserRole.ADMIN, UserRole.CUSTOMER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quoteId = req.params.quotationId as string;
      const quote = await prisma.quotation.findUnique({ where: { id: quoteId } });
      if (!quote) throw new AppError(404, 'NOT_FOUND', 'Quotation not found');

      const isInternal = [UserRole.SALES_REP, UserRole.SALES_MANAGER, UserRole.ADMIN].includes(req.user!.role as UserRole);
      const isOwner = req.user!.role === UserRole.CUSTOMER && quote.customerId === req.user!.userId;
      if (req.user!.role === UserRole.SALES_REP) {
        await salesService.assertQuotationAccess(quoteId, req.user!.userId, req.user!.role, 'read');
      }

      if (!isInternal && !isOwner) {
        throw new AppError(403, 'FORBIDDEN', 'Access denied to this quotation');
      }

      const tokenRecord = await prisma.customerAccessToken.findFirst({
        where: { quotationId: quoteId, customerId: quote.customerId, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      });
      if (!tokenRecord) {
        throw new AppError(404, 'PORTAL_NOT_SENT', 'Customer portal access has not been issued for this quotation yet');
      }
      res.json({ data: { token: tokenRecord.token, expiresAt: tokenRecord.expiresAt } });
    } catch (err) { next(err); }
  },
);

// ── Internal: Generate portal token (Sales Rep+) ──────────────
portalRoutes.post(
  '/token/:quotationId',
  authMiddleware,
  requireRole(UserRole.SALES_REP, UserRole.SALES_MANAGER, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quoteId = req.params.quotationId as string;
      const quote = await prisma.quotation.findUnique({ where: { id: quoteId } });
      if (!quote) throw new AppError(404, 'NOT_FOUND', 'Quotation not found');

      if (req.user!.role === UserRole.SALES_REP) {
        await salesService.assertQuotationAccess(quoteId, req.user!.userId, req.user!.role, 'read');
      }

      const token = await portalService.generatePortalToken(quoteId, req.user!.userId);
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

// Reject quotation
customerRouter.post('/quotation/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = RejectQuotationSchema.parse(req.body);
    const { quotationId, customerId } = req.portal!;
    const quote = await portalService.rejectQuotation(quotationId, customerId, input.reason);
    res.json({ data: quote });
  } catch (err) { next(err); }
});


// Mount customer router under /customer
portalRoutes.use('/customer', customerRouter);

export default portalRoutes;

// ── Sales Routes ─────────────────────────────────────────────
// HTTP translation for quotation operations.

import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/rbac.middleware.js';
import {
  UserRole,
  CreateQuotationSchema,
  UpdateQuotationSchema,
  AddQuotationLineSchema,
  UpdateQuotationLineSchema,
  QuotationFilterSchema,
  PaginationQuerySchema,
} from '@dealflow360/contracts';
import * as salesService from './sales.service.js';
import * as portalService from '../portal/portal.service.js';
import { AppError } from '../../shared/errors.js';

export const salesRoutes = Router();
salesRoutes.use(authMiddleware, requireRole(UserRole.ADMIN, UserRole.SALES_REP, UserRole.SALES_MANAGER, UserRole.FINANCE_OPS, UserRole.CUSTOMER));

// ── Quotation List ───────────────────────────────────────────

salesRoutes.get('/quotations', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filter = QuotationFilterSchema.parse(req.query);
    if (req.user!.role === UserRole.CUSTOMER) {
      filter.customerId = req.user!.userId;
    }
    const pagination = PaginationQuerySchema.parse(req.query);
    const page = pagination.page ?? 1;
    const limit = (pagination as any).limit ?? pagination.pageSize ?? 20;
    const result = await salesService.getQuotations(filter, page, limit);
    res.json(result);
  } catch (err) { next(err); }
});

// ── Quotation Detail ─────────────────────────────────────────

salesRoutes.get('/quotations/:id', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quotation = await salesService.getQuotationById(req.params.id as string);
    res.json({ data: quotation });
  } catch (err) { next(err); }
});

// ── Create Quotation ─────────────────────────────────────────

salesRoutes.post(
  '/quotations',
  authMiddleware,
  requireRole(UserRole.SALES_REP, UserRole.SALES_MANAGER, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = CreateQuotationSchema.parse(req.body);
      const quotation = await salesService.createQuotation(input, req.user!.userId);
      res.status(201).json({ data: quotation });
    } catch (err) { next(err); }
  },
);

// ── Update Quotation ─────────────────────────────────────────

salesRoutes.put(
  '/quotations/:id',
  authMiddleware,
  requireRole(UserRole.SALES_REP, UserRole.SALES_MANAGER, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = UpdateQuotationSchema.parse(req.body);
      const quotation = await salesService.updateQuotation(req.params.id as string, input, req.user!.userId);
      res.json({ data: quotation });
    } catch (err) { next(err); }
  },
);

// ── Line Management ──────────────────────────────────────────

salesRoutes.post(
  '/quotations/:id/lines',
  authMiddleware,
  requireRole(UserRole.SALES_REP, UserRole.SALES_MANAGER, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = AddQuotationLineSchema.parse(req.body);
      const line = await salesService.addQuotationLine(req.params.id as string, input, req.user!.userId);
      res.status(201).json({ data: line });
    } catch (err) { next(err); }
  },
);

salesRoutes.put(
  '/quotations/:id/lines/:lineId',
  authMiddleware,
  requireRole(UserRole.SALES_REP, UserRole.SALES_MANAGER, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = UpdateQuotationLineSchema.parse(req.body);
      const quotation = await salesService.updateQuotationLine(req.params.id as string, req.params.lineId as string, input, req.user!.userId);
      res.json({ data: quotation });
    } catch (err) { next(err); }
  },
);

salesRoutes.delete(
  '/quotations/:id/lines/:lineId',
  authMiddleware,
  requireRole(UserRole.SALES_REP, UserRole.SALES_MANAGER, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await salesService.removeQuotationLine(req.params.id as string, req.params.lineId as string, req.user!.userId);
      res.status(204).send();
    } catch (err) { next(err); }
  },
);

// ── Submit for Approval ──────────────────────────────────────

salesRoutes.post(
  '/quotations/:id/submit',
  authMiddleware,
  requireRole(UserRole.SALES_REP, UserRole.SALES_MANAGER, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quotation = await salesService.submitQuote(req.params.id as string, req.user!.userId);
      res.json({ data: quotation });
    } catch (err) { next(err); }
  },
);

// ── Delete Draft ─────────────────────────────────────────────

salesRoutes.delete(
  '/quotations/:id',
  authMiddleware,
  requireRole(UserRole.SALES_REP, UserRole.SALES_MANAGER, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await salesService.deleteQuotation(req.params.id as string, req.user!.userId);
      res.status(204).send();
    } catch (err) { next(err); }
  },
);

// ── Live Risk (for display during editing) ───────────────────

salesRoutes.get(
  '/quotations/:id/risk',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const risk = await salesService.getLiveRisk(req.params.id as string);
      res.json({ data: risk });
    } catch (err) { next(err); }
  },
);

// ── Upsell Suggestions ──────────────────────────────────────

salesRoutes.get('/quotations/:id/upsell-suggestions', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const suggestions = await salesService.getUpsellSuggestions(req.params.id as string);
    res.json({ data: suggestions });
  } catch (err) { next(err); }
});

// ── Staff Negotiation Comment ────────────────────────────────
salesRoutes.post(
  '/quotations/:id/comments',
  authMiddleware,
  requireRole(UserRole.SALES_REP, UserRole.SALES_MANAGER, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { message } = req.body;
      if (!message || typeof message !== 'string' || !message.trim()) {
        throw new AppError(400, 'BAD_REQUEST', 'Message is required');
      }
      const comment = await portalService.addStaffNegotiationComment(
        req.params.id as string,
        req.user!.userId,
        message.trim(),
      );
      res.status(201).json({ data: comment });
    } catch (err) { next(err); }
  },
);

export default salesRoutes;

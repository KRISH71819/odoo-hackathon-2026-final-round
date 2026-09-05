// ── DealFlow360 – Insights Routes (Phase 4) ──────────────────
// Invoice, deal health, reporting, and dashboard endpoints.

import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/rbac.middleware.js';
import {
  UserRole,
  CreateInvoiceSchema,
  RecordPaymentSchema,
  ReportFilterSchema,
} from '@dealflow360/contracts';
import * as insightsService from './insights.service.js';

export const insightsRoutes = Router();

insightsRoutes.use(authMiddleware);
insightsRoutes.use(requireRole(UserRole.ADMIN, UserRole.SALES_REP, UserRole.SALES_MANAGER, UserRole.FINANCE_OPS, UserRole.CUSTOMER));

// ── Dashboard KPIs ────────────────────────────────────────────

insightsRoutes.get('/dashboard', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await insightsService.getDashboardKPIs();
    res.json({ data });
  } catch (err) { next(err); }
});

// ── Invoices ──────────────────────────────────────────────────

insightsRoutes.get('/invoices', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const filters = {
      status: req.query.status as string | undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
      salesRepId: req.query.salesRepId as string | undefined,
    };
    const result = await insightsService.getInvoices(filters, page, limit);
    res.json({ data: result.data, pagination: result.pagination });
  } catch (err) { next(err); }
});

insightsRoutes.get('/invoices/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await insightsService.getInvoiceById(req.params.id as string);
    res.json({ data: invoice });
  } catch (err) { next(err); }
});

insightsRoutes.post(
  '/invoices',
  requireRole(UserRole.FINANCE_OPS, UserRole.ADMIN, UserRole.SALES_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = CreateInvoiceSchema.parse(req.body);
      const invoice = await insightsService.createInvoice(input.quotationId, req.user!.userId);
      res.status(201).json({ data: invoice });
    } catch (err) { next(err); }
  },
);

insightsRoutes.post(
  '/invoices/:id/pay',
  requireRole(UserRole.FINANCE_OPS, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = RecordPaymentSchema.parse(req.body);
      const invoice = await insightsService.markInvoicePaid(req.params.id as string, input, req.user!.userId);
      res.json({ data: invoice });
    } catch (err) { next(err); }
  },
);

// ── Deal Health ───────────────────────────────────────────────

insightsRoutes.get(
  '/deal-health',
  requireRole(UserRole.SALES_MANAGER, UserRole.FINANCE_OPS, UserRole.ADMIN),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await insightsService.getDealHealthAlerts();
      res.json({ data });
    } catch (err) { next(err); }
  },
);

insightsRoutes.post(
  '/deal-health/:quotationId/nudge',
  requireRole(UserRole.SALES_MANAGER, UserRole.FINANCE_OPS, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await insightsService.nudgeAlert(req.params.quotationId as string, req.user!.userId);
      res.json({ data: result });
    } catch (err) { next(err); }
  },
);

// ── Reports ───────────────────────────────────────────────────

insightsRoutes.get('/reports', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = ReportFilterSchema.parse(req.query);
    const data = await insightsService.getReportData(filters);
    res.json({ data });
  } catch (err) { next(err); }
});

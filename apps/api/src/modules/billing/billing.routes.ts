// ── DealFlow360 – Billing Routes ─────────────────────────────
// HTTP translation only. Business logic is in billing.service.

import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/rbac.middleware.js';
import {
  UserRole,
  CreateSubscriptionPlanSchema,
  ProrateScheduleSchema,
  CancelSubscriptionSchema,
  CreateCreditNoteSchema,
} from '@dealflow360/contracts';
import * as billingService from './billing.service.js';

export const billingRoutes = Router();

billingRoutes.use(authMiddleware);

// ── Subscription Plans ────────────────────────────────────────

billingRoutes.get('/subscription-plans', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await billingService.getSubscriptionPlans();
    res.json({ data: plans });
  } catch (err) { next(err); }
});

billingRoutes.post(
  '/subscription-plans',
  requireRole(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = CreateSubscriptionPlanSchema.parse(req.body);
      const plan = await billingService.createSubscriptionPlan(input);
      res.status(201).json({ data: plan });
    } catch (err) { next(err); }
  },
);

// ── Billing Schedules ─────────────────────────────────────────

billingRoutes.get('/schedules/:quotationId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schedules = await billingService.getBillingSchedules(req.params.quotationId as string);
    res.json({ data: schedules });
  } catch (err) { next(err); }
});

billingRoutes.post(
  '/schedules/:id/prorate',
  requireRole(UserRole.FINANCE_OPS, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = ProrateScheduleSchema.parse(req.body);
      const result = await billingService.prorateSchedule(req.params.id as string, input, req.user!.userId);
      res.json({ data: result });
    } catch (err) { next(err); }
  },
);

billingRoutes.post(
  '/schedules/:id/cancel',
  requireRole(UserRole.FINANCE_OPS, UserRole.ADMIN, UserRole.SALES_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = CancelSubscriptionSchema.parse(req.body);
      const schedule = await billingService.cancelSubscription(req.params.id as string, input, req.user!.userId);
      res.json({ data: schedule });
    } catch (err) { next(err); }
  },
);

// ── Credit Notes ──────────────────────────────────────────────

billingRoutes.post(
  '/invoices/:id/credit-note',
  requireRole(UserRole.FINANCE_OPS, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = CreateCreditNoteSchema.parse(req.body);
      const note = await billingService.createCreditNote(req.params.id as string, input, req.user!.userId);
      res.status(201).json({ data: note });
    } catch (err) { next(err); }
  },
);

export default billingRoutes;

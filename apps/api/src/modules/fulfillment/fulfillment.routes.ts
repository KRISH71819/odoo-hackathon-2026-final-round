// ── DealFlow360 – Fulfillment Routes ─────────────────────────
// HTTP translation only. All business logic is in fulfillment.service.

import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/rbac.middleware.js';
import { UserRole, OverrideFulfillmentPlanSchema, PaginationQuerySchema } from '@dealflow360/contracts';
import * as fulfillmentService from './fulfillment.service.js';

export const fulfillmentRoutes = Router();

// All fulfillment endpoints require authentication
fulfillmentRoutes.use(authMiddleware);
fulfillmentRoutes.use(requireRole(UserRole.ADMIN, UserRole.SALES_REP, UserRole.SALES_MANAGER, UserRole.FINANCE_OPS));

// ── List fulfillment plans ────────────────────────────────────

fulfillmentRoutes.get('/plans', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, pageSize = 20 } = PaginationQuerySchema.parse(req.query) as any;
    const result = await fulfillmentService.getFulfillmentPlans(Number(page), Number(pageSize));
    res.json(result);
  } catch (err) { next(err); }
});

// ── Warehouses ────────────────────────────────────────────────

fulfillmentRoutes.get('/warehouses', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const warehouses = await fulfillmentService.getWarehouses();
    res.json({ data: warehouses });
  } catch (err) { next(err); }
});


fulfillmentRoutes.post('/warehouses', requireRole(UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, code, address, shippingCostWeight } = req.body ?? {};
    if (!name || !code) throw new Error('name and code are required');
    const warehouse = await fulfillmentService.createWarehouse({ name, code, address, shippingCostWeight: Number(shippingCostWeight ?? 1) });
    res.status(201).json({ data: warehouse });
  } catch (err) { next(err); }
});

fulfillmentRoutes.put('/warehouses/:id/stock', requireRole(UserRole.ADMIN, UserRole.FINANCE_OPS), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, quantity } = req.body ?? {};
    const stock = await fulfillmentService.upsertWarehouseStock(req.params.id as string, String(productId), Number(quantity));
    res.json({ data: stock });
  } catch (err) { next(err); }
});

// ── Get plan for a quotation ──────────────────────────────────

fulfillmentRoutes.get('/quotations/:quotationId/plan', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plan = await fulfillmentService.getFulfillmentPlanForQuotation(req.params.quotationId as string);
    res.json({ data: plan });
  } catch (err) { next(err); }
});

// ── Suggest plan ──────────────────────────────────────────────

fulfillmentRoutes.post(
  '/quotations/:quotationId/suggest',
  requireRole(UserRole.FINANCE_OPS, UserRole.ADMIN, UserRole.SALES_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const plan = await fulfillmentService.suggestFulfillmentPlan(
        req.params.quotationId as string,
        req.user!.userId,
      );
      res.status(201).json({ data: plan });
    } catch (err) { next(err); }
  },
);

// ── Plan detail ───────────────────────────────────────────────

fulfillmentRoutes.get('/plans/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plan = await fulfillmentService.getFulfillmentPlanById(req.params.id as string);
    res.json({ data: plan });
  } catch (err) { next(err); }
});

// ── Accept plan ───────────────────────────────────────────────

fulfillmentRoutes.post(
  '/plans/:id/accept',
  requireRole(UserRole.FINANCE_OPS, UserRole.ADMIN, UserRole.SALES_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const plan = await fulfillmentService.acceptFulfillmentPlan(
        req.params.id as string,
        req.user!.userId,
      );
      res.json({ data: plan });
    } catch (err) { next(err); }
  },
);

// ── Override plan ─────────────────────────────────────────────

fulfillmentRoutes.put(
  '/plans/:id/override',
  requireRole(UserRole.FINANCE_OPS, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = OverrideFulfillmentPlanSchema.parse(req.body);
      const plan = await fulfillmentService.overrideFulfillmentPlan(
        req.params.id as string,
        input,
        req.user!.userId,
      );
      res.json({ data: plan });
    } catch (err) { next(err); }
  },
);

// ── Create backorder ──────────────────────────────────────────

fulfillmentRoutes.post(
  '/plans/:id/backorder',
  requireRole(UserRole.FINANCE_OPS, UserRole.ADMIN, UserRole.SALES_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const plan = await fulfillmentService.createBackorder(
        req.params.id as string,
        req.user!.userId,
      );
      res.json({ data: plan });
    } catch (err) { next(err); }
  },
);

// ── Consolidate backorder ─────────────────────────────────────

fulfillmentRoutes.post(
  '/plans/:id/consolidate',
  requireRole(UserRole.FINANCE_OPS, UserRole.ADMIN, UserRole.SALES_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const plan = await fulfillmentService.consolidateBackorder(
        req.params.id as string,
        req.user!.userId,
      );
      res.json({ data: plan });
    } catch (err) { next(err); }
  },
);

export default fulfillmentRoutes;

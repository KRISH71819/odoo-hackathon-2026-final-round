// ── Catalog Routes ───────────────────────────────────────────
// HTTP translation layer for Catalog module.

import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/rbac.middleware.js';
import {
  UserRole,
  CreateProductSchema,
  UpdateProductSchema,
  ProductFilterSchema,
  PaginationQuerySchema,
  CreatePriceListSchema,
  CreatePriceListItemSchema,
} from '@dealflow360/contracts';
import * as catalogService from './catalog.service.js';

export const catalogRoutes = Router();
catalogRoutes.use(authMiddleware, requireRole(UserRole.ADMIN, UserRole.SALES_REP, UserRole.SALES_MANAGER, UserRole.FINANCE_OPS));

// ── Products ─────────────────────────────────────────────────

catalogRoutes.get('/products', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filter = ProductFilterSchema.parse(req.query);
    const pagination = PaginationQuerySchema.parse(req.query);
    const page = pagination.page ?? 1;
    const limit = (pagination as any).limit ?? pagination.pageSize ?? 20;
    const result = await catalogService.getProducts(filter, page, limit);
    res.json(result);
  } catch (err) { next(err); }
});

catalogRoutes.get('/products/:id', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await catalogService.getProductById(req.params.id as string);
    res.json({ data: product });
  } catch (err) { next(err); }
});

catalogRoutes.post('/products', authMiddleware, requireRole(UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = CreateProductSchema.parse(req.body);
    const product = await catalogService.createProduct(input);
    res.status(201).json({ data: product });
  } catch (err) { next(err); }
});

catalogRoutes.put('/products/:id', authMiddleware, requireRole(UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = UpdateProductSchema.parse(req.body);
    const product = await catalogService.updateProduct(req.params.id as string, input);
    res.json({ data: product });
  } catch (err) { next(err); }
});

// ── Price Lists ──────────────────────────────────────────────

catalogRoutes.get('/price-lists', authMiddleware, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const lists = await catalogService.getPriceLists();
    res.json({ data: lists });
  } catch (err) { next(err); }
});

catalogRoutes.post('/price-lists', authMiddleware, requireRole(UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = CreatePriceListSchema.parse(req.body);
    const list = await catalogService.createPriceList(input);
    res.status(201).json({ data: list });
  } catch (err) { next(err); }
});

catalogRoutes.post('/price-lists/:id/items', authMiddleware, requireRole(UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = CreatePriceListItemSchema.parse(req.body);
    const item = await catalogService.addPriceListItem(req.params.id as string, input);
    res.status(201).json({ data: item });
  } catch (err) { next(err); }
});

export default catalogRoutes;

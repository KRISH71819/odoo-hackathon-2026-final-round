// ── DealFlow360 – Auth Routes ──

import { Router, Request, Response, NextFunction } from 'express';
import { LoginRequestSchema, SignupRequestSchema } from '@dealflow360/contracts';
import { validateBody } from '../../middleware/validate.middleware.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/rbac.middleware.js';
import { sendSuccess, sendCreated } from '../../shared/response.js';
import * as authService from './auth.service.js';

export const authRoutes = Router();

// POST /api/auth/login
authRoutes.post(
  '/login',
  validateBody(LoginRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/signup
authRoutes.post(
  '/signup',
  validateBody(SignupRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, name } = req.body;
      // Public signup is always a Sales Rep. Privileged roles are admin-controlled/seeded.
      const result = await authService.signup(email, password, name, 'SALES_REP');
      sendCreated(res, result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/auth/me (requires auth)
authRoutes.get(
  '/me',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await authService.getMe(req.user!.userId);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/auth/customers (requires auth)
authRoutes.get(
  '/customers',
  authMiddleware,
  requireRole('ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE_OPS'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { prisma } = await import('../../shared/prisma.js');
      const customers = await prisma.user.findMany({
        where: { role: 'CUSTOMER' },
        select: { id: true, name: true, email: true, tier: true, createdAt: true },
        orderBy: { name: 'asc' },
      });
      sendSuccess(res, customers);
    } catch (err) {
      next(err);
    }
  },
);

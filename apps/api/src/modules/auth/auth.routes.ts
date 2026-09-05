// ── DealFlow360 – Auth Routes ──

import { Router, Request, Response, NextFunction } from 'express';
import { LoginRequestSchema, SignupRequestSchema, StaffSignupRequestSchema, UserRole } from '@dealflow360/contracts';
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
      // Public signup is always a CUSTOMER. Defaults to BRONZE tier.
      const result = await authService.signup(email, password, name, 'CUSTOMER', 'BRONZE');
      sendCreated(res, result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/staff-signup
// Sales Rep self-registration is allowed only with an explicit invite code.
authRoutes.post(
  '/staff-signup',
  validateBody(StaffSignupRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const configuredCode = process.env.STAFF_SIGNUP_CODE;
      if (!configuredCode || req.body.inviteCode !== configuredCode) {
        return res.status(403).json({ error: { code: 'INVALID_INVITE', message: 'Invalid or disabled staff signup code' } });
      }
      const { email, password, name } = req.body;
      const result = await authService.signup(email, password, name, UserRole.SALES_REP);
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

// Internal staff: Create user with role
authRoutes.post(
  '/users',
  authMiddleware,
  requireRole(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, name, role } = req.body;
      const result = await authService.adminCreateUser(email, password, name, role);
      sendCreated(res, result);
    } catch (err) {
      next(err);
    }
  },
);

// Internal staff: Get all users
authRoutes.get(
  '/users',
  authMiddleware,
  requireRole(UserRole.ADMIN),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await authService.getAllUsers();
      sendSuccess(res, users);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/auth/customers (requires auth)
authRoutes.get(
  '/customers',
  authMiddleware,
  requireRole(UserRole.ADMIN, UserRole.SALES_REP, UserRole.SALES_MANAGER, UserRole.FINANCE_OPS),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const customers = await authService.getCustomers();
      sendSuccess(res, customers);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/auth/customers/:id
authRoutes.get(
  '/customers/:id',
  authMiddleware,
  requireRole(UserRole.ADMIN, UserRole.SALES_REP, UserRole.SALES_MANAGER, UserRole.FINANCE_OPS),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customer = await authService.getCustomerById(req.params.id as string);
      sendSuccess(res, customer);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/auth/customers/:id/tier
authRoutes.patch(
  '/customers/:id/tier',
  authMiddleware,
  requireRole(UserRole.ADMIN, UserRole.SALES_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tier } = req.body;
      const updated = await authService.updateCustomerTier(req.params.id as string, tier);
      sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/auth/customers/:id/tier
authRoutes.put(
  '/customers/:id/tier',
  authMiddleware,
  requireRole(UserRole.ADMIN, UserRole.SALES_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tier } = req.body;
      const updated = await authService.updateCustomerTier(req.params.id as string, tier);
      sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/customers
authRoutes.post(
  '/customers',
  authMiddleware,
  requireRole(UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.SALES_REP),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customer = await authService.createCustomer(req.body);
      sendCreated(res, customer);
    } catch (err) {
      next(err);
    }
  },
);

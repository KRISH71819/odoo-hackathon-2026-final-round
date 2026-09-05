// ── Governance Routes ────────────────────────────────────────
// HTTP translation for approval operations.

import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/rbac.middleware.js';
import { UserRole, ApprovalActionInputSchema } from '@dealflow360/contracts';
import * as governanceService from './governance.service.js';
import * as salesService from '../sales/sales.service.js';

export const governanceRoutes = Router();
governanceRoutes.use(authMiddleware, requireRole(UserRole.ADMIN, UserRole.SALES_REP, UserRole.SALES_MANAGER, UserRole.FINANCE_OPS));

// ── Pending Approvals ────────────────────────────────────────

governanceRoutes.get(
  '/approvals',
  authMiddleware,
  requireRole(UserRole.SALES_MANAGER, UserRole.FINANCE_OPS, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const approvals = await governanceService.getPendingApprovals(req.user!.role);
      res.json({ data: approvals });
    } catch (err) { next(err); }
  },
);

// ── Approval Detail ──────────────────────────────────────────

governanceRoutes.get(
  '/approvals/:id',
  authMiddleware,
  requireRole(UserRole.SALES_MANAGER, UserRole.FINANCE_OPS, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const approval = await governanceService.getApprovalDetail(req.params.id as string);
      res.json({ data: approval });
    } catch (err) { next(err); }
  },
);

// ── Approval Action ──────────────────────────────────────────

governanceRoutes.post(
  '/approvals/:id/action',
  authMiddleware,
  requireRole(UserRole.SALES_MANAGER, UserRole.FINANCE_OPS, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = ApprovalActionInputSchema.parse(req.body);
      let result;

      switch (input.action) {
        case 'APPROVE':
          result = await governanceService.approveQuote(req.params.id as string, req.user!.userId, req.user!.role, input.reason);
          break;
        case 'REJECT':
          result = await governanceService.rejectQuote(req.params.id as string, req.user!.userId, req.user!.role, input.reason!);
          break;
        case 'RETURN_FOR_REVISION':
          result = await governanceService.returnQuoteForRevision(req.params.id as string, req.user!.userId, req.user!.role, input.reason!);
          break;
      }

      res.json({ data: result });
    } catch (err) { next(err); }
  },
);

// ── Audit Trail ──────────────────────────────────────────────

governanceRoutes.get('/quotations/:id/audit-trail', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role === UserRole.SALES_REP) {
      await salesService.assertQuotationAccess(req.params.id as string, req.user!.userId, req.user!.role, 'read');
    }
    const trail = await governanceService.getQuotationAuditTrail(req.params.id as string);
    res.json({ data: trail });
  } catch (err) { next(err); }
});

// ── Discount Rules ───────────────────────────────────────────

governanceRoutes.get('/discount-rules', authMiddleware, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rules = await governanceService.getDiscountRules();
    res.json({ data: rules });
  } catch (err) { next(err); }
});

governanceRoutes.put('/discount-rules/:id', authMiddleware, requireRole(UserRole.ADMIN, UserRole.SALES_MANAGER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { maxDiscountBps, description } = req.body;
    const rule = await governanceService.updateDiscountRule(req.params.id as string, maxDiscountBps, description);
    res.json({ data: rule });
  } catch (err) { next(err); }
});

governanceRoutes.put('/category-discount-rules/:id', authMiddleware, requireRole(UserRole.ADMIN, UserRole.SALES_MANAGER), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { maxDiscountBps, description } = req.body;
    const rule = await governanceService.updateCategoryDiscountRule(req.params.id as string, maxDiscountBps, description);
    res.json({ data: rule });
  } catch (err) { next(err); }
});


// ── Approval Chain Configuration ─────────────────────────────
governanceRoutes.get(
  '/approval-thresholds',
  requireRole(UserRole.ADMIN, UserRole.SALES_MANAGER),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const thresholds = await governanceService.getApprovalThresholds();
      res.json({ data: thresholds });
    } catch (err) { next(err); }
  },
);

governanceRoutes.put(
  '/approval-thresholds/:id',
  requireRole(UserRole.ADMIN, UserRole.SALES_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const threshold = await governanceService.updateApprovalThreshold(req.params.id as string, req.body ?? {});
      res.json({ data: threshold });
    } catch (err) { next(err); }
  },
);

export default governanceRoutes;

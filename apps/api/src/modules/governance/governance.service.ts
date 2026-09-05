// ── Governance Service ───────────────────────────────────────
// Approval actions with idempotency, state preconditions, and audit trail.
// All mutations are transactional.

import prisma from '../../shared/prisma.js';
import { AppError } from '../../shared/errors.js';
import { ApprovalStatus, ApprovalActionType, QuotationStatus, AuditAction } from '@dealflow360/contracts';

// ── Queries ──────────────────────────────────────────────────

export async function getPendingApprovals(userRole: string) {
  return prisma.approvalRequest.findMany({
    where: {
      status: ApprovalStatus.PENDING,
      role: userRole,
    },
    include: {
      quotation: {
        include: {
          customer: { select: { id: true, name: true } },
          salesRep: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getApprovalDetail(approvalRequestId: string) {
  const approval = await prisma.approvalRequest.findUnique({
    where: { id: approvalRequestId },
    include: {
      quotation: {
        include: {
          customer: true,
          salesRep: { select: { id: true, name: true } },
          lines: { orderBy: { sortOrder: 'asc' } },
          approvalRequests: {
            orderBy: { step: 'asc' },
            include: {
              actions: { include: { user: { select: { id: true, name: true } } } },
            },
          },
        },
      },
      actions: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!approval) throw new AppError(404, 'NOT_FOUND', 'Approval request not found');
  return approval;
}

export async function getQuotationAuditTrail(quotationId: string) {
  return prisma.auditLog.findMany({
    where: { quotationId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

// ── Approve ──────────────────────────────────────────────────

export async function approveQuote(approvalRequestId: string, userId: string, reason?: string) {
  const approval = await prisma.approvalRequest.findUnique({
    where: { id: approvalRequestId },
    include: {
      quotation: {
        include: { approvalRequests: { orderBy: { step: 'asc' } } },
      },
    },
  });

  if (!approval) throw new AppError(404, 'NOT_FOUND', 'Approval request not found');

  // Idempotency: already approved → return success silently
  if (approval.status === ApprovalStatus.APPROVED) {
    return getApprovalDetail(approvalRequestId);
  }

  if (approval.status !== ApprovalStatus.PENDING) {
    throw new AppError(409, 'INVALID_STATE', `Approval is ${approval.status}, cannot approve`);
  }

  // Check ordering: previous steps must be approved
  const prevSteps = approval.quotation.approvalRequests.filter((r) => r.step < approval.step);
  const allPrevApproved = prevSteps.every((r) => r.status === ApprovalStatus.APPROVED);
  if (!allPrevApproved) {
    throw new AppError(409, 'STEP_ORDER', 'Previous approval steps must be completed first');
  }

  await prisma.$transaction(async (tx) => {
    // Mark this approval as approved
    await tx.approvalRequest.update({
      where: { id: approvalRequestId },
      data: { status: ApprovalStatus.APPROVED, decidedAt: new Date(), reason },
    });

    // Record the action
    await tx.approvalAction.create({
      data: {
        approvalRequestId,
        userId,
        action: ApprovalActionType.APPROVE,
        reason,
      },
    });

    // Check if all steps are now approved
    const allRequests = approval.quotation.approvalRequests;
    const remainingPending = allRequests.filter(
      (r) => r.id !== approvalRequestId && r.status === ApprovalStatus.PENDING
    );

    if (remainingPending.length === 0) {
      // All approved — move quotation to APPROVED
      await tx.quotation.update({
        where: { id: approval.quotationId },
        data: {
          status: QuotationStatus.APPROVED,
          version: { increment: 1 },
        },
      });
    } else {
      // Move to next pending step's status
      const nextStep = remainingPending[0];
      const isFinance = nextStep && (nextStep.role === 'FINANCE' || nextStep.role === 'FINANCE_OPS');
      const nextStatus = isFinance
        ? QuotationStatus.PENDING_FINANCE
        : QuotationStatus.PENDING_MANAGER;

      await tx.quotation.update({
        where: { id: approval.quotationId },
        data: { status: nextStatus, version: { increment: 1 } },
      });
    }

    // Audit
    await tx.auditLog.create({
      data: {
        quotationId: approval.quotationId,
        userId,
        action: AuditAction.QUOTATION_APPROVED,
        details: JSON.stringify({ step: approval.step, role: approval.role, reason }),
      },
    });
  });

  return getApprovalDetail(approvalRequestId);
}

// ── Reject ───────────────────────────────────────────────────

export async function rejectQuote(approvalRequestId: string, userId: string, reason: string) {
  if (!reason?.trim()) {
    throw new AppError(400, 'REASON_REQUIRED', 'Reason is required for rejection');
  }

  const approval = await prisma.approvalRequest.findUnique({
    where: { id: approvalRequestId },
    include: { quotation: true },
  });

  if (!approval) throw new AppError(404, 'NOT_FOUND', 'Approval request not found');

  // Idempotency
  if (approval.status === ApprovalStatus.REJECTED) {
    return getApprovalDetail(approvalRequestId);
  }

  if (approval.status !== ApprovalStatus.PENDING) {
    throw new AppError(409, 'INVALID_STATE', `Approval is ${approval.status}, cannot reject`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.approvalRequest.update({
      where: { id: approvalRequestId },
      data: { status: ApprovalStatus.REJECTED, decidedAt: new Date(), reason },
    });

    await tx.approvalAction.create({
      data: { approvalRequestId, userId, action: ApprovalActionType.REJECT, reason },
    });

    await tx.quotation.update({
      where: { id: approval.quotationId },
      data: { status: QuotationStatus.REJECTED, version: { increment: 1 } },
    });

    await tx.auditLog.create({
      data: {
        quotationId: approval.quotationId,
        userId,
        action: AuditAction.QUOTATION_REJECTED,
        details: JSON.stringify({ step: approval.step, role: approval.role, reason }),
      },
    });
  });

  return getApprovalDetail(approvalRequestId);
}

// ── Return for Revision ──────────────────────────────────────

export async function returnQuoteForRevision(approvalRequestId: string, userId: string, reason: string) {
  if (!reason?.trim()) {
    throw new AppError(400, 'REASON_REQUIRED', 'Reason is required for returning a quotation');
  }

  const approval = await prisma.approvalRequest.findUnique({
    where: { id: approvalRequestId },
    include: { quotation: true },
  });

  if (!approval) throw new AppError(404, 'NOT_FOUND', 'Approval request not found');

  if (approval.status !== ApprovalStatus.PENDING) {
    throw new AppError(409, 'INVALID_STATE', `Approval is ${approval.status}, cannot return for revision`);
  }

  await prisma.$transaction(async (tx) => {
    // Reset all approval requests to pending
    await tx.approvalRequest.updateMany({
      where: { quotationId: approval.quotationId },
      data: { status: ApprovalStatus.PENDING, decidedAt: null, reason: '' },
    });

    await tx.approvalAction.create({
      data: { approvalRequestId, userId, action: ApprovalActionType.RETURN_FOR_REVISION, reason },
    });

    await tx.quotation.update({
      where: { id: approval.quotationId },
      data: { status: QuotationStatus.REVISION, version: { increment: 1 } },
    });

    await tx.auditLog.create({
      data: {
        quotationId: approval.quotationId,
        userId,
        action: AuditAction.QUOTATION_RETURNED,
        details: JSON.stringify({ step: approval.step, role: approval.role, reason }),
      },
    });
  });

  return getApprovalDetail(approvalRequestId);
}

// ── Discount Rules ───────────────────────────────────────────

export async function getDiscountRules() {
  const [tierRules, categoryRules] = await Promise.all([
    prisma.discountRule.findMany({ orderBy: { customerTier: 'asc' } }),
    prisma.categoryDiscountRule.findMany({ orderBy: { category: 'asc' } }),
  ]);
  return { tierRules, categoryRules };
}

export async function updateDiscountRule(id: string, maxDiscountBps: number, description?: string) {
  return prisma.discountRule.update({
    where: { id },
    data: { maxDiscountBps, ...(description !== undefined && { description }) },
  });
}

export async function updateCategoryDiscountRule(id: string, maxDiscountBps: number, description?: string) {
  return prisma.categoryDiscountRule.update({
    where: { id },
    data: { maxDiscountBps, ...(description !== undefined && { description }) },
  });
}

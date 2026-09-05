// ── Portal Service ───────────────────────────────────────────
// Restricted customer-facing operations. Every read/write is scoped
// by the portal token's (customerId, quotationId) pair.
// The counter-offer reuses the Phase 2 risk engine — no duplicate logic.

import prisma from '../../shared/prisma.js';
import { AppError } from '../../shared/errors.js';
import { QuotationStatus, AuditAction, RiskLevel } from '@dealflow360/contracts';
import type {
  AddNegotiationCommentInput,
  SubmitCounterOfferInput,
} from '@dealflow360/contracts';
import { calculateLinePolicy, type DiscountLimits } from '../governance/calculateLinePolicy.js';
import { calculateBlendedRisk } from '../governance/calculateBlendedRisk.js';
import { resolveApprovalChain } from '../governance/resolveApprovalChain.js';
import { generateBillingSchedule } from '../billing/billing.service.js';

// ── Read ─────────────────────────────────────────────────────

/**
 * Get portal-scoped quotation detail.
 * Enforces that customerId matches the token scope.
 */
export async function getPortalQuotation(quotationId: string, customerId: string) {
  const quote = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      lines: { orderBy: { sortOrder: 'asc' } },
    },
  });
  if (!quote) throw new AppError(404, 'NOT_FOUND', 'Quotation not found');
  // Enforce portal scope — token must belong to this customer
  if (quote.customerId !== customerId) {
    throw new AppError(403, 'FORBIDDEN', 'Access denied: this token does not grant access to the requested quotation');
  }
  return quote;
}

export async function getNegotiationThread(quotationId: string, customerId: string) {
  // Verify access first
  await getPortalQuotation(quotationId, customerId);

  const thread = await prisma.negotiationThread.findUnique({
    where: { quotationId },
    include: {
      comments: {
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  return thread;
}

// ── Comment ───────────────────────────────────────────────────

export async function addNegotiationComment(
  quotationId: string,
  customerId: string,
  input: AddNegotiationCommentInput,
) {
  const quote = await getPortalQuotation(quotationId, customerId);

  // Only allowed on portal-accessible statuses
  const portalAllowedStatuses: string[] = [
    QuotationStatus.SENT_TO_CUSTOMER,
    QuotationStatus.UNDER_NEGOTIATION,
    QuotationStatus.FULFILLMENT_READY,
  ];
  if (!portalAllowedStatuses.includes(quote.status)) {
    throw new AppError(409, 'INVALID_STATE', `Cannot comment in quotation status ${quote.status}`);
  }

  // Create thread if it doesn't exist
  let thread = await prisma.negotiationThread.findUnique({ where: { quotationId } });
  if (!thread) {
    thread = await prisma.negotiationThread.create({ data: { quotationId } });
  }

  // Move quote to UNDER_NEGOTIATION if it was SENT_TO_CUSTOMER
  if (quote.status === QuotationStatus.SENT_TO_CUSTOMER) {
    await prisma.quotation.update({
      where: { id: quotationId },
      data: { status: QuotationStatus.UNDER_NEGOTIATION, version: { increment: 1 } },
    });
  }

  const comment = await prisma.negotiationComment.create({
    data: {
      threadId: thread.id,
      userId: customerId,
      message: input.message,
      isChangeRequest: input.isChangeRequest,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  await prisma.auditLog.create({
    data: {
      quotationId,
      userId: customerId,
      action: AuditAction.NEGOTIATION_COMMENT_ADDED,
      details: JSON.stringify({ isChangeRequest: input.isChangeRequest }),
    },
  });

  return comment;
}

// ── Counter Offer ─────────────────────────────────────────────
// Re-runs Phase 2 risk engine with the proposed discount.
// If risky → creates a new approval cycle (re-enters approval).
// If safe → moves to CONFIRMED.

export async function submitCounterOffer(
  quotationId: string,
  customerId: string,
  input: SubmitCounterOfferInput,
) {
  const quote = await getPortalQuotation(quotationId, customerId);

  const negotiableStatuses: string[] = [
    QuotationStatus.SENT_TO_CUSTOMER,
    QuotationStatus.UNDER_NEGOTIATION,
    QuotationStatus.FULFILLMENT_READY,
  ];
  if (!negotiableStatuses.includes(quote.status)) {
    throw new AppError(409, 'INVALID_STATE', `Counter-offer not allowed in status ${quote.status}`);
  }

  // Get full quote with lines for risk calculation
  const fullQuote = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      customer: true,
      lines: true,
    },
  });
  if (!fullQuote) throw new AppError(404, 'NOT_FOUND', 'Quotation not found');

  const customerTier = (fullQuote.customer as any).tier ?? 'BRONZE';

  // Load discount rules (same as Phase 2 submitQuote)
  const tierRule = await prisma.discountRule.findFirst({ where: { customerTier } });
  const categoryRules = await prisma.categoryDiscountRule.findMany();
  const categoryRuleMap = new Map(
    categoryRules.map((r) => [r.category, r.maxDiscountBps || Math.round(r.maxDiscountPercent * 100)]),
  );
  const tierLimit = tierRule?.maxDiscountBps || (tierRule?.maxDiscountPercent ? Math.round(tierRule.maxDiscountPercent * 100) : 10000);

  // Re-evaluate lines with the new order-level discount from counter-offer
  const lineResults = fullQuote.lines.map((line) => {
    const limits: DiscountLimits = {
      tierLimitBps: tierLimit,
      categoryLimitBps: categoryRuleMap.get(line.productCategory) ?? 10000,
    };
    return calculateLinePolicy(
      { lineId: line.id, productName: line.productName, lineDiscountBps: line.discountBps, category: line.productCategory as any },
      limits,
    );
  });

  // For counter-offer, the proposed order discount also contributes to risk
  // by treating the entire order as having the proposed discount applied
  const orderDiscountExcess = Math.max(0, input.proposedOrderDiscountBps - tierLimit);
  const lineTotals = fullQuote.lines.map((l) => ({ lineId: l.id, afterDiscount: l.afterDiscount }));

  const riskResult = calculateBlendedRisk({ lineResults, lineTotals });

  // Additional risk if order-level discount exceeds tier limit
  const effectiveRiskBps = riskResult.blendedRiskBps + orderDiscountExcess;
  const effectiveRiskLevel = bpsToRiskLevel(effectiveRiskBps);

  const thresholds = await prisma.approvalThreshold.findMany();
  const requiredApprovers = resolveApprovalChain(effectiveRiskLevel, thresholds);

  // Thread and comment for the counter-offer message
  let thread = await prisma.negotiationThread.findUnique({ where: { quotationId } });
  if (!thread) {
    thread = await prisma.negotiationThread.create({ data: { quotationId } });
  }

  await prisma.$transaction(async (tx) => {
    // Update order discount on quotation
    await tx.quotation.update({
      where: { id: quotationId },
      data: {
        orderDiscountBps: input.proposedOrderDiscountBps,
        orderDiscount: input.proposedOrderDiscountBps / 100,
        version: { increment: 1 },
      },
    });

    // Add counter-offer comment if message provided
    if (input.message) {
      await tx.negotiationComment.create({
        data: {
          threadId: thread!.id,
          userId: customerId,
          message: input.message,
          isChangeRequest: true,
          proposedDiscount: input.proposedOrderDiscountBps / 100,
        },
      });
    }

    if (requiredApprovers.length > 0) {
      // Counter-offer exceeds threshold → re-enter approval
      // Delete any old pending approvals, create new ones
      await tx.approvalRequest.deleteMany({ where: { quotationId } });
      for (let i = 0; i < requiredApprovers.length; i++) {
        await tx.approvalRequest.create({
          data: {
            quotationId,
            step: i + 1,
            role: requiredApprovers[i]!,
            status: 'PENDING',
          },
        });
      }
      const newStatus = requiredApprovers[0] === 'SALES_MANAGER'
        ? QuotationStatus.PENDING_MANAGER
        : QuotationStatus.PENDING_FINANCE;
      await tx.quotation.update({
        where: { id: quotationId },
        data: { status: newStatus, version: { increment: 1 } },
      });
    } else {
      // Below threshold → proceed to UNDER_NEGOTIATION (confirmed when customer presses confirm)
      await tx.quotation.update({
        where: { id: quotationId },
        data: { status: QuotationStatus.UNDER_NEGOTIATION, version: { increment: 1 } },
      });
    }

    await tx.auditLog.create({
      data: {
        quotationId,
        userId: customerId,
        action: AuditAction.COUNTER_OFFER_SUBMITTED,
        details: JSON.stringify({
          proposedOrderDiscountBps: input.proposedOrderDiscountBps,
          effectiveRiskLevel,
          effectiveRiskBps,
          requiredApprovers,
          reEntersApproval: requiredApprovers.length > 0,
        }),
      },
    });
  });

  return getPortalQuotation(quotationId, customerId);
}

// ── Confirm Quotation ─────────────────────────────────────────
// Customer confirms the accepted terms. Idempotent.

export async function confirmQuotation(quotationId: string, customerId: string) {
  const quote = await getPortalQuotation(quotationId, customerId);

  // Idempotent: already confirmed
  if (quote.status === QuotationStatus.CONFIRMED) {
    return quote;
  }

  const confirmableStatuses: string[] = [
    QuotationStatus.SENT_TO_CUSTOMER,
    QuotationStatus.UNDER_NEGOTIATION,
    QuotationStatus.FULFILLMENT_READY,
    QuotationStatus.APPROVED,
  ];
  if (!confirmableStatuses.includes(quote.status)) {
    throw new AppError(409, 'INVALID_STATE', `Quotation in status ${quote.status} cannot be confirmed`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.quotation.update({
      where: { id: quotationId },
      data: { status: QuotationStatus.CONFIRMED, version: { increment: 1 } },
    });
    await tx.auditLog.create({
      data: {
        quotationId,
        userId: customerId,
        action: AuditAction.QUOTATION_CONFIRMED,
        details: JSON.stringify({ confirmedBy: customerId }),
      },
    });
  });

  // Generate billing schedule for recurring lines
  await generateBillingSchedule(quotationId, customerId);

  return getPortalQuotation(quotationId, customerId);
}

// ── Portal Token Management ───────────────────────────────────

/**
 * Generate a portal access token for a specific customer+quotation.
 * Called by internal users (Sales Rep+) to send to customer.
 */
export async function generatePortalToken(quotationId: string, userId: string) {
  const quote = await prisma.quotation.findUnique({ where: { id: quotationId } });
  if (!quote) throw new AppError(404, 'NOT_FOUND', 'Quotation not found');

  // Transition to SENT_TO_CUSTOMER if APPROVED or FULFILLMENT_READY
  const sendableStatuses: string[] = [
    QuotationStatus.APPROVED,
    QuotationStatus.FULFILLMENT_READY,
    QuotationStatus.SENT_TO_CUSTOMER,
  ];
  if (!sendableStatuses.includes(quote.status)) {
    throw new AppError(409, 'INVALID_STATE', `Quotation must be APPROVED or FULFILLMENT_READY to send to customer (current: ${quote.status})`);
  }

  // Invalidate old tokens for this quotation
  const existing = await prisma.customerAccessToken.findFirst({
    where: { quotationId, customerId: quote.customerId },
  });

  // 7-day expiry
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  let tokenRecord;
  if (existing) {
    // Re-use and refresh existing token
    tokenRecord = await prisma.customerAccessToken.update({
      where: { id: existing.id },
      data: { expiresAt },
    });
  } else {
    tokenRecord = await prisma.customerAccessToken.create({
      data: {
        customerId: quote.customerId,
        quotationId,
        expiresAt,
      },
    });
  }

  // Move to SENT_TO_CUSTOMER if not already there
  if (quote.status === QuotationStatus.APPROVED || quote.status === QuotationStatus.FULFILLMENT_READY) {
    await prisma.quotation.update({
      where: { id: quotationId },
      data: { status: QuotationStatus.SENT_TO_CUSTOMER, version: { increment: 1 } },
    });
  }

  await prisma.auditLog.create({
    data: {
      quotationId,
      userId,
      action: AuditAction.PORTAL_TOKEN_GENERATED,
      details: JSON.stringify({ tokenId: tokenRecord.id, expiresAt }),
    },
  });

  return { token: tokenRecord.token, expiresAt: tokenRecord.expiresAt };
}

// ── Internal Helper ──────────────────────────────────────

function bpsToRiskLevel(bps: number): RiskLevel {
  if (bps === 0) return RiskLevel.NONE;
  if (bps <= 500) return RiskLevel.LOW;
  if (bps <= 1500) return RiskLevel.MEDIUM;
  return RiskLevel.HIGH;
}

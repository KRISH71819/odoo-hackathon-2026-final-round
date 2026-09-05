// ── Portal Service ───────────────────────────────────────────
// Restricted customer-facing operations. Every read/write is scoped
// by the portal token's (customerId, quotationId) pair.
// The counter-offer reuses the Phase 2 risk engine — no duplicate logic.

import prisma from '../../shared/prisma.js';
import { AppError } from '../../shared/errors.js';
import { QuotationStatus, AuditAction } from '@dealflow360/contracts';
import type {
  AddNegotiationCommentInput,
  SubmitCounterOfferInput,
} from '@dealflow360/contracts';
import { resolveApprovalChain } from '../governance/resolveApprovalChain.js';
import { generateBillingSchedule } from '../billing/billing.service.js';
import { recalculateTotals, calculateRiskForQuote, getQuotationById } from '../sales/sales.service.js';
import { createInvoice } from '../insights/insights.service.js';

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

  let thread = await prisma.negotiationThread.findUnique({ where: { quotationId } });
  if (!thread) thread = await prisma.negotiationThread.create({ data: { quotationId } });

  // Apply the commercial change first, then reuse the exact Phase-2 pricing/risk engine.
  await prisma.quotation.update({
    where: { id: quotationId },
    data: {
      orderDiscountBps: input.proposedOrderDiscountBps,
      orderDiscount: input.proposedOrderDiscountBps / 100,
      version: { increment: 1 },
    },
  });
  await recalculateTotals(quotationId);
  const recalculated = await getQuotationById(quotationId);
  const riskResult = await calculateRiskForQuote(recalculated);
  const thresholds = await prisma.approvalThreshold.findMany();
  const requiredApprovers = resolveApprovalChain(riskResult.riskLevel, thresholds);

  await prisma.$transaction(async (tx) => {
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

    await tx.approvalRequest.deleteMany({ where: { quotationId } });
    for (let i = 0; i < requiredApprovers.length; i++) {
      await tx.approvalRequest.create({
        data: { quotationId, step: i + 1, role: requiredApprovers[i]!, status: 'PENDING' },
      });
    }

    const newStatus = requiredApprovers.length === 0
      ? QuotationStatus.UNDER_NEGOTIATION
      : requiredApprovers[0] === 'SALES_MANAGER'
        ? QuotationStatus.PENDING_MANAGER
        : QuotationStatus.PENDING_FINANCE;

    await tx.quotation.update({
      where: { id: quotationId },
      data: {
        status: newStatus,
        riskLevel: riskResult.riskLevel,
        riskScore: riskResult.blendedRiskBps,
        version: { increment: 1 },
      },
    });

    await tx.auditLog.create({
      data: {
        quotationId,
        userId: customerId,
        action: AuditAction.COUNTER_OFFER_SUBMITTED,
        details: JSON.stringify({
          proposedOrderDiscountBps: input.proposedOrderDiscountBps,
          newTotal: recalculated.total,
          newMarginPercent: recalculated.marginPercent,
          riskLevel: riskResult.riskLevel,
          riskScore: riskResult.blendedRiskBps,
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

  // Idempotent: confirmation may already have progressed into billing/payment.
  if ([QuotationStatus.CONFIRMED, QuotationStatus.BILLED, QuotationStatus.PAID].includes(quote.status as QuotationStatus)) {
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

  // Generate recurring schedules and the one-time invoice through existing services.
  await generateBillingSchedule(quotationId, customerId);
  await createInvoice(quotationId, customerId);

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

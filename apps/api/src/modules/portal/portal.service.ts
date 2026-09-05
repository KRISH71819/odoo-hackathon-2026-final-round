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
import { suggestFulfillmentPlan } from '../fulfillment/fulfillment.service.js';

// ── Read ─────────────────────────────────────────────────────

/**
 * Get portal-scoped quotation detail.
 * Enforces that customerId matches the token scope.
 */
export async function getPortalQuotation(quotationId: string, customerId: string) {
  const quote = await prisma.quotation.findUnique({
    where: { id: quotationId },
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      subtotal: true,
      taxTotal: true,
      total: true,
      orderDiscount: true,
      orderDiscountBps: true,
      totalDiscount: true,
      createdAt: true,
      updatedAt: true,
      customerId: true,
      customer: { select: { id: true, name: true, tier: true } },
      salesRep: { select: { id: true, name: true } },
      lines: {
        select: {
          id: true,
          productId: true,
          variantId: true,
          productName: true,
          productCategory: true,
          description: true,
          quantity: true,
          unitPrice: true,
          lineDiscount: true,
          discountBps: true,
          discountAmount: true,
          afterDiscount: true,
          taxRate: true,
          subtotal: true,
          taxAmount: true,
          total: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: 'asc' },
      },
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

  // Move quote to UNDER_NEGOTIATION when customer starts a conversation.
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

  if (!quote.lines || quote.lines.length === 0) {
    throw new AppError(400, 'EMPTY_QUOTE', 'Cannot submit counter-offer on a quotation with no items.');
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
  ];
  if (!confirmableStatuses.includes(quote.status)) {
    throw new AppError(409, 'INVALID_STATE', `Quotation in status ${quote.status} cannot be confirmed`);
  }

  if (!quote.lines || quote.lines.length === 0) {
    throw new AppError(400, 'EMPTY_QUOTE', 'Cannot confirm a quotation with no line items.');
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

  // Automatically generate fulfillment plan upon confirmation
  try {
    await suggestFulfillmentPlan(quotationId, customerId);
  } catch (err) {
    console.warn('Auto fulfillment plan generation after confirmation failed:', err);
  }

  return getPortalQuotation(quotationId, customerId);
}

// ── Reject Quotation ──────────────────────────────────────────
// Customer declines/rejects the quotation terms.

export async function rejectQuotation(quotationId: string, customerId: string, reason?: string) {
  const quote = await getPortalQuotation(quotationId, customerId);

  // Idempotent: already rejected
  if (quote.status === QuotationStatus.REJECTED) {
    return quote;
  }

  const rejectableStatuses: string[] = [
    QuotationStatus.SENT_TO_CUSTOMER,
    QuotationStatus.UNDER_NEGOTIATION,
    QuotationStatus.FULFILLMENT_READY,
  ];
  if (!rejectableStatuses.includes(quote.status)) {
    throw new AppError(409, 'INVALID_STATE', `Quotation in status ${quote.status} cannot be declined by the customer`);
  }

  let thread = await prisma.negotiationThread.findUnique({ where: { quotationId } });
  if (!thread) thread = await prisma.negotiationThread.create({ data: { quotationId } });

  await prisma.$transaction(async (tx) => {
    await tx.quotation.update({
      where: { id: quotationId },
      data: { status: QuotationStatus.REJECTED, version: { increment: 1 } },
    });

    const rejectionMsg = reason?.trim()
      ? `[Quotation Declined by Customer]: ${reason.trim()}`
      : '[Quotation Declined by Customer]: The customer has declined the quotation terms.';

    await tx.negotiationComment.create({
      data: {
        threadId: thread!.id,
        userId: customerId,
        message: rejectionMsg,
        isChangeRequest: false,
      },
    });

    await tx.auditLog.create({
      data: {
        quotationId,
        userId: customerId,
        action: AuditAction.QUOTATION_REJECTED,
        reason: reason?.trim() || 'Customer declined quotation terms',
        details: JSON.stringify({
          rejectedBy: customerId,
          reason: reason?.trim() || null,
          previousStatus: quote.status,
        }),
      },
    });
  });

  return getPortalQuotation(quotationId, customerId);
}


// ── Portal Token Management ───────────────────────────────────

/**
 * Generate (or re-generate) a CustomerAccessToken for a quotation.
 * Called by internal users (Sales Rep+) to send to customer.
 */
export async function generatePortalToken(quotationId: string, userId: string) {
  const quote = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: { lines: true },
  });
  if (!quote) throw new AppError(404, 'NOT_FOUND', 'Quotation not found');

  // Formal send is allowed only after governance approval / fulfillment readiness.
  const sendableStatuses: string[] = [
    QuotationStatus.APPROVED,
    QuotationStatus.FULFILLMENT_READY,
    QuotationStatus.SENT_TO_CUSTOMER,
    QuotationStatus.UNDER_NEGOTIATION,
  ];
  if (!sendableStatuses.includes(quote.status)) {
    throw new AppError(409, 'INVALID_STATE', `Quotation cannot be sent to customer in status: ${quote.status}`);
  }

  // Invalidate old tokens for this quotation
  const existing = await prisma.customerAccessToken.findFirst({
    where: { quotationId, customerId: quote.customerId },
  });

  // 14-day expiry
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);

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
  if (
    quote.status === QuotationStatus.APPROVED ||
    quote.status === QuotationStatus.FULFILLMENT_READY
  ) {
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

/**
 * Create a new quotation request from customer portal.
 * Assigns to an active sales rep and includes customer name, tier, and requirements.
 */
export async function createCustomerQuoteRequest(customerId: string, input: { items: string; notes?: string }) {
  const customer = await prisma.user.findUnique({ where: { id: customerId } });
  if (!customer || customer.role !== 'CUSTOMER') {
    throw new AppError(404, 'NOT_FOUND', 'Customer not found');
  }

  // Find assigned or available sales rep
  const salesRep = await prisma.user.findFirst({
    where: { role: 'SALES_REP', isActive: true },
    orderBy: { createdAt: 'asc' },
  }) || await prisma.user.findFirst({
    where: { role: 'ADMIN', isActive: true },
  });

  if (!salesRep) {
    throw new AppError(500, 'INTERNAL_ERROR', 'No active sales representative available');
  }

  const shortItems = input.items.trim().slice(0, 40);
  const title = `Quote Request: ${shortItems}${input.items.length > 40 ? '...' : ''}`;
  const fullNotes = `[CUSTOMER QUOTE REQUEST]\nCustomer: ${customer.name}\nTier: ${customer.tier}\nEmail: ${customer.email}\n\nRequested Items:\n${input.items.trim()}\n\nAdditional Notes:\n${(input.notes || '').trim() || 'None'}`;

  const quotation = await prisma.quotation.create({
    data: {
      number: `Q-${Date.now().toString().slice(-6)}`,
      title,
      customerId: customer.id,
      salesRepId: salesRep.id,
      notes: fullNotes,
      status: QuotationStatus.DRAFT,
    },
    include: {
      customer: { select: { id: true, name: true, email: true, tier: true } },
      salesRep: { select: { id: true, name: true, email: true } },
    },
  });

  // Create negotiation thread with the initial request message
  await prisma.negotiationThread.create({
    data: {
      quotationId: quotation.id,
      comments: {
        create: {
          userId: customer.id,
          message: `Customer Request (${customer.tier} Tier):\n\nItems Needed:\n${input.items.trim()}${input.notes ? `\n\nNotes:\n${input.notes.trim()}` : ''}`,
          isChangeRequest: true,
        },
      },
    },
  });

  // Pre-generate a customer access token so customer can view it anytime
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);
  const tokenRecord = await prisma.customerAccessToken.create({
    data: {
      customerId: customer.id,
      quotationId: quotation.id,
      expiresAt,
    },
  });

  await prisma.auditLog.create({
    data: {
      quotationId: quotation.id,
      userId: customer.id,
      action: AuditAction.QUOTATION_CREATED,
      details: JSON.stringify({
        source: 'CUSTOMER_PORTAL_REQUEST',
        customerName: customer.name,
        customerTier: customer.tier,
        items: input.items,
        notes: input.notes,
      }),
    },
  });

  return { ...quotation, portalToken: tokenRecord.token };
}

/**
 * Retrieve or generate a portal token for a customer or sales rep without changing quotation state.
 */
export async function getOrCreateCustomerToken(quotationId: string, customerId: string) {
  const existing = await prisma.customerAccessToken.findFirst({
    where: { quotationId, customerId, expiresAt: { gt: new Date() } },
  });
  if (existing) {
    return { token: existing.token, expiresAt: existing.expiresAt };
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);
  const tokenRecord = await prisma.customerAccessToken.create({
    data: {
      customerId,
      quotationId,
      expiresAt,
    },
  });
  return { token: tokenRecord.token, expiresAt: tokenRecord.expiresAt };
}

/**
 * Add a comment from staff / sales rep into the quotation's negotiation thread.
 */
export async function addStaffNegotiationComment(
  quotationId: string,
  userId: string,
  message: string,
) {
  const quote = await prisma.quotation.findUnique({ where: { id: quotationId }, select: { id: true, status: true } });
  if (!quote) throw new AppError(404, 'NOT_FOUND', 'Quotation not found');
  const commentableStatuses: string[] = [
    QuotationStatus.SENT_TO_CUSTOMER,
    QuotationStatus.UNDER_NEGOTIATION,
    QuotationStatus.PENDING_MANAGER,
    QuotationStatus.PENDING_FINANCE,
    QuotationStatus.REVISION,
    QuotationStatus.APPROVED,
    QuotationStatus.FULFILLMENT_READY,
  ];
  if (!commentableStatuses.includes(quote.status)) {
    throw new AppError(409, 'INVALID_STATE', `Staff reply not allowed in quotation status ${quote.status}`);
  }
  let thread = await prisma.negotiationThread.findUnique({ where: { quotationId } });
  if (!thread) {
    thread = await prisma.negotiationThread.create({ data: { quotationId } });
  }

  const comment = await prisma.negotiationComment.create({
    data: {
      threadId: thread.id,
      userId,
      message,
      isChangeRequest: false,
    },
    include: { user: { select: { id: true, name: true, role: true } } },
  });

  await prisma.auditLog.create({
    data: {
      quotationId,
      userId,
      action: AuditAction.NEGOTIATION_COMMENT_ADDED,
      details: JSON.stringify({ authorRole: 'STAFF', message }),
    },
  });

  return comment;
}


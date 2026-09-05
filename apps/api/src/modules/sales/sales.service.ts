// ── Sales Service ────────────────────────────────────────────
// Quotation lifecycle use cases. Server is source of truth for money.
// State transitions are named functions — no arbitrary status updates.

import prisma from '../../shared/prisma.js';
import { AppError } from '../../shared/errors.js';
import { QuotationStatus, RiskLevel, AuditAction } from '@dealflow360/contracts';
import type { CreateQuotationInput, UpdateQuotationInput, AddQuotationLineInput, UpdateQuotationLineInput, QuotationFilter } from '@dealflow360/contracts';
import { calculateQuoteTotals, type LineInput } from './calculateQuoteTotals.js';
import { resolveEffectivePrice } from '../catalog/catalog.service.js';
import { calculateLinePolicy, type DiscountLimits, type LinePolicyInput } from '../governance/calculateLinePolicy.js';
import { calculateBlendedRisk } from '../governance/calculateBlendedRisk.js';
import { resolveApprovalChain } from '../governance/resolveApprovalChain.js';

// ── Queries ──────────────────────────────────────────────────

export async function getQuotations(filter: QuotationFilter, page: number, limit: number) {
  const where: Record<string, unknown> = {};
  if (filter.status) where.status = filter.status;
  if (filter.customerId) where.customerId = filter.customerId;
  if (filter.salesRepId) where.salesRepId = filter.salesRepId;
  if (filter.search) {
    where.OR = [
      { title: { contains: filter.search } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.quotation.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, tier: true } },
        salesRep: { select: { id: true, name: true } },
        _count: { select: { lines: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.quotation.count({ where }),
  ]);

  const quotationIds = data.map((q) => q.id);
  const tokens = await prisma.customerAccessToken.findMany({
    where: { quotationId: { in: quotationIds }, expiresAt: { gt: new Date() } },
    select: { quotationId: true, token: true },
    orderBy: { createdAt: 'desc' },
  });
  const tokenMap = new Map(tokens.map((t) => [t.quotationId, t.token]));
  const enrichedData = data.map((q) => ({
    ...q,
    portalToken: tokenMap.get(q.id) || null,
  }));

  return { data: enrichedData, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getQuotationById(id: string) {
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      customer: true,
      salesRep: { select: { id: true, name: true, email: true } },
      lines: { orderBy: { sortOrder: 'asc' } },
      approvalRequests: {
        orderBy: { step: 'asc' },
        include: { actions: { include: { user: { select: { id: true, name: true } } } } },
      },
      negotiationThread: {
        include: {
          comments: {
            orderBy: { createdAt: 'asc' },
            include: {
              user: { select: { id: true, name: true, role: true, tier: true } },
            },
          },
        },
      },
    },
  });
  if (!quotation) throw new AppError(404, 'NOT_FOUND', 'Quotation not found');
  return quotation;
}

// ── Create ───────────────────────────────────────────────────

export async function createQuotation(input: CreateQuotationInput, salesRepId: string) {
  const customer = await prisma.user.findUnique({ where: { id: input.customerId } });
  if (!customer || customer.role !== 'CUSTOMER') throw new AppError(404, 'NOT_FOUND', 'Customer not found');

  const quotation = await prisma.quotation.create({
    data: {
      number: `Q-${Date.now().toString().slice(-6)}`,
      title: input.title,
      customerId: input.customerId,
      salesRepId,
      orderDiscountBps: input.orderDiscountBps,
      orderDiscount: input.orderDiscountBps / 100,
      notes: input.notes,
      status: QuotationStatus.DRAFT,
    },
  });

  // Pre-generate portal token and thread so quotation is immediately access-ready for customer in portal
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);
  await prisma.customerAccessToken.create({
    data: {
      customerId: input.customerId,
      quotationId: quotation.id,
      expiresAt,
    },
  });

  await prisma.negotiationThread.create({
    data: { quotationId: quotation.id },
  });

  await writeAudit(quotation.id, salesRepId, AuditAction.QUOTATION_CREATED, 'Quotation created');

  return quotation;
}

// ── Update (draft only) ──────────────────────────────────────

export async function updateQuotation(id: string, input: UpdateQuotationInput, userId: string) {
  const quote = await getQuotationById(id);
  assertEditable(quote.status);

  const updated = await prisma.quotation.update({
    where: { id },
    data: { ...input, version: { increment: 1 } },
  });

  // Recalculate if order discount changed
  if (input.orderDiscountBps !== undefined) {
    await recalculateTotals(id);
  }

  await writeAudit(id, userId, AuditAction.QUOTATION_UPDATED, JSON.stringify(input));

  return updated;
}

// ── Line Management ──────────────────────────────────────────

export async function addQuotationLine(quotationId: string, input: AddQuotationLineInput, userId: string) {
  const quote = await getQuotationById(quotationId);
  assertEditable(quote.status);

  // Resolve product details and effective price for customer tier
  const product = await prisma.product.findUnique({ where: { id: input.productId } });
  if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found');

  const customerTier = (quote.customer as any).tier ?? 'BRONZE';
  const effectivePrice = await resolveEffectivePrice(input.productId, customerTier);

  let extraPrice = 0;
  if (input.variantId) {
    const variant = await prisma.productVariant.findUnique({ where: { id: input.variantId } });
    if (!variant || variant.productId !== input.productId) {
      throw new AppError(400, 'INVALID_VARIANT', 'Variant does not belong to this product');
    }
    extraPrice = (variant as any).extraPrice ?? 0;
  }

  const lineCount = await prisma.quotationLine.count({ where: { quotationId } });

  const line = await prisma.quotationLine.create({
    data: {
      quotationId,
      productId: input.productId,
      variantId: input.variantId,
      productName: product.name,
      productCategory: product.category,
      quantity: input.quantity,
      unitPrice: effectivePrice.unitPrice + extraPrice,
      costPrice: effectivePrice.costPrice,
      discountBps: input.lineDiscountBps,
      lineDiscount: input.lineDiscountBps / 100,
      taxRate: effectivePrice.taxRate,
      sortOrder: lineCount,
    },
  });

  await recalculateTotals(quotationId);
  await writeAudit(quotationId, userId, AuditAction.LINE_ADDED, `Added ${product.name} x${input.quantity}`);

  return line;
}

export async function updateQuotationLine(quotationId: string, lineId: string, input: UpdateQuotationLineInput, userId: string) {
  const quote = await getQuotationById(quotationId);
  assertEditable(quote.status);

  const line = await prisma.quotationLine.findFirst({ where: { id: lineId, quotationId } });
  if (!line) throw new AppError(404, 'NOT_FOUND', 'Line not found');

  const updateData: Record<string, any> = { ...input };
  if (input.lineDiscountBps !== undefined) {
    updateData.discountBps = input.lineDiscountBps;
    updateData.lineDiscount = input.lineDiscountBps / 100;
    delete updateData.lineDiscountBps;
  }

  await prisma.quotationLine.update({
    where: { id: lineId },
    data: updateData,
  });

  await recalculateTotals(quotationId);
  await writeAudit(quotationId, userId, AuditAction.LINE_UPDATED, JSON.stringify(input));

  return getQuotationById(quotationId);
}

export async function removeQuotationLine(quotationId: string, lineId: string, userId: string) {
  const quote = await getQuotationById(quotationId);
  assertEditable(quote.status);

  const line = await prisma.quotationLine.findFirst({ where: { id: lineId, quotationId } });
  if (!line) throw new AppError(404, 'NOT_FOUND', 'Line not found');

  await prisma.quotationLine.delete({ where: { id: lineId } });

  await recalculateTotals(quotationId);
  await writeAudit(quotationId, userId, AuditAction.LINE_REMOVED, `Removed ${line.productName || 'line'}`);
}

// ── Submit for Approval ──────────────────────────────────────

export async function submitQuote(quotationId: string, userId: string) {
  const quote = await getQuotationById(quotationId);
  assertEditable(quote.status);

  if (quote.lines.length === 0) {
    throw new AppError(400, 'EMPTY_QUOTE', 'Cannot submit a quotation with no lines');
  }

  // Recalculate totals and risk fresh
  await recalculateTotals(quotationId);
  const freshQuote = await getQuotationById(quotationId);

  // Calculate risk
  const riskResult = await calculateRiskForQuote(freshQuote);

  // Resolve approval chain from DB config
  const thresholds = await prisma.approvalThreshold.findMany();
  const requiredApprovers = resolveApprovalChain(riskResult.riskLevel, thresholds);

  // All in one transaction: update status, create approval records, write audit
  await prisma.$transaction(async (tx) => {
    // Determine new status
    const newStatus = requiredApprovers.length === 0
      ? QuotationStatus.APPROVED // No approval needed — auto-approve
      : requiredApprovers[0] === 'SALES_MANAGER'
        ? QuotationStatus.PENDING_MANAGER
        : QuotationStatus.PENDING_FINANCE;

    // Update quotation status and risk
    await tx.quotation.update({
      where: { id: quotationId, version: freshQuote.version },
      data: {
        status: newStatus,
        riskLevel: riskResult.riskLevel,
        riskScore: riskResult.blendedRiskBps,
        version: { increment: 1 },
      },
    });

    // Delete any existing approval requests (in case of re-submit after revision)
    await tx.approvalRequest.deleteMany({ where: { quotationId } });

    // Create approval request records
    for (let i = 0; i < requiredApprovers.length; i++) {
      await tx.approvalRequest.create({
        data: {
          quotationId,
          step: i + 1,
          role: requiredApprovers[i]!,
          status: 'PENDING', // all start pending, only first is actionable
        },
      });
    }

    // Audit
    await tx.auditLog.create({
      data: {
        quotationId,
        userId,
        action: AuditAction.QUOTATION_SUBMITTED,
        details: JSON.stringify({
          riskLevel: riskResult.riskLevel,
          riskScore: riskResult.blendedRiskBps,
          requiredApprovers,
          reasons: riskResult.reasons,
        }),
      },
    });
  });

  return getQuotationById(quotationId);
}

// ── Upsell Suggestions ──────────────────────────────────────

export async function getUpsellSuggestions(quotationId: string) {
  const quote = await getQuotationById(quotationId);
  const productIds = quote.lines.map((l) => l.productId);

  if (productIds.length === 0) return [];

  // Find active upsell rules for products in the quote
  const rules = await prisma.upsellRule.findMany({
    where: {
      sourceProductId: { in: productIds },
      suggestedProductId: { notIn: productIds }, // don't suggest what's already in the quote
      isActive: true,
    },
    include: {
      suggestedProduct: true,
      sourceProduct: { select: { name: true } },
    },
  });

  // Filter by minimum margin threshold
  // ponytail: simple filter, skip if current margin is 0 (empty quote edge)
  const currentMarginBps = quote.marginPercent;

  return rules
    .filter((r) => currentMarginBps >= r.minMarginBps || r.isPromotion)
    .map((r) => ({
      id: r.id,
      suggestedProduct: r.suggestedProduct,
      sourceProductName: r.sourceProduct.name,
      reason: r.reason,
      isPromotion: r.isPromotion,
      estimatedMarginDelta: r.suggestedProduct.unitPrice - r.suggestedProduct.costPrice,
    }));
}

// ── Internal Helpers ─────────────────────────────────────────

export async function recalculateTotals(quotationId: string) {
  const quote = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: { lines: true },
  });
  if (!quote) return;

  const lineInputs: LineInput[] = quote.lines.map((l) => ({
    id: l.id,
    unitPrice: l.unitPrice,
    costPrice: l.costPrice,
    quantity: l.quantity,
    lineDiscountBps: l.discountBps,
    taxRate: l.taxRate,
  }));

  const totals = calculateQuoteTotals(lineInputs, quote.orderDiscountBps);

  // Update each line with calculated values
  for (const lineTotals of totals.lines) {
    await prisma.quotationLine.update({
      where: { id: lineTotals.lineId },
      data: {
        subtotal: lineTotals.subtotal,
        discountAmount: lineTotals.discountAmount,
        afterDiscount: lineTotals.afterDiscount,
        taxAmount: lineTotals.taxAmount,
        total: lineTotals.total,
        marginPercent: lineTotals.marginPercent,
      },
    });
  }

  // Update quotation-level totals
  await prisma.quotation.update({
    where: { id: quotationId },
    data: {
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      taxTotal: totals.totalTax,
      total: totals.grandTotal,
      marginPercent: totals.marginPercent,
    },
  });
}

export async function calculateRiskForQuote(quote: Awaited<ReturnType<typeof getQuotationById>>) {
  const customer = quote.customer;
  const customerTier = (customer as any).tier ?? 'BRONZE';

  // Load discount rules
  const tierRule = await prisma.discountRule.findFirst({ where: { customerTier } });
  const categoryRules = await prisma.categoryDiscountRule.findMany();

  const categoryRuleMap = new Map(
    categoryRules.map((r) => [r.category, r.maxDiscountBps || Math.round(r.maxDiscountPercent * 100)]),
  );

  const tierLimit = tierRule?.maxDiscountBps || (tierRule?.maxDiscountPercent ? Math.round(tierRule.maxDiscountPercent * 100) : 10000);

  const lineResults = quote.lines.map((line) => {
    const limits: DiscountLimits = {
      tierLimitBps: tierLimit,
      categoryLimitBps: categoryRuleMap.get(line.productCategory) ?? 10000,
    };

    const policyInput: LinePolicyInput = {
      lineId: line.id,
      productName: line.productName,
      lineDiscountBps: line.discountBps,
      category: line.productCategory as any,
    };

    return calculateLinePolicy(policyInput, limits);
  });

  const lineTotals = quote.lines.map((l) => ({ lineId: l.id, afterDiscount: l.afterDiscount }));
  const risk = calculateBlendedRisk({ lineResults, lineTotals });

  // Order-level discount is governed by the customer-tier ceiling as well.
  // This keeps submit and customer counter-offer on the same deterministic engine.
  const orderDiscountExcessBps = Math.max(0, quote.orderDiscountBps - tierLimit);
  const blendedRiskBps = risk.blendedRiskBps + orderDiscountExcessBps;
  const riskLevel = blendedRiskBps === 0
    ? RiskLevel.NONE
    : blendedRiskBps <= 500
      ? RiskLevel.LOW
      : blendedRiskBps <= 1500
        ? RiskLevel.MEDIUM
        : RiskLevel.HIGH;

  return {
    ...risk,
    blendedRiskBps,
    riskLevel,
    reasons: [
      ...risk.reasons,
      ...(orderDiscountExcessBps > 0 ? [`Order discount exceeds customer-tier limit by ${orderDiscountExcessBps} bps`] : []),
    ],
    lineResults,
  };
}

function assertEditable(status: string) {
  if (status !== QuotationStatus.DRAFT && status !== QuotationStatus.REVISION) {
    throw new AppError(409, 'NOT_EDITABLE', `Quotation in status ${status} cannot be edited. Return for revision first.`);
  }
}

async function writeAudit(quotationId: string, userId: string, action: string, details: string) {
  await prisma.auditLog.create({
    data: { quotationId, userId, action, details },
  });
}

// ── Delete Draft ──────────────────────────────────────────────

export async function deleteQuotation(quotationId: string, userId: string) {
  const quote = await getQuotationById(quotationId);

  if (quote.status !== QuotationStatus.DRAFT) {
    throw new AppError(409, 'NOT_DELETABLE', `Only DRAFT quotations can be deleted. This quotation is ${quote.status}.`);
  }

  await writeAudit(quotationId, userId, 'QUOTATION_DELETED', `Quotation ${quote.number} deleted by user`);

  // Delete in dependency order
  await prisma.auditLog.deleteMany({ where: { quotationId } });
  await prisma.quotationLine.deleteMany({ where: { quotationId } });
  await prisma.quotation.delete({ where: { id: quotationId } });
}

// ── Live Risk Calculation (no persist) ───────────────────────

export async function getLiveRisk(quotationId: string) {
  const quote = await getQuotationById(quotationId);
  const riskResult = await calculateRiskForQuote(quote);
  return {
    riskLevel: riskResult.riskLevel,
    riskScore: riskResult.blendedRiskBps,
    reasons: riskResult.reasons,
    lineResults: riskResult.lineResults,
  };
}

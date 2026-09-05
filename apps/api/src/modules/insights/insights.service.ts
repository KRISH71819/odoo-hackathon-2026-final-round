// ── Insights Service (Phase 4) ───────────────────────────────
// Invoice lifecycle, deal health alerts, and reporting aggregations.
// Read models aggregate but never mutate core entities.

import prisma from '../../shared/prisma.js';
import { AppError } from '../../shared/errors.js';
import {
  QuotationStatus,
  InvoiceStatus,
  AuditAction,
} from '@dealflow360/contracts';
import type { RecordPaymentInput, ReportFilter } from '@dealflow360/contracts';

// ── Invoice ─────────────────────────────────────────────────

/**
 * Create an invoice for a CONFIRMED quotation. Idempotent: returns existing
 * invoice if one already exists for this quotation.
 */
export async function createInvoice(quotationId: string, userId: string) {
  const quote = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: { invoices: true },
  });
  if (!quote) throw new AppError(404, 'NOT_FOUND', 'Quotation not found');

  // Idempotent — return existing invoice
  if (quote.invoices.length > 0) return quote.invoices[0];

  if (quote.status !== QuotationStatus.CONFIRMED) {
    throw new AppError(409, 'INVALID_STATE', `Quotation must be CONFIRMED to create invoice (current: ${quote.status})`);
  }

  // 30-day due date
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        quotationId,
        number: `INV-${Date.now().toString().slice(-6)}`,
        subtotal: quote.subtotal,
        taxTotal: quote.taxTotal,
        total: quote.total,
        status: InvoiceStatus.SENT,
        dueDate,
      },
    });

    await tx.quotation.update({
      where: { id: quotationId },
      data: { status: QuotationStatus.BILLED, version: { increment: 1 } },
    });

    await tx.auditLog.create({
      data: {
        quotationId,
        userId,
        action: AuditAction.INVOICE_CREATED,
        details: JSON.stringify({ invoiceId: inv.id, total: inv.total }),
      },
    });

    return inv;
  });

  return invoice;
}

export async function getInvoices(
  filters: { status?: string; dateFrom?: string; dateTo?: string; salesRepId?: string },
  page: number,
  limit: number,
) {
  const where: Record<string, unknown> = {};
  if (filters.status) where.status = filters.status;
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {
      ...(filters.dateFrom && { gte: new Date(filters.dateFrom) }),
      ...(filters.dateTo && { lte: new Date(filters.dateTo) }),
    };
  }
  if (filters.salesRepId) {
    where.quotation = { salesRepId: filters.salesRepId };
  }

  const [data, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        quotation: {
          select: {
            id: true, number: true, title: true,
            customer: { select: { id: true, name: true } },
            salesRep: { select: { id: true, name: true } },
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.invoice.count({ where }),
  ]);

  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getInvoiceById(id: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      quotation: {
        include: {
          customer: { select: { id: true, name: true, email: true } },
          salesRep: { select: { id: true, name: true } },
          lines: { orderBy: { sortOrder: 'asc' } },
        },
      },
      payments: { orderBy: { paidAt: 'desc' } },
      creditNotes: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Invoice not found');
  return invoice;
}

/**
 * Record a payment against an invoice. Idempotent via state check:
 * if already PAID, returns the invoice without creating a duplicate payment.
 */
export async function markInvoicePaid(invoiceId: string, input: RecordPaymentInput, userId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true, quotation: true },
  });
  if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Invoice not found');

  // Idempotent
  if (invoice.status === InvoiceStatus.PAID) {
    return getInvoiceById(invoiceId);
  }

  if (invoice.status === InvoiceStatus.CANCELLED) {
    throw new AppError(409, 'INVALID_STATE', 'Cannot pay a cancelled invoice');
  }

  const existingPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  const newTotal = existingPaid + input.amount;

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        invoiceId,
        amount: input.amount,
        method: input.method,
        reference: input.reference,
      },
    });

    const newStatus = newTotal >= invoice.total
      ? InvoiceStatus.PAID
      : InvoiceStatus.PARTIALLY_PAID;

    await tx.invoice.update({
      where: { id: invoiceId },
      data: { status: newStatus, ...(newStatus === InvoiceStatus.PAID && { paidAt: new Date() }) },
    });

    // If fully paid, update quotation status
    if (newStatus === InvoiceStatus.PAID) {
      await tx.quotation.update({
        where: { id: invoice.quotationId },
        data: { status: QuotationStatus.PAID, version: { increment: 1 } },
      });
    }

    await tx.auditLog.create({
      data: {
        quotationId: invoice.quotationId,
        userId,
        action: AuditAction.INVOICE_PAID,
        details: JSON.stringify({
          invoiceId, amount: input.amount, method: input.method,
          totalPaid: newTotal, invoiceTotal: invoice.total, newStatus,
        }),
      },
    });
  });

  return getInvoiceById(invoiceId);
}

// ── Deal Health ─────────────────────────────────────────────

// ponytail: configurable threshold could move to a DB table; hardcoded default is fine for hackathon
const STALLED_DAYS = 7;
const DELIVERY_SLIPPAGE_DAYS = 3;
const ANOMALY_MULTIPLIER = 1.5;

export async function getDealHealthAlerts() {
  const now = new Date();

  // 1. Stalled deals: DRAFT or PENDING_* with no update in STALLED_DAYS
  const stalledCutoff = new Date(now.getTime() - STALLED_DAYS * 86400000);
  const stalledDeals = await prisma.quotation.findMany({
    where: {
      status: {
        in: [
          QuotationStatus.DRAFT,
          QuotationStatus.PENDING_MANAGER,
          QuotationStatus.PENDING_FINANCE,
          QuotationStatus.REVISION,
        ],
      },
      updatedAt: { lt: stalledCutoff },
    },
    include: {
      customer: { select: { id: true, name: true } },
      salesRep: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: 'asc' },
    take: 50,
  });

  // 2. Discount anomalies: compare each active quote's avg discount vs rep's historical avg
  const allQuotes = await prisma.quotation.findMany({
    where: { status: { notIn: [QuotationStatus.REJECTED] } },
    select: { id: true, salesRepId: true, marginPercent: true, total: true, orderDiscountBps: true, status: true, number: true, title: true,
      salesRep: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true } },
      lines: { select: { discountBps: true, afterDiscount: true } },
    },
  });

  // Compute per-rep historical avg discount
  const repDiscounts = new Map<string, number[]>();
  for (const q of allQuotes) {
    if (q.lines.length === 0) continue;
    const avgBps = q.lines.reduce((s, l) => s + l.discountBps, 0) / q.lines.length;
    const arr = repDiscounts.get(q.salesRepId) ?? [];
    arr.push(avgBps);
    repDiscounts.set(q.salesRepId, arr);
  }

  const discountAnomalies: Array<{
    quotation: typeof allQuotes[0];
    repAvgDiscountBps: number;
    quoteAvgDiscountBps: number;
    severity: string;
  }> = [];

  for (const q of allQuotes) {
    if (q.lines.length === 0) continue;
    const quoteAvg = q.lines.reduce((s, l) => s + l.discountBps, 0) / q.lines.length;
    const repHistory = repDiscounts.get(q.salesRepId) ?? [];
    if (repHistory.length < 2) continue; // need history to compare
    const repAvg = repHistory.reduce((a, b) => a + b, 0) / repHistory.length;
    if (repAvg > 0 && quoteAvg > repAvg * ANOMALY_MULTIPLIER) {
      discountAnomalies.push({
        quotation: q,
        repAvgDiscountBps: Math.round(repAvg),
        quoteAvgDiscountBps: Math.round(quoteAvg),
        severity: quoteAvg > repAvg * 2 ? 'CRITICAL' : 'WARNING',
      });
    }
  }

  // 3. Delivery slippage: confirmed quotes with PENDING fulfillment plans older than threshold
  const slippageCutoff = new Date(now.getTime() - DELIVERY_SLIPPAGE_DAYS * 86400000);
  const slippedPlans = await prisma.fulfillmentPlan.findMany({
    where: {
      status: 'PENDING',
      createdAt: { lt: slippageCutoff },
      quotation: { status: { in: [QuotationStatus.CONFIRMED, QuotationStatus.BILLED] } },
    },
    include: {
      quotation: {
        select: { id: true, number: true, title: true,
          customer: { select: { id: true, name: true } },
          salesRep: { select: { id: true, name: true } },
        },
      },
    },
    take: 50,
  });

  return { stalledDeals, discountAnomalies, deliverySlippage: slippedPlans };
}

export async function nudgeAlert(quotationId: string, userId: string) {
  const quote = await prisma.quotation.findUnique({ where: { id: quotationId } });
  if (!quote) throw new AppError(404, 'NOT_FOUND', 'Quotation not found');

  await prisma.auditLog.create({
    data: {
      quotationId,
      userId,
      action: AuditAction.DEAL_HEALTH_NUDGE,
      details: JSON.stringify({ nudgedBy: userId, at: new Date().toISOString() }),
    },
  });

  return { success: true, quotationId };
}

// ── Reports ─────────────────────────────────────────────────

export async function getReportData(filters: ReportFilter) {
  const dateFilter: Record<string, unknown> = {};
  if (filters.dateFrom || filters.dateTo) {
    dateFilter.createdAt = {
      ...(filters.dateFrom && { gte: new Date(filters.dateFrom) }),
      ...(filters.dateTo && { lte: new Date(filters.dateTo) }),
    };
  }

  const quoteWhere: Record<string, unknown> = { ...dateFilter };
  if (filters.salesRepId) quoteWhere.salesRepId = filters.salesRepId;
  if (filters.status) quoteWhere.status = filters.status;

  // Totals
  const quotations = await prisma.quotation.findMany({
    where: quoteWhere,
    select: {
      id: true, status: true, total: true, marginPercent: true,
      orderDiscountBps: true, createdAt: true, updatedAt: true,
      salesRepId: true,
      salesRep: { select: { id: true, name: true } },
      lines: { select: { productCategory: true, total: true, discountBps: true } },
    },
  });

  const totalRevenue = quotations
    .filter(q => q.status === QuotationStatus.PAID || q.status === QuotationStatus.BILLED)
    .reduce((s, q) => s + q.total, 0);

  const openStatuses = [QuotationStatus.DRAFT, QuotationStatus.PENDING_MANAGER, QuotationStatus.PENDING_FINANCE, QuotationStatus.REVISION];
  const openQuotes = quotations.filter(q => openStatuses.includes(q.status as QuotationStatus)).length;

  const avgDiscount = quotations.length > 0
    ? Math.round(quotations.reduce((s, q) => s + q.orderDiscountBps, 0) / quotations.length)
    : 0;

  // Avg cycle time (days from created to PAID/BILLED)
  const completedQuotes = quotations.filter(q =>
    q.status === QuotationStatus.PAID || q.status === QuotationStatus.BILLED,
  );
  const avgCycleDays = completedQuotes.length > 0
    ? Math.round(completedQuotes.reduce((s, q) => {
        return s + (q.updatedAt.getTime() - q.createdAt.getTime()) / 86400000;
      }, 0) / completedQuotes.length)
    : 0;

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  for (const q of quotations) {
    statusCounts[q.status] = (statusCounts[q.status] || 0) + 1;
  }

  // Category breakdown
  const categoryCounts: Record<string, number> = {};
  for (const q of quotations) {
    for (const l of q.lines) {
      if (!filters.category || l.productCategory === filters.category) {
        categoryCounts[l.productCategory] = (categoryCounts[l.productCategory] || 0) + l.total;
      }
    }
  }

  // Top reps
  const repTotals = new Map<string, { name: string; total: number; count: number }>();
  for (const q of quotations) {
    const entry = repTotals.get(q.salesRepId) ?? { name: q.salesRep.name, total: 0, count: 0 };
    entry.total += q.total;
    entry.count++;
    repTotals.set(q.salesRepId, entry);
  }
  const topReps = [...repTotals.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return {
    totalRevenue,
    openQuotes,
    totalQuotes: quotations.length,
    avgDiscountBps: avgDiscount,
    avgCycleDays,
    statusCounts,
    categoryCounts,
    topReps,
  };
}

// ── Dashboard KPIs ──────────────────────────────────────────

export async function getDashboardKPIs() {
  const [pendingApprovals, openQuotes, atRiskDeals, recentActivity] = await Promise.all([
    prisma.approvalRequest.count({ where: { status: 'PENDING' } }),
    prisma.quotation.count({
      where: {
        status: {
          in: [QuotationStatus.DRAFT, QuotationStatus.PENDING_MANAGER, QuotationStatus.PENDING_FINANCE, QuotationStatus.REVISION],
        },
      },
    }),
    prisma.quotation.count({
      where: { riskLevel: { in: ['MEDIUM', 'HIGH'] }, status: { notIn: [QuotationStatus.PAID, QuotationStatus.REJECTED] } },
    }),
    prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true } },
        quotation: { select: { id: true, number: true } },
      },
    }),
  ]);

  return { pendingApprovals, openQuotes, atRiskDeals, recentActivity };
}

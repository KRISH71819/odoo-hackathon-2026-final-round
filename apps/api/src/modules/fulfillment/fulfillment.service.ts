// ── Fulfillment Service ──────────────────────────────────────
// Takes approved quotations through warehouse allocation and backorders.
// All stock mutations are transactional with re-read stock inside tx.

import prisma from '../../shared/prisma.js';
import { AppError } from '../../shared/errors.js';
import { FulfillmentStatus, QuotationStatus, AuditAction } from '@dealflow360/contracts';
import type { OverrideFulfillmentPlanInput } from '@dealflow360/contracts';
import {
  chooseFulfillmentSplit,
  type LineInput,
  type StockRecord,
} from './chooseFulfillmentSplit.js';

// ── Queries ──────────────────────────────────────────────────

export async function getFulfillmentPlans(page: number, limit: number) {
  const [data, total] = await Promise.all([
    prisma.fulfillmentPlan.findMany({
      include: {
        quotation: {
          select: { id: true, number: true, status: true, customer: { select: { name: true } } },
        },
        lines: { include: { warehouse: { select: { name: true, code: true } }, quotationLine: { select: { productName: true, quantity: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.fulfillmentPlan.count(),
  ]);
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getFulfillmentPlanById(id: string) {
  const plan = await prisma.fulfillmentPlan.findUnique({
    where: { id },
    include: {
      quotation: {
        include: {
          lines: { orderBy: { sortOrder: 'asc' } },
          customer: { select: { id: true, name: true } },
        },
      },
      lines: {
        include: {
          warehouse: true,
          quotationLine: true,
        },
      },
    },
  });
  if (!plan) throw new AppError(404, 'NOT_FOUND', 'Fulfillment plan not found');
  return plan;
}

export async function getFulfillmentPlanForQuotation(quotationId: string) {
  return prisma.fulfillmentPlan.findFirst({
    where: { quotationId },
    include: {
      lines: {
        include: {
          warehouse: true,
          quotationLine: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ── Suggest Fulfillment Plan ──────────────────────────────────
// Reads live stock and runs the pure split algorithm, then persists.

export async function suggestFulfillmentPlan(quotationId: string, userId: string) {
  const quote = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: { lines: true },
  });
  if (!quote) throw new AppError(404, 'NOT_FOUND', 'Quotation not found');
  if (quote.status !== QuotationStatus.APPROVED && quote.status !== QuotationStatus.FULFILLMENT_READY) {
    throw new AppError(409, 'INVALID_STATE', `Quotation must be APPROVED to create a fulfillment plan (current: ${quote.status})`);
  }

  const warehouses = await prisma.warehouse.findMany({
    where: { isActive: true },
    include: { stocks: true },
  });

  // Build line inputs for the split algorithm
  const lineInputs: LineInput[] = quote.lines.map((line) => {
    const stockByWarehouse: StockRecord[] = warehouses.flatMap((wh) => {
      const stock = wh.stocks.find((s) => s.productId === line.productId);
      if (!stock) return [];
      return [{
        warehouseId: wh.id,
        warehouseName: wh.name,
        shippingCostWeight: wh.shippingCostWeight,
        availableQty: Math.max(0, stock.quantity - stock.reservedQuantity),
      }];
    });
    return {
      quotationLineId: line.id,
      productId: line.productId,
      quantity: line.quantity,
      stockByWarehouse,
    };
  });

  const allocationResults = chooseFulfillmentSplit(lineInputs);

  // Delete any existing suggestion plan (re-suggest is allowed)
  await prisma.fulfillmentPlan.deleteMany({ where: { quotationId, status: FulfillmentStatus.PENDING } });

  // Persist the new plan inside a transaction
  const plan = await prisma.$transaction(async (tx) => {
    const newPlan = await tx.fulfillmentPlan.create({
      data: {
        quotationId,
        status: FulfillmentStatus.PENDING,
      },
    });

    for (const alloc of allocationResults) {
      await tx.fulfillmentLine.create({
        data: {
          fulfillmentPlanId: newPlan.id,
          quotationLineId: alloc.quotationLineId,
          warehouseId: alloc.warehouseId,
          allocatedQty: alloc.allocatedQty,
          isBackorder: alloc.isBackorder,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        quotationId,
        userId,
        action: AuditAction.FULFILLMENT_SUGGESTED,
        details: JSON.stringify({ planId: newPlan.id, lineCount: allocationResults.length }),
      },
    });

    return newPlan;
  });

  return getFulfillmentPlanById(plan.id);
}

// ── Accept Fulfillment Plan ───────────────────────────────────
// Reserves stock atomically. Transitions quote to FULFILLMENT_READY.

export async function acceptFulfillmentPlan(planId: string, userId: string) {
  const plan = await getFulfillmentPlanById(planId);
  if (plan.status === FulfillmentStatus.ALLOCATED || plan.status === FulfillmentStatus.PARTIALLY_ALLOCATED) {
    // Idempotent: already accepted
    return plan;
  }
  if (plan.status !== FulfillmentStatus.PENDING) {
    throw new AppError(409, 'INVALID_STATE', `Plan is ${plan.status}, cannot accept`);
  }

  await prisma.$transaction(async (tx) => {
    // Re-read stock inside transaction to prevent overselling
    const nonBackorderLines = plan.lines.filter((l) => !l.isBackorder);
    for (const line of nonBackorderLines) {
      const stock = await tx.stock.findFirst({
        where: { warehouseId: line.warehouseId, productId: line.quotationLine.productId ?? (line.quotationLine as any).productId },
      });
      // Get product id from quotation line
      const quotationLine = await tx.quotationLine.findUnique({ where: { id: line.quotationLineId } });
      if (!quotationLine) throw new AppError(404, 'NOT_FOUND', `Quotation line ${line.quotationLineId} not found`);

      const stockRecord = await tx.stock.findFirst({
        where: { warehouseId: line.warehouseId, productId: quotationLine.productId },
      });
      if (!stockRecord) {
        throw new AppError(409, 'INSUFFICIENT_STOCK', `No stock record for warehouse ${line.warehouseId}`);
      }
      const available = stockRecord.quantity - stockRecord.reservedQuantity;
      if (available < line.allocatedQty) {
        throw new AppError(409, 'INSUFFICIENT_STOCK', `Insufficient stock in warehouse for ${quotationLine.productName}: need ${line.allocatedQty}, available ${available}`);
      }
      // Reserve stock
      await tx.stock.update({
        where: { id: stockRecord.id },
        data: { reservedQuantity: { increment: line.allocatedQty } },
      });
    }

    const hasBackorder = plan.lines.some((l) => l.isBackorder);
    const newPlanStatus = hasBackorder ? FulfillmentStatus.PARTIALLY_ALLOCATED : FulfillmentStatus.ALLOCATED;

    await tx.fulfillmentPlan.update({
      where: { id: planId },
      data: { status: newPlanStatus },
    });

    await tx.quotation.update({
      where: { id: plan.quotationId },
      data: { status: QuotationStatus.FULFILLMENT_READY, version: { increment: 1 } },
    });

    await tx.auditLog.create({
      data: {
        quotationId: plan.quotationId,
        userId,
        action: AuditAction.FULFILLMENT_ACCEPTED,
        details: JSON.stringify({ planId, hasBackorder, newPlanStatus }),
      },
    });
  });

  return getFulfillmentPlanById(planId);
}

// ── Override Fulfillment Plan ─────────────────────────────────
// Manual override: validates stock, writes audit. Replaces existing lines.

export async function overrideFulfillmentPlan(
  planId: string,
  input: OverrideFulfillmentPlanInput,
  userId: string,
) {
  const plan = await getFulfillmentPlanById(planId);
  if (plan.status !== FulfillmentStatus.PENDING) {
    throw new AppError(409, 'INVALID_STATE', `Plan is ${plan.status}, cannot override. Only PENDING plans can be overridden.`);
  }

  // Validate all quotation lines belong to the plan's quotation
  const quoteLineIds = plan.quotation.lines.map((l) => l.id);
  for (const overrideLine of input.lines) {
    if (!quoteLineIds.includes(overrideLine.quotationLineId)) {
      throw new AppError(400, 'INVALID_INPUT', `QuotationLine ${overrideLine.quotationLineId} does not belong to this quotation`);
    }
  }

  // Validate stock availability for non-backorder allocations
  for (const overrideLine of input.lines) {
    if (overrideLine.isBackorder) continue;
    const qLine = plan.quotation.lines.find((l) => l.id === overrideLine.quotationLineId);
    if (!qLine) continue;
    const stock = await prisma.stock.findFirst({
      where: { warehouseId: overrideLine.warehouseId, productId: qLine.productId },
    });
    const available = stock ? stock.quantity - stock.reservedQuantity : 0;
    if (available < overrideLine.allocatedQty) {
      throw new AppError(409, 'INSUFFICIENT_STOCK', `Insufficient stock in warehouse for line ${overrideLine.quotationLineId}`);
    }
  }

  await prisma.$transaction(async (tx) => {
    // Delete old lines, insert new ones
    await tx.fulfillmentLine.deleteMany({ where: { fulfillmentPlanId: planId } });
    for (const line of input.lines) {
      await tx.fulfillmentLine.create({
        data: {
          fulfillmentPlanId: planId,
          quotationLineId: line.quotationLineId,
          warehouseId: line.warehouseId,
          allocatedQty: line.allocatedQty,
          isBackorder: line.isBackorder ?? false,
        },
      });
    }
    await tx.auditLog.create({
      data: {
        quotationId: plan.quotationId,
        userId,
        action: AuditAction.FULFILLMENT_OVERRIDE,
        details: JSON.stringify({ planId, overrideLines: input.lines }),
      },
    });
  });

  return getFulfillmentPlanById(planId);
}

// ── Create Backorder ──────────────────────────────────────────
// Marks backorder lines on an already-accepted plan. Idempotent.

export async function createBackorder(planId: string, userId: string) {
  const plan = await getFulfillmentPlanById(planId);
  const backorderLines = plan.lines.filter((l) => l.isBackorder);

  if (backorderLines.length === 0) {
    throw new AppError(409, 'NO_BACKORDER', 'No backorder lines on this plan');
  }
  if (plan.status === FulfillmentStatus.BACKORDERED) {
    // Already backordered – idempotent
    return plan;
  }

  await prisma.$transaction(async (tx) => {
    await tx.fulfillmentPlan.update({
      where: { id: planId },
      data: { status: FulfillmentStatus.BACKORDERED },
    });
    await tx.auditLog.create({
      data: {
        quotationId: plan.quotationId,
        userId,
        action: AuditAction.BACKORDER_CREATED,
        details: JSON.stringify({ planId, backorderLineCount: backorderLines.length }),
      },
    });
  });

  return getFulfillmentPlanById(planId);
}

// ── Consolidate Backorder ─────────────────────────────────────
// Attempts to fill backorder lines when stock is available.

export async function consolidateBackorder(planId: string, userId: string) {
  const plan = await getFulfillmentPlanById(planId);
  const backorderLines = plan.lines.filter((l) => l.isBackorder);

  if (backorderLines.length === 0) {
    throw new AppError(409, 'NO_BACKORDER', 'No backorder lines to consolidate');
  }

  let anyConsolidated = false;

  await prisma.$transaction(async (tx) => {
    for (const bLine of backorderLines) {
      const qLine = await tx.quotationLine.findUnique({ where: { id: bLine.quotationLineId } });
      if (!qLine) continue;

      const stock = await tx.stock.findFirst({
        where: { warehouseId: bLine.warehouseId, productId: qLine.productId },
      });
      const available = stock ? stock.quantity - stock.reservedQuantity : 0;

      if (available >= bLine.allocatedQty) {
        // Reserve it
        await tx.stock.update({
          where: { id: stock!.id },
          data: { reservedQuantity: { increment: bLine.allocatedQty } },
        });
        // Mark the backorder line as fulfilled
        await tx.fulfillmentLine.update({
          where: { id: bLine.id },
          data: { isBackorder: false },
        });
        anyConsolidated = true;
      }
    }

    if (anyConsolidated) {
      // Re-check if any backorders remain
      const remainingBackorders = await tx.fulfillmentLine.count({
        where: { fulfillmentPlanId: planId, isBackorder: true },
      });
      const newStatus = remainingBackorders === 0 ? FulfillmentStatus.ALLOCATED : FulfillmentStatus.PARTIALLY_ALLOCATED;
      await tx.fulfillmentPlan.update({ where: { id: planId }, data: { status: newStatus } });
    }

    await tx.auditLog.create({
      data: {
        quotationId: plan.quotationId,
        userId,
        action: AuditAction.BACKORDER_CONSOLIDATED,
        details: JSON.stringify({ planId, anyConsolidated }),
      },
    });
  });

  return getFulfillmentPlanById(planId);
}

// ── Warehouse List ────────────────────────────────────────────

export async function getWarehouses() {
  return prisma.warehouse.findMany({
    where: { isActive: true },
    include: {
      stocks: {
        include: { product: { select: { id: true, name: true, sku: true } } },
      },
    },
    orderBy: { shippingCostWeight: 'asc' },
  });
}

export async function createWarehouse(input: { name: string; code: string; address?: string; shippingCostWeight?: number }) {
  return prisma.warehouse.create({
    data: {
      name: input.name, code: input.code, address: input.address ?? '',
      shippingCostWeight: input.shippingCostWeight ?? 1, isActive: true,
    },
  });
}

export async function upsertWarehouseStock(warehouseId: string, productId: string, quantity: number) {
  const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
  if (!warehouse) throw new AppError(404, 'NOT_FOUND', 'Warehouse not found');
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found');
  return prisma.stock.upsert({
    where: { warehouseId_productId: { warehouseId, productId } },
    update: { quantity },
    create: { warehouseId, productId, quantity },
  });
}

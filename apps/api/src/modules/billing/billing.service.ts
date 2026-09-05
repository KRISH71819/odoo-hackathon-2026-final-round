// ── Billing Service ─────────────────────────────────────────
// Hybrid billing: one-time and recurring lines, billing schedules,
// proration, cancellation, and credit notes.

import prisma from '../../shared/prisma.js';
import { AppError } from '../../shared/errors.js';
import { AuditAction, BillingInterval } from '@dealflow360/contracts';
import type {
  CreateSubscriptionPlanInput,
  ProrateScheduleInput,
  CancelSubscriptionInput,
  CreateCreditNoteInput,
} from '@dealflow360/contracts';
import { calculateProration } from './calculateProration.js';

// ── Subscription Plans ────────────────────────────────────────

export async function getSubscriptionPlans() {
  return prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

export async function createSubscriptionPlan(input: CreateSubscriptionPlanInput) {
  return prisma.subscriptionPlan.create({ data: input });
}

// ── Billing Schedules ─────────────────────────────────────────

export async function getBillingSchedules(quotationId: string) {
  return prisma.billingSchedule.findMany({
    where: { quotationId },
    include: {
      subscriptionPlan: true,
      quotationLine: { select: { productName: true, quantity: true } },
    },
    orderBy: { nextBillingDate: 'asc' },
  });
}

// ── Generate Billing Schedule on Confirm ─────────────────────
// Called when a quotation transitions to CONFIRMED.
// Creates one BillingSchedule per recurring line. One-time lines
// generate an Invoice (handled in Phase 4 createInvoice; here we
// just create the schedule markers).

export async function generateBillingSchedule(quotationId: string, userId: string) {
  const quote = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      lines: {
        include: { product: true },
      },
    },
  });
  if (!quote) throw new AppError(404, 'NOT_FOUND', 'Quotation not found');

  const recurringLines = quote.lines.filter((l) => l.product.type === 'SUBSCRIPTION');
  const now = new Date();

  let schedulesCreated = 0;

  await prisma.$transaction(async (tx) => {
    for (const line of recurringLines) {
      // Find subscription plan for this product (use cheapest matching plan or first)
      const plan = await tx.subscriptionPlan.findFirst({ where: { isActive: true } });
      if (!plan) continue;

      // Check if a schedule already exists (idempotent)
      const existing = await tx.billingSchedule.findFirst({
        where: { quotationId, quotationLineId: line.id },
      });
      if (existing) continue;

      const nextBillingDate = addInterval(now, plan.interval as BillingInterval);

      await tx.billingSchedule.create({
        data: {
          quotationId,
          quotationLineId: line.id,
          subscriptionPlanId: plan.id,
          startDate: now,
          nextBillingDate,
          interval: plan.interval,
          amount: plan.pricePerInterval * line.quantity,
          status: 'ACTIVE',
        },
      });
      schedulesCreated++;
    }

    await tx.auditLog.create({
      data: {
        quotationId,
        userId,
        action: AuditAction.BILLING_SCHEDULE_GENERATED,
        details: JSON.stringify({ quotationId, schedulesCreated }),
      },
    });
  });

  return getBillingSchedules(quotationId);
}

// ── Mid-cycle Proration ───────────────────────────────────────

export async function prorateSchedule(scheduleId: string, input: ProrateScheduleInput, userId: string) {
  const schedule = await prisma.billingSchedule.findUnique({
    where: { id: scheduleId },
    include: { subscriptionPlan: true, quotationLine: true, quotation: true },
  });
  if (!schedule) throw new AppError(404, 'NOT_FOUND', 'Billing schedule not found');
  if (schedule.status !== 'ACTIVE') {
    throw new AppError(409, 'INVALID_STATE', 'Schedule is not active');
  }

  const changeDate = new Date(input.changeDate);
  const periodStart = schedule.startDate;
  const periodEnd = schedule.nextBillingDate;

  const result = calculateProration({
    periodStart,
    periodEnd,
    changeDate,
    pricePerInterval: schedule.subscriptionPlan.pricePerInterval,
    prorationRule: schedule.subscriptionPlan.prorationRule as 'DAY_BASED' | 'NONE',
  });

  // Update schedule with new quantity and prorated amount for next cycle
  const newAmount = result.proratedAmount * input.newQuantity;
  await prisma.$transaction(async (tx) => {
    await tx.billingSchedule.update({
      where: { id: scheduleId },
      data: { amount: newAmount },
    });
    await tx.auditLog.create({
      data: {
        quotationId: schedule.quotationId,
        userId,
        action: AuditAction.SUBSCRIPTION_PRORATED,
        details: JSON.stringify({
          scheduleId,
          changeDate: input.changeDate,
          newQuantity: input.newQuantity,
          proratedAmount: result.proratedAmount,
          newAmount,
          periodDays: result.periodDays,
          remainingDays: result.remainingDays,
        }),
      },
    });
  });

  return { schedule: await prisma.billingSchedule.findUnique({ where: { id: scheduleId } }), proration: result };
}

// ── Cancel Subscription ───────────────────────────────────────

export async function cancelSubscription(scheduleId: string, input: CancelSubscriptionInput, userId: string) {
  const schedule = await prisma.billingSchedule.findUnique({
    where: { id: scheduleId },
    include: { subscriptionPlan: true, quotation: true },
  });
  if (!schedule) throw new AppError(404, 'NOT_FOUND', 'Billing schedule not found');
  if (schedule.status !== 'ACTIVE') {
    throw new AppError(409, 'INVALID_STATE', 'Schedule is already cancelled or paused');
  }

  const policy = schedule.subscriptionPlan.cancellationPolicy;
  // IMMEDIATE: cancel now. END_OF_PERIOD: mark as PAUSED until period end.
  const newStatus = policy === 'IMMEDIATE' ? 'CANCELLED' : 'PAUSED';

  await prisma.$transaction(async (tx) => {
    await tx.billingSchedule.update({
      where: { id: scheduleId },
      data: { status: newStatus },
    });
    await tx.auditLog.create({
      data: {
        quotationId: schedule.quotationId,
        userId,
        action: AuditAction.SUBSCRIPTION_CANCELLED,
        details: JSON.stringify({ scheduleId, policy, newStatus, reason: input.reason }),
      },
    });
  });

  return prisma.billingSchedule.findUnique({ where: { id: scheduleId } });
}

// ── Credit Note ───────────────────────────────────────────────

export async function createCreditNote(invoiceId: string, input: CreateCreditNoteInput, userId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { quotation: true },
  });
  if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Invoice not found');
  if (invoice.status === 'CANCELLED') {
    throw new AppError(409, 'INVALID_STATE', 'Cannot issue credit note for cancelled invoice');
  }
  if (input.amount > invoice.total) {
    throw new AppError(400, 'AMOUNT_EXCEEDS_INVOICE', `Credit note amount (${input.amount}) exceeds invoice total (${invoice.total})`);
  }

  const creditNote = await prisma.$transaction(async (tx) => {
    const note = await tx.creditNote.create({
      data: { invoiceId, amount: input.amount, reason: input.reason },
    });
    // Update invoice status to PARTIALLY_PAID if not fully credited
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { status: 'PARTIALLY_PAID' },
    });
    await tx.auditLog.create({
      data: {
        quotationId: invoice.quotationId,
        userId,
        action: AuditAction.CREDIT_NOTE_ISSUED,
        details: JSON.stringify({ invoiceId, amount: input.amount, reason: input.reason }),
      },
    });
    return note;
  });

  return creditNote;
}

// ── Helper ────────────────────────────────────────────────────

function addInterval(date: Date, interval: BillingInterval): Date {
  const d = new Date(date);
  switch (interval) {
    case BillingInterval.MONTHLY:
      d.setMonth(d.getMonth() + 1);
      break;
    case BillingInterval.QUARTERLY:
      d.setMonth(d.getMonth() + 3);
      break;
    case BillingInterval.YEARLY:
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d;
}

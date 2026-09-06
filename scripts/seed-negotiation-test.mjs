// ── Negotiation Renegotiation Test Data ──────────────────────
// Adds a quotation in UNDER_NEGOTIATION status so the sales rep
// can test editing lines and re-submitting for approval.
//
// Run: node scripts/seed-negotiation-test.mjs
// Safe to run multiple times (upserts / skips existing records).

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding renegotiation test data...\n');

  // ── Ensure base users exist ────────────────────────────────
  // (safe upserts — no-ops if seed.ts has already been run)
  const { hash } = await import('bcryptjs');
  const pw = await hash('password123', 10);

  await prisma.user.upsert({
    where: { id: 'user-rep' },
    update: {},
    create: {
      id: 'user-rep',
      email: 'rep@dealflow.com',
      passwordHash: pw,
      name: 'Alice Johnson',
      role: 'SALES_REP',
    },
  });

  await prisma.user.upsert({
    where: { id: 'user-customer-gamma' },
    update: {},
    create: {
      id: 'user-customer-gamma',
      email: 'customer@gamma.com',
      passwordHash: pw,
      name: 'Frank Lee (Gamma Ltd)',
      role: 'CUSTOMER',
      tier: 'GOLD',
    },
  });

  await prisma.user.upsert({
    where: { id: 'user-manager' },
    update: {},
    create: {
      id: 'user-manager',
      email: 'manager@dealflow.com',
      passwordHash: pw,
      name: 'Bob Martinez',
      role: 'SALES_MANAGER',
    },
  });

  // ── Ensure products exist ──────────────────────────────────
  await prisma.product.upsert({
    where: { id: 'prod-laptop' },
    update: {},
    create: {
      id: 'prod-laptop',
      name: 'Business Laptop Pro',
      sku: 'HW-LAPTOP-001',
      category: 'HARDWARE',
      type: 'HARDWARE',
      description: '15.6" business laptop with 16GB RAM, 512GB SSD',
      unitPrice: 129900,
      costPrice: 89900,
      taxRate: 0.08,
    },
  });

  await prisma.product.upsert({
    where: { id: 'prod-monitor' },
    update: {},
    create: {
      id: 'prod-monitor',
      name: '27" 4K Monitor',
      sku: 'HW-MON-001',
      category: 'HARDWARE',
      type: 'HARDWARE',
      description: '27-inch 4K IPS display with USB-C connectivity',
      unitPrice: 49900,
      costPrice: 32000,
      taxRate: 0.08,
    },
  });

  await prisma.product.upsert({
    where: { id: 'prod-setup' },
    update: {},
    create: {
      id: 'prod-setup',
      name: 'On-Site Setup Service',
      sku: 'SVC-SETUP-001',
      category: 'SERVICE',
      type: 'SERVICE',
      description: 'Professional on-site hardware setup and configuration',
      unitPrice: 29900,
      costPrice: 18000,
      taxRate: 0.05,
    },
  });

  console.log('  ✓ Users and products verified');

  // ── Tear down previous test quotation if it exists ─────────
  const OLD_ID = 'q-neg-test-001';
  await prisma.negotiationComment.deleteMany({ where: { thread: { quotationId: OLD_ID } } });
  await prisma.negotiationThread.deleteMany({ where: { quotationId: OLD_ID } });
  await prisma.approvalRequest.deleteMany({ where: { quotationId: OLD_ID } });
  await prisma.auditLog.deleteMany({ where: { quotationId: OLD_ID } });
  await prisma.quotationLine.deleteMany({ where: { quotationId: OLD_ID } });
  await prisma.quotation.deleteMany({ where: { id: OLD_ID } });

  console.log('  ✓ Cleaned any previous test quotation');

  // ── Create UNDER_NEGOTIATION quotation ─────────────────────
  //   Gamma (GOLD tier) customer, approved by manager, then sent to customer
  //   Customer is negotiating — wants a bigger discount on laptops.
  const quote = await prisma.quotation.create({
    data: {
      id: OLD_ID,
      number: 'Q-NEG-001',
      title: 'Gamma Ltd — Q3 Tech Refresh (Renegotiation)',
      customerId: 'user-customer-gamma',
      salesRepId: 'user-rep',
      status: 'UNDER_NEGOTIATION',
      // Gold tier pricing — 5% off standard laptop price = $1,234
      subtotal:    4 * 123400 + 2 * 47400 + 1 * 29900,  // $643,300 cents  (4 laptops + 2 monitors + setup)
      totalDiscount: 4 * 12340 + 2 * 4740,               // 10% off laptops + 10% off monitors
      taxTotal:    Math.round((4 * (123400 - 12340) + 2 * (47400 - 4740)) * 0.08 + 29900 * 0.05),
      total:       0, // will be recalculated on save/submit
      orderDiscountBps: 0,
      marginPercent: 2500,  // ~25%
      riskScore:   800,     // LOW risk (8%) — triggered manager approval
      riskLevel:   'LOW',
      notes:       'Gold tier enterprise deal. Customer is requesting 15% on laptops instead of 10%.',
      version:     3,

      lines: {
        create: [
          {
            id: 'ql-neg-1',
            productId:       'prod-laptop',
            productName:     'Business Laptop Pro (GOLD tier)',
            productCategory: 'HARDWARE',
            quantity:        4,
            unitPrice:       123400,   // Gold tier price
            costPrice:       89900,
            discountBps:     1000,     // 10% — customer wants 15%
            lineDiscount:    10,
            taxRate:         850,
            subtotal:        493600,
            taxAmount:       Math.round((493600 - 49360) * 0.08),
            total:           Math.round(493600 - 49360 + (493600 - 49360) * 0.08),
            marginPercent:   2400,
            sortOrder:       0,
          },
          {
            id: 'ql-neg-2',
            productId:       'prod-monitor',
            productName:     '27" 4K Monitor (GOLD tier)',
            productCategory: 'HARDWARE',
            quantity:        2,
            unitPrice:       47400,    // Gold tier price
            costPrice:       32000,
            discountBps:     1000,     // 10%
            lineDiscount:    10,
            taxRate:         850,
            subtotal:        94800,
            taxAmount:       Math.round((94800 - 9480) * 0.08),
            total:           Math.round(94800 - 9480 + (94800 - 9480) * 0.08),
            marginPercent:   2900,
            sortOrder:       1,
          },
          {
            id: 'ql-neg-3',
            productId:       'prod-setup',
            productName:     'On-Site Setup Service',
            productCategory: 'SERVICE',
            quantity:        1,
            unitPrice:       29900,
            costPrice:       18000,
            discountBps:     0,
            lineDiscount:    0,
            taxRate:         500,
            subtotal:        29900,
            taxAmount:       Math.round(29900 * 0.05),
            total:           Math.round(29900 * 1.05),
            marginPercent:   3980,
            sortOrder:       2,
          },
        ],
      },

      // ── Approval history (already approved by manager, now in negotiation)
      approvalRequests: {
        create: [
          {
            id:     'ar-neg-1',
            step:   1,
            role:   'SALES_MANAGER',
            status: 'APPROVED',
          },
        ],
      },
    },
  });

  console.log(`  ✓ Created quotation ${quote.number} (UNDER_NEGOTIATION) — ID: ${quote.id}`);

  // ── Negotiation thread ─────────────────────────────────────
  const thread = await prisma.negotiationThread.create({
    data: {
      quotationId: OLD_ID,
    },
  });

  // ── Thread comments (customer ↔ sales rep conversation) ────
  await prisma.negotiationComment.createMany({
    data: [
      {
        threadId:        thread.id,
        userId:          'user-customer-gamma',
        message:         'Hi Alice, we reviewed the quotation. The pricing looks good overall but we were hoping for 15% on the laptops instead of 10%, given our long-term relationship and commitment to order 4 units. Can you work something out?',
        isChangeRequest: true,
        proposedDiscount: 0.15,
      },
      {
        threadId: thread.id,
        userId:   'user-rep',
        message:  'Hi Frank, thanks for the feedback! 15% on GOLD tier laptops would require manager re-approval (it triggers our discount governance policy). I\'ll adjust the laptop discount and re-submit for approval. I\'ll keep you posted!',
        isChangeRequest: false,
      },
    ],
  });

  console.log('  ✓ Created negotiation thread with 2 comments (customer change request + rep reply)');

  // ── Audit trail ────────────────────────────────────────────
  await prisma.auditLog.createMany({
    data: [
      {
        quotationId: OLD_ID,
        userId:      'user-rep',
        action:      'QUOTATION_CREATED',
        details:     JSON.stringify({ note: 'Quotation created for Gamma Ltd Q3 Tech Refresh' }),
      },
      {
        quotationId: OLD_ID,
        userId:      'user-rep',
        action:      'QUOTATION_SUBMITTED',
        details:     JSON.stringify({ riskLevel: 'LOW', riskScore: 800, requiredApprovers: ['SALES_MANAGER'] }),
      },
      {
        quotationId: OLD_ID,
        userId:      'user-manager',
        action:      'QUOTATION_APPROVED',
        details:     JSON.stringify({ step: 1, role: 'SALES_MANAGER', note: 'Approved — LOW risk, standard 10% discount.' }),
      },
      {
        quotationId: OLD_ID,
        userId:      'user-rep',
        action:      'QUOTATION_UPDATED',
        details:     JSON.stringify({ note: 'Portal link sent to customer for review' }),
      },
    ],
  });

  console.log('  ✓ Created 4 audit trail entries (created → submitted → approved → sent)');

  // ── Summary ─────────────────────────────────────────────────
  console.log('\n✅ Renegotiation test data ready!\n');
  console.log('Test scenario:');
  console.log('  Quote:     Q-NEG-001 — "Gamma Ltd — Q3 Tech Refresh (Renegotiation)"');
  console.log('  Status:    UNDER_NEGOTIATION');
  console.log('  Customer:  Frank Lee / customer@gamma.com (GOLD tier)');
  console.log('  Rep:       Alice Johnson / rep@dealflow.com');
  console.log('');
  console.log('What to test (login as rep@dealflow.com / password123):');
  console.log('  1. Open Q-NEG-001 → see "RENEGOTIATION MODE" banner');
  console.log('  2. Click ✏ Edit on the Business Laptop Pro line');
  console.log('  3. Change discount from 10% → 15% (click 15 preset or type 15)');
  console.log('  4. Click ✓ Save → discount + totals update immediately');
  console.log('  5. Optionally change quantity on Monitors (e.g. 2 → 4)');
  console.log('  6. Click "🔄 Re-submit for Approval" in the sidebar');
  console.log('  7. Confirm → quote changes to PENDING_MANAGER');
  console.log('  8. Login as manager@dealflow.com → see new approval request');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

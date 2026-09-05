// ── DealFlow360 – Deterministic Seed Data ──
// One command rebuilds a known demo dataset.
// Run: npx tsx prisma/seed.ts

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function main() {
  console.log('🌱 Seeding DealFlow360 database...\n');

  // ── Clean existing data (order matters for FK constraints) ──
  await prisma.negotiationComment.deleteMany();
  await prisma.negotiationThread.deleteMany();
  await prisma.dealHealthAlert.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.creditNote.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.billingSchedule.deleteMany();
  await prisma.fulfillmentLine.deleteMany();
  await prisma.fulfillmentPlan.deleteMany();
  await prisma.approvalAction.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.quotationLine.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.upsellRule.deleteMany();
  await prisma.priceListItem.deleteMany();
  await prisma.priceList.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.categoryDiscountRule.deleteMany();
  await prisma.discountRule.deleteMany();
  await prisma.approvalThreshold.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.customerAccessToken.deleteMany();
  await prisma.user.deleteMany();

  console.log('  ✓ Cleaned existing data');

  // ── Users (one per role) ──
  const defaultPassword = await hash('password123', SALT_ROUNDS);

  const admin = await prisma.user.create({
    data: {
      id: 'user-admin',
      email: 'admin@dealflow.com',
      passwordHash: defaultPassword,
      name: 'System Admin',
      role: 'ADMIN',
    },
  });

  const rep = await prisma.user.create({
    data: {
      id: 'user-rep',
      email: 'rep@dealflow.com',
      passwordHash: defaultPassword,
      name: 'Alice Johnson',
      role: 'SALES_REP',
    },
  });

  const manager = await prisma.user.create({
    data: {
      id: 'user-manager',
      email: 'manager@dealflow.com',
      passwordHash: defaultPassword,
      name: 'Bob Martinez',
      role: 'SALES_MANAGER',
    },
  });

  const finance = await prisma.user.create({
    data: {
      id: 'user-finance',
      email: 'finance@dealflow.com',
      passwordHash: defaultPassword,
      name: 'Carol Chen',
      role: 'FINANCE_OPS',
    },
  });

  const customerUser = await prisma.user.create({
    data: {
      id: 'user-customer-acme',
      email: 'customer@acme.com',
      passwordHash: defaultPassword,
      name: 'Dave Wilson (Acme Corp)',
      role: 'CUSTOMER',
      tier: 'BRONZE',
    },
  });

  const customerBeta = await prisma.user.create({
    data: {
      id: 'user-customer-beta',
      email: 'customer@beta.com',
      passwordHash: defaultPassword,
      name: 'Eve Santos (Beta Industries)',
      role: 'CUSTOMER',
      tier: 'SILVER',
    },
  });

  const customerGamma = await prisma.user.create({
    data: {
      id: 'user-customer-gamma',
      email: 'customer@gamma.com',
      passwordHash: defaultPassword,
      name: 'Frank Lee (Gamma Ltd)',
      role: 'CUSTOMER',
      tier: 'GOLD',
    },
  });

  console.log('  ✓ Created 7 users (admin, rep, manager, finance, 3 customers)');

  // ── Products ──
  // Prices in cents (minor currency units)

  // Hardware
  const laptop = await prisma.product.create({
    data: {
      id: 'prod-laptop',
      name: 'Business Laptop Pro',
      sku: 'HW-LAPTOP-001',
      category: 'HARDWARE',
      type: 'HARDWARE',
      description: '15.6" business laptop with 16GB RAM, 512GB SSD',
      unitPrice: 129900, // $1,299.00
      costPrice: 89900,  // $899.00
      taxRate: 0.08,
    },
  });

  const monitor = await prisma.product.create({
    data: {
      id: 'prod-monitor',
      name: '27" 4K Monitor',
      sku: 'HW-MON-001',
      category: 'HARDWARE',
      type: 'HARDWARE',
      description: '27-inch 4K IPS display with USB-C connectivity',
      unitPrice: 49900, // $499.00
      costPrice: 32000, // $320.00
      taxRate: 0.08,
    },
  });

  const keyboard = await prisma.product.create({
    data: {
      id: 'prod-keyboard',
      name: 'Mechanical Keyboard',
      sku: 'HW-KB-001',
      category: 'ACCESSORY',
      type: 'HARDWARE',
      description: 'Wireless mechanical keyboard with backlight',
      unitPrice: 14900, // $149.00
      costPrice: 7500,  // $75.00
      taxRate: 0.08,
    },
  });

  const dockStation = await prisma.product.create({
    data: {
      id: 'prod-dock',
      name: 'USB-C Dock Station',
      sku: 'HW-DOCK-001',
      category: 'ACCESSORY',
      type: 'HARDWARE',
      description: 'Universal USB-C docking station with dual display',
      unitPrice: 24900, // $249.00
      costPrice: 15000, // $150.00
      taxRate: 0.08,
    },
  });

  // Services
  const setupService = await prisma.product.create({
    data: {
      id: 'prod-setup',
      name: 'On-Site Setup Service',
      sku: 'SVC-SETUP-001',
      category: 'SERVICE',
      type: 'SERVICE',
      description: 'Professional on-site hardware setup and configuration',
      unitPrice: 29900, // $299.00
      costPrice: 18000, // $180.00
      taxRate: 0.05,
    },
  });

  const consulting = await prisma.product.create({
    data: {
      id: 'prod-consulting',
      name: 'IT Consulting (per hour)',
      sku: 'SVC-CONSULT-001',
      category: 'SERVICE',
      type: 'SERVICE',
      description: 'Expert IT consulting and architecture review',
      unitPrice: 25000, // $250.00
      costPrice: 15000, // $150.00
      taxRate: 0.05,
    },
  });

  const training = await prisma.product.create({
    data: {
      id: 'prod-training',
      name: 'Team Training Session',
      sku: 'SVC-TRAIN-001',
      category: 'SERVICE',
      type: 'SERVICE',
      description: 'Half-day team training on new systems',
      unitPrice: 150000, // $1,500.00
      costPrice: 80000,  // $800.00
      taxRate: 0.05,
    },
  });

  // Subscriptions
  const saas = await prisma.product.create({
    data: {
      id: 'prod-saas',
      name: 'CloudSuite Platform',
      sku: 'SUB-SAAS-001',
      category: 'SOFTWARE',
      type: 'SUBSCRIPTION',
      description: 'Enterprise cloud platform - per user per month',
      unitPrice: 4900, // $49.00/month
      costPrice: 1500, // $15.00/month
      taxRate: 0.05,
    },
  });

  const supportPlan = await prisma.product.create({
    data: {
      id: 'prod-support',
      name: 'Premium Support Plan',
      sku: 'SUB-SUPPORT-001',
      category: 'SERVICE',
      type: 'SUBSCRIPTION',
      description: '24/7 premium support with dedicated account manager',
      unitPrice: 19900, // $199.00/month
      costPrice: 8000,  // $80.00/month
      taxRate: 0.05,
    },
  });

  const securitySuite = await prisma.product.create({
    data: {
      id: 'prod-security',
      name: 'Security Suite Add-on',
      sku: 'SUB-SEC-001',
      category: 'SOFTWARE',
      type: 'SUBSCRIPTION',
      description: 'Advanced security, SSO, and compliance tools',
      unitPrice: 2900, // $29.00/month
      costPrice: 800,  // $8.00/month
      taxRate: 0.05,
    },
  });

  console.log('  ✓ Created 10 products (4 hardware, 3 services, 3 subscriptions)');

  // ── Product Variants ──
  await prisma.productVariant.createMany({
    data: [
      { id: 'var-laptop-16', productId: 'prod-laptop', attribute: 'RAM', value: '16GB', extraPrice: 0 },
      { id: 'var-laptop-32', productId: 'prod-laptop', attribute: 'RAM', value: '32GB', extraPrice: 30000 },
      { id: 'var-monitor-27', productId: 'prod-monitor', attribute: 'Size', value: '27"', extraPrice: 0 },
      { id: 'var-monitor-32', productId: 'prod-monitor', attribute: 'Size', value: '32"', extraPrice: 15000 },
    ],
  });

  console.log('  ✓ Created 4 product variants');

  // ── Price Lists ──
  const standardPL = await prisma.priceList.create({
    data: { id: 'pl-standard', name: 'Standard Pricing', customerTier: 'BRONZE', currency: 'USD' },
  });

  const silverPL = await prisma.priceList.create({
    data: { id: 'pl-silver', name: 'Silver Tier Pricing', customerTier: 'SILVER', currency: 'USD' },
  });

  const goldPL = await prisma.priceList.create({
    data: { id: 'pl-gold', name: 'Gold Tier Pricing', customerTier: 'GOLD', currency: 'USD' },
  });

  // Gold tier gets 5% lower base prices on hardware
  await prisma.priceListItem.createMany({
    data: [
      { priceListId: 'pl-gold', productId: 'prod-laptop', unitPrice: 123400 },
      { priceListId: 'pl-gold', productId: 'prod-monitor', unitPrice: 47400 },
      { priceListId: 'pl-silver', productId: 'prod-laptop', unitPrice: 126700 },
      { priceListId: 'pl-silver', productId: 'prod-monitor', unitPrice: 48600 },
    ],
  });

  console.log('  ✓ Created 3 price lists with 4 tier-specific prices');

  // ── Discount Rules ──
  await prisma.discountRule.createMany({
    data: [
      { id: 'dr-bronze', customerTier: 'BRONZE', maxDiscountPercent: 5, description: 'Bronze tier: up to 5% discount' },
      { id: 'dr-silver', customerTier: 'SILVER', maxDiscountPercent: 10, description: 'Silver tier: up to 10% discount' },
      { id: 'dr-gold', customerTier: 'GOLD', maxDiscountPercent: 15, description: 'Gold tier: up to 15% discount' },
    ],
  });

  // Category-specific ceilings (stricter than tier for some categories)
  await prisma.categoryDiscountRule.createMany({
    data: [
      { id: 'cdr-hardware', category: 'HARDWARE', maxDiscountPercent: 15, description: 'Hardware: healthy margins, up to 15%' },
      { id: 'cdr-service', category: 'SERVICE', maxDiscountPercent: 10, description: 'Services: thin margins, max 10%' },
      { id: 'cdr-software', category: 'SOFTWARE', maxDiscountPercent: 12, description: 'Software: moderate margins, max 12%' },
      { id: 'cdr-accessory', category: 'ACCESSORY', maxDiscountPercent: 20, description: 'Accessories: high margins, up to 20%' },
    ],
  });

  console.log('  ✓ Created discount rules (3 tier + 4 category)');

  // ── Approval Thresholds ──
  await prisma.approvalThreshold.createMany({
    data: [
      {
        id: 'at-none',
        minRiskScore: 0,
        maxRiskScore: 0,
        requiredApprovers: '[]',
        description: 'No risk: no approval needed',
      },
      {
        id: 'at-low',
        minRiskScore: 0.01,
        maxRiskScore: 5,
        requiredApprovers: '["SALES_MANAGER"]',
        description: 'Low risk: Sales Manager approval',
      },
      {
        id: 'at-medium',
        minRiskScore: 5.01,
        maxRiskScore: 15,
        requiredApprovers: '["SALES_MANAGER"]',
        description: 'Medium risk: Sales Manager approval',
      },
      {
        id: 'at-high',
        minRiskScore: 15.01,
        maxRiskScore: 100,
        requiredApprovers: '["SALES_MANAGER", "FINANCE_OPS"]',
        description: 'High risk: Sales Manager then Finance approval',
      },
    ],
  });

  console.log('  ✓ Created 4 approval thresholds');

  // ── Warehouses ──
  const mainWarehouse = await prisma.warehouse.create({
    data: {
      id: 'wh-main',
      name: 'Main Warehouse',
      code: 'MAIN',
      address: '100 Industrial Pkwy, San Jose, CA 95112',
      shippingCostWeight: 1.0,
    },
  });

  const eastDepot = await prisma.warehouse.create({
    data: {
      id: 'wh-east',
      name: 'East Depot',
      code: 'EAST',
      address: '500 Commerce Dr, Atlanta, GA 30318',
      shippingCostWeight: 1.5,
    },
  });

  const westHub = await prisma.warehouse.create({
    data: {
      id: 'wh-west',
      name: 'West Hub',
      code: 'WEST',
      address: '250 Pacific Ave, Seattle, WA 98101',
      shippingCostWeight: 1.2,
    },
  });

  console.log('  ✓ Created 3 warehouses');

  // ── Stock ──
  await prisma.stock.createMany({
    data: [
      // Main warehouse - good stock
      { warehouseId: 'wh-main', productId: 'prod-laptop', quantity: 50, reservedQuantity: 0 },
      { warehouseId: 'wh-main', productId: 'prod-monitor', quantity: 80, reservedQuantity: 0 },
      { warehouseId: 'wh-main', productId: 'prod-keyboard', quantity: 200, reservedQuantity: 0 },
      { warehouseId: 'wh-main', productId: 'prod-dock', quantity: 60, reservedQuantity: 0 },
      // East depot - partial stock
      { warehouseId: 'wh-east', productId: 'prod-laptop', quantity: 15, reservedQuantity: 0 },
      { warehouseId: 'wh-east', productId: 'prod-monitor', quantity: 30, reservedQuantity: 0 },
      { warehouseId: 'wh-east', productId: 'prod-keyboard', quantity: 100, reservedQuantity: 0 },
      // West hub - limited stock (forces split scenarios)
      { warehouseId: 'wh-west', productId: 'prod-laptop', quantity: 5, reservedQuantity: 0 },
      { warehouseId: 'wh-west', productId: 'prod-monitor', quantity: 10, reservedQuantity: 0 },
      { warehouseId: 'wh-west', productId: 'prod-dock', quantity: 25, reservedQuantity: 0 },
    ],
  });

  console.log('  ✓ Created stock entries across 3 warehouses');

  // ── Subscription Plans ──
  await prisma.subscriptionPlan.createMany({
    data: [
      {
        id: 'sp-monthly',
        name: 'Monthly Plan',
        interval: 'MONTHLY',
        pricePerInterval: 4900, // $49.00
        prorationRule: 'DAY_BASED',
        cancellationPolicy: 'IMMEDIATE',
      },
      {
        id: 'sp-quarterly',
        name: 'Quarterly Plan',
        interval: 'QUARTERLY',
        pricePerInterval: 12900, // $129.00 (saves ~12%)
        prorationRule: 'DAY_BASED',
        cancellationPolicy: 'END_OF_PERIOD',
      },
      {
        id: 'sp-yearly',
        name: 'Annual Plan',
        interval: 'YEARLY',
        pricePerInterval: 46800, // $468.00 (saves ~20%)
        prorationRule: 'DAY_BASED',
        cancellationPolicy: 'END_OF_PERIOD',
      },
    ],
  });

  console.log('  ✓ Created 3 subscription plans');

  // ── Upsell Rules ──
  await prisma.upsellRule.createMany({
    data: [
      {
        id: 'ur-dock',
        sourceProductId: 'prod-laptop',
        suggestedProductId: 'prod-dock',
        reason: '90% of laptop deployments include a Thunderbolt dock',
        minMarginBps: 2000,
        isPromotion: false,
        isActive: true,
      },
      {
        id: 'ur-support',
        sourceProductId: 'prod-laptop',
        suggestedProductId: 'prod-support',
        reason: 'Mission-critical laptops require 24/7 dedicated enterprise support',
        minMarginBps: 2500,
        isPromotion: true,
        isActive: true,
      },
      {
        id: 'ur-keyboard',
        sourceProductId: 'prod-monitor',
        suggestedProductId: 'prod-keyboard',
        reason: 'Complete workstation bundle accessory',
        minMarginBps: 1500,
        isPromotion: false,
        isActive: true,
      },
    ],
  });

  console.log('  ✓ Created 3 upsell suggestion rules');

  // ── Sample Quotations (Phase 2 Demo) ──
  const q1 = await prisma.quotation.create({
    data: {
      id: 'q-1001',
      number: 'Q-1001',
      title: 'Acme Hardware Refresh',
      customerId: 'user-customer-acme',
      salesRepId: 'user-rep',
      status: 'DRAFT',
      subtotal: 359600, // 2x Laptop ($1299) + 2x Monitor ($499)
      taxTotal: 30566,
      total: 390166,
      orderDiscountBps: 0,
      marginPercent: 3200,
      riskScore: 0,
      riskLevel: 'NONE',
      notes: 'Initial proposal for quarterly office upgrade',
      lines: {
        create: [
          {
            id: 'ql-1',
            productId: 'prod-laptop',
            productName: 'ThinkPad X1 Carbon Gen 12',
            productCategory: 'HARDWARE',
            quantity: 2,
            unitPrice: 129900,
            costPrice: 85000,
            discountBps: 0,
            taxRate: 850,
            subtotal: 259800,
            taxAmount: 22083,
            total: 281883,
            marginPercent: 3456,
            sortOrder: 0,
          },
          {
            id: 'ql-2',
            productId: 'prod-monitor',
            productName: 'Dell UltraSharp 27" 4K Monitor',
            productCategory: 'HARDWARE',
            quantity: 2,
            unitPrice: 49900,
            costPrice: 32000,
            discountBps: 0,
            taxRate: 850,
            subtotal: 99800,
            taxAmount: 8483,
            total: 108283,
            marginPercent: 3587,
            sortOrder: 1,
          },
        ],
      },
    },
  });

  const q2 = await prisma.quotation.create({
    data: {
      id: 'q-1002',
      number: 'Q-1002',
      title: 'Beta Corp Expansion Bundle',
      customerId: 'user-customer-beta',
      salesRepId: 'user-rep',
      status: 'PENDING_MANAGER',
      subtotal: 659500,
      totalDiscount: 65950,
      taxTotal: 50451,
      total: 644001,
      orderDiscountBps: 0,
      marginPercent: 2800,
      riskScore: 350,
      riskLevel: 'LOW',
      notes: 'Requested 15% discount on software training & hardware bundle',
      lines: {
        create: [
          {
            id: 'ql-3',
            productId: 'prod-laptop',
            productName: 'ThinkPad X1 Carbon Gen 12',
            productCategory: 'HARDWARE',
            quantity: 4,
            unitPrice: 126700, // Silver tier price
            costPrice: 85000,
            discountBps: 1000, // 10% discount
            taxRate: 850,
            subtotal: 506800,
            taxAmount: 38770,
            total: 494890,
            marginPercent: 3100,
            sortOrder: 0,
          },
          {
            id: 'ql-4',
            productId: 'prod-training',
            productName: 'Team Training Workshop',
            productCategory: 'SERVICE',
            quantity: 1,
            unitPrice: 120000,
            costPrice: 60000,
            discountBps: 1200, // 12% discount (exceeds 10% limit!)
            taxRate: 850,
            subtotal: 120000,
            taxAmount: 8976,
            total: 114576,
            marginPercent: 4300,
            sortOrder: 1,
          },
        ],
      },
      approvalRequests: {
        create: [
          {
            id: 'ar-1',
            step: 1,
            role: 'SALES_MANAGER',
            status: 'PENDING',
          },
        ],
      },
    },
  });

  await prisma.auditLog.createMany({
    data: [
      {
        quotationId: 'q-1001',
        userId: 'user-rep',
        action: 'QUOTATION_CREATED',
        details: 'Quotation created by Alice Johnson',
      },
      {
        quotationId: 'q-1002',
        userId: 'user-rep',
        action: 'QUOTATION_CREATED',
        details: 'Quotation created for Beta Corp',
      },
      {
        quotationId: 'q-1002',
        userId: 'user-rep',
        action: 'QUOTATION_SUBMITTED',
        details: 'Submitted for manager approval. Risk: LOW',
      },
    ],
  });

  console.log('  ✓ Created sample quotations (Q-1001 DRAFT, Q-1002 PENDING_MANAGER) with lines and approval requests');

  // ── Summary ──
  console.log('\n✅ Seed complete!\n');
  console.log('Demo accounts (all use password: password123):');
  console.log('  Admin:         admin@dealflow.com');
  console.log('  Sales Rep:     rep@dealflow.com');
  console.log('  Sales Manager: manager@dealflow.com');
  console.log('  Finance/Ops:   finance@dealflow.com');
  console.log('  Customer:      customer@acme.com');
  console.log('  Customer:      customer@beta.com');
  console.log('  Customer:      customer@gamma.com');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

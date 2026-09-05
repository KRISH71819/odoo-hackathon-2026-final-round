import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();
const PASSWORD = 'password123';

const CUSTOMER_COUNT = 250;
const PRODUCT_COUNT = 250;
const QUOTATION_COUNT = 300;
const SALES_REP_COUNT = 20;
const MANAGER_COUNT = 5;
const FINANCE_COUNT = 4;
const WAREHOUSE_COUNT = 12;
const EXTRA_PLAN_COUNT = 9;
const UPSELL_COUNT = 200;
const DEAL_ALERT_COUNT = 250;

const pad = (n: number, width = 3) => String(n).padStart(width, '0');

function daysAgo(days: number, hourOffset = 0) {
  return new Date(Date.now() - days * 86_400_000 - hourOffset * 3_600_000);
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 86_400_000);
}

function riskLevel(score: number) {
  if (score === 0) return 'NONE';
  if (score <= 500) return 'LOW';
  if (score <= 1500) return 'MEDIUM';
  return 'HIGH';
}

function tierLimit(tier: string) {
  if (tier === 'GOLD') return 1500;
  if (tier === 'SILVER') return 1000;
  return 500;
}

function categoryLimit(category: string) {
  if (category === 'ACCESSORY') return 2000;
  if (category === 'HARDWARE') return 1500;
  if (category === 'SOFTWARE') return 1200;
  return 1000;
}

async function insertChunks(
  rows: any[],
  insert: (chunk: any[]) => Promise<unknown>,
  size = 150,
) {
  for (let i = 0; i < rows.length; i += size) {
    await insert(rows.slice(i, i + size));
  }
}

async function cleanPreviousBulkSeed() {
  console.log('🧹 Removing previous reviewer-generated bulk data...');

  await prisma.negotiationComment.deleteMany({
    where: { id: { startsWith: 'bulk-' } },
  });
  await prisma.negotiationThread.deleteMany({
    where: { id: { startsWith: 'bulk-' } },
  });
  await prisma.customerAccessToken.deleteMany({
    where: { id: { startsWith: 'bulk-' } },
  });
  await prisma.dealHealthAlert.deleteMany({
    where: { id: { startsWith: 'bulk-' } },
  });
  await prisma.payment.deleteMany({
    where: { id: { startsWith: 'bulk-' } },
  });
  await prisma.creditNote.deleteMany({
    where: { id: { startsWith: 'bulk-' } },
  });
  await prisma.invoice.deleteMany({
    where: { id: { startsWith: 'bulk-' } },
  });
  await prisma.billingSchedule.deleteMany({
    where: { id: { startsWith: 'bulk-' } },
  });
  await prisma.fulfillmentLine.deleteMany({
    where: { id: { startsWith: 'bulk-' } },
  });
  await prisma.fulfillmentPlan.deleteMany({
    where: { id: { startsWith: 'bulk-' } },
  });
  await prisma.approvalAction.deleteMany({
    where: { id: { startsWith: 'bulk-' } },
  });
  await prisma.approvalRequest.deleteMany({
    where: { id: { startsWith: 'bulk-' } },
  });
  await prisma.auditLog.deleteMany({
    where: { id: { startsWith: 'bulk-' } },
  });
  await prisma.quotationLine.deleteMany({
    where: { id: { startsWith: 'bulk-' } },
  });
  await prisma.quotation.deleteMany({
    where: { id: { startsWith: 'bulk-' } },
  });
  await prisma.stock.deleteMany({
    where: { id: { startsWith: 'bulk-' } },
  });
  await prisma.upsellRule.deleteMany({
    where: { id: { startsWith: 'bulk-' } },
  });
  await prisma.priceListItem.deleteMany({
    where: { id: { startsWith: 'bulk-' } },
  });
  await prisma.productVariant.deleteMany({
    where: { id: { startsWith: 'bulk-' } },
  });
  await prisma.product.deleteMany({
    where: { id: { startsWith: 'bulk-' } },
  });
  await prisma.subscriptionPlan.deleteMany({
    where: { id: { startsWith: 'bulk-' } },
  });
  await prisma.stock.deleteMany({
    where: { warehouseId: { startsWith: 'bulk-' } },
  });
  await prisma.warehouse.deleteMany({
    where: { id: { startsWith: 'bulk-' } },
  });
  await prisma.priceList.deleteMany({
    where: { id: { startsWith: 'bulk-' } },
  });
  await prisma.user.deleteMany({
    where: { id: { startsWith: 'bulk-' } },
  });

  console.log('  ✓ Old bulk data removed');
}

async function main() {
  console.log('\n🌱 Creating DealFlow360 reviewer-scale dataset...\n');

  await cleanPreviousBulkSeed();

  const passwordHash = await hash(PASSWORD, 10);

  // ────────────────────────────────────────────────────────────
  // STAFF
  // ────────────────────────────────────────────────────────────

  const salesReps = Array.from({ length: SALES_REP_COUNT }, (_, idx) => {
    const i = idx + 1;
    return {
      id: `bulk-rep-${pad(i)}`,
      email: `reviewer.rep${pad(i, 2)}@dealflow.test`,
      passwordHash,
      name: `Sales Rep ${pad(i, 2)}`,
      role: 'SALES_REP',
      tier: 'BRONZE',
      isActive: true,
    };
  });

  const managers = Array.from({ length: MANAGER_COUNT }, (_, idx) => {
    const i = idx + 1;
    return {
      id: `bulk-manager-${pad(i)}`,
      email: `reviewer.manager${pad(i, 2)}@dealflow.test`,
      passwordHash,
      name: `Sales Manager ${pad(i, 2)}`,
      role: 'SALES_MANAGER',
      tier: 'BRONZE',
      isActive: true,
    };
  });

  const financeUsers = Array.from({ length: FINANCE_COUNT }, (_, idx) => {
    const i = idx + 1;
    return {
      id: `bulk-finance-${pad(i)}`,
      email: `reviewer.finance${pad(i, 2)}@dealflow.test`,
      passwordHash,
      name: `Finance Operator ${pad(i, 2)}`,
      role: 'FINANCE_OPS',
      tier: 'BRONZE',
      isActive: true,
    };
  });

  await prisma.user.createMany({
    data: [...salesReps, ...managers, ...financeUsers],
  });

  // ────────────────────────────────────────────────────────────
  // CUSTOMERS
  // ────────────────────────────────────────────────────────────

  const companyPrefixes = [
    'Apex',
    'Nova',
    'Vertex',
    'Nimbus',
    'Orbit',
    'Zenith',
    'BluePeak',
    'Quantum',
    'Summit',
    'Crest',
    'Pioneer',
    'Atlas',
    'Fusion',
    'BrightWorks',
    'CoreTech',
  ];

  const companySuffixes = [
    'Systems',
    'Industries',
    'Enterprises',
    'Technologies',
    'Solutions',
    'Labs',
    'Networks',
    'Global',
    'Digital',
    'Logistics',
  ];

  const firstNames = [
    'Aarav',
    'Maya',
    'Rohan',
    'Ananya',
    'Ishaan',
    'Meera',
    'Kabir',
    'Nisha',
    'Arjun',
    'Sara',
  ];

  const lastNames = [
    'Patel',
    'Shah',
    'Mehta',
    'Kapoor',
    'Rao',
    'Singh',
    'Iyer',
    'Joshi',
    'Gupta',
    'Malhotra',
  ];

  const tiers = ['BRONZE', 'SILVER', 'GOLD'];

  const customers = Array.from({ length: CUSTOMER_COUNT }, (_, idx) => {
    const i = idx + 1;
    const company =
      `${companyPrefixes[idx % companyPrefixes.length]} ` +
      `${companySuffixes[(idx * 3) % companySuffixes.length]} ${pad(i)}`;

    const person =
      `${firstNames[idx % firstNames.length]} ` +
      `${lastNames[(idx * 7) % lastNames.length]}`;

    return {
      id: `bulk-customer-${pad(i)}`,
      email: `customer${pad(i)}@reviewer-demo.test`,
      passwordHash,
      name: `${person} (${company})`,
      role: 'CUSTOMER',
      tier: tiers[idx % tiers.length],
      isActive: idx % 29 !== 0,
      createdAt: daysAgo(20 + (idx % 300)),
      updatedAt: daysAgo(idx % 20),
    };
  });

  await insertChunks(
    customers,
    (data) => prisma.user.createMany({ data }),
  );

  console.log(`  ✓ ${CUSTOMER_COUNT} customers`);
  console.log(
    `  ✓ ${SALES_REP_COUNT} reps, ${MANAGER_COUNT} managers, ${FINANCE_COUNT} finance users`,
  );

  // ────────────────────────────────────────────────────────────
  // PRODUCTS
  // ────────────────────────────────────────────────────────────

  const productTemplates = {
    HARDWARE: [
      'Business Laptop',
      'Mobile Workstation',
      'Rack Server',
      '4K Monitor',
      'Office Desktop',
      'Network Appliance',
    ],
    ACCESSORY: [
      'USB-C Dock',
      'Mechanical Keyboard',
      'Wireless Mouse',
      'Business Headset',
      'HD Webcam',
      'UPS Backup Unit',
    ],
    SERVICE: [
      'Deployment Service',
      'Migration Workshop',
      'Cloud Consulting',
      'Security Audit',
      'Team Training',
      'Architecture Review',
    ],
    SOFTWARE: [
      'CloudSuite Platform',
      'Security Protect',
      'Analytics Pro',
      'Workflow Automation',
      'Backup Cloud',
      'Compliance Suite',
    ],
  };

  const products: any[] = [];

  for (let i = 1; i <= PRODUCT_COUNT; i++) {
    const selector = i % 10;

    let category: string;
    let type: string;

    if (selector <= 3) {
      category = 'HARDWARE';
      type = 'HARDWARE';
    } else if (selector <= 5) {
      category = 'ACCESSORY';
      type = 'HARDWARE';
    } else if (selector <= 7) {
      category = 'SERVICE';
      type = 'SERVICE';
    } else {
      category = 'SOFTWARE';
      type = 'SUBSCRIPTION';
    }

    const names =
      productTemplates[category as keyof typeof productTemplates];

    let basePrice: number;

    if (type === 'SUBSCRIPTION') {
      basePrice = 2500 + (i % 20) * 900;
    } else if (type === 'SERVICE') {
      basePrice = 20000 + (i % 25) * 6500;
    } else if (category === 'ACCESSORY') {
      basePrice = 4000 + (i % 25) * 2200;
    } else {
      basePrice = 55000 + (i % 35) * 7500;
    }

    const costRatio =
      type === 'SUBSCRIPTION' ? 0.32 :
      type === 'SERVICE' ? 0.55 :
      0.66;

    products.push({
      id: `bulk-product-${pad(i)}`,
      name: `${names[i % names.length]} ${pad(i)}`,
      sku: `BULK-${category.slice(0, 3)}-${pad(i)}`,
      category,
      type,
      description:
        `Reviewer-scale demo ${category.toLowerCase()} product ${pad(i)}`,
      unitPrice: basePrice,
      costPrice: Math.round(basePrice * costRatio),
      taxRate:
        category === 'HARDWARE' || category === 'ACCESSORY'
          ? 0.08
          : 0.05,
      isActive: i % 31 !== 0,
      createdAt: daysAgo(50 + (i % 500)),
      updatedAt: daysAgo(i % 30),
    });
  }

  await insertChunks(
    products,
    (data) => prisma.product.createMany({ data }),
  );

  // Variants for hardware/accessory products.
  const variants: any[] = [];
  let variantCounter = 1;

  for (const product of products) {
    if (
      product.type !== 'HARDWARE' ||
      variants.length >= 180
    ) continue;

    variants.push({
      id: `bulk-variant-${pad(variantCounter++)}`,
      productId: product.id,
      attribute:
        product.category === 'HARDWARE'
          ? 'Configuration'
          : 'Pack',
      value:
        product.category === 'HARDWARE'
          ? 'Standard'
          : 'Single',
      extraPrice: 0,
    });

    if (variants.length < 180 && variantCounter % 3 === 0) {
      variants.push({
        id: `bulk-variant-${pad(variantCounter++)}`,
        productId: product.id,
        attribute:
          product.category === 'HARDWARE'
            ? 'Configuration'
            : 'Pack',
        value:
          product.category === 'HARDWARE'
            ? 'Premium'
            : '5-Pack',
        extraPrice: Math.round(product.unitPrice * 0.15),
      });
    }
  }

  await insertChunks(
    variants,
    (data) => prisma.productVariant.createMany({ data }),
  );

  console.log(`  ✓ ${PRODUCT_COUNT} products`);
  console.log(`  ✓ ${variants.length} product variants`);

  // ────────────────────────────────────────────────────────────
  // PRICE LISTS
  // ────────────────────────────────────────────────────────────

  async function ensurePriceList(
    id: string,
    tier: string,
    name: string,
  ) {
    let list = await prisma.priceList.findFirst({
      where: {
        customerTier: tier,
        isActive: true,
      },
    });

    if (!list) {
      list = await prisma.priceList.create({
        data: {
          id,
          name,
          customerTier: tier,
          currency: 'USD',
          isActive: true,
        },
      });
    }

    return list;
  }

  const bronzeList = await ensurePriceList(
    'bulk-pl-bronze',
    'BRONZE',
    'Reviewer Bronze Pricing',
  );

  const silverList = await ensurePriceList(
    'bulk-pl-silver',
    'SILVER',
    'Reviewer Silver Pricing',
  );

  const goldList = await ensurePriceList(
    'bulk-pl-gold',
    'GOLD',
    'Reviewer Gold Pricing',
  );

  const priceItems: any[] = [];

  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    priceItems.push(
      {
        id: `bulk-pli-b-${pad(i + 1)}`,
        priceListId: bronzeList.id,
        productId: product.id,
        unitPrice: product.unitPrice,
      },
      {
        id: `bulk-pli-s-${pad(i + 1)}`,
        priceListId: silverList.id,
        productId: product.id,
        unitPrice: Math.round(product.unitPrice * 0.97),
      },
      {
        id: `bulk-pli-g-${pad(i + 1)}`,
        priceListId: goldList.id,
        productId: product.id,
        unitPrice: Math.round(product.unitPrice * 0.94),
      },
    );
  }

  await insertChunks(
    priceItems,
    (data) => prisma.priceListItem.createMany({ data }),
  );

  console.log(`  ✓ ${priceItems.length} tier price-list entries`);

  // ────────────────────────────────────────────────────────────
  // WAREHOUSES + STOCK
  // ────────────────────────────────────────────────────────────

  const warehouseCities = [
    'Mumbai',
    'Delhi',
    'Pune',
    'Bengaluru',
    'Ahmedabad',
    'Hyderabad',
    'Chennai',
    'Jaipur',
    'Kolkata',
    'Surat',
    'Indore',
    'Nagpur',
  ];

  const warehouses = Array.from(
    { length: WAREHOUSE_COUNT },
    (_, idx) => {
      const i = idx + 1;

      return {
        id: `bulk-warehouse-${pad(i)}`,
        name: `${warehouseCities[idx]} Distribution Hub`,
        code: `BWH-${pad(i)}`,
        address:
          `${100 + i} Logistics Park, ${warehouseCities[idx]}`,
        shippingCostWeight:
          Number((0.8 + (idx % 7) * 0.18).toFixed(2)),
        isActive: true,
      };
    },
  );

  await prisma.warehouse.createMany({ data: warehouses });

  const stockRows: any[] = [];

  for (let w = 0; w < warehouses.length; w++) {
    for (let p = 0; p < products.length; p++) {
      const product = products[p];

      let quantity =
        (p * 17 + w * 31 + 23) % 220;

      // Produce intentional low/out-of-stock situations.
      if ((p + w) % 19 === 0) quantity = 0;
      if ((p + w) % 23 === 0) quantity = 3;

      const reserved =
        quantity === 0
          ? 0
          : Math.min(
              Math.floor(quantity * ((p + w) % 4) * 0.05),
              quantity,
            );

      stockRows.push({
        id: `bulk-stock-${pad(w + 1)}-${pad(p + 1)}`,
        warehouseId: warehouses[w].id,
        productId: product.id,
        quantity,
        reservedQuantity: reserved,
      });
    }
  }

  await insertChunks(
    stockRows,
    (data) => prisma.stock.createMany({ data }),
    100,
  );

  console.log(`  ✓ ${WAREHOUSE_COUNT} warehouses`);
  console.log(`  ✓ ${stockRows.length} warehouse stock records`);

  // ────────────────────────────────────────────────────────────
  // SUBSCRIPTION PLANS
  // ────────────────────────────────────────────────────────────

  const intervals = ['MONTHLY', 'QUARTERLY', 'YEARLY'];

  const subscriptionPlans = Array.from(
    { length: EXTRA_PLAN_COUNT },
    (_, idx) => {
      const i = idx + 1;
      const interval = intervals[idx % intervals.length];

      return {
        id: `bulk-plan-${pad(i)}`,
        name: `Reviewer ${interval} Plan ${pad(i)}`,
        interval,
        pricePerInterval:
          interval === 'YEARLY'
            ? 48000 + i * 2500
            : interval === 'QUARTERLY'
              ? 15000 + i * 1200
              : 5500 + i * 700,
        prorationRule: 'DAY_BASED',
        cancellationPolicy:
          idx % 2 === 0
            ? 'IMMEDIATE'
            : 'END_OF_PERIOD',
        isActive: true,
      };
    },
  );

  await prisma.subscriptionPlan.createMany({
    data: subscriptionPlans,
  });

  console.log(`  ✓ ${EXTRA_PLAN_COUNT} extra subscription plans`);

  // ────────────────────────────────────────────────────────────
  // UPSELL RULES
  // ────────────────────────────────────────────────────────────

  const upsellRules: any[] = [];

  for (let i = 1; i <= UPSELL_COUNT; i++) {
    const source =
      products[(i * 7) % products.length];

    let target =
      products[(i * 13 + 17) % products.length];

    if (target.id === source.id) {
      target = products[(i * 13 + 18) % products.length];
    }

    upsellRules.push({
      id: `bulk-upsell-${pad(i)}`,
      sourceProductId: source.id,
      suggestedProductId: target.id,
      reason:
        i % 3 === 0
          ? 'Frequently bundled in similar enterprise deals'
          : i % 3 === 1
            ? 'Improves deployment completeness and account value'
            : 'High-margin complementary recommendation',
      minMarginBps: 1200 + (i % 18) * 100,
      isPromotion: i % 7 === 0,
      isActive: true,
      createdAt: daysAgo(i % 180),
    });
  }

  await insertChunks(
    upsellRules,
    (data) => prisma.upsellRule.createMany({ data }),
  );

  console.log(`  ✓ ${UPSELL_COUNT} upsell/cross-sell rules`);

  // ────────────────────────────────────────────────────────────
  // QUOTATIONS + LINES
  // ────────────────────────────────────────────────────────────

  const statusPool = [
    'DRAFT',
    'DRAFT',
    'PENDING_MANAGER',
    'PENDING_MANAGER',
    'PENDING_FINANCE',
    'APPROVED',
    'FULFILLMENT_READY',
    'SENT_TO_CUSTOMER',
    'UNDER_NEGOTIATION',
    'CONFIRMED',
    'BILLED',
    'BILLED',
    'PAID',
    'PAID',
    'REJECTED',
    'REVISION',
  ];

  const quotations: any[] = [];
  const quoteLines: any[] = [];

  const quoteMeta = new Map<
    string,
    {
      status: string;
      lines: any[];
      customerId: string;
      salesRepId: string;
      createdAt: Date;
      riskScore: number;
      riskLevel: string;
    }
  >();

  for (let i = 1; i <= QUOTATION_COUNT; i++) {
    const status =
      statusPool[(i - 1) % statusPool.length];

    const customer =
      customers[(i * 11) % customers.length];

    const rep =
      salesReps[(i * 5) % salesReps.length];

    const createdDaysAgo = 1 + (i * 7) % 160;

    const shouldBeStalled =
      ['DRAFT', 'PENDING_MANAGER', 'PENDING_FINANCE', 'REVISION'].includes(status) &&
      i % 3 === 0;

    const updatedAt = shouldBeStalled
      ? daysAgo(8 + (i % 35))
      : daysAgo(i % 5);

    const createdAt = daysAgo(createdDaysAgo);

    const selectedProducts = [
      products[(i * 3) % products.length],
      products[(i * 7 + 11) % products.length],
      products[(i * 17 + 29) % products.length],
    ];

    // Ensure later lifecycle quotes frequently contain subscriptions.
    if (
      ['CONFIRMED', 'BILLED', 'PAID'].includes(status) ||
      i % 4 === 0
    ) {
      const subscriptions =
        products.filter((p) => p.type === 'SUBSCRIPTION');

      selectedProducts[2] =
        subscriptions[i % subscriptions.length];
    }

    const lineRecords: any[] = [];

    for (let lineIndex = 0; lineIndex < 3; lineIndex++) {
      const product = selectedProducts[lineIndex];

      const quantity =
        1 + ((i + lineIndex * 3) % 12);

      let discountBps: number;

      if (status === 'PENDING_FINANCE') {
        discountBps =
          [3200, 2800, 2400][lineIndex];
      } else if (
        status === 'PENDING_MANAGER' ||
        status === 'REVISION'
      ) {
        discountBps =
          [1700, 1400, 1100][lineIndex];
      } else if (status === 'REJECTED') {
        discountBps =
          [2600, 2100, 1800][lineIndex];
      } else {
        discountBps =
          [0, 300, 600, 900, 1200][
            (i + lineIndex) % 5
          ];
      }

      const tier = customer.tier;

      const tierPriceFactor =
        tier === 'GOLD'
          ? 0.94
          : tier === 'SILVER'
            ? 0.97
            : 1;

      const unitPrice =
        Math.round(product.unitPrice * tierPriceFactor);

      const subtotal =
        unitPrice * quantity;

      const discountAmount =
        Math.floor(subtotal * discountBps / 10000);

      const afterDiscount =
        subtotal - discountAmount;

      const taxBps =
        product.category === 'HARDWARE' ||
        product.category === 'ACCESSORY'
          ? 800
          : 500;

      const taxAmount =
        Math.floor(afterDiscount * taxBps / 10000);

      const total =
        afterDiscount + taxAmount;

      const costPrice =
        product.costPrice;

      const costTotal =
        costPrice * quantity;

      const marginAmount =
        afterDiscount - costTotal;

      const marginBps =
        afterDiscount > 0
          ? Math.round(marginAmount / afterDiscount * 10000)
          : 0;

      const lineId =
        `bulk-line-${pad(i)}-${lineIndex + 1}`;

      lineRecords.push({
        id: lineId,
        quotationId: `bulk-quote-${pad(i)}`,
        productId: product.id,
        productName: product.name,
        productCategory: product.category,
        description: product.description,
        quantity,
        unitPrice,
        lineDiscount: discountBps / 100,
        discountBps,
        discountAmount,
        afterDiscount,
        taxRate: taxBps,
        subtotal,
        taxAmount,
        total,
        costPrice,
        marginPercent: marginBps,
        sortOrder: lineIndex,
      });
    }

    const subtotal =
      lineRecords.reduce(
        (sum, line) => sum + line.subtotal,
        0,
      );

    const totalDiscount =
      lineRecords.reduce(
        (sum, line) => sum + line.discountAmount,
        0,
      );

    const taxTotal =
      lineRecords.reduce(
        (sum, line) => sum + line.taxAmount,
        0,
      );

    const total =
      lineRecords.reduce(
        (sum, line) => sum + line.total,
        0,
      );

    const totalAfterDiscount =
      lineRecords.reduce(
        (sum, line) => sum + line.afterDiscount,
        0,
      );

    const totalCost =
      lineRecords.reduce(
        (sum, line) =>
          sum + line.costPrice * line.quantity,
        0,
      );

    const marginPercent =
      totalAfterDiscount > 0
        ? Math.round(
            (totalAfterDiscount - totalCost) /
              totalAfterDiscount *
              10000,
          )
        : 0;

    let riskScore = 0;

    for (const line of lineRecords) {
      const allowed =
        Math.min(
          tierLimit(customer.tier),
          categoryLimit(line.productCategory),
        );

      const excess =
        Math.max(
          0,
          line.discountBps - allowed,
        );

      if (excess > 0 && totalAfterDiscount > 0) {
        riskScore += Math.floor(
          excess *
            (line.afterDiscount / totalAfterDiscount),
        );
      }
    }

    // Ensure PENDING_FINANCE examples are definitely high-risk.
    if (
      status === 'PENDING_FINANCE' &&
      riskScore <= 1500
    ) {
      riskScore = 1800 + (i % 700);
    }

    const level = riskLevel(riskScore);

    quotations.push({
      id: `bulk-quote-${pad(i)}`,
      number: `RQ-${String(100000 + i)}`,
      title:
        `${customer.name.split('(')[1]?.replace(')', '') ?? 'Enterprise'} ` +
        `Opportunity ${pad(i)}`,
      customerId: customer.id,
      salesRepId: rep.id,
      status,
      subtotal,
      taxTotal,
      total,
      orderDiscount: 0,
      orderDiscountBps: 0,
      totalDiscount,
      marginPercent,
      riskScore,
      riskLevel: level,
      version:
        ['DRAFT', 'PENDING_MANAGER'].includes(status)
          ? 1
          : 2 + (i % 4),
      notes:
        `Reviewer-generated realistic quotation ${pad(i)}. ` +
        `Used for filtering, pagination, approval and reporting tests.`,
      createdAt,
      updatedAt,
    });

    quoteLines.push(...lineRecords);

    quoteMeta.set(`bulk-quote-${pad(i)}`, {
      status,
      lines: lineRecords,
      customerId: customer.id,
      salesRepId: rep.id,
      createdAt,
      riskScore,
      riskLevel: level,
    });
  }

  await insertChunks(
    quotations,
    (data) => prisma.quotation.createMany({ data }),
    100,
  );

  await insertChunks(
    quoteLines,
    (data) => prisma.quotationLine.createMany({ data }),
    100,
  );

  console.log(`  ✓ ${QUOTATION_COUNT} quotations`);
  console.log(`  ✓ ${quoteLines.length} quotation lines`);

  // ────────────────────────────────────────────────────────────
  // APPROVALS + ACTIONS + AUDIT
  // ────────────────────────────────────────────────────────────

  const approvalRequests: any[] = [];
  const approvalActions: any[] = [];
  const auditLogs: any[] = [];

  let approvalCounter = 1;
  let actionCounter = 1;
  let auditCounter = 1;

  for (let i = 1; i <= QUOTATION_COUNT; i++) {
    const quoteId = `bulk-quote-${pad(i)}`;
    const meta = quoteMeta.get(quoteId)!;
    const manager =
      managers[i % managers.length];
    const finance =
      financeUsers[i % financeUsers.length];

    auditLogs.push({
      id: `bulk-audit-${pad(auditCounter++, 5)}`,
      quotationId: quoteId,
      entityType: 'Quotation',
      entityId: quoteId,
      action: 'QUOTATION_CREATED',
      userId: meta.salesRepId,
      details: 'Reviewer bulk quotation created',
      changes: '{}',
      reason: '',
      createdAt: meta.createdAt,
    });

    const needsApproval =
      meta.riskLevel !== 'NONE' ||
      [
        'PENDING_MANAGER',
        'PENDING_FINANCE',
        'REJECTED',
        'REVISION',
      ].includes(meta.status);

    if (!needsApproval) continue;

    const managerApprovalId =
      `bulk-approval-${pad(approvalCounter++, 5)}`;

    let managerStatus = 'APPROVED';

    if (
      meta.status === 'PENDING_MANAGER' ||
      meta.status === 'REVISION'
    ) {
      managerStatus = 'PENDING';
    } else if (meta.status === 'REJECTED') {
      managerStatus = 'REJECTED';
    }

    approvalRequests.push({
      id: managerApprovalId,
      quotationId: quoteId,
      status: managerStatus,
      step: 1,
      role: 'SALES_MANAGER',
      currentStep: 0,
      totalSteps:
        meta.riskLevel === 'HIGH' ||
        meta.status === 'PENDING_FINANCE'
          ? 2
          : 1,
      decidedAt:
        managerStatus === 'PENDING'
          ? null
          : daysAgo(Math.max(0, i % 5)),
      comment: '',
      reason:
        managerStatus === 'REJECTED'
          ? 'Commercial terms outside approved policy'
          : '',
      createdAt:
        meta.status === 'PENDING_MANAGER' && i % 2 === 0
          ? daysAgo(3 + (i % 10))
          : meta.createdAt,
      updatedAt: daysAgo(i % 3),
    });

    if (managerStatus === 'APPROVED') {
      approvalActions.push({
        id: `bulk-action-${pad(actionCounter++, 5)}`,
        approvalRequestId: managerApprovalId,
        userId: manager.id,
        action: 'APPROVE',
        reason: 'Approved during reviewer dataset generation',
        stepIndex: 1,
        createdAt: daysAgo(i % 5),
      });
    }

    if (managerStatus === 'REJECTED') {
      approvalActions.push({
        id: `bulk-action-${pad(actionCounter++, 5)}`,
        approvalRequestId: managerApprovalId,
        userId: manager.id,
        action: 'REJECT',
        reason: 'Commercial terms outside approved policy',
        stepIndex: 1,
        createdAt: daysAgo(i % 5),
      });
    }

    if (meta.status === 'REVISION') {
      approvalActions.push({
        id: `bulk-action-${pad(actionCounter++, 5)}`,
        approvalRequestId: managerApprovalId,
        userId: manager.id,
        action: 'RETURN_FOR_REVISION',
        reason:
          'Reduce discount or adjust product mix before resubmitting',
        stepIndex: 1,
        createdAt: daysAgo(1),
      });

      auditLogs.push({
        id: `bulk-audit-${pad(auditCounter++, 5)}`,
        quotationId: quoteId,
        entityType: 'Quotation',
        entityId: quoteId,
        action: 'QUOTATION_RETURNED',
        userId: manager.id,
        details:
          'Returned for revision: reduce discount or adjust product mix',
        changes: '{}',
        reason:
          'Reduce discount or adjust product mix before resubmitting',
        createdAt: daysAgo(1),
      });
    }

    const needsFinance =
      meta.riskLevel === 'HIGH' ||
      meta.status === 'PENDING_FINANCE';

    if (needsFinance) {
      const financeApprovalId =
        `bulk-approval-${pad(approvalCounter++, 5)}`;

      const financeStatus =
        meta.status === 'PENDING_FINANCE'
          ? 'PENDING'
          : ['PENDING_MANAGER', 'REVISION', 'REJECTED'].includes(
              meta.status,
            )
            ? 'PENDING'
            : 'APPROVED';

      approvalRequests.push({
        id: financeApprovalId,
        quotationId: quoteId,
        status: financeStatus,
        step: 2,
        role: 'FINANCE_OPS',
        currentStep: 1,
        totalSteps: 2,
        decidedAt:
          financeStatus === 'APPROVED'
            ? daysAgo(i % 4)
            : null,
        comment: '',
        reason: '',
        createdAt:
          meta.status === 'PENDING_FINANCE' && i % 2 === 0
            ? daysAgo(2 + (i % 9))
            : meta.createdAt,
        updatedAt: daysAgo(i % 2),
      });

      if (financeStatus === 'APPROVED') {
        approvalActions.push({
          id: `bulk-action-${pad(actionCounter++, 5)}`,
          approvalRequestId: financeApprovalId,
          userId: finance.id,
          action: 'APPROVE',
          reason: 'Finance approval completed',
          stepIndex: 2,
          createdAt: daysAgo(i % 4),
        });
      }
    }

    auditLogs.push({
      id: `bulk-audit-${pad(auditCounter++, 5)}`,
      quotationId: quoteId,
      entityType: 'Quotation',
      entityId: quoteId,
      action: 'QUOTATION_SUBMITTED',
      userId: meta.salesRepId,
      details:
        `Submitted with ${meta.riskLevel} risk (${Math.round(meta.riskScore)} bps)`,
      changes: '{}',
      reason: '',
      createdAt:
        new Date(meta.createdAt.getTime() + 3_600_000),
    });
  }

  await insertChunks(
    approvalRequests,
    (data) => prisma.approvalRequest.createMany({ data }),
  );

  await insertChunks(
    approvalActions,
    (data) => prisma.approvalAction.createMany({ data }),
  );

  await insertChunks(
    auditLogs,
    (data) => prisma.auditLog.createMany({ data }),
  );

  console.log(`  ✓ ${approvalRequests.length} approval requests`);
  console.log(`  ✓ ${approvalActions.length} approval actions`);
  console.log(`  ✓ ${auditLogs.length} audit records`);

  // ────────────────────────────────────────────────────────────
  // FULFILLMENT
  // ────────────────────────────────────────────────────────────

  const fulfillmentPlans: any[] = [];
  const fulfillmentLines: any[] = [];
  let fulfillmentCounter = 1;
  let fulfillmentLineCounter = 1;

  const fulfillmentStatuses = new Set([
    'FULFILLMENT_READY',
    'SENT_TO_CUSTOMER',
    'UNDER_NEGOTIATION',
    'CONFIRMED',
    'BILLED',
    'PAID',
  ]);

  for (let i = 1; i <= QUOTATION_COUNT; i++) {
    const quoteId = `bulk-quote-${pad(i)}`;
    const meta = quoteMeta.get(quoteId)!;

    if (!fulfillmentStatuses.has(meta.status)) continue;

    const planId =
      `bulk-fulfillment-${pad(fulfillmentCounter++, 5)}`;

    let planStatus = 'ALLOCATED';

    if (meta.status === 'PAID') {
      planStatus = i % 2 === 0 ? 'DELIVERED' : 'SHIPPED';
    } else if (meta.status === 'BILLED') {
      planStatus = i % 3 === 0 ? 'PENDING' : 'SHIPPED';
    } else if (meta.status === 'CONFIRMED') {
      planStatus = i % 2 === 0 ? 'PENDING' : 'ALLOCATED';
    }

    const planCreatedAt =
      planStatus === 'PENDING' && i % 2 === 0
        ? daysAgo(5 + (i % 12))
        : daysAgo(i % 3);

    fulfillmentPlans.push({
      id: planId,
      quotationId: quoteId,
      status: planStatus,
      createdAt: planCreatedAt,
      updatedAt: planCreatedAt,
    });

    for (let lineIndex = 0; lineIndex < meta.lines.length; lineIndex++) {
      const line = meta.lines[lineIndex];

      const warehouse =
        warehouses[(i + lineIndex * 3) % warehouses.length];

      const shouldBackorder =
        (i + lineIndex) % 17 === 0;

      fulfillmentLines.push({
        id:
          `bulk-fulfillment-line-${pad(fulfillmentLineCounter++, 6)}`,
        fulfillmentPlanId: planId,
        quotationLineId: line.id,
        warehouseId: warehouse.id,
        allocatedQty:
          shouldBackorder
            ? Math.max(0, line.quantity - 1)
            : line.quantity,
        isBackorder: shouldBackorder,
      });
    }
  }

  await insertChunks(
    fulfillmentPlans,
    (data) => prisma.fulfillmentPlan.createMany({ data }),
  );

  await insertChunks(
    fulfillmentLines,
    (data) => prisma.fulfillmentLine.createMany({ data }),
  );

  console.log(`  ✓ ${fulfillmentPlans.length} fulfillment plans`);
  console.log(`  ✓ ${fulfillmentLines.length} fulfillment allocations`);

  // ────────────────────────────────────────────────────────────
  // CUSTOMER PORTAL / NEGOTIATION
  // ────────────────────────────────────────────────────────────

  const customerFacingStatuses = new Set([
    'SENT_TO_CUSTOMER',
    'UNDER_NEGOTIATION',
    'CONFIRMED',
    'BILLED',
    'PAID',
  ]);

  const threads: any[] = [];
  const comments: any[] = [];
  const portalTokens: any[] = [];
  let threadCounter = 1;
  let commentCounter = 1;
  let tokenCounter = 1;

  for (let i = 1; i <= QUOTATION_COUNT; i++) {
    const quoteId = `bulk-quote-${pad(i)}`;
    const meta = quoteMeta.get(quoteId)!;

    if (!customerFacingStatuses.has(meta.status)) continue;

    const threadId =
      `bulk-thread-${pad(threadCounter++, 5)}`;

    threads.push({
      id: threadId,
      quotationId: quoteId,
      createdAt: daysAgo(i % 12),
    });

    comments.push(
      {
        id: `bulk-comment-${pad(commentCounter++, 6)}`,
        threadId,
        userId: meta.customerId,
        message:
          i % 3 === 0
            ? 'Can you improve pricing if we commit for a longer term?'
            : 'Please confirm delivery timeline and implementation support.',
        isChangeRequest: i % 4 === 0,
        proposedDiscount:
          i % 5 === 0 ? 2 + (i % 5) : null,
        createdAt: daysAgo(2),
      },
      {
        id: `bulk-comment-${pad(commentCounter++, 6)}`,
        threadId,
        userId: meta.salesRepId,
        message:
          'Thanks. We reviewed the request and updated the commercial proposal.',
        isChangeRequest: false,
        proposedDiscount: null,
        createdAt: daysAgo(1),
      },
    );

    portalTokens.push({
      id: `bulk-token-${pad(tokenCounter, 5)}`,
      token: `reviewer-portal-token-${pad(tokenCounter++, 5)}`,
      customerId: meta.customerId,
      quotationId: quoteId,
      expiresAt: daysFromNow(30),
      createdAt: daysAgo(i % 10),
    });
  }

  await insertChunks(
    threads,
    (data) => prisma.negotiationThread.createMany({ data }),
  );

  await insertChunks(
    comments,
    (data) => prisma.negotiationComment.createMany({ data }),
  );

  await insertChunks(
    portalTokens,
    (data) => prisma.customerAccessToken.createMany({ data }),
  );

  console.log(`  ✓ ${threads.length} negotiation threads`);
  console.log(`  ✓ ${comments.length} negotiation comments`);
  console.log(`  ✓ ${portalTokens.length} customer portal tokens`);

  // ────────────────────────────────────────────────────────────
  // BILLING + INVOICES + PAYMENTS
  // ────────────────────────────────────────────────────────────

  const allPlans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  const billingSchedules: any[] = [];
  const invoices: any[] = [];
  const payments: any[] = [];
  const creditNotes: any[] = [];

  let scheduleCounter = 1;
  let invoiceCounter = 1;
  let paymentCounter = 1;
  let creditCounter = 1;

  for (let i = 1; i <= QUOTATION_COUNT; i++) {
    const quoteId = `bulk-quote-${pad(i)}`;
    const meta = quoteMeta.get(quoteId)!;

    if (
      !['CONFIRMED', 'BILLED', 'PAID'].includes(meta.status)
    ) {
      continue;
    }

    const subscriptionLines =
      meta.lines.filter((line) => {
        const product =
          products.find((p) => p.id === line.productId);
        return product?.type === 'SUBSCRIPTION';
      });

    for (const line of subscriptionLines) {
      const plan =
        allPlans[
          (i + scheduleCounter) %
          allPlans.length
        ];

      billingSchedules.push({
        id: `bulk-schedule-${pad(scheduleCounter++, 6)}`,
        quotationId: quoteId,
        quotationLineId: line.id,
        subscriptionPlanId: plan.id,
        startDate: daysAgo(i % 25),
        nextBillingDate:
          plan.interval === 'YEARLY'
            ? daysFromNow(365)
            : plan.interval === 'QUARTERLY'
              ? daysFromNow(90)
              : daysFromNow(30),
        interval: plan.interval,
        amount: line.afterDiscount,
        status: i % 17 === 0 ? 'CANCELLED' : 'ACTIVE',
      });
    }

    if (!['BILLED', 'PAID'].includes(meta.status)) continue;

    const oneTimeLines =
      meta.lines.filter((line) => {
        const product =
          products.find((p) => p.id === line.productId);
        return product?.type !== 'SUBSCRIPTION';
      });

    if (oneTimeLines.length === 0) continue;

    const invoiceSubtotal =
      oneTimeLines.reduce(
        (sum, line) => sum + line.afterDiscount,
        0,
      );

    const invoiceTax =
      oneTimeLines.reduce(
        (sum, line) => sum + line.taxAmount,
        0,
      );

    const invoiceTotal =
      oneTimeLines.reduce(
        (sum, line) => sum + line.total,
        0,
      );

    const invoiceId =
      `bulk-invoice-${pad(invoiceCounter, 5)}`;

    let invoiceStatus =
      meta.status === 'PAID'
        ? 'PAID'
        : i % 3 === 0
          ? 'PARTIALLY_PAID'
          : 'SENT';

    invoices.push({
      id: invoiceId,
      quotationId: quoteId,
      number: `RINV-${100000 + invoiceCounter++}`,
      status: invoiceStatus,
      subtotal: invoiceSubtotal,
      taxTotal: invoiceTax,
      total: invoiceTotal,
      dueDate: daysFromNow(30),
      paidAt:
        invoiceStatus === 'PAID'
          ? daysAgo(i % 5)
          : null,
      createdAt: daysAgo(i % 20),
      updatedAt: daysAgo(i % 3),
    });

    if (invoiceStatus === 'PAID') {
      payments.push({
        id: `bulk-payment-${pad(paymentCounter++, 5)}`,
        invoiceId,
        amount: invoiceTotal,
        method:
          i % 2 === 0
            ? 'BANK_TRANSFER'
            : 'CARD',
        reference: `PAY-${100000 + i}`,
        paidAt: daysAgo(i % 5),
      });
    } else if (invoiceStatus === 'PARTIALLY_PAID') {
      payments.push({
        id: `bulk-payment-${pad(paymentCounter++, 5)}`,
        invoiceId,
        amount: Math.floor(invoiceTotal * 0.5),
        method: 'BANK_TRANSFER',
        reference: `PART-${100000 + i}`,
        paidAt: daysAgo(i % 4),
      });
    }

    if (i % 11 === 0) {
      creditNotes.push({
        id: `bulk-credit-${pad(creditCounter++, 5)}`,
        invoiceId,
        amount: Math.max(
          100,
          Math.floor(invoiceTotal * 0.05),
        ),
        reason:
          'Reviewer demo credit adjustment for service-level exception',
        createdAt: daysAgo(i % 6),
      });
    }
  }

  await insertChunks(
    billingSchedules,
    (data) => prisma.billingSchedule.createMany({ data }),
  );

  await insertChunks(
    invoices,
    (data) => prisma.invoice.createMany({ data }),
  );

  await insertChunks(
    payments,
    (data) => prisma.payment.createMany({ data }),
  );

  await insertChunks(
    creditNotes,
    (data) => prisma.creditNote.createMany({ data }),
  );

  console.log(`  ✓ ${billingSchedules.length} billing schedules`);
  console.log(`  ✓ ${invoices.length} invoices`);
  console.log(`  ✓ ${payments.length} payments`);
  console.log(`  ✓ ${creditNotes.length} credit notes`);

  // ────────────────────────────────────────────────────────────
  // STORED DEAL HEALTH ALERTS
  // ────────────────────────────────────────────────────────────

  const alertTypes = [
    'STALLED_DEAL',
    'DISCOUNT_ANOMALY',
    'DELIVERY_SLIPPAGE',
  ];

  const severities = ['INFO', 'WARNING', 'CRITICAL'];

  const alerts = Array.from(
    { length: DEAL_ALERT_COUNT },
    (_, idx) => {
      const i = idx + 1;

      return {
        id: `bulk-alert-${pad(i, 5)}`,
        quotationId:
          `bulk-quote-${pad((idx % QUOTATION_COUNT) + 1)}`,
        alertType:
          alertTypes[idx % alertTypes.length],
        severity:
          severities[(idx * 2) % severities.length],
        message:
          idx % 3 === 0
            ? 'Quotation inactive beyond configured threshold'
            : idx % 3 === 1
              ? 'Discount materially exceeds representative historical baseline'
              : 'Fulfillment promise may slip because allocation remains pending',
        isResolved: idx % 5 === 0,
        resolvedAt:
          idx % 5 === 0
            ? daysAgo(idx % 4)
            : null,
        createdAt: daysAgo(idx % 40),
      };
    },
  );

  await insertChunks(
    alerts,
    (data) => prisma.dealHealthAlert.createMany({ data }),
  );

  console.log(`  ✓ ${DEAL_ALERT_COUNT} stored Deal Health alerts`);

  // ────────────────────────────────────────────────────────────
  // FINAL COUNTS
  // ────────────────────────────────────────────────────────────

  const counts = {
    users: await prisma.user.count(),
    customers: await prisma.user.count({
      where: { role: 'CUSTOMER' },
    }),
    salesReps: await prisma.user.count({
      where: { role: 'SALES_REP' },
    }),
    products: await prisma.product.count(),
    variants: await prisma.productVariant.count(),
    warehouses: await prisma.warehouse.count(),
    stockRows: await prisma.stock.count(),
    upsellRules: await prisma.upsellRule.count(),
    quotations: await prisma.quotation.count(),
    quotationLines: await prisma.quotationLine.count(),
    approvals: await prisma.approvalRequest.count(),
    approvalActions: await prisma.approvalAction.count(),
    fulfillmentPlans: await prisma.fulfillmentPlan.count(),
    negotiationThreads: await prisma.negotiationThread.count(),
    billingSchedules: await prisma.billingSchedule.count(),
    invoices: await prisma.invoice.count(),
    payments: await prisma.payment.count(),
    alerts: await prisma.dealHealthAlert.count(),
    auditLogs: await prisma.auditLog.count(),
  };

  console.log('\n✅ Reviewer-scale seed completed successfully.\n');
  console.table(counts);

  console.log('\nReviewer test accounts (password: password123)');
  console.log('  Sales Rep:     reviewer.rep01@dealflow.test');
  console.log('  Manager:       reviewer.manager01@dealflow.test');
  console.log('  Finance/Ops:   reviewer.finance01@dealflow.test');
  console.log('  Customer:      customer001@reviewer-demo.test');
  console.log('\nExisting demo accounts remain untouched.');
}

main()
  .catch((error) => {
    console.error('\n❌ Reviewer seed failed:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

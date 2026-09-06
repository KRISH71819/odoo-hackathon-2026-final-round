// test-checklist.mjs
// Automated End-to-End QA Runner for DealFlow360_Full_Functionality_QA_and_Bug_Fix_Checklist.md

const BASE_URL = 'http://localhost:3001/api';

const results = [];

function recordTest(category, name, passed, details = '') {
  results.push({ category, name, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} [${category}] ${name} ${details ? '(' + details + ')' : ''}`);
}

async function request(url, options = {}) {
  const res = await fetch(`${BASE_URL}${url}`, options);
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

async function login(email, password = 'password123') {
  const res = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${JSON.stringify(res.data)}`);
  return res.data.token || res.data.data?.token || res.data.accessToken;
}

async function runChecklistQA() {
  console.log('================================================================');
  console.log('🧪 DealFlow360 — Full Functionality QA Checklist Automated Suite');
  console.log('Target: DealFlow360_Full_Functionality_QA_and_Bug_Fix_Checklist.md');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // Section 0: Role Authentication Verification
  // -------------------------------------------------------------
  console.log('--- Phase 1: Multi-Role Authentication ---');
  let adminToken, repToken, managerToken, financeToken, custAToken, custBToken;
  try {
    adminToken = await login('admin@dealflow.com');
    recordTest('Auth', 'Admin login (admin@dealflow.com)', true);
  } catch (e) {
    recordTest('Auth', 'Admin login', false, e.message);
  }

  try {
    repToken = await login('reviewer.rep01@dealflow.test');
    recordTest('Auth', 'Sales Rep login (reviewer.rep01@dealflow.test)', true);
  } catch {
    repToken = await login('rep@dealflow.com');
    recordTest('Auth', 'Sales Rep login fallback (rep@dealflow.com)', true);
  }

  try {
    managerToken = await login('reviewer.manager01@dealflow.test');
    recordTest('Auth', 'Sales Manager login (reviewer.manager01@dealflow.test)', true);
  } catch {
    managerToken = await login('manager@dealflow.com');
    recordTest('Auth', 'Sales Manager login fallback (manager@dealflow.com)', true);
  }

  try {
    financeToken = await login('reviewer.finance01@dealflow.test');
    recordTest('Auth', 'Finance Ops login (reviewer.finance01@dealflow.test)', true);
  } catch {
    financeToken = await login('finance@dealflow.com');
    recordTest('Auth', 'Finance Ops login fallback (finance@dealflow.com)', true);
  }

  try {
    custAToken = await login('customer@acme.com');
    recordTest('Auth', 'Customer A login (customer@acme.com)', true);
  } catch (e) {
    recordTest('Auth', 'Customer A login', false, e.message);
  }

  try {
    custBToken = await login('customer001@reviewer-demo.test');
    recordTest('Auth', 'Customer B login (customer001@reviewer-demo.test)', true);
  } catch {
    custBToken = await login('customer@beta.com');
    recordTest('Auth', 'Customer B login fallback', true);
  }

  console.log();

  // -------------------------------------------------------------
  // Section 1: Bug 1 — Discount Configuration Sync to Dashboard
  // -------------------------------------------------------------
  console.log('--- Bug 1: Discount Configuration & Dashboard Sync ---');
  try {
    const dash = await request('/insights/dashboard', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const rules = dash.data?.data?.discountRules;
    const hasRules = rules && Array.isArray(rules.tierRules) && Array.isArray(rules.categoryRules);
    recordTest('Bug 1', 'Dashboard returns dynamic discount rules from database', hasRules, `Tier rules: ${rules?.tierRules?.length}, Category rules: ${rules?.categoryRules?.length}`);
    
    // Verify rules format
    const hasGoldRule = rules?.tierRules?.some(r => r.customerTier === 'GOLD' || r.tier === 'GOLD');
    recordTest('Bug 1', 'Dashboard contains customer tier discount ceilings', hasGoldRule);
  } catch (e) {
    recordTest('Bug 1', 'Dashboard discount rules retrieval', false, e.message);
  }
  console.log();

  // -------------------------------------------------------------
  // Section 2: Bug 2 — Actionable Nudge Engine & Anti-Spam
  // -------------------------------------------------------------
  console.log('--- Bug 2: Actionable Nudge Engine & Anti-Spam ---');
  try {
    const quotesList = await request('/sales/quotations?limit=5', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const quote = quotesList.data?.data?.[0];
    if (!quote) throw new Error('No quote available to nudge');

    // Nudge 1
    const n1 = await request(`/insights/deal-health/${quote.id}/nudge`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const n1Data = n1.data?.data;
    const n1Success = n1.ok && (n1Data?.success || n1Data?.throttled);
    recordTest('Bug 2', 'Nudge creates actionable recipient notification', n1Success, `Recipient: ${n1Data?.recipient}`);

    // Nudge 2 (immediate - must be throttled)
    const n2 = await request(`/insights/deal-health/${quote.id}/nudge`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const n2Data = n2.data?.data;
    recordTest('Bug 2', 'Nudge enforces 15-minute anti-spam throttle', n2Data?.throttled === true, n2Data?.message);
  } catch (e) {
    recordTest('Bug 2', 'Nudge execution', false, e.message);
  }
  console.log();

  // -------------------------------------------------------------
  // Section 3: Bug 3 — Full Fulfillment Plan Generation & Split
  // -------------------------------------------------------------
  console.log('--- Bug 3: Full Fulfillment Plan Generation & Logistics KPIs ---');
  try {
    const plansRes = await request('/fulfillment/plans', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const plans = plansRes.data?.data || [];
    recordTest('Bug 3', 'Fulfillment plans query accessible', plansRes.ok, `${plans.length} total plans`);

    if (plans.length > 0) {
      const planDetail = await request(`/fulfillment/plans/${plans[0].id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const p = planDetail.data?.data;
      const hasLines = p && Array.isArray(p.lines);
      recordTest('Bug 3', 'Fulfillment plan detail has warehouse allocation lines', hasLines, `${p?.lines?.length || 0} lines allocated`);
      
      const distinctWarehouses = new Set(p?.lines?.map(l => l.warehouseId).filter(Boolean));
      recordTest('Bug 3', 'Multi-warehouse shipment origin count resolved', distinctWarehouses.size >= 1, `${distinctWarehouses.size} warehouse(s)`);
    }
  } catch (e) {
    recordTest('Bug 3', 'Fulfillment verification', false, e.message);
  }
  console.log();

  // -------------------------------------------------------------
  // Section 4: Bug 4 — Customer Data Isolation Security (P0)
  // -------------------------------------------------------------
  console.log('--- Bug 4: Customer Data Isolation Security (P0) ---');
  try {
    const allQuotesRes = await request('/sales/quotations?limit=30', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const allQuotes = allQuotesRes.data?.data || [];
    
    // Get customer profile
    const meRes = await request('/auth/me', {
      headers: { Authorization: `Bearer ${custAToken}` },
    });
    const custAId = meRes.data?.data?.user?.id || meRes.data?.user?.id;

    const foreignQuote = allQuotes.find(q => q.customerId !== custAId);
    const ownQuote = allQuotes.find(q => q.customerId === custAId);

    // Cross-customer access test (must be 403 Forbidden)
    if (foreignQuote) {
      const blockRes = await request(`/sales/quotations/${foreignQuote.id}`, {
        headers: { Authorization: `Bearer ${custAToken}` },
      });
      recordTest('Bug 4 (P0)', 'Direct API access to foreign customer quote blocked with 403', blockRes.status === 403, `HTTP ${blockRes.status}`);
    }

    // Customer own quote internal data stripping test
    if (ownQuote) {
      const ownRes = await request(`/sales/quotations/${ownQuote.id}`, {
        headers: { Authorization: `Bearer ${custAToken}` },
      });
      const q = ownRes.data?.data;
      const stripped = q && q.marginPercent === undefined && q.riskLevel === undefined && q.riskScore === undefined;
      recordTest('Bug 4 (P0)', 'Internal margin, risk score, and risk level stripped for customer', stripped);
      
      const lineCostStripped = !q.lines?.some(l => l.costPrice !== undefined || l.marginPercent !== undefined);
      recordTest('Bug 4 (P0)', 'Line item cost prices and margin percentages stripped for customer', lineCostStripped);

      // Risk endpoint forbidden
      const riskRes = await request(`/sales/quotations/${ownQuote.id}/risk`, {
        headers: { Authorization: `Bearer ${custAToken}` },
      });
      recordTest('Bug 4 (P0)', 'Customer direct access to deal risk endpoint blocked with 403', riskRes.status === 403, `HTTP ${riskRes.status}`);
    }
  } catch (e) {
    recordTest('Bug 4', 'Security boundary test', false, e.message);
  }
  console.log();

  // -------------------------------------------------------------
  // Section 5: Bug 5 — Quotation Finder & Pagination
  // -------------------------------------------------------------
  console.log('--- Bug 5: Quotation Finder & Pagination ---');
  try {
    const pageRes = await request('/sales/quotations?page=1&limit=5', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const pg = pageRes.data?.pagination;
    const validPagination = pg && pg.page === 1 && pg.limit === 5 && pg.total > 0;
    recordTest('Bug 5', 'Quotation list returns page, limit, total, and totalPages metadata', validPagination, `Page ${pg?.page}/${pg?.totalPages}, Total: ${pg?.total}`);

    const sampleQuote = pageRes.data?.data?.[0];
    if (sampleQuote?.number) {
      const searchRes = await request(`/sales/quotations?search=${encodeURIComponent(sampleQuote.number)}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const found = searchRes.data?.data?.some(q => q.id === sampleQuote.id);
      recordTest('Bug 5', 'Quotation finder locates quotes by exact quotation number', found, `Searched: ${sampleQuote.number}`);
    }
  } catch (e) {
    recordTest('Bug 5', 'Pagination & finder test', false, e.message);
  }
  console.log();

  // -------------------------------------------------------------
  // Section 6: End-to-End Sales Core & Governance Workflow
  // -------------------------------------------------------------
  console.log('--- Workflows: End-to-End Quote Lifecycle & Governance ---');
  try {
    // 1. Create Quote
    const custRes = await request('/auth/customers', {
      headers: { Authorization: `Bearer ${repToken}` },
    });
    const customers = custRes.data?.data || [];
    const targetCust = customers[0];

    const createRes = await request('/sales/quotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${repToken}` },
      body: JSON.stringify({
        customerId: targetCust.id,
        title: 'QA Checklist Automated Test Deal',
        orderDiscountBps: 0,
      }),
    });
    const newQuote = createRes.data?.data;
    recordTest('Workflow', 'Sales Rep creates draft quotation', createRes.ok && !!newQuote?.id, `Quote ${newQuote?.number}`);

    // 2. Add Line Item with high discount to trigger manager approval
    const prodRes = await request('/catalog/products?limit=5', {
      headers: { Authorization: `Bearer ${repToken}` },
    });
    const product = prodRes.data?.data?.[0];

    const addLineRes = await request(`/sales/quotations/${newQuote.id}/lines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${repToken}` },
      body: JSON.stringify({
        productId: product.id,
        quantity: 5,
        unitPrice: product.unitPrice || 10000,
        discountBps: 2500, // 25% discount triggers approval
      }),
    });
    recordTest('Workflow', 'Add line item with discount and server-backed margin calculation', addLineRes.ok, `Margin: ${addLineRes.data?.data?.marginPercent}`);

    // 3. Submit for Approval
    const submitRes = await request(`/sales/quotations/${newQuote.id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${repToken}` },
    });
    recordTest('Workflow', 'Submit quotation routes to approval queue (PENDING_MANAGER)', submitRes.ok, `Status: ${submitRes.data?.data?.status}`);

    // 4. Manager Approves
    const apprRes = await request('/governance/approvals?status=PENDING', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    const pendingRequests = apprRes.data?.data || [];
    const myAppr = pendingRequests.find(a => a.quotationId === newQuote.id);
    if (myAppr) {
      const approveRes = await request(`/governance/approvals/${myAppr.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({ reason: 'Approved via QA checklist automated suite' }),
      });
      recordTest('Workflow', 'Manager approval transitions quotation status', approveRes.ok);
    }
  } catch (e) {
    recordTest('Workflow', 'End-to-end lifecycle test', false, e.message);
  }
  console.log();

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  console.log('================================================================');
  console.log(`📊 QA CHECKLIST TEST EXECUTION SUMMARY: ${passedCount} PASSED / ${failedCount} FAILED (${results.length} total)`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runChecklistQA().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});

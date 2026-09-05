// ── DealFlow360 – Application Router ──

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './Layout.js';
import { LoginPage } from '../features/auth/LoginPage.js';
import { DashboardPage } from '../features/dashboard/DashboardPage.js';
import ProductListPage from '../features/catalog/ProductListPage.js';
import QuotationListPage from '../features/quotation/QuotationListPage.js';
import QuotationBuilderPage from '../features/quotation/QuotationBuilderPage.js';
import ApprovalListPage from '../features/approval/ApprovalListPage.js';
import ApprovalDetailPage from '../features/approval/ApprovalDetailPage.js';
// Phase 3 – Fulfillment
import FulfillmentListPage from '../features/fulfillment/FulfillmentListPage.js';
import FulfillmentDetailPage from '../features/fulfillment/FulfillmentDetailPage.js';
// Phase 3 – Billing/Subscriptions
import SubscriptionListPage from '../features/billing/SubscriptionListPage.js';
import BillingDetailPage from '../features/billing/BillingDetailPage.js';
// Phase 3 – Customer Portal (public, token-based, no internal layout)
import CustomerPortalPage from '../features/portal/CustomerPortalPage.js';
// Phase 4 – Invoice, Deal Health, Reports
import InvoiceListPage from '../features/invoice/InvoiceListPage.js';
import InvoiceDetailPage from '../features/invoice/InvoiceDetailPage.js';
import DealHealthPage from '../features/dealhealth/DealHealthPage.js';

// Lazy-load reports (heavy charting deps)
const ReportsPage = React.lazy(() => import('../features/reports/ReportsPage.js'));

export function AppRouter() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Customer portal (public, token-based, no internal layout) */}
      <Route path="/portal/:token" element={<CustomerPortalPage />} />

      {/* Internal protected routes */}
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />

        {/* Phase 2 */}
        <Route path="products" element={<ProductListPage />} />
        <Route path="quotations" element={<QuotationListPage />} />
        <Route path="quotations/:id" element={<QuotationBuilderPage />} />
        <Route path="approvals" element={<ApprovalListPage />} />
        <Route path="approvals/:id" element={<ApprovalDetailPage />} />

        {/* Phase 3 – Fulfillment */}
        <Route path="fulfillment" element={<FulfillmentListPage />} />
        <Route path="fulfillment/:id" element={<FulfillmentDetailPage />} />

        {/* Phase 3 – Subscriptions / Billing */}
        <Route path="subscriptions" element={<SubscriptionListPage />} />
        <Route path="billing/:quotationId" element={<BillingDetailPage />} />

        {/* Phase 4 – Invoices */}
        <Route path="invoices" element={<InvoiceListPage />} />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />

        {/* Phase 4 – Deal Health */}
        <Route path="deal-health" element={<DealHealthPage />} />

        {/* Phase 4 – Reports (lazy) */}
        <Route path="reports" element={
          <React.Suspense fallback={<div className="flex items-center justify-center p-8"><div className="w-6 h-6 border-2 border-df-border border-t-df-nav rounded-full animate-spin" /></div>}>
            <ReportsPage />
          </React.Suspense>
        } />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

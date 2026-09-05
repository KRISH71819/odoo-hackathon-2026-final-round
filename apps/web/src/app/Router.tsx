// ── DealFlow360 – Application Router ──

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './Layout.js';
import { LoginPage } from '../features/auth/LoginPage.js';
import { DashboardPage } from '../features/dashboard/DashboardPage.js';
import { PlaceholderPage } from '../features/shared/PlaceholderPage.js';
import ProductListPage from '../features/catalog/ProductListPage.js';
import QuotationListPage from '../features/quotation/QuotationListPage.js';
import QuotationBuilderPage from '../features/quotation/QuotationBuilderPage.js';
import ApprovalListPage from '../features/approval/ApprovalListPage.js';
import ApprovalDetailPage from '../features/approval/ApprovalDetailPage.js';

// ── Placeholder route configs for future phases ──
const placeholders = {
  customers: {
    title: 'Customers',
    phase: 2,
    description: 'Customer management with tier tracking (Bronze, Silver, Gold).',
    features: ['Customer list with tier badges', 'Customer detail with quotation history', 'Tier-based pricing rules'],
  },
  fulfillment: {
    title: 'Fulfillment & Stock',
    phase: 3,
    description: 'Warehouse fulfillment split, stock tracking, and backorder management.',
    features: [
      'Recommended warehouse split based on live stock',
      'Manual override with validation',
      'Backorder creation and consolidation',
      'Shipment count and cost estimation',
    ],
  },
  subscriptions: {
    title: 'Subscriptions',
    phase: 3,
    description: 'Subscription plan management with billing schedules.',
    features: [
      'Active subscriptions list',
      'One-time vs recurring line separation',
      'Billing schedule display',
      'Mid-cycle proration and cancellation',
    ],
  },
  invoices: {
    title: 'Invoices',
    phase: 4,
    description: 'Invoice generation, payment tracking, and credit notes.',
    features: [
      'Invoice list with status tracking',
      'Payment recording',
      'Credit note management',
      'Invoice status lifecycle',
    ],
  },
  'deal-health': {
    title: 'Deal Health & Anomalies',
    phase: 4,
    description: 'Dashboard for stalled deals, discount anomalies, and delivery slippage.',
    features: [
      'Stalled deal detection',
      'Discount anomaly alerts',
      'Delivery promise slippage',
      'Nudge/escalation actions',
    ],
  },
  reports: {
    title: 'Reports & Analytics',
    phase: 4,
    description: 'Sales performance reports with filtering and PDF/XLS export.',
    features: [
      'Period, rep, status, product filters',
      'PDF and XLS export',
      'Sales performance charts',
      'KPI cards with live data',
    ],
  },
};

export function AppRouter() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes */}
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        
        {/* Phase 2 implemented routes */}
        <Route path="products" element={<ProductListPage />} />
        <Route path="quotations" element={<QuotationListPage />} />
        <Route path="quotations/:id" element={<QuotationBuilderPage />} />
        <Route path="approvals" element={<ApprovalListPage />} />
        <Route path="approvals/:id" element={<ApprovalDetailPage />} />

        {/* Placeholder routes for remaining phases */}
        {Object.entries(placeholders).map(([path, config]) => (
          <Route
            key={path}
            path={path}
            element={<PlaceholderPage {...config} />}
          />
        ))}
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

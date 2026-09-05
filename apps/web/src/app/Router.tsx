// ── DealFlow360 – Application Router ──

import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './Layout.js';
import { LoginPage } from '../features/auth/LoginPage.js';
import { DashboardPage } from '../features/dashboard/DashboardPage.js';
import { PlaceholderPage } from '../features/shared/PlaceholderPage.js';

// ── Placeholder route configs ──
const placeholders = {
  customers: {
    title: 'Customers',
    phase: 2,
    description: 'Customer management with tier tracking (Bronze, Silver, Gold).',
    features: ['Customer list with tier badges', 'Customer detail with quotation history', 'Tier-based pricing rules'],
  },
  quotations: {
    title: 'Quotations',
    phase: 2,
    description: 'Quotation list, pipeline view, and quotation builder with live totals and margin.',
    features: [
      'Quotation pipeline (Kanban-style)',
      'Quotation builder with product lines',
      'Line/order discounts with live margin indicator',
      'Auto-routing to approval based on risk score',
    ],
  },
  approvals: {
    title: 'Approvals',
    phase: 2,
    description: 'Approval queue with blended risk scores and audit trail.',
    features: [
      'Approval queue with risk score display',
      'Approve, reject, or return-for-revision actions',
      'Full audit trail per quotation',
      'Multi-step approval (Manager → Finance)',
    ],
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
  products: {
    title: 'Product Catalog',
    phase: 2,
    description: 'Product and price list management (backend configuration area).',
    features: [
      'Product CRUD with variants',
      'Price list management per tier',
      'Category and type classification',
      'Discount tier and approval chain setup',
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

// ── DealFlow360 – Dashboard Page (Phase 4 – Live Data) ──

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader, Panel, StatusBadge, PrimaryButton, Spinner } from '../../components/ui.js';
import { useAuth } from '../../lib/auth.js';
import { api } from '../../lib/api.js';
import { formatDateTime } from '../../lib/format.js';

function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<any>('/insights/dashboard'),
    refetchInterval: 30000, // refresh every 30s
  });
}

export function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useDashboard();
  const kpi = data?.data;

  return (
    <div>
      <PageHeader
        title="Sales Dashboard"
        subtitle={`Welcome back, ${user?.name}`}
      >
        <Link to="/deal-health"><PrimaryButton>Deal Health</PrimaryButton></Link>
        <Link to="/reports"><PrimaryButton>Reports</PrimaryButton></Link>
      </PageHeader>

      {isLoading ? <Spinner /> : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/approvals" className="block">
              <Panel title="Pending Approvals">
                <div className="text-2xl font-bold text-df-nav">{kpi?.pendingApprovals ?? 0}</div>
                <p className="text-xs text-df-text-dim mt-1">Awaiting review</p>
              </Panel>
            </Link>
            <Link to="/quotations" className="block">
              <Panel title="Open Quotations">
                <div className="text-2xl font-bold text-df-nav">{kpi?.openQuotes ?? 0}</div>
                <p className="text-xs text-df-text-dim mt-1">Draft / Pending / Revision</p>
              </Panel>
            </Link>
            <Link to="/deal-health" className="block">
              <Panel title="At-Risk Deals">
                <div className="text-2xl font-bold text-amber-400">{kpi?.atRiskDeals ?? 0}</div>
                <p className="text-xs text-df-text-dim mt-1">Medium or High risk</p>
              </Panel>
            </Link>
          </div>

          <Panel title="Recent Activity" className="mt-4">
            {(kpi?.recentActivity ?? []).length === 0 ? (
              <p className="text-sm text-df-text-muted">No recent activity</p>
            ) : (
              <div className="space-y-1">
                {(kpi?.recentActivity ?? []).map((entry: any) => (
                  <div key={entry.id} className="flex items-center gap-3 py-2 border-b border-df-border/50 last:border-0 text-xs">
                    <div className="w-2 h-2 rounded-full bg-df-nav flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-df-text font-medium">{entry.user?.name ?? 'System'}</span>
                      <span className="text-df-text-muted ml-1.5">
                        {entry.action.replace(/_/g, ' ').toLowerCase()}
                      </span>
                      {entry.quotation && (
                        <Link
                          to={`/quotations/${entry.quotation.id}`}
                          className="text-df-nav hover:underline ml-1.5"
                        >
                          {entry.quotation.number}
                        </Link>
                      )}
                    </div>
                    <span className="text-df-text-dim flex-shrink-0">{formatDateTime(entry.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Quick Links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <Link to="/quotations" className="block">
              <Panel><div className="text-center text-xs text-df-text-muted hover:text-df-text">📋 Quotations</div></Panel>
            </Link>
            <Link to="/invoices" className="block">
              <Panel><div className="text-center text-xs text-df-text-muted hover:text-df-text">💳 Invoices</div></Panel>
            </Link>
            <Link to="/fulfillment" className="block">
              <Panel><div className="text-center text-xs text-df-text-muted hover:text-df-text">📦 Fulfillment</div></Panel>
            </Link>
            <Link to="/products" className="block">
              <Panel><div className="text-center text-xs text-df-text-muted hover:text-df-text">🏷️ Products</div></Panel>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

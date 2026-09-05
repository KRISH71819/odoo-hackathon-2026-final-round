// ── DealFlow360 – Dashboard Page ──

import React from 'react';
import { PageHeader, Panel, NoticeStrip, StatusBadge } from '../../components/ui.js';
import { useAuth } from '../../lib/auth.js';

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <PageHeader
        title="Sales Dashboard"
        subtitle={`Welcome back, ${user?.name}`}
      />

      <NoticeStrip variant="info">
        Dashboard data will be populated in Phase 4 with live deal health, anomaly alerts, and reporting metrics.
      </NoticeStrip>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <Panel title="Pending Approvals">
          <div className="text-2xl font-bold text-df-nav">—</div>
          <p className="text-xs text-df-text-dim mt-1">Phase 2</p>
        </Panel>
        <Panel title="Open Quotations">
          <div className="text-2xl font-bold text-df-nav">—</div>
          <p className="text-xs text-df-text-dim mt-1">Phase 2</p>
        </Panel>
        <Panel title="At-Risk Deals">
          <div className="text-2xl font-bold text-df-warning">—</div>
          <p className="text-xs text-df-text-dim mt-1">Phase 4</p>
        </Panel>
      </div>

      <Panel title="Recent Activity" className="mt-4">
        <p className="text-sm text-df-text-muted">
          Activity feed will show recent quotation changes, approvals, and customer interactions.
        </p>
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-df-border last:border-0">
              <div className="w-2 h-2 rounded-full bg-df-border" />
              <div className="flex-1">
                <div className="h-3 bg-df-border rounded w-3/4 animate-pulse" />
              </div>
              <StatusBadge label="Phase 2+" variant="neutral" />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// ── Deal Health Page (Phase 4) ──
import React from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Panel, StatusBadge, PrimaryButton, Spinner, NoticeStrip, Badge } from '../../components/ui.js';
import { formatCurrency, formatDate } from '../../lib/format.js';
import { useDealHealth, useNudge } from './useDealHealth.js';

export default function DealHealthPage() {
  const { data, isLoading } = useDealHealth();
  const nudge = useNudge();

  if (isLoading) return <Spinner />;
  const health = data?.data;
  if (!health) return <NoticeStrip variant="danger">Failed to load deal health data</NoticeStrip>;

  const { stalledDeals, discountAnomalies, deliverySlippage, approvalAging = [] } = health;

  return (
    <div>
      <PageHeader title="Deal Health" subtitle="Monitor stalled deals, discount anomalies, and delivery slippage" />

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Panel>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-400">{stalledDeals?.length ?? 0}</div>
            <div className="text-xs text-df-text-muted mt-1">Stalled Deals</div>
          </div>
        </Panel>
        <Panel>
          <div className="text-center">
            <div className="text-2xl font-bold text-rose-400">{discountAnomalies?.length ?? 0}</div>
            <div className="text-xs text-df-text-muted mt-1">Discount Anomalies</div>
          </div>
        </Panel>
        <Panel>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{deliverySlippage?.length ?? 0}</div>
            <div className="text-xs text-df-text-muted mt-1">Delivery Slippage</div>
          </div>
        </Panel>
        <Panel>
          <div className="text-center">
            <div className="text-2xl font-bold text-violet-400">{approvalAging?.length ?? 0}</div>
            <div className="text-xs text-df-text-muted mt-1">Aged Approvals</div>
          </div>
        </Panel>
      </div>

      {/* Stalled Deals */}
      <Panel title="Stalled Deals" className="mb-4">
        {stalledDeals?.length === 0 ? (
          <p className="text-xs text-df-text-muted">No stalled deals detected ✓</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-df-border text-left text-df-text-muted">
                  <th className="pb-2 pr-3">Quote</th>
                  <th className="pb-2 pr-3">Customer</th>
                  <th className="pb-2 pr-3">Rep</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Last Updated</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody className="text-df-text">
                {stalledDeals.map((q: any) => (
                  <tr key={q.id} className="border-b border-df-border/30">
                    <td className="py-2 pr-3">
                      <Link to={`/quotations/${q.id}`} className="text-df-nav hover:underline">{q.number}</Link>
                    </td>
                    <td className="py-2 pr-3">{q.customer?.name}</td>
                    <td className="py-2 pr-3">{q.salesRep?.name}</td>
                    <td className="py-2 pr-3"><StatusBadge status={q.status} /></td>
                    <td className="py-2 pr-3">{formatDate(q.updatedAt)}</td>
                    <td className="py-2">
                      <PrimaryButton
                        onClick={() => nudge.mutate(q.id)}
                        disabled={nudge.isPending}
                      >
                        Nudge
                      </PrimaryButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Discount Anomalies */}
      <Panel title="Discount Anomalies" className="mb-4">
        {discountAnomalies?.length === 0 ? (
          <p className="text-xs text-df-text-muted">No discount anomalies detected ✓</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {discountAnomalies.map((a: any) => (
              <div key={a.quotation.id} className="border border-df-border rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <Link to={`/quotations/${a.quotation.id}`} className="text-xs text-df-nav hover:underline font-medium">
                    {a.quotation.number}
                  </Link>
                  <Badge variant={a.severity === 'CRITICAL' ? 'danger' : 'warning'}>{a.severity}</Badge>
                </div>
                <div className="text-xs text-df-text-muted">
                  Rep: {a.quotation.salesRep?.name}
                </div>
                <div className="text-xs mt-1">
                  <span className="text-df-text-muted">Quote avg: </span>
                  <span className="text-rose-400">{(a.quoteAvgDiscountBps / 100).toFixed(1)}%</span>
                  <span className="text-df-text-muted ml-2">Rep avg: </span>
                  <span className="text-emerald-400">{(a.repAvgDiscountBps / 100).toFixed(1)}%</span>
                </div>
                <PrimaryButton
                  className="mt-2"
                  onClick={() => nudge.mutate(a.quotation.id)}
                  disabled={nudge.isPending}
                >
                  Nudge
                </PrimaryButton>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Approval Aging" className="mb-4">
        {approvalAging.length === 0 ? <p className="text-xs text-df-text-muted">No aged approvals ✓</p> : (
          <div className="space-y-2">{approvalAging.map((a: any) => (
            <div key={a.id} className="flex items-center justify-between border-b border-df-border/30 py-2 text-xs">
              <Link to={`/quotations/${a.quotationId}`} className="text-df-nav hover:underline">{a.quotation?.number}</Link>
              <span className="text-df-text-muted">{a.role.replace(/_/g, ' ')} pending since {formatDate(a.createdAt)}</span>
              <PrimaryButton onClick={() => nudge.mutate(a.quotationId)} disabled={nudge.isPending}>Nudge</PrimaryButton>
            </div>
          ))}</div>
        )}
      </Panel>

      {/* Delivery Slippage */}
      <Panel title="Delivery Slippage">
        {deliverySlippage?.length === 0 ? (
          <p className="text-xs text-df-text-muted">No delivery slippage detected ✓</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-df-border text-left text-df-text-muted">
                  <th className="pb-2 pr-3">Quote</th>
                  <th className="pb-2 pr-3">Customer</th>
                  <th className="pb-2 pr-3">Plan Created</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody className="text-df-text">
                {deliverySlippage.map((fp: any) => (
                  <tr key={fp.id} className="border-b border-df-border/30">
                    <td className="py-2 pr-3">
                      <Link to={`/fulfillment/${fp.id}`} className="text-df-nav hover:underline">
                        {fp.quotation?.number}
                      </Link>
                    </td>
                    <td className="py-2 pr-3">{fp.quotation?.customer?.name}</td>
                    <td className="py-2 pr-3">{formatDate(fp.createdAt)}</td>
                    <td className="py-2">
                      <PrimaryButton
                        onClick={() => nudge.mutate(fp.quotation?.id)}
                        disabled={nudge.isPending}
                      >
                        Nudge
                      </PrimaryButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

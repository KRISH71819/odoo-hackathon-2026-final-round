// ── Fulfillment List Page ─────────────────────────────────────
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Panel, StatusBadge, Spinner } from '../../components/ui';
import { useFulfillmentPlans } from './useFulfillment';
import { formatDate } from '../../lib/format';

export default function FulfillmentListPage() {
  const { data, isLoading, error } = useFulfillmentPlans();
  const navigate = useNavigate();
  const plans = data?.data ?? [];

  return (
    <div>
      <PageHeader title="Fulfillment & Stock" subtitle="Warehouse allocation plans and backorder management" />
      {isLoading && <Spinner />}
      {error && (
        <div className="text-df-danger text-sm py-4">Failed to load fulfillment plans.</div>
      )}
      {!isLoading && plans.length === 0 && (
        <Panel>
          <p className="text-df-text-muted text-sm">
            No fulfillment plans yet. Plans are created after quotations are approved.
          </p>
        </Panel>
      )}
      {plans.length > 0 && (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-df-border text-df-text-muted">
                  <th className="text-left py-2 pr-4 font-medium">Quote #</th>
                  <th className="text-left py-2 pr-4 font-medium">Customer</th>
                  <th className="text-left py-2 pr-4 font-medium">Status</th>
                  <th className="text-left py-2 pr-4 font-medium">Lines</th>
                  <th className="text-left py-2 pr-4 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan: any) => (
                  <tr
                    key={plan.id}
                    className="border-b border-df-border hover:bg-df-border/30 cursor-pointer transition-colors"
                    onClick={() => navigate(`/fulfillment/${plan.id}`)}
                  >
                    <td className="py-2 pr-4 font-mono text-df-nav">{plan.quotation?.number ?? '—'}</td>
                    <td className="py-2 pr-4 text-df-text">{plan.quotation?.customer?.name ?? '—'}</td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={plan.status} />
                    </td>
                    <td className="py-2 pr-4 text-df-text-muted">{plan.lines?.length ?? 0} allocation(s)</td>
                    <td className="py-2 pr-4 text-df-text-muted">{formatDate(plan.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}

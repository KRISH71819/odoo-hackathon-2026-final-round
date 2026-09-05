// ── Fulfillment Detail Page ───────────────────────────────────
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PageHeader,
  Panel,
  StatusBadge,
  PrimaryButton,
  SecondaryButton,
  DangerButton,
  NoticeStrip,
  Spinner,
} from '../../components/ui';
import { formatCurrency } from '../../lib/format';
import {
  useFulfillmentPlan,
  useAcceptFulfillmentPlan,
  useCreateBackorder,
  useConsolidateBackorder,
} from './useFulfillment';

export default function FulfillmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useFulfillmentPlan(id!);
  const accept = useAcceptFulfillmentPlan();
  const createBackorder = useCreateBackorder();
  const consolidate = useConsolidateBackorder();
  const [error, setError] = useState<string | null>(null);

  const plan = data?.data;
  const hasBackorderLines = plan?.lines?.some((l: any) => l.isBackorder);

  async function handleAction(fn: () => Promise<any>, label: string) {
    setError(null);
    try {
      await fn();
      refetch();
    } catch (e: any) {
      setError(e?.message ?? `${label} failed`);
    }
  }

  if (isLoading) return <Spinner />;
  if (!plan) return <div className="text-df-danger text-sm py-4">Fulfillment plan not found.</div>;

  const allocated = plan.lines?.filter((l: any) => !l.isBackorder) ?? [];
  const backordered = plan.lines?.filter((l: any) => l.isBackorder) ?? [];

  return (
    <div>
      <PageHeader
        title={`Fulfillment Plan — ${plan.quotation?.number ?? ''}`}
        subtitle={`Customer: ${plan.quotation?.customer?.name ?? '—'}`}
        actions={
          <button
            className="text-xs text-df-text-muted hover:text-df-text"
            onClick={() => navigate('/fulfillment')}
          >
            ← Back to list
          </button>
        }
      />

      {error && <NoticeStrip variant="danger" className="mb-4">{error}</NoticeStrip>}

      {/* Plan Status */}
      <div className="flex items-center gap-3 mb-4">
        <StatusBadge status={plan.status} />
        {hasBackorderLines && (
          <NoticeStrip variant="warning" className="text-xs">
            This plan has backorder lines. Stock is insufficient for full fulfillment.
          </NoticeStrip>
        )}
      </div>

      {/* Allocated Lines */}
      <Panel title="Allocated Lines" className="mb-4">
        {allocated.length === 0 ? (
          <p className="text-df-text-muted text-xs">No allocated lines.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-df-border text-df-text-muted">
                <th className="text-left py-2 pr-4 font-medium">Product</th>
                <th className="text-left py-2 pr-4 font-medium">Warehouse</th>
                <th className="text-right py-2 pr-4 font-medium">Qty</th>
                <th className="text-right py-2 font-medium">Ship Weight</th>
              </tr>
            </thead>
            <tbody>
              {allocated.map((line: any) => (
                <tr key={line.id} className="border-b border-df-border/50">
                  <td className="py-2 pr-4 text-df-text">{line.quotationLine?.productName ?? '—'}</td>
                  <td className="py-2 pr-4 text-df-text-muted">{line.warehouse?.name ?? '—'}</td>
                  <td className="py-2 pr-4 text-right font-mono">{line.allocatedQty}</td>
                  <td className="py-2 text-right text-df-text-muted">{line.warehouse?.shippingCostWeight ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      {/* Backorder Lines */}
      {backordered.length > 0 && (
        <Panel title="Backorder Lines" className="mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-df-border text-df-text-muted">
                <th className="text-left py-2 pr-4 font-medium">Product</th>
                <th className="text-left py-2 pr-4 font-medium">Warehouse</th>
                <th className="text-right py-2 font-medium">Qty Pending</th>
              </tr>
            </thead>
            <tbody>
              {backordered.map((line: any) => (
                <tr key={line.id} className="border-b border-df-border/50">
                  <td className="py-2 pr-4 text-df-text">{line.quotationLine?.productName ?? '—'}</td>
                  <td className="py-2 pr-4 text-df-text-muted">{line.warehouse?.name ?? '—'}</td>
                  <td className="py-2 text-right font-mono text-df-text font-semibold">{line.allocatedQty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {/* Actions */}
      <Panel title="Actions">
        <div className="flex flex-wrap gap-2">
          {plan.status === 'PENDING' && (
            <PrimaryButton
              disabled={accept.isPending}
              onClick={() => handleAction(() => accept.mutateAsync(plan.id), 'Accept')}
            >
              {accept.isPending ? 'Accepting…' : 'Accept Plan'}
            </PrimaryButton>
          )}
          {(plan.status === 'ALLOCATED' || plan.status === 'PARTIALLY_ALLOCATED') && hasBackorderLines && (
            <>
              <SecondaryButton
                disabled={createBackorder.isPending}
                onClick={() => handleAction(() => createBackorder.mutateAsync(plan.id), 'Backorder')}
              >
                Mark as Backordered
              </SecondaryButton>
              <PrimaryButton
                disabled={consolidate.isPending}
                onClick={() => handleAction(() => consolidate.mutateAsync(plan.id), 'Consolidate')}
              >
                {consolidate.isPending ? 'Consolidating…' : 'Consolidate Backorder'}
              </PrimaryButton>
            </>
          )}
          {plan.status === 'BACKORDERED' && (
            <PrimaryButton
              disabled={consolidate.isPending}
              onClick={() => handleAction(() => consolidate.mutateAsync(plan.id), 'Consolidate')}
            >
              {consolidate.isPending ? 'Checking stock…' : 'Try to Consolidate'}
            </PrimaryButton>
          )}
        </div>
      </Panel>
    </div>
  );
}

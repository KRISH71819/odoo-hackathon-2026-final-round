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
import { useAuth } from '../../lib/auth.js';
import { UserRole } from '@dealflow360/contracts';
import {
  useFulfillmentPlan,
  useAcceptFulfillmentPlan,
  useCreateBackorder,
  useConsolidateBackorder,
  useOverrideFulfillmentPlan,
  useWarehouses,
} from './useFulfillment';

export default function FulfillmentDetailPage() {
  const { user } = useAuth();
  const canOperate = user?.role === UserRole.FINANCE_OPS || user?.role === UserRole.ADMIN;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useFulfillmentPlan(id!);
  const accept = useAcceptFulfillmentPlan();
  const createBackorder = useCreateBackorder();
  const consolidate = useConsolidateBackorder();
  const overridePlan = useOverrideFulfillmentPlan();
  const { data: warehousesData } = useWarehouses();
  const [error, setError] = useState<string | null>(null);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideLines, setOverrideLines] = useState<any[]>([]);

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

  // Compute fulfillment logistics metrics
  const uniqueWarehouseIds = new Set(allocated.map((l: any) => l.warehouseId).filter(Boolean));
  const shipmentCount = uniqueWarehouseIds.size;
  const estimatedShippingCost = allocated.reduce((sum: number, l: any) => {
    const weight = Number(l.warehouse?.shippingCostWeight ?? 1);
    return sum + (Number(l.allocatedQty) || 0) * weight;
  }, 0);

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

      {/* Plan Logistics KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-df-surface border border-df-border rounded-lg p-3">
          <div className="text-[11px] uppercase tracking-wider text-df-text-muted font-medium">Plan Status</div>
          <div className="mt-1 flex items-center">
            <StatusBadge status={plan.status} />
          </div>
        </div>
        <div className="bg-df-surface border border-df-border rounded-lg p-3">
          <div className="text-[11px] uppercase tracking-wider text-df-text-muted font-medium">Shipment Origins</div>
          <div className="mt-1 text-lg font-bold text-df-text">
            {shipmentCount} <span className="text-xs font-normal text-df-text-muted">{shipmentCount === 1 ? 'warehouse' : 'warehouses (split)'}</span>
          </div>
        </div>
        <div className="bg-df-surface border border-df-border rounded-lg p-3">
          <div className="text-[11px] uppercase tracking-wider text-df-text-muted font-medium">Allocated Units</div>
          <div className="mt-1 text-lg font-bold text-df-text">
            {allocated.reduce((sum: number, l: any) => sum + (Number(l.allocatedQty) || 0), 0)}
          </div>
        </div>
        <div className="bg-df-surface border border-df-border rounded-lg p-3">
          <div className="text-[11px] uppercase tracking-wider text-df-text-muted font-medium">Est. Shipping Cost</div>
          <div className="mt-1 text-lg font-bold text-df-text">
            {formatCurrency(estimatedShippingCost)}
          </div>
        </div>
      </div>

      {hasBackorderLines && (
        <NoticeStrip variant="warning" className="text-xs mb-4">
          This plan has backorder lines ({backordered.reduce((s: number, l: any) => s + (Number(l.allocatedQty) || 0), 0)} units). Stock is insufficient for immediate full shipment.
        </NoticeStrip>
      )}

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

      {canOperate && showOverride && plan.status === 'PENDING' && (
        <Panel title="Manual Override" className="mb-4">
          <div className="space-y-3">
            {overrideLines.map((line, index) => (
              <div key={`${line.quotationLineId}-${index}`} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                <div className="text-xs text-df-text">{plan.quotation.lines.find((q: any) => q.id === line.quotationLineId)?.productName}</div>
                <select className="bg-df-bg border border-df-border rounded px-2 py-2 text-xs" value={line.warehouseId} onChange={(e) => setOverrideLines(v => v.map((x, i) => i === index ? { ...x, warehouseId: e.target.value } : x))}>
                  {(warehousesData?.data || []).map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
                <input className="bg-df-bg border border-df-border rounded px-2 py-2 text-xs" type="number" min={0} value={line.allocatedQty} onChange={(e) => setOverrideLines(v => v.map((x, i) => i === index ? { ...x, allocatedQty: Number(e.target.value) } : x))} />
                <label className="text-xs text-df-text-muted flex items-center gap-2"><input type="checkbox" checked={!!line.isBackorder} onChange={(e) => setOverrideLines(v => v.map((x, i) => i === index ? { ...x, isBackorder: e.target.checked } : x))} /> Backorder</label>
              </div>
            ))}
            <div className="flex gap-2">
              <PrimaryButton disabled={overridePlan.isPending} onClick={() => handleAction(() => overridePlan.mutateAsync({ planId: plan.id, data: { lines: overrideLines } }), 'Override')}>Save Override</PrimaryButton>
              <SecondaryButton onClick={() => setShowOverride(false)}>Cancel</SecondaryButton>
            </div>
          </div>
        </Panel>
      )}

      {/* Actions */}
      <Panel title="Actions">
        {!canOperate ? (
          <p className="text-xs text-df-text-muted">Read-only tracking. Fulfillment decisions are handled by Finance / Operations.</p>
        ) : (
        <div className="flex flex-wrap gap-2">
          {plan.status === 'PENDING' && (
            <>
            <PrimaryButton
              disabled={accept.isPending}
              onClick={() => handleAction(() => accept.mutateAsync(plan.id), 'Accept')}
            >
              {accept.isPending ? 'Accepting…' : 'Accept Plan'}
            </PrimaryButton>
            <SecondaryButton onClick={() => { setOverrideLines(plan.lines.map((l: any) => ({ quotationLineId: l.quotationLineId, warehouseId: l.warehouseId, allocatedQty: l.allocatedQty, isBackorder: l.isBackorder }))); setShowOverride(true); }}>Manual Override</SecondaryButton>
            </>
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
        )}
      </Panel>
    </div>
  );
}

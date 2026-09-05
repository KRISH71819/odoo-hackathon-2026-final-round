// ── Billing Detail Page ───────────────────────────────────────
// Shows billing schedule for a specific quotation (accessed via quotation detail)
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PageHeader,
  Panel,
  StatusBadge,
  PrimaryButton,
  DangerButton,
  NoticeStrip,
  Spinner,
} from '../../components/ui';
import { formatCurrency, formatDate } from '../../lib/format';
import { useBillingSchedules, useCancelSubscription, useProrateSchedule } from './useBilling';
import { useAuth } from '../../lib/auth.js';

export default function BillingDetailPage() {
  const { quotationId } = useParams<{ quotationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canReconcile = ['FINANCE_OPS', 'ADMIN'].includes(user?.role ?? '');
  const { data, isLoading, refetch } = useBillingSchedules(quotationId!);
  const cancel = useCancelSubscription();
  const prorate = useProrateSchedule();
  const [prorateTarget, setProrateTarget] = useState<string | null>(null);
  const [prorateQty, setProrateQty] = useState('1');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const schedules = data?.data ?? [];

  const intervalLabel: Record<string, string> = {
    MONTHLY: 'Monthly',
    QUARTERLY: 'Quarterly',
    YEARLY: 'Yearly',
  };

  async function handleCancel(scheduleId: string) {
    if (!cancelReason.trim()) {
      setError('Cancellation reason is required');
      return;
    }
    setError(null);
    try {
      await cancel.mutateAsync({ scheduleId, reason: cancelReason });
      setCancelTarget(null);
      setCancelReason('');
      refetch();
    } catch (e: any) {
      setError(e?.message ?? 'Cancellation failed');
    }
  }

  if (isLoading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Billing Schedule"
        subtitle={`Quotation: ${quotationId}`}
        actions={
          <button
            className="text-xs text-df-text-muted hover:text-df-text"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>
        }
      />

      {error && <NoticeStrip variant="danger" className="mb-4">{error}</NoticeStrip>}

      {schedules.length === 0 ? (
        <Panel>
          <p className="text-df-text-muted text-sm">
            No recurring billing schedules. One-time lines will appear on the invoice when the
            quotation is confirmed.
          </p>
        </Panel>
      ) : (
        <>
          <Panel title="Upcoming Billing Schedule" className="mb-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-df-border text-df-text-muted">
                  <th className="text-left py-2 pr-4 font-medium">Product</th>
                  <th className="text-left py-2 pr-4 font-medium">Interval</th>
                  <th className="text-right py-2 pr-4 font-medium">Amount</th>
                  <th className="text-left py-2 pr-4 font-medium">Next Billing</th>
                  <th className="text-left py-2 pr-4 font-medium">Status</th>
                  <th className="text-right py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule: any) => (
                  <React.Fragment key={schedule.id}>
                    <tr className="border-b border-df-border/50">
                      <td className="py-2 pr-4 text-df-text">
                        {schedule.quotationLine?.productName ?? '—'}
                        <span className="block text-df-text-muted">
                          Qty: {schedule.quotationLine?.quantity ?? 1}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-df-text-muted">
                        {intervalLabel[schedule.interval] ?? schedule.interval}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono text-df-text">
                        {formatCurrency(schedule.amount)}
                      </td>
                      <td className="py-2 pr-4 text-df-text-muted">
                        {formatDate(schedule.nextBillingDate)}
                      </td>
                      <td className="py-2 pr-4">
                        <StatusBadge status={schedule.status} />
                      </td>
                      <td className="py-2 text-right">
                        {canReconcile && schedule.status === 'ACTIVE' && (
                          <div className="flex justify-end gap-2">
                            <button className="text-xs text-df-nav hover:underline" onClick={() => { setProrateTarget(schedule.id); setProrateQty(String(schedule.quotationLine?.quantity ?? 1)); }}>Prorate</button>
                            <button className="text-xs text-df-danger hover:underline" onClick={() => setCancelTarget(schedule.id)}>Cancel</button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {canReconcile && prorateTarget === schedule.id && (
                      <tr className="bg-df-border/20">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <input className="w-28 px-2 py-1 text-xs bg-df-surface border border-df-border rounded text-df-text" type="number" min="1" value={prorateQty} onChange={(e) => setProrateQty(e.target.value)} />
                            <PrimaryButton disabled={prorate.isPending} onClick={async () => { await prorate.mutateAsync({ scheduleId: schedule.id, data: { newQuantity: Number(prorateQty), changeDate: new Date().toISOString() } }); setProrateTarget(null); refetch(); }}>Apply Proration</PrimaryButton>
                            <button className="text-xs text-df-text-muted" onClick={() => setProrateTarget(null)}>Dismiss</button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {/* Inline cancel form */}
                    {canReconcile && cancelTarget === schedule.id && (
                      <tr className="bg-df-border/20">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <input
                              className="flex-1 px-2 py-1 text-xs bg-df-surface border border-df-border rounded text-df-text"
                              placeholder="Cancellation reason (required)"
                              value={cancelReason}
                              onChange={(e) => setCancelReason(e.target.value)}
                            />
                            <DangerButton
                              disabled={cancel.isPending}
                              onClick={() => handleCancel(schedule.id)}
                            >
                              {cancel.isPending ? 'Cancelling…' : 'Confirm Cancel'}
                            </DangerButton>
                            <button
                              className="text-xs text-df-text-muted hover:text-df-text"
                              onClick={() => { setCancelTarget(null); setCancelReason(''); }}
                            >
                              Dismiss
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </Panel>
        </>
      )}
    </div>
  );
}

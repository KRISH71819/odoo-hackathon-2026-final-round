// ── Approval Detail Page ─────────────────────────────────────
// Risk breakdown, approval steps, quote summary, action buttons, audit trail.

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApprovalDetail, useApprovalAction } from './useApprovals';
import { PageHeader, StatusBadge, PrimaryButton, SecondaryButton, DangerButton, SuccessButton, Panel, NoticeStrip, Spinner, Input, formatCents, formatBps } from '../../components/ui';

export default function ApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useApprovalDetail(id!);
  const action = useApprovalAction();

  const [reason, setReason] = useState('');
  const [showReasonFor, setShowReasonFor] = useState<string | null>(null);

  if (isLoading) return <Spinner />;

  const approval = data?.data;
  if (!approval) return <div className="text-center text-charcoal-400 py-12">Approval not found</div>;

  const quote = approval.quotation;
  const isPending = approval.status === 'PENDING';

  const handleAction = async (actionType: string) => {
    if (actionType !== 'APPROVE' && !reason.trim()) return;
    await action.mutateAsync({ id: id!, data: { action: actionType, reason: reason || undefined } });
    setShowReasonFor(null);
    setReason('');
  };

  return (
    <div>
      <PageHeader title={`Approval: ${quote.title}`}>
        <StatusBadge status={approval.status} className="text-sm px-3 py-1" />
        <SecondaryButton onClick={() => navigate('/approvals')}>← Back</SecondaryButton>
      </PageHeader>

      {/* Risk Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <Panel>
          <p className="text-xs text-charcoal-400">Risk Level</p>
          <StatusBadge status={quote.riskLevel} className="text-sm mt-1" />
        </Panel>
        <Panel>
          <p className="text-xs text-charcoal-400">Risk Score</p>
          <p className="text-lg font-mono font-semibold">{quote.riskScore} bps</p>
        </Panel>
        <Panel>
          <p className="text-xs text-charcoal-400">Grand Total</p>
          <p className="text-lg font-mono font-semibold">{formatCents(quote.total ?? quote.grandTotal)}</p>
        </Panel>
        <Panel>
          <p className="text-xs text-charcoal-400">Margin</p>
          <p className={`text-lg font-mono font-semibold ${quote.marginPercent >= 2000 ? 'text-success' : quote.marginPercent >= 1000 ? 'text-warning' : 'text-danger'}`}>
            {formatBps(quote.marginPercent)}
          </p>
        </Panel>
      </div>

      {/* Discount Warning */}
      {quote.riskLevel !== 'NONE' && (
        <NoticeStrip variant={quote.riskLevel === 'HIGH' ? 'danger' : 'warning'}>
          ⚠ This quotation exceeds discount policy limits. Review line-level discounts below.
        </NoticeStrip>
      )}

      {/* Lines */}
      <Panel title="Quotation Lines" className="mt-4">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Unit Price</th>
                <th className="text-right">Discount</th>
                <th className="text-right">Total</th>
                <th className="text-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              {quote.lines.map((line: any) => (
                <tr key={line.id}>
                  <td className="font-medium">{line.productName}</td>
                  <td><StatusBadge status={line.productCategory} /></td>
                  <td className="text-right">{line.quantity}</td>
                  <td className="text-right font-mono">{formatCents(line.unitPrice)}</td>
                  <td className="text-right">{formatBps(line.lineDiscountBps)}</td>
                  <td className="text-right font-mono">{formatCents(line.total)}</td>
                  <td className={`text-right ${line.marginPercent >= 2000 ? 'text-success' : 'text-warning'}`}>{formatBps(line.marginPercent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Approval Steps Timeline */}
      <Panel title="Approval Steps" className="mt-4">
        <div className="space-y-3">
          {quote.approvalRequests.map((ar: any) => (
            <div key={ar.id} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                ar.status === 'APPROVED' ? 'bg-success/20 text-success' :
                ar.status === 'REJECTED' ? 'bg-danger/20 text-danger' :
                ar.id === approval.id ? 'bg-accent/20 text-accent ring-2 ring-accent' :
                'bg-charcoal-700 text-charcoal-400'
              }`}>
                {ar.step}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{ar.role.replace('_', ' ')}</span>
                  <StatusBadge status={ar.status} />
                </div>
                {ar.actions?.map((act: any) => (
                  <p key={act.id} className="text-xs text-charcoal-400 mt-1">
                    {act.user?.name} — {act.action} {act.reason ? `— "${act.reason}"` : ''} — {new Date(act.createdAt).toLocaleString()}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Action Buttons */}
      {isPending && (
        <Panel className="mt-4">
          {showReasonFor ? (
            <div className="space-y-3">
              <Input
                label={`Reason for ${showReasonFor === 'REJECT' ? 'rejection' : 'revision return'}`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason (required)..."
              />
              <div className="flex gap-2">
                <DangerButton onClick={() => handleAction(showReasonFor)} disabled={!reason.trim() || action.isPending}>
                  Confirm {showReasonFor === 'REJECT' ? 'Reject' : 'Return'}
                </DangerButton>
                <SecondaryButton onClick={() => { setShowReasonFor(null); setReason(''); }}>Cancel</SecondaryButton>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <SuccessButton onClick={() => handleAction('APPROVE')} disabled={action.isPending}>
                ✓ Approve
              </SuccessButton>
              <DangerButton onClick={() => setShowReasonFor('REJECT')}>
                ✗ Reject
              </DangerButton>
              <SecondaryButton onClick={() => setShowReasonFor('RETURN_FOR_REVISION')}>
                ↩ Return for Revision
              </SecondaryButton>
            </div>
          )}
        </Panel>
      )}

      {/* Customer Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <Panel title="Customer">
          <div className="space-y-1 text-sm">
            <p><span className="text-charcoal-400">Name:</span> {quote.customer?.name}</p>
            <p><span className="text-charcoal-400">Tier:</span> <StatusBadge status={quote.customer?.tier} /></p>
            <p><span className="text-charcoal-400">Email:</span> {quote.customer?.email}</p>
          </div>
        </Panel>
        <Panel title="Sales Rep">
          <div className="space-y-1 text-sm">
            <p><span className="text-charcoal-400">Name:</span> {quote.salesRep?.name}</p>
            <p><span className="text-charcoal-400">Email:</span> {quote.salesRep?.email}</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ── Approval List Page ───────────────────────────────────────

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePendingApprovals } from './useApprovals';
import { PageHeader, StatusBadge, Panel, Spinner, formatCents } from '../../components/ui';

export default function ApprovalListPage() {
  const navigate = useNavigate();
  const { data, isLoading } = usePendingApprovals();
  const approvals = data?.data || [];

  return (
    <div>
      <PageHeader title="Pending Approvals" />

      {isLoading ? <Spinner /> : (
        <Panel>
          {approvals.length === 0 ? (
            <div className="text-center text-charcoal-400 py-12">
              <p className="text-lg mb-1">✓ All caught up</p>
              <p className="text-sm">No pending approvals for your role</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Quotation</th>
                    <th>Customer</th>
                    <th>Sales Rep</th>
                    <th>Step</th>
                    <th>Risk</th>
                    <th className="text-right">Amount</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {approvals.map((a: any) => (
                    <tr key={a.id} className="cursor-pointer" onClick={() => navigate(`/approvals/${a.id}`)}>
                      <td className="font-medium">{a.quotation?.title}</td>
                      <td>{a.quotation?.customer?.name}</td>
                      <td className="text-charcoal-400">{a.quotation?.salesRep?.name}</td>
                      <td>
                        <span className="text-xs text-charcoal-400">Step {a.step}:</span>{' '}
                        <span className="text-sm">{a.role.replace('_', ' ')}</span>
                      </td>
                      <td><StatusBadge status={a.quotation?.riskLevel || 'NONE'} /></td>
                      <td className="text-right font-mono">{formatCents(a.quotation?.total ?? a.quotation?.grandTotal ?? 0)}</td>
                      <td className="text-charcoal-400 text-xs">{new Date(a.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

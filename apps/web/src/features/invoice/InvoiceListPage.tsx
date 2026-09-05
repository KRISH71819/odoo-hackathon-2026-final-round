// ── Invoice List Page (Phase 4) ──
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Panel, StatusBadge, PrimaryButton, Select, Spinner } from '../../components/ui.js';
import { formatCurrency, formatDate } from '../../lib/format.js';
import { useInvoices } from './useInvoices.js';

export default function InvoiceListPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const filters: Record<string, string> = {};
  if (status) filters.status = status;
  const { data, isLoading } = useInvoices(filters, page);

  const invoices = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div>
      <PageHeader title="Invoices" subtitle="Invoice management and payment tracking">
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
          <option value="PAID">Paid</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
      </PageHeader>

      {isLoading ? <Spinner /> : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-df-border text-left text-df-text-muted">
                  <th className="pb-2 pr-4">Invoice #</th>
                  <th className="pb-2 pr-4">Quotation</th>
                  <th className="pb-2 pr-4">Customer</th>
                  <th className="pb-2 pr-4">Total</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Due Date</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody className="text-df-text">
                {invoices.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-df-text-muted">No invoices found</td></tr>
                )}
                {invoices.map((inv: any) => (
                  <tr key={inv.id} className="border-b border-df-border/50 hover:bg-df-surface/50">
                    <td className="py-2 pr-4 font-medium">{inv.number}</td>
                    <td className="py-2 pr-4">
                      <Link to={`/quotations/${inv.quotation?.id}`} className="text-df-nav hover:underline">
                        {inv.quotation?.number}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">{inv.quotation?.customer?.name}</td>
                    <td className="py-2 pr-4">{formatCurrency(inv.total)}</td>
                    <td className="py-2 pr-4"><StatusBadge status={inv.status} /></td>
                    <td className="py-2 pr-4">{inv.dueDate ? formatDate(inv.dueDate) : '—'}</td>
                    <td className="py-2">
                      <Link to={`/invoices/${inv.id}`}>
                        <PrimaryButton>View</PrimaryButton>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-df-border">
              <span className="text-xs text-df-text-muted">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>
              <div className="flex gap-2">
                <PrimaryButton disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</PrimaryButton>
                <PrimaryButton disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</PrimaryButton>
              </div>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

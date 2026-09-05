// ── Quotation List Page ──────────────────────────────────────

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuotations, useCreateQuotation } from './useQuotations';
import { PageHeader, StatusBadge, PrimaryButton, Spinner, Panel, formatCents, Select } from '../../components/ui';
import { QuotationStatus } from '@dealflow360/contracts';
import { api } from '../../lib/api';
import { useQuery } from '@tanstack/react-query';

export default function QuotationListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');

  const params: Record<string, string> = {};
  if (statusFilter) params.status = statusFilter;

  const { data, isLoading } = useQuotations(Object.keys(params).length > 0 ? params : undefined);
  const quotations = data?.data || [];

  // Load customers for new quote dialog
  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get<any>('/auth/customers'),
  });

  const createQuotation = useCreateQuotation();

  const handleNewQuote = async () => {
    const customers = customersData?.data || [];
    if (customers.length === 0) return;
    // ponytail: use first customer for quick demo. Add modal picker later.
    const res = await createQuotation.mutateAsync({ customerId: customers[0].id, title: 'New Quotation' });
    navigate(`/quotations/${res.data.id}`);
  };

  return (
    <div>
      <PageHeader title="Quotations">
        <PrimaryButton onClick={handleNewQuote} disabled={createQuotation.isPending}>
          + New Quotation
        </PrimaryButton>
      </PageHeader>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {['', ...Object.values(QuotationStatus).slice(0, 7)].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap transition-colors ${
              statusFilter === s
                ? 'bg-accent text-white'
                : 'bg-charcoal-800 text-charcoal-400 hover:text-charcoal-200'
            }`}
          >
            {s === '' ? 'All' : s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {isLoading ? <Spinner /> : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Customer</th>
                  <th>Sales Rep</th>
                  <th>Status</th>
                  <th className="text-right">Amount</th>
                  <th>Lines</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q: any) => (
                  <tr key={q.id} className="cursor-pointer" onClick={() => navigate(`/quotations/${q.id}`)}>
                    <td className="font-medium">{q.title}</td>
                    <td>{q.customer?.name || '—'}</td>
                    <td className="text-charcoal-400">{q.salesRep?.name || '—'}</td>
                    <td><StatusBadge status={q.status} /></td>
                    <td className="text-right font-mono">{formatCents(q.grandTotal)}</td>
                    <td className="text-charcoal-400">{q._count?.lines || 0}</td>
                    <td className="text-charcoal-400 text-xs">{new Date(q.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {quotations.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-charcoal-400 py-8">No quotations found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}

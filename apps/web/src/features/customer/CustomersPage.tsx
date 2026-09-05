// ── DealFlow360 – Customers Page ──

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { PageHeader, StatusBadge, PrimaryButton, Spinner, Panel } from '../../components/ui';
import { useCreateQuotation } from '../quotation/useQuotations';

export default function CustomersPage() {
  const navigate = useNavigate();
  const createQuotation = useCreateQuotation();

  const { data, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get<any>('/auth/customers'),
  });

  const customers = data?.data || [];

  const handleCreateQuote = async (customerId: string, customerName: string) => {
    const res = await createQuotation.mutateAsync({
      customerId,
      title: `${customerName} Proposal`,
    });
    navigate(`/quotations/${res.data.id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Directory"
        subtitle="Active B2B customer accounts, discount tiers, and quotation creation"
      />

      {isLoading ? (
        <Spinner />
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account Name</th>
                  <th>Contact Email</th>
                  <th>Customer Tier</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c: any) => (
                  <tr key={c.id}>
                    <td className="font-medium text-white">{c.name}</td>
                    <td className="text-charcoal-400 font-mono text-xs">{c.email}</td>
                    <td>
                      <StatusBadge status={c.tier || 'STANDARD'} />
                    </td>
                    <td className="text-charcoal-400 text-xs">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="text-right">
                      <PrimaryButton
                        disabled={createQuotation.isPending}
                        onClick={() => handleCreateQuote(c.id, c.name)}
                      >
                        + Create Quote
                      </PrimaryButton>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-charcoal-400 py-8">
                      No customer accounts found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}

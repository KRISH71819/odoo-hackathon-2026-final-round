// ── Quotation List & Pipeline Page ──────────────────────────

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuotations, useCreateQuotation } from './useQuotations';
import {
  PageHeader,
  StatusBadge,
  PrimaryButton,
  SecondaryButton,
  Spinner,
  Panel,
  formatCents,
  formatBps,
  Select,
  Input,
} from '../../components/ui';
import { QuotationStatus, UserRole } from '@dealflow360/contracts';
import { api } from '../../lib/api';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth';

interface PipelineStage {
  id: string;
  name: string;
  statuses: string[];
}

const PIPELINE_STAGES: PipelineStage[] = [
  { id: 'draft', name: 'Draft', statuses: [QuotationStatus.DRAFT, QuotationStatus.REVISION] },
  { id: 'pending', name: 'Pending Approval', statuses: [QuotationStatus.PENDING_MANAGER, QuotationStatus.PENDING_FINANCE] },
  { id: 'approved', name: 'Approved / Ready', statuses: [QuotationStatus.APPROVED, QuotationStatus.FULFILLMENT_READY] },
  { id: 'negotiation', name: 'Under Negotiation', statuses: [QuotationStatus.SENT_TO_CUSTOMER, QuotationStatus.UNDER_NEGOTIATION] },
  { id: 'confirmed', name: 'Confirmed / Won', statuses: [QuotationStatus.CONFIRMED, QuotationStatus.BILLED, QuotationStatus.PAID] },
  { id: 'rejected', name: 'Rejected', statuses: [QuotationStatus.REJECTED] },
];

export default function QuotationListPage() {
  const { user } = useAuth();
  const isCustomer = user?.role === UserRole.CUSTOMER;
  const isSalesRep = user?.role === UserRole.SALES_REP || user?.role === UserRole.ADMIN;
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('list');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('New Enterprise Quotation');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  const params: Record<string, string> = {};
  if (viewMode === 'pipeline') {
    params.limit = '100';
    params.page = '1';
  } else {
    params.page = String(page);
    params.limit = String(pageSize);
    if (statusFilter) params.status = statusFilter;
    if (searchQuery.trim()) params.search = searchQuery.trim();
  }

  const { data, isLoading } = useQuotations(params);
  const quotations = data?.data || [];
  const pagination = data?.pagination || { page: 1, limit: pageSize, total: quotations.length, totalPages: 1 };

  // Load customers for new quote dialog
  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get<any>('/auth/customers'),
  });

  const customers = customersData?.data || [];
  const createQuotation = useCreateQuotation();

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    const customerId = selectedCustomerId || customers[0]?.id;
    if (!customerId) return;

    const res = await createQuotation.mutateAsync({
      customerId,
      title: newTitle.trim() || 'New Quotation',
    });
    setIsModalOpen(false);
    navigate(`/quotations/${res.data.id}`);
  };

  return (
    <div>
      <PageHeader
        title="Quotations & Pipeline"
        subtitle="Manage end-to-end sales deals, margins, and governance approval stages"
        actions={
          <div className="flex items-center gap-2">
            <div className="bg-charcoal-800 p-0.5 rounded border border-charcoal-700 flex text-xs">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-accent text-white font-medium'
                    : 'text-charcoal-400 hover:text-charcoal-200'
                }`}
              >
                List View
              </button>
              <button
                onClick={() => setViewMode('pipeline')}
                className={`px-3 py-1 rounded transition-colors ${
                  viewMode === 'pipeline'
                    ? 'bg-accent text-white font-medium'
                    : 'text-charcoal-400 hover:text-charcoal-200'
                }`}
              >
                Pipeline (Kanban)
              </button>
            </div>
            {isSalesRep && (
              <PrimaryButton onClick={() => setIsModalOpen(true)}>
                + New Quotation
              </PrimaryButton>
            )}
          </div>
        }
      />

      {/* Filter and Finder bar for List view */}
      {viewMode === 'list' && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
          <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
            {['', ...Object.values(QuotationStatus)].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
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
          <div className="w-full sm:w-72">
            <Input
              type="search"
              placeholder="Search by quote #, title, customer, sales rep, status..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="text-xs"
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <Spinner />
      ) : viewMode === 'list' ? (
        <Panel>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Quote #</th>
                  <th>Title</th>
                  <th>Customer</th>
                  <th>Sales Rep</th>
                  <th>Status</th>
                  <th className="text-right">Amount</th>
                  {!isCustomer && <th className="text-right">Margin</th>}
                  <th>Lines</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q: any) => (
                  <tr key={q.id} className="cursor-pointer hover:bg-charcoal-800/60 transition-colors" onClick={() => navigate(`/quotations/${q.id}`)}>
                    <td className="font-mono text-white font-semibold">{q.number || '—'}</td>
                    <td className="font-medium">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{q.title}</span>
                        {(q.notes?.includes('[CUSTOMER QUOTE REQUEST]') || q.title?.startsWith('Quote Request:')) && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                            CUSTOMER REQUEST
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-charcoal-200">{q.customer?.name || '—'}</span>
                        {q.customer?.tier && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            q.customer.tier === 'PLATINUM'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : q.customer.tier === 'GOLD'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : q.customer.tier === 'SILVER'
                              ? 'bg-slate-400/20 text-slate-200 border border-slate-400/30'
                              : 'bg-amber-700/20 text-amber-400 border border-amber-700/30'
                          }`}>
                            {q.customer.tier}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-charcoal-400">{q.salesRep?.name || '—'}</td>
                    <td><StatusBadge status={q.status} /></td>
                    <td className="text-right font-mono font-medium">{formatCents(q.total ?? q.grandTotal)}</td>
                    {!isCustomer && (
                      <td className={`text-right font-mono text-xs ${(q.marginPercent ?? 0) >= 2000 ? 'text-success' : (q.marginPercent ?? 0) >= 1000 ? 'text-warning' : 'text-danger'}`}>
                        {formatBps(q.marginPercent)}
                      </td>
                    )}
                    <td className="text-charcoal-400">{q._count?.lines || q.lines?.length || 0}</td>
                    <td className="text-charcoal-400 text-xs">{new Date(q.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {quotations.length === 0 && (
                  <tr>
                    <td colSpan={isCustomer ? 8 : 9} className="text-center text-charcoal-400 py-8">
                      No quotations found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-charcoal-800 text-xs text-charcoal-400">
            <div>
              Showing <span className="font-semibold text-charcoal-200">{quotations.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}</span> to{' '}
              <span className="font-semibold text-charcoal-200">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
              <span className="font-semibold text-charcoal-200">{pagination.total}</span> quotations
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded bg-charcoal-800 border border-charcoal-700 text-charcoal-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-charcoal-700 transition-colors"
              >
                Previous
              </button>
              <span className="text-charcoal-400 font-mono">
                Page {pagination.page} of {Math.max(1, pagination.totalPages)}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded bg-charcoal-800 border border-charcoal-700 text-charcoal-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-charcoal-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </Panel>
      ) : (
        /* Pipeline Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => {
            const stageQuotes = quotations.filter((q: any) => stage.statuses.includes(q.status));
            const totalStageAmount = stageQuotes.reduce((acc: number, q: any) => acc + (q.total ?? q.grandTotal ?? 0), 0);

            return (
              <div key={stage.id} className="bg-charcoal-900 border border-charcoal-800 rounded-lg p-3 flex flex-col min-w-[220px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-xs text-charcoal-200 uppercase tracking-wider">{stage.name}</span>
                  <span className="text-[11px] bg-charcoal-800 text-charcoal-300 px-2 py-0.5 rounded-full font-mono">
                    {stageQuotes.length}
                  </span>
                </div>
                <div className="text-xs text-charcoal-400 font-mono mb-3 pb-2 border-b border-charcoal-800">
                  {formatCents(totalStageAmount)}
                </div>

                <div className="space-y-2 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
                  {stageQuotes.map((q: any) => (
                    <div
                      key={q.id}
                      onClick={() => navigate(`/quotations/${q.id}`)}
                      className="bg-charcoal-800 border border-charcoal-700/80 hover:border-accent rounded p-3 cursor-pointer transition-all hover:translate-y-[-1px] shadow-sm"
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-mono text-white font-semibold">{q.number}</span>
                        <StatusBadge status={q.status} />
                      </div>
                      <div className="font-medium text-xs text-charcoal-100 truncate mb-1" title={q.title}>
                        {q.title}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-charcoal-300 truncate mb-2">
                        <span className="truncate">🏢 {q.customer?.name || 'Customer'}</span>
                        {q.customer?.tier && (
                          <span className="ml-1 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {q.customer.tier}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-charcoal-700/50">
                        <span className="font-mono font-medium text-charcoal-200">{formatCents(q.total ?? q.grandTotal)}</span>
                        <span className={`text-[10px] font-mono ${(q.marginPercent ?? 0) >= 2000 ? 'text-success' : 'text-warning'}`}>
                          {formatBps(q.marginPercent)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {stageQuotes.length === 0 && (
                    <div className="h-24 border border-dashed border-charcoal-800 rounded flex items-center justify-center text-charcoal-600 text-xs">
                      No deals
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Quotation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-charcoal-900 border border-charcoal-700 rounded-lg p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-semibold text-charcoal-100 mb-4">Create New Quotation</h3>
            <form onSubmit={handleCreateQuote} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-charcoal-300 mb-1">Customer</label>
                <Select
                  value={selectedCustomerId || customers[0]?.id || ''}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                >
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.tier || 'BRONZE'} Tier) — {c.email}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal-300 mb-1">Quotation Title</label>
                <Input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Acme Corp - Q3 Hardware & Cloud Upgrade"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <SecondaryButton type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={createQuotation.isPending}>
                  {createQuotation.isPending ? 'Creating...' : 'Create & Open'}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


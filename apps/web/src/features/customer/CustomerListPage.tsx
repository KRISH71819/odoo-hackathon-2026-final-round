// ── Customer List & Tier Management Page ─────────────────────────
// Phase 2 Core: Customer list with tier tracking (Bronze, Silver, Gold),
// customer quotation history, and tier-based pricing rule awareness.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth.js';
import { UserRole } from '@dealflow360/contracts';
import {
  useCustomers,
  useCustomer,
  useUpdateCustomerTier,
  useCreateCustomer,
  useDiscountRules,
  CustomerSummary,
} from './useCustomers.js';
import { useCreateQuotation } from '../quotation/useQuotations.js';
import {
  PageHeader,
  Panel,
  StatusBadge,
  PrimaryButton,
  SecondaryButton,
  Input,
  Select,
  Spinner,
  NoticeStrip,
  formatCents,
  formatBps,
} from '../../components/ui.js';

export default function CustomerListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreateQuote = user?.role === UserRole.SALES_REP || user?.role === UserRole.ADMIN;
  const canCreateCustomer = user?.role === UserRole.ADMIN || user?.role === UserRole.SALES_REP;
  const { data: customersData, isLoading } = useCustomers();
  const { data: rulesData } = useDiscountRules();
  const createQuotation = useCreateQuotation();

  const [tierFilter, setTierFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const customers: CustomerSummary[] = customersData?.data || [];
  const tierRules = rulesData?.data?.tierRules || [];

  // Filtered list
  const filteredCustomers = customers.filter((c) => {
    if (tierFilter && c.tier !== tierFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
    }
    return true;
  });

  // Tier counts
  const bronzeCount = customers.filter((c) => c.tier === 'BRONZE').length;
  const silverCount = customers.filter((c) => c.tier === 'SILVER').length;
  const goldCount = customers.filter((c) => c.tier === 'GOLD').length;

  const handleCreateQuoteForCustomer = async (customerId: string, customerName: string) => {
    try {
      const shortName = customerName.includes('(') ? customerName.split('(')[0]!.trim() : customerName;
      const res = await createQuotation.mutateAsync({
        customerId,
        title: `Quote for ${shortName}`,
      });
      navigate(`/quotations/${res.data.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to create quotation');
    }
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Customer tier tracking, discount ceilings, and quotation relationship history"
      >
        {canCreateCustomer && <PrimaryButton onClick={() => setShowAddModal(true)}>+ Add Customer</PrimaryButton>}
      </PageHeader>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <Panel>
          <p className="text-xs text-df-text-muted">Total Accounts</p>
          <div className="text-2xl font-bold text-df-text mt-1">{customers.length}</div>
          <p className="text-xs text-df-text-dim mt-1">Managed enterprise accounts</p>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between">
            <p className="text-xs text-df-text-muted">Bronze Tier</p>
            <StatusBadge status="BRONZE" />
          </div>
          <div className="text-2xl font-bold text-df-text mt-1">{bronzeCount}</div>
          <p className="text-xs text-df-text-dim mt-1">Ceiling: 10% discount max</p>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between">
            <p className="text-xs text-df-text-muted">Silver Tier</p>
            <StatusBadge status="SILVER" />
          </div>
          <div className="text-2xl font-bold text-df-text mt-1">{silverCount}</div>
          <p className="text-xs text-df-text-dim mt-1">Ceiling: 15% discount max</p>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between">
            <p className="text-xs text-df-text-muted">Gold Tier</p>
            <StatusBadge status="GOLD" />
          </div>
          <div className="text-2xl font-bold text-df-text mt-1">{goldCount}</div>
          <p className="text-xs text-df-text-dim mt-1">Ceiling: 25% discount max</p>
        </Panel>
      </div>

      {/* Tier Governance Rule Banner */}
      <div className="mb-4">
        <NoticeStrip variant="info">
          <strong>Tier-Based Governance Policy:</strong> Customer tier determines both base price list eligibility and maximum discount ceilings. Line discounts exceeding tier limits trigger mandatory manager and finance approvals.
        </NoticeStrip>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
        <div className="flex gap-2">
          {['', 'BRONZE', 'SILVER', 'GOLD'].map((tier) => (
            <button
              key={tier}
              onClick={() => setTierFilter(tier)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                tierFilter === tier
                  ? 'bg-df-nav text-white'
                  : 'bg-df-surface text-df-text-muted hover:text-df-text border border-df-border'
              }`}
            >
              {tier === '' ? 'All Tiers' : tier}
            </button>
          ))}
        </div>

        <div className="w-64">
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Customer Table */}
      {isLoading ? (
        <Spinner />
      ) : (
        <Panel>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer / Account</th>
                  <th>Contact Email</th>
                  <th>Tier</th>
                  <th className="text-center">Quotations</th>
                  <th>Member Since</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-df-text-muted text-sm">
                      No customers found matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="hover:bg-df-surface/80 transition-colors cursor-pointer"
                      onClick={() => setSelectedCustomerId(customer.id)}
                    >
                      <td>
                        <div className="font-medium text-df-text">{customer.name}</div>
                        <div className="text-xs text-df-text-dim font-mono">{customer.id}</div>
                      </td>
                      <td className="text-df-text-muted text-sm">{customer.email}</td>
                      <td>
                        <StatusBadge status={customer.tier} />
                      </td>
                      <td className="text-center font-semibold text-sm">
                        {customer._count?.quotationsAsCustomer ?? 0}
                      </td>
                      <td className="text-xs text-df-text-muted">
                        {new Date(customer.createdAt).toLocaleDateString()}
                      </td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <SecondaryButton
                            onClick={() => setSelectedCustomerId(customer.id)}
                            className="text-xs py-1"
                          >
                            Details
                          </SecondaryButton>
                          {canCreateQuote && (
                            <PrimaryButton
                              onClick={() => handleCreateQuoteForCustomer(customer.id, customer.name)}
                              className="text-xs py-1"
                              disabled={createQuotation.isPending}
                            >
                              + Quote
                            </PrimaryButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomerId && (
        <CustomerDetailModal
          customerId={selectedCustomerId}
          onClose={() => setSelectedCustomerId(null)}
          onStartQuote={(id, name) => handleCreateQuoteForCustomer(id, name)}
          canCreateQuote={canCreateQuote}
          canManageTier={user?.role === UserRole.ADMIN || user?.role === UserRole.SALES_MANAGER}
        />
      )}

      {/* Add Customer Modal */}
      {showAddModal && <AddCustomerModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}

// ── Customer Detail Modal ──
function CustomerDetailModal({
  customerId,
  onClose,
  onStartQuote,
  canCreateQuote,
  canManageTier,
}: {
  customerId: string;
  onClose: () => void;
  onStartQuote: (id: string, name: string) => void;
  canCreateQuote: boolean;
  canManageTier: boolean;
}) {
  const navigate = useNavigate();
  const { data, isLoading } = useCustomer(customerId);
  const updateTier = useUpdateCustomerTier();
  const customer = data?.data;

  const [selectedTier, setSelectedTier] = useState<string>('');

  React.useEffect(() => {
    if (customer?.tier) {
      setSelectedTier(customer.tier);
    }
  }, [customer?.tier]);

  const handleSaveTier = async () => {
    if (!selectedTier || selectedTier === customer?.tier) return;
    await updateTier.mutateAsync({ id: customerId, tier: selectedTier });
  };

  const tierCeilings: Record<string, string> = {
    BRONZE: '10.0% max line discount (1,000 bps)',
    SILVER: '15.0% max line discount (1,500 bps)',
    GOLD: '25.0% max line discount (2,500 bps)',
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-df-bg border border-df-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
        {isLoading || !customer ? (
          <Spinner />
        ) : (
          <div>
            <div className="flex items-start justify-between border-b border-df-border pb-4 mb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-df-text">{customer.name}</h2>
                  <StatusBadge status={customer.tier} />
                </div>
                <p className="text-xs text-df-text-muted mt-0.5">{customer.email}</p>
                <p className="text-xs text-df-text-dim font-mono mt-0.5">ID: {customer.id}</p>
              </div>
              <button
                onClick={onClose}
                className="text-df-text-muted hover:text-df-text text-lg px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            {/* Tier Configuration Card */}
            <Panel title="Customer Tier & Pricing Governance" className="mb-4">
              {canManageTier ? (
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end justify-between">
                  <div className="w-full sm:w-64">
                    <Select label="Assigned Tier" value={selectedTier} onChange={(e) => setSelectedTier(e.target.value)}>
                      <option value="BRONZE">BRONZE</option>
                      <option value="SILVER">SILVER</option>
                      <option value="GOLD">GOLD</option>
                    </Select>
                  </div>
                  <PrimaryButton onClick={handleSaveTier} disabled={updateTier.isPending || selectedTier === customer.tier} className="whitespace-nowrap">
                    {updateTier.isPending ? 'Updating...' : 'Save Tier Change'}
                  </PrimaryButton>
                </div>
              ) : (
                <p className="text-xs text-df-text-muted">Tier changes are managed by Sales Manager or Admin.</p>
              )}

              <div className="mt-3 p-3 bg-df-surface/60 rounded border border-df-border text-xs">
                <div className="font-medium text-df-text">
                  Current Policy Ceiling: {tierCeilings[customer.tier] || 'Standard'}
                </div>
                <p className="text-df-text-muted mt-1">
                  Adjusting the tier immediately impacts effective price lookup and discount threshold evaluation for all new quotations.
                </p>
              </div>
            </Panel>

            {/* Quotations History */}
            <Panel
              title={`Quotation History (${customer.quotationsAsCustomer?.length || 0})`}
              className="mb-4"
            >
              {customer.quotationsAsCustomer?.length === 0 ? (
                <div className="text-center py-6 text-df-text-muted text-xs">
                  No quotations created for this customer yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table text-xs">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Status</th>
                        <th className="text-right">Total</th>
                        <th>Risk</th>
                        <th>Date</th>
                        <th className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customer.quotationsAsCustomer.map((q: any) => (
                        <tr key={q.id}>
                          <td className="font-medium text-df-text">{q.title}</td>
                          <td>
                            <StatusBadge status={q.status} />
                          </td>
                          <td className="text-right font-mono font-medium">
                            {formatCents(q.total ?? q.totalAmount ?? 0)}
                          </td>
                          <td>
                            <StatusBadge status={q.riskLevel} />
                          </td>
                          <td className="text-df-text-muted">
                            {new Date(q.createdAt).toLocaleDateString()}
                          </td>
                          <td className="text-right">
                            <button
                              onClick={() => {
                                onClose();
                                navigate(`/quotations/${q.id}`);
                              }}
                              className="text-df-nav hover:underline font-medium text-xs"
                            >
                              Open Builder →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t border-df-border pt-4">
              <SecondaryButton onClick={onClose}>Close</SecondaryButton>
              {canCreateQuote && (
                <PrimaryButton onClick={() => onStartQuote(customer.id, customer.name)}>
                  + Create Quotation for Customer
                </PrimaryButton>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add Customer Modal ──
function AddCustomerModal({ onClose }: { onClose: () => void }) {
  const createCustomer = useCreateCustomer();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tier, setTier] = useState('BRONZE');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required');
      return;
    }

    try {
      await createCustomer.mutateAsync({ name: name.trim(), email: email.trim(), tier });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create customer');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-df-bg border border-df-border rounded-lg max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-df-border pb-3 mb-4">
          <h2 className="text-base font-bold text-df-text">Add New Customer</h2>
          <button
            onClick={onClose}
            className="text-df-text-muted hover:text-df-text text-lg px-1.5 py-0.5 rounded"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <NoticeStrip variant="danger">{error}</NoticeStrip>}

          <Input
            label="Company or Customer Name"
            placeholder="e.g. Acme Corp"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Contact Email"
            type="email"
            placeholder="e.g. contact@acme.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Select
            label="Pricing Tier"
            value={tier}
            onChange={(e) => setTier(e.target.value)}
          >
            <option value="BRONZE">BRONZE (Standard, max 10% discount)</option>
            <option value="SILVER">SILVER (Preferred, max 15% discount)</option>
            <option value="GOLD">GOLD (VIP Partner, max 25% discount)</option>
          </Select>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-df-border">
            <SecondaryButton type="button" onClick={onClose}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={createCustomer.isPending}>
              {createCustomer.isPending ? 'Creating...' : 'Create Customer'}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}

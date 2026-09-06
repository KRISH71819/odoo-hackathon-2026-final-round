// ── DealFlow360 – shadcn Dashboard ──

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardList, FileText, AlertTriangle, Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.js';
import { Button } from '../../components/ui/button.js';
import { Separator } from '../../components/ui/separator.js';
import { Skeleton } from '../../components/ui/skeleton.js';
import { useAuth } from '../../lib/auth.js';
import { api } from '../../lib/api.js';
import { formatDateTime } from '../../lib/format.js';
import { UserRole } from '@dealflow360/contracts';
import { useCustomers } from '../customer/useCustomers.js';
import { useCreateQuotation } from '../quotation/useQuotations.js';
import { StatusBadge } from '../../components/ui.js';

const MANAGERS: UserRole[] = [UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.FINANCE_OPS];

function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<any>('/insights/dashboard'),
    refetchInterval: 30000,
  });
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  href,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  description?: string;
  href?: string;
}) {
  const content = (
    <Card className="hover:border-primary/30 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link to={href} className="block">{content}</Link>;
  }
  return content;
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading } = useDashboard();
  const { data: customersData } = useCustomers();
  const createQuotation = useCreateQuotation();

  const kpi = data?.data;
  const isManager = MANAGERS.includes(user?.role as UserRole);
  const canCreateQuote = user?.role === UserRole.SALES_REP || user?.role === UserRole.ADMIN;
  const customers = customersData?.data || [];

  // New quotation modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('New Enterprise Deal');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  const handleNewQuote = () => {
    if (customers.length === 0) {
      navigate('/customers');
      return;
    }
    // Always show the customer selection modal — never default to customers[0]
    setSelectedCustomerId('');
    setNewTitle('New Enterprise Deal');
    setIsModalOpen(true);
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    const customerId = selectedCustomerId || customers[0]?.id;
    if (!customerId) return;
    try {
      const res = await createQuotation.mutateAsync({
        customerId,
        title: newTitle.trim() || 'New Quotation',
      });
      setIsModalOpen(false);
      navigate(`/quotations/${res.data.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to create quotation');
    }
  };

  const quickLinks = [
    { path: '/quotations', icon: '📋', label: 'Quotations' },
    ...(isManager ? [{ path: '/approvals', icon: '✅', label: 'Approvals' }] : []),
    { path: '/customers', icon: '👥', label: 'Customers' },
    { path: '/fulfillment', icon: '📦', label: 'Fulfillment' },
    { path: '/subscriptions', icon: '🔄', label: 'Subscriptions' },
    { path: '/invoices', icon: '💳', label: 'Invoices' },
    ...(isManager ? [{ path: '/deal-health', icon: '🩺', label: 'Deal Health' }] : []),
  ];

  return (
    <>
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name}
          </p>
        </div>
        <div className="flex gap-2">
          {isManager && (
            <>
              <Button variant="outline" asChild><Link to="/deal-health">🩺 Deal Health</Link></Button>
              <Button variant="outline" asChild><Link to="/reports">📊 Reports</Link></Button>
            </>
          )}
          {canCreateQuote && (
            <Button onClick={handleNewQuote} disabled={createQuotation.isPending}>
              + New Quotation
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-16" /><Skeleton className="h-3 w-32 mt-2" /></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${isManager ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-4`}>
            {isManager && (
              <StatCard
                title="Pending Approvals"
                value={kpi?.pendingApprovals ?? 0}
                icon={ClipboardList}
                description="Awaiting review"
                href="/approvals"
              />
            )}
            <StatCard
              title="Open Quotations"
              value={kpi?.openQuotes ?? 0}
              icon={FileText}
              description="Draft / Pending / Revision"
              href="/quotations"
            />
            {isManager && (
              <StatCard
                title="At-Risk Deals"
                value={kpi?.atRiskDeals ?? 0}
                icon={AlertTriangle}
                description="Medium or High risk"
                href="/deal-health"
              />
            )}
            <StatCard
              title="Managed Accounts"
              value={customers.length}
              icon={Users}
              description="Bronze, Silver & Gold"
              href="/customers"
            />
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Activity Feed */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {(kpi?.recentActivity ?? []).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">No recent activity</p>
                      <p className="text-xs mt-1">Create a quotation to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {(kpi?.recentActivity ?? []).map((entry: any) => (
                        <div key={entry.id} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-accent/50 transition-colors">
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{entry.user?.name ?? 'System'}</span>
                            <span className="text-muted-foreground ml-1.5">{entry.action.replace(/_/g, ' ').toLowerCase()}</span>
                            {entry.quotation && (
                              <Link to={`/quotations/${entry.quotation.id}`} className="text-primary hover:underline ml-1.5 font-semibold">
                                {entry.quotation.number || entry.quotation.id.slice(0, 8)}
                              </Link>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground flex-shrink-0 font-mono">
                            {formatDateTime(entry.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <Separator className="my-3" />
                  <div className="flex justify-end">
                    <Link to="/quotations" className="text-xs text-primary hover:underline font-medium">
                      View all quotations →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Discount Governance</CardTitle>
                  <Link to="/configuration" className="text-xs text-primary hover:underline font-medium">
                    Configure →
                  </Link>
                </CardHeader>
                <CardContent className="space-y-2">
                  {((kpi?.discountRules?.tierRules?.length ?? 0) > 0
                    ? kpi.discountRules.tierRules
                    : [
                        { customerTier: 'BRONZE', maxDiscountBps: 1000 },
                        { customerTier: 'SILVER', maxDiscountBps: 1500 },
                        { customerTier: 'GOLD', maxDiscountBps: 2500 },
                      ]
                  ).map((rule: any) => {
                    const percent = rule.maxDiscountBps ? `${(rule.maxDiscountBps / 100).toFixed(1)}%` : rule.maxDiscountPercent ? `${rule.maxDiscountPercent.toFixed(1)}%` : '0.0%';
                    return (
                      <div key={rule.id || rule.customerTier} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={rule.customerTier} />
                          <span className="capitalize">{rule.customerTier.toLowerCase()} Tier</span>
                        </div>
                        <span className="font-mono text-xs font-bold text-foreground">{percent}</span>
                      </div>
                    );
                  })}
                  {((kpi?.discountRules?.categoryRules?.length ?? 0) > 0) && (
                    <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground space-y-1">
                      <span className="font-semibold block text-foreground/80">Category Ceilings:</span>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {kpi.discountRules.categoryRules.map((c: any) => (
                          <span key={c.id}>
                            {c.category}: <span className="font-mono font-bold text-foreground">{(c.maxDiscountBps / 100).toFixed(1)}%</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Links</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {quickLinks.map((mod) => (
                      <Link key={mod.path} to={mod.path} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-accent transition-colors">
                        <span>{mod.icon}</span>
                        <span>{mod.label}</span>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>

      {/* New Quotation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-semibold mb-4">Create New Quotation</h3>
            <form onSubmit={handleCreateQuote} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Customer</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedCustomerId || customers[0]?.id || ''}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                >
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.tier || 'BRONZE'} Tier) — {c.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Quotation Title</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Acme Corp - Q3 Hardware & Cloud Upgrade"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createQuotation.isPending}>
                  {createQuotation.isPending ? 'Creating...' : 'Create & Open'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

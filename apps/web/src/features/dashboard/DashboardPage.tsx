// ── DealFlow360 – shadcn Dashboard ──

import React from 'react';
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

  const handleNewQuote = async () => {
    if (customers.length === 0) {
      navigate('/customers');
      return;
    }
    try {
      const res = await createQuotation.mutateAsync({
        customerId: customers[0].id,
        title: 'New Enterprise Deal',
      });
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
                <CardHeader>
                  <CardTitle className="text-base">Discount Governance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { tier: 'BRONZE', label: 'Standard', max: '10.0%' },
                    { tier: 'SILVER', label: 'Silver', max: '15.0%' },
                    { tier: 'GOLD', label: 'Gold VIP', max: '25.0%' },
                  ].map((rule) => (
                    <div key={rule.tier} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={rule.tier} />
                        <span>{rule.label}</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-muted-foreground">{rule.max}</span>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground pt-1">
                    Category limits: Hardware (15%), Services (20%), Subscription (25%).
                  </p>
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
  );
}

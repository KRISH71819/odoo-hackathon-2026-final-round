// ── Subscriptions List Page ───────────────────────────────────
import React from 'react';
import { PageHeader, Panel, StatusBadge, Spinner } from '../../components/ui';
import { useSubscriptionPlans } from './useBilling';
import { formatCurrency } from '../../lib/format';

export default function SubscriptionListPage() {
  const { data, isLoading } = useSubscriptionPlans();
  const plans = data?.data ?? [];

  const intervalLabel: Record<string, string> = {
    MONTHLY: 'Monthly',
    QUARTERLY: 'Quarterly',
    YEARLY: 'Yearly',
  };

  return (
    <div>
      <PageHeader
        title="Subscriptions"
        subtitle="Recurring subscription plans and billing configuration"
      />

      {isLoading && <Spinner />}

      {!isLoading && plans.length === 0 && (
        <Panel>
          <p className="text-df-text-muted text-sm">No subscription plans configured.</p>
        </Panel>
      )}

      {plans.length > 0 && (
        <Panel title="Active Subscription Plans">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-df-border text-df-text-muted">
                <th className="text-left py-2 pr-4 font-medium">Plan Name</th>
                <th className="text-left py-2 pr-4 font-medium">Interval</th>
                <th className="text-right py-2 pr-4 font-medium">Price / Period</th>
                <th className="text-left py-2 pr-4 font-medium">Proration</th>
                <th className="text-left py-2 font-medium">Cancellation</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan: any) => (
                <tr key={plan.id} className="border-b border-df-border/50">
                  <td className="py-2 pr-4 text-df-text font-medium">{plan.name}</td>
                  <td className="py-2 pr-4 text-df-text-muted">
                    {intervalLabel[plan.interval] ?? plan.interval}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-df-text">
                    {formatCurrency(plan.pricePerInterval)}
                  </td>
                  <td className="py-2 pr-4 text-df-text-muted">
                    {plan.prorationRule === 'DAY_BASED' ? 'Day-based' : 'None'}
                  </td>
                  <td className="py-2 text-df-text-muted">
                    {plan.cancellationPolicy === 'IMMEDIATE' ? 'Immediate' : 'End of period'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}

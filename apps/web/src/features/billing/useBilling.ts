// ── Billing Hooks ─────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

const KEYS = {
  subscriptionPlans: ['subscription-plans'] as const,
  schedules: (quotationId: string) => ['billing-schedules', quotationId] as const,
};

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: KEYS.subscriptionPlans,
    queryFn: () => api.get<any>('/billing/subscription-plans'),
  });
}

export function useBillingSchedules(quotationId: string) {
  return useQuery({
    queryKey: KEYS.schedules(quotationId),
    queryFn: () => api.get<any>(`/billing/schedules/${quotationId}`),
    enabled: !!quotationId,
  });
}

export function useProrateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scheduleId, data }: { scheduleId: string; data: any }) =>
      api.post<any>(`/billing/schedules/${scheduleId}/prorate`, data),
    onSuccess: () => {
      // Invalidate all schedules (quotationId not easily available here)
      qc.invalidateQueries({ queryKey: ['billing-schedules'] });
    },
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scheduleId, reason }: { scheduleId: string; reason: string }) =>
      api.post<any>(`/billing/schedules/${scheduleId}/cancel`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-schedules'] });
    },
  });
}

export function useCreateCreditNote() {
  return useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: any }) =>
      api.post<any>(`/billing/invoices/${invoiceId}/credit-note`, data),
  });
}

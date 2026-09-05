// ── Fulfillment Hooks ─────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

const KEYS = {
  plans: ['fulfillment-plans'] as const,
  plan: (id: string) => ['fulfillment-plans', id] as const,
  quotationPlan: (quotationId: string) => ['fulfillment-plans', 'quotation', quotationId] as const,
  warehouses: ['warehouses'] as const,
};

export function useFulfillmentPlans() {
  return useQuery({
    queryKey: KEYS.plans,
    queryFn: () => api.get<any>('/fulfillment/plans'),
  });
}

export function useFulfillmentPlan(id: string) {
  return useQuery({
    queryKey: KEYS.plan(id),
    queryFn: () => api.get<any>(`/fulfillment/plans/${id}`),
    enabled: !!id,
  });
}

export function useQuotationFulfillmentPlan(quotationId: string) {
  return useQuery({
    queryKey: KEYS.quotationPlan(quotationId),
    queryFn: () => api.get<any>(`/fulfillment/quotations/${quotationId}/plan`),
    enabled: !!quotationId,
  });
}

export function useWarehouses() {
  return useQuery({
    queryKey: KEYS.warehouses,
    queryFn: () => api.get<any>('/fulfillment/warehouses'),
  });
}

export function useSuggestFulfillmentPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (quotationId: string) =>
      api.post<any>(`/fulfillment/quotations/${quotationId}/suggest`),
    onSuccess: (_d, quotationId) => {
      qc.invalidateQueries({ queryKey: KEYS.quotationPlan(quotationId) });
      qc.invalidateQueries({ queryKey: KEYS.plans });
    },
  });
}

export function useAcceptFulfillmentPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => api.post<any>(`/fulfillment/plans/${planId}/accept`),
    onSuccess: (_d, planId) => {
      qc.invalidateQueries({ queryKey: KEYS.plan(planId) });
      qc.invalidateQueries({ queryKey: KEYS.plans });
    },
  });
}

export function useOverrideFulfillmentPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, data }: { planId: string; data: any }) =>
      api.put<any>(`/fulfillment/plans/${planId}/override`, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.plan(vars.planId) });
    },
  });
}

export function useCreateBackorder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => api.post<any>(`/fulfillment/plans/${planId}/backorder`),
    onSuccess: (_d, planId) => {
      qc.invalidateQueries({ queryKey: KEYS.plan(planId) });
    },
  });
}

export function useConsolidateBackorder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => api.post<any>(`/fulfillment/plans/${planId}/consolidate`),
    onSuccess: (_d, planId) => {
      qc.invalidateQueries({ queryKey: KEYS.plan(planId) });
    },
  });
}

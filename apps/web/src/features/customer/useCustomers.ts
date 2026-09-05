// ── Customer Hooks ──────────────────────────────────────────
// TanStack Query hooks for customer operations & tier tracking.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';

export interface CustomerSummary {
  id: string;
  name: string;
  email: string;
  tier: 'BRONZE' | 'SILVER' | 'GOLD';
  createdAt: string;
  _count?: {
    quotationsAsCustomer: number;
  };
}

export interface CustomerDetail extends CustomerSummary {
  quotationsAsCustomer: Array<{
    id: string;
    title: string;
    status: string;
    total?: number;
    totalAmount?: number;
    riskLevel: string;
    riskScore: number;
    createdAt: string;
  }>;
}

const KEYS = {
  customers: ['customers'] as const,
  customer: (id: string) => ['customers', id] as const,
  discountRules: ['discount-rules'] as const,
};

export function useCustomers() {
  return useQuery({
    queryKey: KEYS.customers,
    queryFn: () => api.get<any>('/auth/customers'),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: KEYS.customer(id),
    queryFn: () => api.get<any>(`/auth/customers/${id}`),
    enabled: !!id,
  });
}

export function useDiscountRules() {
  return useQuery({
    queryKey: KEYS.discountRules,
    queryFn: () => api.get<any>('/discount-rules'),
  });
}

export function useUpdateCustomerTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tier }: { id: string; tier: string }) =>
      api.patch<any>(`/auth/customers/${id}/tier`, { tier }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.customers });
      qc.invalidateQueries({ queryKey: KEYS.customer(vars.id) });
    },
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; email: string; tier?: string }) =>
      api.post<any>('/auth/customers', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.customers });
    },
  });
}

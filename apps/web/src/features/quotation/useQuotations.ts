// ── Quotation Hooks ──────────────────────────────────────────
// TanStack Query hooks for all quotation operations.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

const KEYS = {
  quotations: ['quotations'] as const,
  quotation: (id: string) => ['quotations', id] as const,
  upsellSuggestions: (id: string) => ['upsell-suggestions', id] as const,
  auditTrail: (id: string) => ['audit-trail', id] as const,
  liveRisk: (id: string) => ['live-risk', id] as const,
};

export function useQuotations(params?: Record<string, string>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return useQuery({
    queryKey: [...KEYS.quotations, params],
    queryFn: () => api.get<any>(`/quotations${query}`),
  });
}

export function useQuotation(id: string) {
  return useQuery({
    queryKey: KEYS.quotation(id),
    queryFn: () => api.get<any>(`/quotations/${id}`),
    enabled: !!id,
  });
}

export function useCreateQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post<any>('/quotations', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.quotations }),
  });
}

export function useUpdateQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/quotations/${id}`, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.quotation(vars.id) });
      qc.invalidateQueries({ queryKey: KEYS.quotations });
      qc.invalidateQueries({ queryKey: KEYS.liveRisk(vars.id) });
    },
  });
}

export function useAddLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ quotationId, data }: { quotationId: string; data: any }) =>
      api.post(`/quotations/${quotationId}/lines`, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.quotation(vars.quotationId) });
      qc.invalidateQueries({ queryKey: KEYS.upsellSuggestions(vars.quotationId) });
      qc.invalidateQueries({ queryKey: KEYS.liveRisk(vars.quotationId) });
    },
  });
}

export function useUpdateLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ quotationId, lineId, data }: { quotationId: string; lineId: string; data: any }) =>
      api.put(`/quotations/${quotationId}/lines/${lineId}`, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.quotation(vars.quotationId) });
      qc.invalidateQueries({ queryKey: KEYS.upsellSuggestions(vars.quotationId) });
      qc.invalidateQueries({ queryKey: KEYS.liveRisk(vars.quotationId) });
    },
  });
}

export function useRemoveLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ quotationId, lineId }: { quotationId: string; lineId: string }) =>
      api.del(`/quotations/${quotationId}/lines/${lineId}`),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.quotation(vars.quotationId) });
      qc.invalidateQueries({ queryKey: KEYS.upsellSuggestions(vars.quotationId) });
      qc.invalidateQueries({ queryKey: KEYS.liveRisk(vars.quotationId) });
    },
  });
}

export function useSubmitQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (quotationId: string) => api.post(`/quotations/${quotationId}/submit`),
    onSuccess: (_d, quotationId) => {
      qc.invalidateQueries({ queryKey: KEYS.quotation(quotationId) });
      qc.invalidateQueries({ queryKey: KEYS.quotations });
    },
  });
}

export function useDeleteQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (quotationId: string) => api.del(`/quotations/${quotationId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.quotations });
    },
  });
}

export function useUpsellSuggestions(quotationId: string) {
  return useQuery({
    queryKey: KEYS.upsellSuggestions(quotationId),
    queryFn: () => api.get<any>(`/quotations/${quotationId}/upsell-suggestions`),
    enabled: !!quotationId,
  });
}

export function useLiveRisk(quotationId: string) {
  return useQuery({
    queryKey: KEYS.liveRisk(quotationId),
    queryFn: () => api.get<any>(`/quotations/${quotationId}/risk`),
    enabled: !!quotationId,
    staleTime: 0, // always refetch when invalidated
  });
}

export function useAuditTrail(quotationId: string) {
  return useQuery({
    queryKey: KEYS.auditTrail(quotationId),
    queryFn: () => api.get<any>(`/quotations/${quotationId}/audit-trail`),
    enabled: !!quotationId,
  });
}

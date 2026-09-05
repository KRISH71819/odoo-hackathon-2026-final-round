// ── Invoice Hooks (Phase 4) ──
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';

export function useInvoices(filters: Record<string, string> = {}, page = 1) {
  const params = new URLSearchParams({ page: String(page), limit: '20', ...filters });
  return useQuery({
    queryKey: ['invoices', filters, page],
    queryFn: () => api.get<any>(`/insights/invoices?${params}`),
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.get<any>(`/insights/invoices/${id}`),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (quotationId: string) => api.post<any>('/insights/invoices', { quotationId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['quotation'] }); },
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, ...body }: { invoiceId: string; amount: number; method?: string; reference?: string }) =>
      api.post<any>(`/insights/invoices/${invoiceId}/pay`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['invoice'] }); },
  });
}

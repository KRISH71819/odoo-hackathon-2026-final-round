// ── Deal Health Hooks (Phase 4) ──
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';

export function useDealHealth() {
  return useQuery({
    queryKey: ['deal-health'],
    queryFn: () => api.get<any>('/insights/deal-health'),
  });
}

export function useNudge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (quotationId: string) => api.post<any>(`/insights/deal-health/${quotationId}/nudge`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deal-health'] }),
  });
}

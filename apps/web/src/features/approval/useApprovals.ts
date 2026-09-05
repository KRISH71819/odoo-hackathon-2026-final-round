// ── Approval Hooks ───────────────────────────────────────────

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

const KEYS = {
  approvals: ['approvals'] as const,
  approval: (id: string) => ['approvals', id] as const,
};

export function usePendingApprovals() {
  return useQuery({
    queryKey: KEYS.approvals,
    queryFn: () => api.get<any>('/approvals'),
  });
}

export function useApprovalDetail(id: string) {
  return useQuery({
    queryKey: KEYS.approval(id),
    queryFn: () => api.get<any>(`/approvals/${id}`),
    enabled: !!id,
  });
}

export function useApprovalAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.post(`/approvals/${id}/action`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.approvals });
      qc.invalidateQueries({ queryKey: ['quotations'] });
    },
  });
}

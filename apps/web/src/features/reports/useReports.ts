// ── Reports Hooks (Phase 4) ──
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';

export function useReports(filters: Record<string, string> = {}) {
  const params = new URLSearchParams(filters);
  return useQuery({
    queryKey: ['reports', filters],
    queryFn: () => api.get<any>(`/insights/reports?${params}`),
  });
}

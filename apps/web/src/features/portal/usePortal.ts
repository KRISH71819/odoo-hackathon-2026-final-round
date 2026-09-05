// ── Portal Hooks ──────────────────────────────────────────────
// All portal API calls use X-Portal-Token header, not JWT.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const PORTAL_BASE = '/api/portal/customer';

async function portalRequest<T>(path: string, options: RequestInit = {}, token: string): Promise<T> {
  const res = await fetch(`${PORTAL_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Portal-Token': token,
      ...(options.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

const KEYS = {
  quote: (token: string) => ['portal-quote', token] as const,
  thread: (token: string) => ['portal-thread', token] as const,
};

export function usePortalQuotation(token: string) {
  return useQuery({
    queryKey: KEYS.quote(token),
    queryFn: () => portalRequest<any>('/quotation', {}, token),
    enabled: !!token,
    retry: 1,
  });
}

export function usePortalThread(token: string) {
  return useQuery({
    queryKey: KEYS.thread(token),
    queryFn: () => portalRequest<any>('/quotation/thread', {}, token),
    enabled: !!token,
  });
}

export function useAddPortalComment(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { message: string; isChangeRequest: boolean }) =>
      portalRequest<any>('/quotation/comments', { method: 'POST', body: JSON.stringify(data) }, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.thread(token) });
    },
  });
}

export function useSubmitCounterOffer(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { proposedOrderDiscountBps: number; message?: string }) =>
      portalRequest<any>('/quotation/counter-offer', { method: 'POST', body: JSON.stringify(data) }, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.quote(token) });
      qc.invalidateQueries({ queryKey: KEYS.thread(token) });
    },
  });
}

export function useConfirmQuotation(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      portalRequest<any>('/quotation/confirm', { method: 'POST' }, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.quote(token) });
    },
  });
}

export function useRejectQuotation(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data?: { reason?: string }) =>
      portalRequest<any>('/quotation/reject', { method: 'POST', body: JSON.stringify(data || {}) }, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.quote(token) });
      qc.invalidateQueries({ queryKey: KEYS.thread(token) });
    },
  });
}


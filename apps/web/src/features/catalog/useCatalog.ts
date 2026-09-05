// ── Catalog Hooks ────────────────────────────────────────────
// TanStack Query hooks for product and price list operations.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

const KEYS = {
  products: ['products'] as const,
  product: (id: string) => ['products', id] as const,
  priceLists: ['price-lists'] as const,
};

export function useProducts(params?: Record<string, string>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return useQuery({
    queryKey: [...KEYS.products, params],
    queryFn: () => api.get<any>(`/products${query}`),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: KEYS.product(id),
    queryFn: () => api.get<any>(`/products/${id}`),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/products', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.products }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/products/${id}`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.products });
      qc.invalidateQueries({ queryKey: KEYS.product(vars.id) });
    },
  });
}

export function usePriceLists() {
  return useQuery({
    queryKey: KEYS.priceLists,
    queryFn: () => api.get<any>('/price-lists'),
  });
}

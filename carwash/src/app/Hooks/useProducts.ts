'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchProducts,
  fetchProductByCode,
  updateProduct,
  createProduct,
} from '@/app/lib/utils/pos-api';
import type { PosProduct } from '@/app/lib/types/pos';

export function useProducts(token: string) {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => fetchProducts(token),
    select: (res) => res.data,
  });
}

export function useProductByCode(code: string, token: string) {
  return useQuery({
    queryKey: ['product', code],
    queryFn: () => fetchProductByCode(code, token),
    enabled: !!code && !!token,
    select: (res) => res.data,
  });
}

export function useCreateProduct(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newProduct: PosProduct) => createProduct(newProduct, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct(code: string, token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productData,
    }: {
      code: string;
      productData: Partial<PosProduct>;
    }) => updateProduct(code, productData, token),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });

      queryClient.invalidateQueries({ queryKey: ['product', variables.code] });
    },
  });
}

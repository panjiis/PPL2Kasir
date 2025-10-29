'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchOrders,
  fetchOrderById,
  createOrder,
  createOrderFromCart,
  voidOrder,
  returnOrder,
} from '@/app/lib/utils/pos-api';
import type { PosOrder } from '@/app/lib/types/pos';

export function useOrders(token: string) {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => fetchOrders(token),
    select: (res) => res.data,
  });
}

export function useOrderById(id: string, token: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => fetchOrderById(id, token),
    enabled: !!id,
    select: (res) => res.data,
  });
}

export function useCreateOrder(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: PosOrder) => createOrder(body, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useCreateOrderFromCart(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      cart_id: string;
      document_number: string;
      additional_info?: string;
      notes?: string;
    }) => createOrderFromCart(body, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useVoidOrder(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { id: number; voided_by: number; reason: string }) =>
      voidOrder(body, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useReturnOrder(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      original_order_id: number;
      item_ids: number[];
      processed_by: number;
      reason: string;
    }) => returnOrder(body, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

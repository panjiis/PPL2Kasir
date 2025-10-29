'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchPaymentTypes } from '@/app/lib/utils/pos-api';
import type { PaymentType } from '@/app/lib/types/pos';

export function usePaymentTypes(token: string) {
  return useQuery({
    queryKey: ['paymentTypes'],
    queryFn: () => fetchPaymentTypes(token),
    select: (res) => (Array.isArray(res.data) ? res.data : []) as PaymentType[],
    enabled: !!token, // Hanya jalankan jika token ada
  });
}
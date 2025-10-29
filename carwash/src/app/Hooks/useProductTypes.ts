'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchProductGroups } from '@/app/lib/utils/pos-api';
import type { ProductGroup } from '@/app/lib/types/pos';

export function useProductGroups(token: string) {
  return useQuery({
    queryKey: ['product-groups'],
    queryFn: () => fetchProductGroups(token),
    select: (res) => res.data as ProductGroup[],
  });
}

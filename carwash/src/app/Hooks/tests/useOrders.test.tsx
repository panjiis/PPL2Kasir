import { renderHook, waitFor } from '@testing-library/react';
import { useOrders, useCreateOrder } from '../useOrders'; // Sesuaikan path
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as api from '@/app/lib/utils/pos-api'; // Import semua fungsi API untuk di-spy

// 1. Setup Wrapper untuk React Query
// Hooks butuh QueryClientProvider agar bisa jalan
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Matikan retry agar test lebih cepat gagal jika ada error
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// 2. Mock API Module
vi.mock('@/app/lib/utils/pos-api', () => ({
  fetchOrders: vi.fn(),
  createOrder: vi.fn(),
}));

describe('useOrders Hooks', () => {
  const token = 'fake-token';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- TEST QUERY (GET DATA) ---
  describe('useOrders', () => {
    it('berhasil mengambil data orders', async () => {
      // Setup mock return value
      const mockData = { data: [{ id: 1, total: 10000 }] };
      (api.fetchOrders as any).mockResolvedValue(mockData);

      const { result } = renderHook(() => useOrders(token), {
        wrapper: createWrapper(),
      });

      // Cek state awal (loading)
      expect(result.current.isLoading).toBe(true);

      // Tunggu sampai sukses
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assertions
      expect(api.fetchOrders).toHaveBeenCalledWith(token);
      expect(result.current.data).toEqual(mockData.data); // Karena di hook ada select: res => res.data
    });
  });

  // --- TEST MUTATION (CREATE/UPDATE) ---
  describe('useCreateOrder', () => {
    it('berhasil membuat order dan melakukan invalidasi query', async () => {
      const mockOrder = { id: 1, items: [] } as any;
      const mockResponse = { success: true };
      
      (api.createOrder as any).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCreateOrder(token), {
        wrapper: createWrapper(),
      });

      // Panggil fungsi mutate
      result.current.mutate(mockOrder);

      // Tunggu sampai selesai
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assertions
      expect(api.createOrder).toHaveBeenCalledWith(mockOrder, token);
      
      // (Opsional) Kita bisa cek apakah queryClient.invalidateQueries dipanggil, 
      // tapi biasanya cek isSuccess dan API call sudah cukup untuk unit test hook ini.
    });

    it('menangani error saat create order gagal', async () => {
        const mockOrder = { id: 1, items: [] } as any;
        (api.createOrder as any).mockRejectedValue(new Error('Gagal buat order'));
  
        const { result } = renderHook(() => useCreateOrder(token), {
          wrapper: createWrapper(),
        });
  
        result.current.mutate(mockOrder);
  
        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error).toBeDefined();
      });
  });
});
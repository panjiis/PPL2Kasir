import { renderHook, waitFor } from '@testing-library/react';
import { useProducts, useProductByCode, useCreateProduct, useUpdateProduct } from '../useProducts';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as api from '@/app/lib/utils/pos-api';

// 1. Setup Wrapper React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// 2. Mock API Modules
vi.mock('@/app/lib/utils/pos-api', () => ({
  fetchProducts: vi.fn(),
  fetchProductByCode: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
}));

describe('useProducts Hooks', () => {
  const token = 'fake-token';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- TEST: useProducts (Get All) ---
  describe('useProducts', () => {
    it('berhasil mengambil daftar produk', async () => {
      const mockData = { data: [{ id: 1, name: 'Sabun Cuci' }] };
      (api.fetchProducts as any).mockResolvedValue(mockData);

      const { result } = renderHook(() => useProducts(token), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Pastikan data yang dikembalikan adalah isi array (karena logic 'select')
      expect(result.current.data).toEqual(mockData.data);
      expect(api.fetchProducts).toHaveBeenCalledWith(token);
    });
  });

  // --- TEST: useProductByCode (Get One) ---
  describe('useProductByCode', () => {
    it('berhasil mengambil satu produk berdasarkan code', async () => {
      const code = 'P001';
      const mockData = { data: { id: 1, code: 'P001', name: 'Sabun' } };
      (api.fetchProductByCode as any).mockResolvedValue(mockData);

      const { result } = renderHook(() => useProductByCode(code, token), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData.data);
      expect(api.fetchProductByCode).toHaveBeenCalledWith(code, token);
    });

    it('tidak melakukan fetch jika code kosong (Enabled Check)', async () => {
      const { result } = renderHook(() => useProductByCode('', token), {
        wrapper: createWrapper(),
      });

      // Karena enabled: false, statusnya 'idle' (loading true tapi fetchStatus idle)
      expect(result.current.fetchStatus).toBe('idle');
      expect(api.fetchProductByCode).not.toHaveBeenCalled();
    });
  });

  // --- TEST: useCreateProduct (Mutation) ---
  describe('useCreateProduct', () => {
    it('berhasil membuat produk baru', async () => {
      const newProduct = { name: 'Shampoo Mobil', price: 50000 } as any;
      (api.createProduct as any).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useCreateProduct(token), {
        wrapper: createWrapper(),
      });

      result.current.mutate(newProduct);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(api.createProduct).toHaveBeenCalledWith(newProduct, token);
    });
  });

  // --- TEST: useUpdateProduct (Mutation) ---
  describe('useUpdateProduct', () => {
    it('berhasil update produk', async () => {
      const code = 'P001';
      const updateData = { price: 60000 };
      (api.updateProduct as any).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useUpdateProduct(code, token), {
        wrapper: createWrapper(),
      });

      // Perhatikan cara panggil mutate: object destructuring sesuai definisi hook
      result.current.mutate({ code, productData: updateData });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Pastikan parameter API benar
      expect(api.updateProduct).toHaveBeenCalledWith(code, updateData, token);
    });
  });
});
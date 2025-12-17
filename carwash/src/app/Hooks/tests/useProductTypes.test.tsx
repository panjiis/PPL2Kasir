import { renderHook, waitFor } from '@testing-library/react';
import { useProductGroups } from '../useProductTypes'; // Sesuaikan jika nama file aslinya useProductGroups.ts
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

// 2. Mock API
vi.mock('@/app/lib/utils/pos-api', () => ({
  fetchProductGroups: vi.fn(),
}));

describe('useProductGroups Hook', () => {
  const token = 'fake-token';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('berhasil mengambil data product groups', async () => {
    const mockData = { 
      data: [
        { id: 1, name: 'Minuman' },
        { id: 2, name: 'Makanan' }
      ] 
    };
    
    // Mock return value dari API
    (api.fetchProductGroups as any).mockResolvedValue(mockData);

    const { result } = renderHook(() => useProductGroups(token), {
      wrapper: createWrapper(),
    });

    // Cek status loading
    expect(result.current.isLoading).toBe(true);

    // Tunggu sampai sukses
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verifikasi data dan pemanggilan API
    expect(result.current.data).toEqual(mockData.data);
    expect(api.fetchProductGroups).toHaveBeenCalledWith(token);
  });
});
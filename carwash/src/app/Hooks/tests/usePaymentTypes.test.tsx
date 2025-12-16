import { renderHook, waitFor } from '@testing-library/react';
import { usePaymentTypes } from '../usePaymentTypes';
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
  fetchPaymentTypes: vi.fn(),
}));

describe('usePaymentTypes Hook', () => {
  const token = 'valid-token';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('berhasil mengambil dan mengembalikan data payment types', async () => {
    // Mock respon sukses standar
    const mockResponse = { 
      data: [
        { id: 1, name: 'Cash' },
        { id: 2, name: 'QRIS' }
      ] 
    };
    
    (api.fetchPaymentTypes as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => usePaymentTypes(token), {
      wrapper: createWrapper(),
    });

    // Cek loading awal
    expect(result.current.isLoading).toBe(true);

    // Tunggu data sukses
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Pastikan data sesuai
    expect(result.current.data).toEqual(mockResponse.data);
    expect(api.fetchPaymentTypes).toHaveBeenCalledWith(token);
  });

  it('mengembalikan array kosong [] jika respon backend bukan array (Safety Check)', async () => {
    // Mock kasus aneh: backend mengembalikan null atau object kosong di field data
    const weirdResponse = { data: null }; 
    (api.fetchPaymentTypes as any).mockResolvedValue(weirdResponse);

    const { result } = renderHook(() => usePaymentTypes(token), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Logic 'select' di hook Anda harus mengubah null menjadi []
    expect(result.current.data).toEqual([]); 
    expect(Array.isArray(result.current.data)).toBe(true);
  });

  it('tidak melakukan fetch jika token kosong (Enabled Check)', async () => {
    const { result } = renderHook(() => usePaymentTypes(''), {
      wrapper: createWrapper(),
    });

    // PERBAIKAN:
    // Saat enabled: false, isLoading itu false.
    // Kita harus cek fetchStatus-nya 'idle' (artinya tidak sedang ngapa-ngapain).
    expect(result.current.fetchStatus).toBe('idle'); 
    
    // Pastikan API benar-benar tidak dipanggil
    expect(api.fetchPaymentTypes).not.toHaveBeenCalled();
  });
});
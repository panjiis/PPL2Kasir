import { renderHook, waitFor } from '@testing-library/react';
import { useUsers } from '../useUsers';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// PERBAIKAN 1: Path import mundur 2 level
import { useSession } from '../../lib/context/session'; 

// PERBAIKAN 2: Path mock mundur 2 level (harus sama persis dengan lokasi file)
vi.mock('../../lib/context/session', () => ({
  useSession: vi.fn(),
}));

// Mock Global Fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useUsers Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('tidak melakukan fetch jika token tidak ada', async () => {
    // PERBAIKAN 3: Gunakan vi.mocked() untuk type safety yang lebih baik
    vi.mocked(useSession).mockReturnValue({ session: null } as any);

    const { result } = renderHook(() => useUsers());

    await waitFor(() => expect(result.current.loading).toBe(false));
    
    expect(result.current.data).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('berhasil mengambil data users dan melakukan transformasi data dengan benar', async () => {
    vi.mocked(useSession).mockReturnValue({ session: { token: 'valid-token' } } as any);

    const mockApiData = {
      success: true,
      data: [
        {
          id: '1',
          username: 'user1',
          email: 'user1@test.com',
          name: 'User Satu',
          role: 'admin'
        },
        {
          user_id: '2',
          username: 'user2',
          full_name: 'User Dua',
          role: { role_name: 'cashier' }
        }
      ]
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockApiData,
    });

    const { result } = renderHook(() => useUsers());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/users'), 
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer valid-token'
        })
      })
    );

    const users = result.current.data;
    expect(users).toHaveLength(2);

    expect(users[0]).toEqual({
      id: '1',
      username: 'user1',
      email: 'user1@test.com',
      name: 'User Satu',
      role: 'admin'
    });

    expect(users[1]).toEqual({
      id: '2',
      username: 'user2',
      email: undefined,
      name: 'User Dua',
      role: 'cashier'
    });

    expect(result.current.error).toBeNull();
  });

  it('menangani error saat fetch gagal (400/500)', async () => {
    vi.mocked(useSession).mockReturnValue({ session: { token: 'valid-token' } } as any);

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useUsers());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Failed to fetch users');
    expect(result.current.data).toEqual([]);
  });

  it('menangani exception jaringan (Network Error)', async () => {
    vi.mocked(useSession).mockReturnValue({ session: { token: 'valid-token' } } as any);

    mockFetch.mockRejectedValue(new Error('Network Error'));

    const { result } = renderHook(() => useUsers());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network Error');
    expect(result.current.data).toEqual([]);
  });
});
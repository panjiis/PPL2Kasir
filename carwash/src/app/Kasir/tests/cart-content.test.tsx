import { renderHook, act, waitFor } from '@testing-library/react';
import { CartProvider, useCart } from '../cart-content';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as posApi from '@/app/lib/utils/pos-api';

// 1. Mock Global Modules
vi.mock('@/app/lib/context/session', () => ({
  useSession: () => ({ session: { token: 'fake-token', user: { id: 1 } } }),
}));

// Mock Notification (pastikan path relative benar)
vi.mock('../notification-context', () => ({
  useNotification: () => ({ showNotif: vi.fn() }),
}));

// Mock API calls
vi.mock('@/app/lib/utils/pos-api', () => ({
  createCart: vi.fn(),
  addItemToCart: vi.fn(),
  deleteCart: vi.fn(),
  removeItemFromCart: vi.fn(),
  fetchEmployees: vi.fn(),
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('CartContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CartProvider>{children}</CartProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    
    // --- FIX UTAMA: Setup Return Value untuk Semua Mock API ---
    // Memberikan nilai balik Promise agar .then() / .catch() / await tidak error (undefined)
    
    (posApi.createCart as any).mockResolvedValue({ data: { cart_id: 'cart-123' } });
    
    (posApi.addItemToCart as any).mockResolvedValue({ 
      data: { 
        items: [{ 
          item_id: 'line-1', 
          quantity: 1, // Default mock
          product: { product_code: 'P001' } 
        }] 
      } 
    });

    (posApi.fetchEmployees as any).mockResolvedValue({ data: [] });

    // FIX: Mock deleteCart harus mengembalikan Promise, bukan undefined
    (posApi.deleteCart as any).mockResolvedValue({}); 
    
    // FIX: Mock removeItemFromCart juga harus mengembalikan Promise
    (posApi.removeItemFromCart as any).mockResolvedValue({});
  });

  // --- TEST: Menambah Item ---
  it('berhasil menambahkan item ke cart', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    const newItem = {
      id: '1',
      itemId: 'P001',
      name: 'Kopi',
      price: 20000,
      type: 'product',
      category: 'Minuman',
      qty: 1,
      image: ''
    } as any;

    await act(async () => {
      await result.current.addItem(newItem);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].name).toBe('Kopi');
    expect(result.current.cartId).toBe('cart-123'); 
    expect(posApi.createCart).toHaveBeenCalled();
    expect(posApi.addItemToCart).toHaveBeenCalled();
  });

  // --- TEST: Kalkulasi Finansial ---
  it('menghitung subtotal, pajak, dan total dengan benar', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    // Tambah item @ 20.000
    // Menggunakan 1 item agar sesuai dengan default mock addItemToCart (qty: 1)
    const item = {
      id: '1', itemId: 'P001', name: 'Kopi', price: 20000, type: 'product', category: 'Minuman', qty: 1, image: ''
    } as any;

    await act(async () => {
      await result.current.addItem(item);
    });

    // Subtotal = 20.000
    expect(result.current.subtotal).toBe(20000);
    
    // Pajak = 10% * 20.000 = 2.000
    expect(result.current.tax).toBe(2000);

    // Total = 22.000
    expect(result.current.total).toBe(22000);
  });

  // --- TEST: Hapus Item ---
  it('berhasil menghapus item yang dipilih', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const item = { id: '1', itemId: 'P001', name: 'Kopi', price: 20000, type: 'product', category: 'Minuman', qty: 1, image: '' } as any;

    await act(async () => {
      await result.current.addItem(item);
    });

    // Select item
    act(() => {
      result.current.selectItem('1');
    });

    // Delete
    await act(async () => {
      await result.current.deleteSelected();
    });

    expect(result.current.items).toHaveLength(0);
    expect(posApi.removeItemFromCart).toHaveBeenCalled();
  });

  // --- TEST: Diskon/Kupon ---
  it('menerapkan kupon dan menghitung ulang total', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    // Mock data sync
    const mockSyncData = {
      subtotal: 40000, 
      tax: 4000,
      discount: 10000, 
      total: 34000,   
      items: []
    };

    act(() => {
      result.current.applyCoupon({ id: 1, code: 'HEMAT' } as any, mockSyncData);
    });

    expect(result.current.appliedCoupon?.code).toBe('HEMAT');
    expect(result.current.discount).toBe(10000);
    expect(result.current.total).toBe(34000);
  });

  // --- TEST: Clear Cart ---
  it('mengosongkan cart state sepenuhnya', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    
    // Tambah item dulu agar cartId terisi
    await act(async () => {
      await result.current.addItem({ id: '1', itemId: 'P001', name: 'Kopi', price: 20000, type: 'product', category: '', qty: 1, image: '' } as any);
    });

    // Jalankan clearCartState
    // Karena deleteCart sekarang sudah di-mock return value-nya, ini tidak akan crash
    act(() => {
      result.current.clearCartState();
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.cartId).toBeNull();
    expect(result.current.subtotal).toBe(0);
    
    // Optional: Verifikasi deleteCart dipanggil (karena ada token & cartId sebelum di-clear)
    expect(posApi.deleteCart).toHaveBeenCalled();
  });
});
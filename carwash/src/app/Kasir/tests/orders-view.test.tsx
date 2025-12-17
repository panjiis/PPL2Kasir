import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import OrdersView from '../orders-view';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as posApi from '@/app/lib/utils/pos-api';

// --- 1. MOCK DEPENDENCIES ---

// Mock Session
const mockSessionReturn = {
  session: { token: 'test-token', user: { name: 'Kasir 1' } }
};

vi.mock('@/app/lib/context/session', () => ({
  useSession: () => mockSessionReturn,
}));

// Mock Notification
const mockShowNotif = vi.fn();
vi.mock('../notification-context', () => ({
  useNotification: () => ({ showNotif: mockShowNotif }),
}));

// Mock Custom Data Hooks
const mockRefetchOrders = vi.fn();
let mockOrdersData: any[] = [];
let mockProductsData: any[] = [];

vi.mock('@/app/Hooks/useOrders', () => ({
  useOrders: () => ({
    data: mockOrdersData,
    isLoading: false,
    error: null,
    refetch: mockRefetchOrders,
  }),
}));

vi.mock('@/app/Hooks/useProducts', () => ({
  useProducts: () => ({
    data: mockProductsData,
    isLoading: false,
    error: null,
  }),
}));

// Mock API Call langsung
vi.mock('@/app/lib/utils/pos-api', () => ({
  returnOrder: vi.fn(),
}));

// Mock Translation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (key === 'OrdersView.modal.subtotal') return 'Subtotal';
      if (key === 'Aside.totals.tax') return 'Tax';
      if (key === 'Aside.totals.discount') return 'Discount';
      if (key === 'OrdersView.modal.total') return 'Grand Total';
      if (key === 'OrdersView.empty') return 'No orders found';
      if (key === 'OrdersView.modal.returnSuccess') return 'Return Successful';
      if (key === 'OrdersView.modal.returnFailed') return 'Return Failed';
      if (key === 'OrdersView.modal.return') return 'Return Order'; 
      if (key === 'OrdersView.modal.returnYes') return 'Yes, Return';
      return key; 
    },
  }),
}));

// Mock window.print
const mockPrint = vi.fn();

// FIX: Tambahkan 'X' dan 'XIcon' ke mock lucide-react
// Komponen Dialog (Shadcn/Radix) membutuhkan ikon ini untuk tombol Close
vi.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader" />,
  AlertTriangle: () => <div data-testid="error-icon" />,
  Search: () => <div data-testid="search-icon" />,
  // Tambahan penting untuk DialogContent:
  X: () => <div data-testid="close-icon" />, 
  XIcon: () => <div data-testid="close-icon" />, // Alias untuk kompatibilitas
}));

describe('OrdersView Component', () => {
  const dummyOrder = {
    id: 1,
    document_number: 'ORD-001',
    orders_date: { seconds: 1700000000 },
    subtotal: 100000,
    discount_amount: 10000, 
    additional_info: 'Metode: QRIS, Payment Fee: 500', 
    payment_type: { payment_name: 'QRIS' },
    order_items: [
      { id: 101, product_name: 'Item A', quantity: 2, line_total: 50000 },
      { id: 102, product_name: 'Item B', quantity: 1, line_total: 50000 },
    ],
    notes: 'Catatan Order',
  };

  const dummyProducts = [
    { product_code: 'P1', product_name: 'Item A' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockOrdersData = [dummyOrder];
    mockProductsData = dummyProducts;
    
    // Setup Window Print Mock
    Object.defineProperty(window, 'print', {
      writable: true,
      value: mockPrint,
    });
  });

  afterEach(() => {
    // @ts-ignore
    window.print = undefined;
  });

  // --- TEST 1: Rendering & Data Display ---
  it('merender daftar pesanan dengan benar', () => {
    render(<OrdersView />);
    expect(screen.getByText('#ORD-001')).toBeInTheDocument();
    expect(screen.getByText(/Rp\s?100\.000/)).toBeInTheDocument();
  });

  // --- TEST 2: Search & Pagination ---
  it('memfilter pesanan berdasarkan pencarian', async () => {
    const order2 = { ...dummyOrder, id: 2, document_number: 'ORD-999', subtotal: 50000 };
    mockOrdersData = [dummyOrder, order2];

    render(<OrdersView />);
    
    expect(screen.getByText('#ORD-001')).toBeInTheDocument();
    expect(screen.getByText('#ORD-999')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText('OrdersView.searchPlaceholder');
    fireEvent.change(searchInput, { target: { value: '999' } });

    await waitFor(() => {
      expect(screen.queryByText('#ORD-001')).not.toBeInTheDocument();
      expect(screen.getByText('#ORD-999')).toBeInTheDocument();
    });
  });

  // --- TEST 3: Kalkulasi Detail Modal ---
  it('membuka modal dan menghitung pajak, diskon, fee, dan grand total dengan benar', async () => {
    render(<OrdersView />);

    const viewBtn = screen.getByText('OrdersView.viewDetails');
    fireEvent.click(viewBtn);

    const dialog = screen.getByRole('dialog');
    
    // Subtotal: 100.000
    expect(within(dialog).getByText('Subtotal')).toBeInTheDocument();
    expect(within(dialog).getByText(/Rp\s?100\.000/)).toBeInTheDocument();

    // Tax (10% dari (100k - 10k)) = 9.000
    expect(within(dialog).getByText('Tax')).toBeInTheDocument();
    expect(within(dialog).getByText(/Rp\s?9\.000/)).toBeInTheDocument();

    // Discount: -10.000
    expect(within(dialog).getByText('Discount')).toBeInTheDocument();
    expect(within(dialog).getByText(/-\s?Rp\s?10\.000/)).toBeInTheDocument();

    // Fee: 500
    expect(within(dialog).getByText(/Rp\s?500/)).toBeInTheDocument();

    // Grand Total: (100k - 10k) + 9k + 500 = 99.500
    expect(within(dialog).getByText('Grand Total')).toBeInTheDocument();
    expect(within(dialog).getByText(/Rp\s?99\.500/)).toBeInTheDocument();
  });

  // --- TEST 4: Return Order Flow (Success) ---
  it('menangani proses return order dengan sukses', async () => {
    (posApi.returnOrder as any).mockResolvedValue({ success: true });

    render(<OrdersView />);

    fireEvent.click(screen.getByText('OrdersView.viewDetails'));
    
    // Klik tombol Return di modal detail
    fireEvent.click(screen.getByText('Return Order'));

    // Klik tombol Confirm di dialog konfirmasi
    fireEvent.click(screen.getByText('Yes, Return'));

    await waitFor(() => {
      expect(posApi.returnOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          original_order_id: 1,
          item_ids: [101, 102],
        }),
        'test-token'
      );
    });

    expect(mockShowNotif).toHaveBeenCalledWith(expect.objectContaining({
      type: 'success',
    }));
    expect(mockRefetchOrders).toHaveBeenCalled();
  });

  // --- TEST 5: Return Order Flow (Error Handling) ---
  it('menangani error saat return order gagal', async () => {
    (posApi.returnOrder as any).mockRejectedValue(new Error('API Error'));

    render(<OrdersView />);

    fireEvent.click(screen.getByText('OrdersView.viewDetails'));
    fireEvent.click(screen.getByText('Return Order'));
    fireEvent.click(screen.getByText('Yes, Return'));

    await waitFor(() => {
      expect(mockShowNotif).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        message: 'API Error',
      }));
    });
    
    expect(mockRefetchOrders).not.toHaveBeenCalled();
  });

  // --- TEST 6: Print Receipt ---
  it('memanggil window.print saat tombol print ditekan', () => {
    render(<OrdersView />);

    fireEvent.click(screen.getByText('OrdersView.viewDetails'));
    fireEvent.click(screen.getByText('OrdersView.modal.print'));

    expect(mockPrint).toHaveBeenCalled();
  });
});
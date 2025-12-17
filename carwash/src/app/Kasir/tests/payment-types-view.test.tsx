import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PaymentTypesView from '../payment-types-view';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePaymentTypes } from '@/app/Hooks/usePaymentTypes';

// --- 1. MOCK DEPENDENCIES ---

// FIX: Gunakan path alias '@' agar mock mengarah ke file yang benar
vi.mock('@/app/lib/context/session', () => ({
  useSession: () => ({ session: { token: 'test-token', user: { name: 'Admin' } } }),
}));

// FIX: Mock Custom Hook sebagai vi.fn() agar return value bisa diubah per test
vi.mock('@/app/Hooks/usePaymentTypes', () => ({
  usePaymentTypes: vi.fn(),
}));

// Mock Translation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      if (key === 'PaymentTypesView.loading') return 'Loading...';
      if (key === 'PaymentTypesView.errorTitle') return 'Error Occurred';
      if (key === 'PaymentTypesView.empty') return 'No data found';
      if (key === 'PaymentTypesView.statusActive') return 'Active';
      if (key === 'PaymentTypesView.statusInactive') return 'Inactive';
      if (key === 'Pagination.pageOf') return `Page ${params?.currentPage} of ${params?.totalPages}`;
      return key;
    },
  }),
}));

// Mock Lucide Icons
vi.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader" />,
  AlertTriangle: () => <div data-testid="error-icon" />,
  Search: () => <div data-testid="search-icon" />,
}));

describe('PaymentTypesView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default Mock: Loading False, Data Kosong
    (usePaymentTypes as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
  });

  // --- TEST CASE 1: Loading State ---
  it('menampilkan loader saat data sedang diambil', () => {
    // Override mock untuk loading state
    (usePaymentTypes as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
    });

    render(<PaymentTypesView />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  // --- TEST CASE 2: Error State ---
  it('menampilkan pesan error jika terjadi kesalahan', () => {
    // Override mock untuk error state
    (usePaymentTypes as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('Network Error'),
    });

    render(<PaymentTypesView />);
    expect(screen.getByText('Error Occurred')).toBeInTheDocument();
    expect(screen.getByText('Network Error')).toBeInTheDocument();
  });

  // --- TEST CASE 3: Data Mapping & Rendering ---
  it('merender data pembayaran dengan mapping yang benar', () => {
    const mockData = [
      { id: 1, payment_name: 'Cash', processing_fee_rate: '0%', is_active: 1 },
      // Test fallback null fee -> harus jadi '0%' di UI
      { id: 2, payment_name: 'QRIS', processing_fee_rate: null, is_active: 0 }, 
    ];

    (usePaymentTypes as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    });

    render(<PaymentTypesView />);

    // Cek Row 1 (Cash)
    expect(screen.getByText('Cash')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument(); // Badge Active

    // Cek Row 2 (QRIS)
    expect(screen.getByText('QRIS')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument(); // Badge Inactive
    
    // Cek fallback rate '0%' muncul (untuk item ke-2 yang null, dan item ke-1 yang memang 0%)
    // Karena ada 2 item dengan '0%', kita gunakan getAllByText
    const fees = screen.getAllByText('0%');
    expect(fees.length).toBeGreaterThanOrEqual(2);
  });

  // --- TEST CASE 4: Search Filtering ---
  it('memfilter daftar pembayaran berdasarkan input pencarian', async () => {
    const mockData = [
      { id: 1, payment_name: 'Cash', is_active: 1 },
      { id: 2, payment_name: 'Transfer BCA', is_active: 1 },
      { id: 3, payment_name: 'Transfer Mandiri', is_active: 1 },
    ];

    (usePaymentTypes as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    });

    render(<PaymentTypesView />);

    // Awalnya semua muncul
    expect(screen.getByText('Cash')).toBeInTheDocument();
    expect(screen.getByText('Transfer BCA')).toBeInTheDocument();

    // Input search term "Transfer"
    const input = screen.getByPlaceholderText('PaymentTypesView.searchPlaceholder');
    fireEvent.change(input, { target: { value: 'Transfer' } });

    // Assert: "Cash" harus hilang, yang mengandung "Transfer" tetap ada
    await waitFor(() => {
      expect(screen.queryByText('Cash')).not.toBeInTheDocument();
      expect(screen.getByText('Transfer BCA')).toBeInTheDocument();
      expect(screen.getByText('Transfer Mandiri')).toBeInTheDocument();
    });
  });

  // --- TEST CASE 5: Pagination Logic ---
  it('menangani paginasi dengan benar (maks 10 item per halaman)', () => {
    // Generate 15 items dummy
    const mockData = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      payment_name: `Payment ${i + 1}`,
      is_active: 1,
    }));

    (usePaymentTypes as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    });

    render(<PaymentTypesView />);

    // Halaman 1: Harus ada Payment 1 s/d Payment 10
    expect(screen.getByText('Payment 1')).toBeInTheDocument();
    expect(screen.getByText('Payment 10')).toBeInTheDocument();
    
    // Payment 11 (Halaman 2) tidak boleh muncul
    expect(screen.queryByText('Payment 11')).not.toBeInTheDocument();

    // Cek status footer pagination
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();

    // Klik Next
    const nextButton = screen.getByText('Pagination.next');
    fireEvent.click(nextButton);

    // Halaman 2: Harus ada Payment 11 s/d Payment 15
    expect(screen.getByText('Payment 11')).toBeInTheDocument();
    expect(screen.getByText('Payment 15')).toBeInTheDocument();
    
    // Payment 1 (Halaman 1) tidak boleh muncul
    expect(screen.queryByText('Payment 1')).not.toBeInTheDocument();
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
  });

  // --- TEST CASE 6: Empty State ---
  it('menampilkan pesan kosong jika data tidak ada', () => {
    (usePaymentTypes as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<PaymentTypesView />);
    expect(screen.getByText('No data found')).toBeInTheDocument();
  });
});
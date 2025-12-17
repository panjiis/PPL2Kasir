import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProductsView from '../products-view';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useProducts } from '@/app/Hooks/useProducts';
import * as posApi from '@/app/lib/utils/pos-api';

// --- 1. MOCK DEPENDENCIES ---

// Mock Session
vi.mock('@/app/lib/context/session', () => ({
  useSession: () => ({ session: { token: 'test-token' } }),
}));

// Mock useProducts Hook
vi.mock('@/app/Hooks/useProducts', () => ({
  useProducts: vi.fn(),
}));

// Mock API calls
vi.mock('@/app/lib/utils/pos-api', () => ({
  fetchStocks: vi.fn(),
}));

// Mock Translation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      if (key === 'ProductsView.loading') return 'Loading Data...';
      if (key === 'ProductsView.errorTitle') return 'Error Occurred';
      if (key === 'ProductsView.empty') return 'No products found';
      if (key === 'ProductsView.colQty') return 'Qty';
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

describe('ProductsView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: useProducts return empty array, not loading
    (useProducts as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    // Default: fetchStocks return empty array
    (posApi.fetchStocks as any).mockResolvedValue({ data: [] });
  });

  // --- TEST CASE 1: Loading State ---
  it('menampilkan loader saat memuat produk ATAU memuat stok', async () => {
    (useProducts as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    // Buat fetchStocks "menggantung"
    (posApi.fetchStocks as any).mockReturnValue(new Promise(() => {}));

    render(<ProductsView />);
    
    expect(screen.getByText('Loading Data...')).toBeInTheDocument();
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  // --- TEST CASE 2: Error Handling ---
  it('menampilkan pesan error jika hook useProducts gagal', async () => {
    // Setup Mock Error
    (useProducts as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('Failed to load products'),
    });
    
    // fetchStocks sukses (tapi karena async, komponen akan loading sebentar)
    (posApi.fetchStocks as any).mockResolvedValue({ data: [] });

    render(<ProductsView />);

    // FIX: Gunakan waitFor karena komponen akan render Loading dulu (karena loadingStocks true)
    // sebelum useEffect selesai dan menampilkan error
    await waitFor(() => {
      expect(screen.getByText('Error Occurred')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Failed to load products')).toBeInTheDocument();
  });

  // --- TEST CASE 3: Data Merging ---
  it('menggabungkan data produk dan stok serta mendeteksi tipe layanan (Service)', async () => {
    const mockProducts = [
      { product_code: 'P001', product_name: 'Kopi Hitam', price: 15000 },
      { product_code: 'SRV-01', product_name: 'Jasa Seduh', price: 5000 },
    ];
    (useProducts as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockProducts,
      isLoading: false,
      error: null,
    });

    const mockStocks = [
      { product_code: 'P001', available_quantity: 50 },
    ];
    (posApi.fetchStocks as any).mockResolvedValue({ data: mockStocks });

    render(<ProductsView />);

    // Tunggu loading selesai
    await waitFor(() => {
      expect(screen.queryByText('Loading Data...')).not.toBeInTheDocument();
    });

    // Assert Produk
    expect(screen.getByText('Kopi Hitam')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument(); // Stok

    // Assert Service
    expect(screen.getByText('Jasa Seduh')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument(); // Tanda strip untuk service

    expect(screen.getByText(/Rp\s?15\.000/)).toBeInTheDocument();
  });

  // --- TEST CASE 4: Search Filtering ---
  it('memfilter produk berdasarkan nama atau kode', async () => {
    const mockProducts = [
      { product_code: 'A100', product_name: 'Apel Merah', price: 1000 },
      { product_code: 'B200', product_name: 'Pisang Kuning', price: 2000 },
    ];
    (useProducts as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockProducts,
      isLoading: false,
      error: null,
    });
    (posApi.fetchStocks as any).mockResolvedValue({ data: [] });

    render(<ProductsView />);
    await waitFor(() => expect(screen.queryByText('Loading Data...')).not.toBeInTheDocument());

    expect(screen.getByText('Apel Merah')).toBeInTheDocument();
    expect(screen.getByText('Pisang Kuning')).toBeInTheDocument();

    const input = screen.getByPlaceholderText('ProductsView.searchPlaceholder');
    fireEvent.change(input, { target: { value: 'Pisang' } });

    expect(screen.queryByText('Apel Merah')).not.toBeInTheDocument();
    expect(screen.getByText('Pisang Kuning')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'A100' } });
    expect(screen.getByText('Apel Merah')).toBeInTheDocument();
    expect(screen.queryByText('Pisang Kuning')).not.toBeInTheDocument();
  });

  // --- TEST CASE 5: Pagination ---
  it('menangani paginasi (maks 12 item per halaman)', async () => {
    const mockProducts = Array.from({ length: 15 }, (_, i) => ({
      product_code: `P-${i + 1}`,
      product_name: `Produk ${i + 1}`,
      price: 10000,
    }));
    
    (useProducts as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockProducts,
      isLoading: false,
      error: null,
    });
    (posApi.fetchStocks as any).mockResolvedValue({ data: [] });

    render(<ProductsView />);
    await waitFor(() => expect(screen.queryByText('Loading Data...')).not.toBeInTheDocument());

    expect(screen.getByText('Produk 1')).toBeInTheDocument();
    expect(screen.getByText('Produk 12')).toBeInTheDocument();
    expect(screen.queryByText('Produk 13')).not.toBeInTheDocument();

    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();

    const nextBtn = screen.getByText('Pagination.next');
    fireEvent.click(nextBtn);

    expect(screen.getByText('Produk 13')).toBeInTheDocument();
    expect(screen.getByText('Produk 15')).toBeInTheDocument();
    expect(screen.queryByText('Produk 1')).not.toBeInTheDocument();
    
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
  });

  // --- TEST CASE 6: Empty State ---
  it('menampilkan pesan kosong jika tidak ada produk', async () => {
    (useProducts as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    (posApi.fetchStocks as any).mockResolvedValue({ data: [] });

    render(<ProductsView />);
    await waitFor(() => expect(screen.queryByText('Loading Data...')).not.toBeInTheDocument());

    expect(screen.getByText('No products found')).toBeInTheDocument();
  });
});
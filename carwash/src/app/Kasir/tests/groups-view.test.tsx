import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GroupsView from '../groups-view';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as posApi from '@/app/lib/utils/pos-api';
import { useSession } from '@/app/lib/context/session';

// --- 1. MOCK DEPENDENCIES ---

// Mock useSession sebagai spy agar kita bisa manipulasi return valuenya
vi.mock('@/app/lib/context/session', () => ({
  useSession: vi.fn(),
}));

// Mock API
vi.mock('@/app/lib/utils/pos-api', () => ({
  fetchProductGroups: vi.fn(),
  fetchProducts: vi.fn(),
}));

// FIX CRITICAL: Mock Translation dengan referensi fungsi 't' yang stabil
// Masalah sebelumnya: membuat fungsi baru setiap render menyebabkan useEffect loop terus menerus
vi.mock('react-i18next', () => {
  // Definisikan fungsi t di luar return scope agar referensinya tetap sama (stable reference)
  const tImplementation = (key: string, options?: any) => {
    if (key === 'GroupsView.loading') return 'Loading Data...';
    if (key === 'GroupsView.errorSession') return 'Session Error';
    if (key === 'GroupsView.errorUnknown') return 'Unknown Error';
    if (key === 'GroupsView.emptyGroups') return 'No Groups Found';
    if (key === 'GroupsView.emptyProducts') return 'No Products Found';
    if (key === 'GroupsView.subtitle') return `Group: ${options?.groupName}`;
    return key;
  };

  return {
    useTranslation: () => ({
      t: tImplementation, // Selalu mengembalikan referensi fungsi yang sama
    }),
  };
});

// Mock Lucide Icons
vi.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader-icon" />,
  AlertTriangle: () => <div data-testid="error-icon" />,
  ArrowLeft: () => <div data-testid="back-icon" />,
}));

describe('GroupsView Component', () => {
  // Dummy Data
  const mockGroups = [
    { id: 1, product_group_code: 'G1', product_group_name: 'Makanan' },
    { id: 2, product_group_code: 'G2', product_group_name: 'Minuman' },
  ];

  const mockProducts = [
    { 
      product_code: 'G1-001', 
      product_name: 'Nasi Goreng', 
      price: 15000, 
      product_group_id: 1 
    },
    { 
      product_code: 'G2-001', 
      product_name: 'Es Teh', 
      price: 5000, 
      product_group_id: 2 
    },
    { 
      product_code: 'G1-002', 
      product_name: 'Mie Goreng', 
      price: 12000, 
      product_group_id: 1 
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default: Session Valid
    (useSession as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      session: { token: 'valid-token', user: { name: 'Test User' } },
    });
    
    // Default: API Return Empty
    (posApi.fetchProductGroups as any).mockResolvedValue({ data: [] });
    (posApi.fetchProducts as any).mockResolvedValue({ data: [] });
  });

  // --- TEST CASE 1: Validasi Sesi ---
  it('menampilkan error jika token sesi tidak ada', async () => {
    (useSession as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      session: { token: '', user: null },
    });

    render(<GroupsView />);

    await waitFor(() => {
      expect(screen.getByText('Session Error')).toBeInTheDocument();
    });
    expect(posApi.fetchProductGroups).not.toHaveBeenCalled();
  });

  // --- TEST CASE 2: Loading & Data Fetching ---
  it('memuat data dan menampilkan daftar grup', async () => {
    (posApi.fetchProductGroups as any).mockResolvedValue({ data: mockGroups });
    (posApi.fetchProducts as any).mockResolvedValue({ data: mockProducts });

    render(<GroupsView />);

    // Cek loading muncul (text ini dari mock t)
    expect(screen.getByText('Loading Data...')).toBeInTheDocument();

    await waitFor(() => {
      // Pastikan loading hilang
      expect(screen.queryByText('Loading Data...')).not.toBeInTheDocument();
      // Pastikan konten muncul
      expect(screen.getByText('makanan')).toBeInTheDocument();
      expect(screen.getByText('minuman')).toBeInTheDocument();
    });

    expect(posApi.fetchProductGroups).toHaveBeenCalled();
  });

  // --- TEST CASE 3: Interaksi Pilih Grup (Filtering) ---
  it('memfilter produk berdasarkan grup yang dipilih', async () => {
    (posApi.fetchProductGroups as any).mockResolvedValue({ data: mockGroups });
    (posApi.fetchProducts as any).mockResolvedValue({ data: mockProducts });

    render(<GroupsView />);

    // Tunggu load selesai
    await waitFor(() => screen.getByText('makanan'));

    // Act: Klik grup
    fireEvent.click(screen.getByText('makanan'));

    // Assert: Produk muncul
    // Bungkus dalam waitFor untuk menangani update async jika ada delay render
    await waitFor(() => {
        expect(screen.getByText('Nasi Goreng')).toBeInTheDocument();
    });
    expect(screen.getByText('Mie Goreng')).toBeInTheDocument();
    
    // Produk grup lain tidak boleh muncul
    expect(screen.queryByText('Es Teh')).not.toBeInTheDocument();
    
    // Icon back harus ada
    expect(screen.getByTestId('back-icon')).toBeInTheDocument();
  });

  // --- TEST CASE 4: Tombol Kembali (Reset State) ---
  it('kembali ke daftar grup saat tombol back ditekan', async () => {
    (posApi.fetchProductGroups as any).mockResolvedValue({ data: mockGroups });
    (posApi.fetchProducts as any).mockResolvedValue({ data: mockProducts });

    render(<GroupsView />);
    await waitFor(() => screen.getByText('makanan'));

    fireEvent.click(screen.getByText('makanan'));
    await waitFor(() => screen.getByText('Nasi Goreng'));

    // Act: Klik Back
    const backButton = screen.getByTestId('back-icon').parentElement!;
    fireEvent.click(backButton);

    // Assert: Balik ke grup
    await waitFor(() => {
        expect(screen.queryByText('Nasi Goreng')).not.toBeInTheDocument();
        expect(screen.getByText('makanan')).toBeInTheDocument();
    });
  });

  // --- TEST CASE 5: Error Handling API ---
  it('menampilkan pesan error jika API gagal', async () => {
    (posApi.fetchProductGroups as any).mockRejectedValue(new Error('Network Error'));
    
    render(<GroupsView />);

    await waitFor(() => {
      expect(screen.getByText('Network Error')).toBeInTheDocument();
    });
  });

  // --- TEST CASE 6: Format Mata Uang ---
  it('memformat harga produk dengan benar (IDR)', async () => {
    const singleProduct = [{ 
      product_code: 'X1', product_name: 'Mahal', price: 1000000, product_group_id: 1 
    }];
    const singleGroup = [{ id: 1, product_group_name: 'Sultan' }];

    (posApi.fetchProductGroups as any).mockResolvedValue({ data: singleGroup });
    (posApi.fetchProducts as any).mockResolvedValue({ data: singleProduct });

    render(<GroupsView />);
    await waitFor(() => screen.getByText('sultan'));

    fireEvent.click(screen.getByText('sultan'));

    await waitFor(() => {
      // Regex fleksibel untuk menangani format spasi/titik yang mungkin beda antar environment
      const priceText = screen.getByText(/Rp\s?1\.000\.000/); 
      expect(priceText).toBeInTheDocument();
    });
  });

  // --- TEST CASE 7: Empty States ---
  it('menampilkan pesan kosong jika tidak ada grup', async () => {
    (posApi.fetchProductGroups as any).mockResolvedValue({ data: [] });
    (posApi.fetchProducts as any).mockResolvedValue({ data: [] });

    render(<GroupsView />);

    await waitFor(() => {
      expect(screen.getByText('No Groups Found')).toBeInTheDocument();
    });
  });
});
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../login'; // Relative path dari folder tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiUtils from '../../lib/utils/api'; // Naik 2 level ke lib

// --- MOCK DEPENDENCIES ---

// 1. Mock Next.js Router
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
  }),
}));

// 2. Mock Session Context
const mockSetSession = vi.fn();
let mockSessionData: any = null;

vi.mock('../../lib/context/session', () => ({
  useSession: () => ({
    session: mockSessionData,
    setSession: mockSetSession,
  }),
}));

// 3. Mock API Login
vi.mock('../../lib/utils/api', () => ({
  login: vi.fn(),
}));

// 4. Mock Lucide Icons (agar tidak error render SVG)
vi.mock('lucide-react', () => ({
  UserIcon: () => <div data-testid="user-icon" />,
  SquareAsterisk: () => <div data-testid="pass-icon" />,
  Loader2: () => <div data-testid="loader" />,
}));

// 5. Mock Video Tag (Opsional, untuk menghindari error JSDOM dengan properti video)
// JSDOM tidak mendukung penuh HTMLMediaElement
Object.defineProperty(global.HTMLMediaElement.prototype, 'onloadedmetadata', {
  set() {}, // No-op setter
});

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionData = null; // Reset ke kondisi belum login
  });

  // --- GROUP 1: Render & Validasi ---
  
  it('merender form login saat user belum login', () => {
    render(<LoginPage />);
    
    expect(screen.getByText('SYNTRA Login Portal')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('your_username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  it('menampilkan error jika username atau password kosong', () => {
    render(<LoginPage />);
    
    const loginBtn = screen.getByRole('button', { name: 'Login' });
    
    // Klik login tanpa isi apa-apa
    fireEvent.click(loginBtn);
    
    expect(screen.getByText('Username and password are required.')).toBeInTheDocument();
    // Pastikan API tidak dipanggil
    expect(apiUtils.login).not.toHaveBeenCalled();
  });

  // --- GROUP 2: Logika Login ---

  it('menangani proses login yang BERHASIL', async () => {
    // Setup Mock API Success
    const mockApiResponse = {
      data: {
        token: 'fake-jwt-token',
        user: { username: 'testuser', role: { role_name: 'Admin' } },
        expires_at: { seconds: 1700000000 }
      }
    };
    (apiUtils.login as any).mockResolvedValue(mockApiResponse);

    render(<LoginPage />);

    // Input Credentials
    fireEvent.change(screen.getByPlaceholderText('your_username'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'secret123' } });

    // Klik Login
    const loginBtn = screen.getByRole('button', { name: 'Login' });
    fireEvent.click(loginBtn);

    // Assert: State Loading
    expect(screen.getByText('Logging in...')).toBeInTheDocument();
    expect(screen.getByTestId('loader')).toBeInTheDocument();
    expect(loginBtn).toBeDisabled();

    // Assert: API Call & Hasil
    await waitFor(() => {
      expect(apiUtils.login).toHaveBeenCalledWith('admin', 'secret123');
    });

    // Assert: Set Session
    expect(mockSetSession).toHaveBeenCalledWith(expect.objectContaining({
      token: 'fake-jwt-token',
      user: expect.objectContaining({ username: 'testuser' }),
    }));

    // Assert: Redirect
    expect(mockReplace).toHaveBeenCalledWith('/Kasir');
  });

  it('menangani proses login yang GAGAL (API Error)', async () => {
    // Setup Mock API Error
    (apiUtils.login as any).mockRejectedValue(new Error('Invalid credentials'));

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('your_username'), { target: { value: 'wrong' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass' } });
    
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    // Tunggu error muncul
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    // Session tidak boleh diset
    expect(mockSetSession).not.toHaveBeenCalled();
    // Redirect tidak boleh terjadi
    expect(mockReplace).not.toHaveBeenCalled();
    // Loading harus hilang (tombol aktif lagi)
    expect(screen.getByRole('button', { name: 'Login' })).not.toBeDisabled();
  });

  // --- GROUP 3: Kondisi Sudah Login ---

  it('menampilkan halaman Welcome jika session sudah ada (Already Logged In)', () => {
    // Override session data
    mockSessionData = {
      token: 'exist-token',
      user: { username: 'ExistingUser', email: 'user@test.com', role: { role_name: 'Cashier' } },
      expiresAt: Date.now() + 10000,
    };

    render(<LoginPage />);

    // Form login TIDAK boleh muncul
    expect(screen.queryByText('SYNTRA Login Portal')).not.toBeInTheDocument();
    
    // Welcome card HARUS muncul
    expect(screen.getByText('Welcome, ExistingUser')).toBeInTheDocument();
    expect(screen.getByText('You are logged in as Cashier')).toBeInTheDocument();
    expect(screen.getByText(/user@test.com/)).toBeInTheDocument();
    
    // Tombol Logout harus ada
    expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
  });

  it('menghapus session saat tombol Logout diklik', () => {
    mockSessionData = {
      token: 'exist-token',
      user: { username: 'User' },
      expiresAt: Date.now(),
    };

    render(<LoginPage />);

    const logoutBtn = screen.getByRole('button', { name: 'Logout' });
    fireEvent.click(logoutBtn);

    // Assert setSession dipanggil dengan null
    expect(mockSetSession).toHaveBeenCalledWith(null);
  });
});
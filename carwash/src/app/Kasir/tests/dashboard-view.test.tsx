import { render, screen } from '@testing-library/react';
import DashboardView from '../dashboard-view'; // Sesuaikan path import jika perlu
import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Mock usePreferences
// Kita memanipulasi return value dari getUserProfile untuk mensimulasikan berbagai user
const mockGetUserProfile = vi.fn();

vi.mock('@/app/providers/preferences-context', () => ({
  usePreferences: () => ({
    getUserProfile: mockGetUserProfile,
  }),
}));

// 2. Mock useTranslation
// Kita membuat implementasi tiruan fungsi 't' untuk memverifikasi output teks
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { name?: string }) => {
      // Simulasi output translasi agar bisa di-assert di layar
      if (key === 'DashboardView.welcome') return `Selamat Datang, ${options?.name}`;
      if (key === 'DashboardView.prompt') return 'Siap memulai hari ini?';
      return key;
    },
  }),
}));

describe('DashboardView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merender pesan selamat datang dengan nama user yang benar', () => {
    // Arrange: Setup mock user profile
    const mockUser = { name: 'Budi Santoso', role: 'Kasir' };
    mockGetUserProfile.mockReturnValue(mockUser);

    // Act: Render komponen
    render(<DashboardView />);

    // Assert: Cek apakah nama user muncul di dalam heading (h1)
    // Berdasarkan mock t, teks harusnya: "Selamat Datang, Budi Santoso"
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Selamat Datang, Budi Santoso');
    
    // Verifikasi internal: memastikan getUserProfile benar-benar dipanggil
    expect(mockGetUserProfile).toHaveBeenCalled();
  });

  it('merender pesan prompt instruksi dengan benar', () => {
    // Arrange
    mockGetUserProfile.mockReturnValue({ name: 'Test User' });

    // Act
    render(<DashboardView />);

    // Assert: Cek teks prompt
    expect(screen.getByText('Siap memulai hari ini?')).toBeInTheDocument();
  });

  it('menangani render jika nama user kosong (edge case)', () => {
    // Arrange: User tanpa nama atau nama kosong
    mockGetUserProfile.mockReturnValue({ name: '' });

    // Act
    render(<DashboardView />);

    // Assert
    // Jika nama kosong, translasi tetap berjalan dengan string kosong
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Selamat Datang,');
  });
});
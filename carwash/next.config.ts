import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      // --- Tambahan untuk Discord ---
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'media.discordapp.net', // Domain alternatif yang sering dipakai Discord
        port: '',
        pathname: '/**',
      },
      // -----------------------------
      {
        protocol: 'https',
        hostname: '**', // Mengizinkan semua domain gambar HTTPS
      },
    ],
  },
};

export default nextConfig;
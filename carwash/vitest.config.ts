import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths'; // <--- Import ini

export default defineConfig({
  plugins: [
    react(), 
    tsconfigPaths() // <--- Tambahkan ini ke dalam plugins
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts', 
  },
});
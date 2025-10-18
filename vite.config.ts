import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // CRITICAL FIX: Use relative base path for custom domains
  base: './',
  build: {
    // Ensure assets use relative paths
    assetsDir: 'assets',
    // Generate relative paths in index.html
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  // Ensure proper MIME types
  server: {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  },
});
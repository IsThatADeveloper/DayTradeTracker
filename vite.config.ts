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
  // Try absolute path first (works better with Cloudflare Pages)
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Important: generate manifest for proper asset loading
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
        // Ensure consistent naming
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      },
    },
  },
});
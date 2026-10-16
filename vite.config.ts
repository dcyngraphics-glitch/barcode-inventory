import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import fs from 'fs';

const isProduction = process.env.NODE_ENV === 'production';
const isVercel = !!(process.env.VERCEL || process.env.VERCEL_ENV || process.env.VERCEL_URL);
const base = isVercel ? '/' : (isProduction ? '/barcode-inventory/' : '/');

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Barcode Inventory',
        short_name: 'BarInv',
        description: 'Scan barcodes, track inventory, get expiry notifications',
        theme_color: '#1e293b',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.href.includes('openfoodfacts.org'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'off-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
    }),
    {
      // GitHub Pages has no SPA fallback: reloading (or deep-linking) on /sales or
      // /inventory would 404, even though the app itself is fine. Serving index.html
      // as 404.html lets the app boot and route itself from any path.
      name: 'spa-404-fallback',
      closeBundle() {
        fs.copyFileSync('dist/index.html', 'dist/404.html');
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom']
        }
      }
    },
    chunkSizeWarningLimit: 1000000,
  },
  test: {
    environment: 'jsdom',
    isolate: true,
  },
});
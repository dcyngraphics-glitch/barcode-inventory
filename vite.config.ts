import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'url';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';
const isVercel = !!(process.env.VERCEL || process.env.VERCEL_ENV || process.env.VERCEL_URL);
const base = isVercel ? '/' : (isProduction ? '/barcode-inventory/' : '/');

export default defineConfig({
  base,
  define: {
    'process.env': JSON.stringify({ NODE_ENV: 'development' }),
  },
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
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
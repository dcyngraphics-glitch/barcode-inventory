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
  /**
   * The deployment target, exposed to the BUNDLE.
   *
   * vite.config runs in Node, where Vercel's VERCEL vars are real — but the browser
   * bundle only sees `import.meta.env`, and Vite exposes just `VITE_`-prefixed names
   * there. So `import.meta.env.VERCEL` is ALWAYS undefined in the browser, and every
   * production build silently took the GitHub Pages branch: the router's basename
   * became '/barcode-inventory/' on Vercel, which matches no URL, and the app rendered
   * a blank page. Pass it through define() so there is one source of truth.
   */
  define: {
    __IS_VERCEL__: JSON.stringify(isVercel),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'icon-192.png',
        'icon-512.png',
        'icon-maskable-512.png',
        'apple-touch-icon.png',
      ],
      manifest: {
        name: 'Barcode Inventory',
        short_name: 'BarInv',
        description: 'Scan barcodes, track inventory, get expiry notifications',
        theme_color: '#1e293b',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        // `id` pins the app's identity across installs and must match start_url.
        id: './',
        // Chrome's installability check requires a 192x192 AND a 512x512 RASTER
        // icon; an SVG with sizes:"any" does not satisfy it, so an SVG-only
        // manifest makes the app impossible to install. The SVGs stay (crisp at
        // any size, and the favicon), but the PNGs carry the install check.
        // `purpose: 'maskable'` is a separate full-bleed icon: launchers crop a
        // regular icon to a circle, which would cut the dashed frame off.
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
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
        if (fs.existsSync('dist/index.html')) {
          fs.copyFileSync('dist/index.html', 'dist/404.html');
        } else {
          console.warn('[spa-404-fallback] dist/index.html not found — skipping 404 fallback copy');
        }
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
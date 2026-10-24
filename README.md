# Barcode Inventory

A Progressive Web App (PWA) for scanning barcodes and managing personal inventory with expiry tracking. Designed for Filipino grocery users — pre-seeded with 506 common PH products (Bear Brand, Nescafé, Lucky Me, etc.).

## Features

- **Scan barcodes** using device camera (Barcode Detection API) with ZXing fallback
- **Look up products** via Open Food Facts API (no API key required)
- **Pre-seeded catalog** with 506 Filipino grocery products + SRP prices
- **Store product catalog and inventory** locally using IndexedDB
- **Track multiple batches** of the same product with FIFO sorting
- **Expiry notifications** (configurable alert window, default 3 days)
- **Two modes** — Shop (inventory management) and Sell (till/cashier), one tap apart
- **Works offline and is installable** on Android/iOS home screens (PWA, Workbox service worker)

## Sign-in (required)

The app cannot be used until you sign in. Dexie Cloud drives the whole conversation:
tap **Sign in with email**, enter your email, then the one-time code it emails you.
Your account is created automatically on first sign-in, and it is what keeps your
inventory in sync across your phones — **one account, several phones, same data.**

Only the very first sign-in on a device needs a network connection; after that the
session lives in IndexedDB and works offline.

## Modes

The mode is **per device**, stored in `localStorage` — switching the store tablet to
Sell does not switch your phone. Switch it from the segmented control in the app bar,
or from Settings.

| Mode | Purpose | Workflow |
|------|---------|----------|
| **Shop** (default) | Standard inventory management | Scan → Product Detail → Add to Inventory |
| **Sell** | Rapid multi-item scanning (supermarket checkout) | Scan → Add to Cart → Keep Scanning → Review Cart → Save All |

Switching out of Sell while items are in the basket asks first (Keep basket / Clear
and switch) rather than discarding the basket silently.

## Tech Stack

- React 18 + Vite
- TypeScript (strict)
- IndexedDB (via Dexie 4 + dexie-cloud-addon)
- Vite PWA plugin (Workbox)
- Open Food Facts API (fallback)
- Web Audio API (scan beep)

## Architecture

```
App.tsx
└── AuthProvider → AuthGate (splash / storage-error / login / MainApp)
    └── MainApp (catalog-seed gate)
        └── SettingsProvider → ModeProvider → TutorialProvider → ScanCartProvider
            ├── AppRoutes ('/', '/product/:barcode', '/inventory', '/settings', '/cart', '/sales')
            └── BottomNav (3 tabs in Shop, 4 in Sell)
```

## Files

- `src/context/SettingsContext.tsx` — shared settings state via React Context
- `src/context/ModeContext.tsx` — device-local Shop/Sell mode
- `src/context/ScanCartContext.tsx` — cart state for Sell mode
- `src/context/AuthContext.tsx` — sign-in actions (Dexie Cloud)
- `src/hooks/useCloudSession.ts` — the signed-in/out gate, with `db.open()` guard
- `src/services/catalogService.ts` — CRUD for product catalog
- `src/services/inventoryService.ts` — CRUD for batch inventory
- `src/services/productLookupService.ts` — local catalog → API fallback lookup
- `src/services/notificationService.ts` — browser notifications
- `src/services/seedService.ts` — PH grocery seed data (506 products)
- `src/data/phGrocerySeed.ts` — seed data array
- `src/hooks/useBarcodeScanner.ts` — camera lifecycle hook
- `src/hooks/useProductLookup.ts` — lookup with AbortController
- `src/hooks/useInventory.ts` — inventory state management
- `src/hooks/useTheme.ts` — dark mode logic
- `scripts/gen-icons.py` — regenerates the PWA PNG icons from the favicon design

## Getting Started

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build to dist/
npm run type-check   # tsc --noEmit
npm test             # vitest
npm run lint         # eslint
```

### Adding your own products

Edit `src/data/phGrocerySeed.ts`. Seeding runs once per account and is keyed by a
deterministic per-account ID, so adding entries is safe to do after the fact —
existing rows are upserted, not duplicated.

## Deployment

Deployed to GitHub Pages from `.github/workflows/deploy.yml` on every push to
`master` (type-check + test + build, then `actions/deploy-pages`).

Two things make the Pages subpath work:

- `vite.config.ts` sets `base: '/barcode-inventory/'` for production builds and
  `src/main.tsx` passes the matching `basename` to `BrowserRouter`.
- A small `spa-404-fallback` plugin copies `dist/index.html` to `dist/404.html`.
  GitHub Pages has no SPA fallback, so without it a hard reload on `/inventory`
  would 404 instead of booting the app.

### PWA icons

Chrome requires a 192x192 **and** a 512x512 raster icon; an SVG-only manifest makes
the app impossible to install. `scripts/gen-icons.py` renders
`public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png` and
`public/apple-touch-icon.png` from the `favicon.svg` design. Re-run it after changing
the design:

```bash
python scripts/gen-icons.py
```

## Status

463 tests passing · 0 type errors · build passing · CI runs type-check + test + build on push to master.

## License

MIT

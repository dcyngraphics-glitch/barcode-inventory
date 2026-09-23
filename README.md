# Barcode Inventory

A Progressive Web App (PWA) for scanning barcodes and managing personal inventory with expiry tracking. Designed for Filipino grocery users — pre-seeded with 89 common PH products (Bear Brand, Nescafé, Lucky Me, etc.).

## Features

- **Scan barcodes** using device camera (Barcode Detection API) with ZXing fallback
- **Look up products** via Open Food Facts API (no API key required)
- **Pre-seeded catalog** with 89 Filipino grocery products + SRP prices
- **Store product catalog and inventory** locally using IndexedDB
- **Track multiple batches** of the same product with FIFO sorting
- **Expiry notifications** (configurable alert window, default 3 days)
- **Cashier Mode** — rapid scan-to-cart workflow for scanning multiple items quickly
- **Seller Mode** — edit product prices/info directly while scanning (planned)
- Works offline (PWA), installable on mobile/home screen

## Mode Switching

The app supports two operational modes, switchable in Settings:

| Mode | Purpose | Workflow |
|------|---------|----------|
| **Default** (Scanner) | Standard inventory management | Scan → Product Detail → Add to Inventory |
| **Cashier** | Rapid multi-item scanning (supermarket checkout) | Scan → Add to Cart → Keep Scanning → Review Cart → Save All |
| **Seller** | Edit prices/info on the fly | Scan → Quick Edit (price/info) → Add to Inventory |

## Tech Stack

- React 18 + Vite
- TypeScript (strict)
- IndexedDB (via idb library)
- Vite PWA plugin (Workbox)
- Open Food Facts API (fallback)
- Web Audio API (scan beep)

## Architecture

```
App.tsx (SettingsProvider + ScanCartContext)
├── ScannerScreen (CameraViewfinder + ManualEntrySheet + RecentScans)
│   └── Cart badge → CartReviewScreen
├── ProductDetailScreen (ProductForm + ProductImage + ProductManagementSheet)
├── InventoryScreen (SearchBar + FilterChips + InventoryGroup + BatchRow)
└── SettingsScreen (Notifications, Alert Window, Export, Clear, Theme, Mode Toggle)
```

## Files

- `src/context/SettingsContext.tsx` — shared settings state via React Context
- `src/context/ScanCartContext.tsx` — cart state for Cashier Mode
- `src/services/catalogService.ts` — CRUD for product catalog
- `src/services/inventoryService.ts` — CRUD for batch inventory
- `src/services/productLookupService.ts` — local catalog → API fallback lookup
- `src/services/notificationService.ts` — browser notifications
- `src/services/seedService.ts` — PH grocery seed data (89 products)
- `src/data/phGrocerySeed.ts` — seed data array
- `src/hooks/useBarcodeScanner.ts` — camera lifecycle hook
- `src/hooks/useProductLookup.ts` — lookup with AbortController
- `src/hooks/useInventory.ts` — inventory state management
- `src/hooks/useTheme.ts` — dark mode logic

## Getting Started

```bash
npm install
npm run dev      # localhost:5173
npm run build    # production build to dist/
npm test         # vitest
```

## Debug & Fixes (2026-09-22)

22 bugs fixed across all flows. Full report in [[Barcode Inventory Debug Report]].

## License

MIT

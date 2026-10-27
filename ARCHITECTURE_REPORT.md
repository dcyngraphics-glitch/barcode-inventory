# Barcode Inventory — Architecture Map

## 1. Exact Stack & Versions

| Category | Package | Version | Purpose |
|----------|---------|---------|---------|
| **Runtime** | React | 18.3.1 | UI library |
| | React DOM | 18.3.1 | DOM renderer |
| | TypeScript | 5.6.3 | Static typing (strict mode) |
| **Build** | Vite | 6.0.3 | Dev server + production bundler |
| | @vitejs/plugin-react | 4.3.4 | React Fast Refresh + JSX transform |
| | vite-plugin-pwa | 0.21.1 | Workbox service worker + manifest |
| **Routing** | react-router-dom | 7.18.4 | Client-side SPA routing (BrowserRouter + basename) |
| **Database** | Dexie | 4.4.6 | IndexedDB wrapper |
| | dexie-cloud-addon | 4.4.15 | Sync + auth via Dexie Cloud |
| | idb | 8.0.0 | Low-level IndexedDB helper |
| **Barcode** | @zxing/library | 0.21.3 | Core barcode decode (WASM) |
| | @zxing/browser | 0.1.5 | Camera + Barcode Detection API bridge |
| **Icons** | lucide-react | 1.47.0 | 1,000+ SVG icons (tree-shaken) |
| **Testing** | vitest | 5.0.1 | Unit/integration test runner (jsdom) |
| | @testing-library/react | 16.1.0 | Component testing utilities |
| | @testing-library/jest-dom | 6.6.3 | Custom matchers |
| | fake-indexeddb | 6.0.0 | IndexedDB polyfill for tests |
| **Linting** | eslint | 10.11.0 | Linting |
| | typescript-eslint | 8.70.1 | TS-aware ESLint rules |
| | eslint-plugin-react-hooks | 7.1.1 | Hook rules |
| | eslint-plugin-react-refresh | 0.5.7 | Fast Refresh rules |

**Node requirement**: ≥20 (Vite 6 requirement — project uses @types/node 26.x)

---

## 2. Full Folder Tree (with one-line purpose)

```
barcode-inventory/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Pages CI: type-check → test → build → push dist/ to gh-pages
├── public/                     # Static assets served as-is (copied to dist/)
│   ├── favicon.svg             # App icon (SVG — crisp at any size)
│   ├── icon-192.png            # 192×192 PNG (Chrome install requirement)
│   ├── icon-512.png            # 512×512 PNG (Chrome install requirement)
│   ├── icon-maskable-512.png   # 512×512 maskable PNG (launcher safe zone)
│   ├── apple-touch-icon.png    # 180×180 iOS home-screen icon
│   └── theme-preload.js        # Runs before React mounts; applies saved theme to <html> to prevent flash
├── scripts/
│   └── gen-icons.py            # Renders PNG icons from favicon.svg design (LANCZOS downscale)
├── src/
│   ├── main.tsx                # Entry: resolveBasename → BrowserRouter(basename) → <App />
│   ├── App.tsx                 # Root composition: AuthGate → MainApp → providers → routes → BottomNav
│   ├── index.css               # Design tokens (CSS custom properties) + full component styles (~3,300 lines)
│   ├── vite-env.d.ts           # Vite type declarations (ImportMetaEnv, etc.)
│   ├── components/             # Reusable UI primitives (23 components, exported from index.ts)
│   │   ├── index.ts            # Barrel export
│   │   ├── AppModeSwitcher.tsx # Segmented control in app bar (Shop / Sell)
│   │   ├── BatchRow.tsx        # Single batch line in inventory list
│   │   ├── CameraViewfinder.tsx# Camera preview + scanning overlay
│   │   ├── ConfirmDialog.tsx   # Accessible modal confirmation
│   │   ├── EditBatchSheet.tsx  # Bottom-sheet batch editor
│   │   ├── EmptyState.tsx      # Illustrated empty state (scanner, inventory, etc.)
│   │   ├── ErrorBoundary.tsx   # Class component catch-all for render errors
│   │   ├── FilterChips.tsx     # Horizontal chip filter bar
│   │   ├── FormField.tsx       # Labeled input + error + helper text
│   │   ├── InstallPromotionBanner.tsx # PWA install prompt banner (3rd-visit trigger)
│   │   ├── InventoryGroup.tsx  # Collapsible product group with batches
│   │   ├── ModeSegmentedControl.tsx # Shared segmented control component
│   │   ├── OfflineIndicator.tsx# Top-bar "offline" pill
│   │   ├── PermissionPromptModal.tsx # Camera/notification permission rationale
│   │   ├── ProductForm.tsx     # Product create/edit form
│   │   ├── ProductImage.tsx    # Product image with fallback placeholder
│   │   ├── ProductManagementSheet.tsx # Admin sheet for catalog CRUD
│   │   ├── QuickEntryModal.tsx # Rapid quantity/expiry entry modal
│   │   ├── RecentScans.tsx     # Horizontal recent-scan carousel
│   │   ├── ScreenSkeleton.tsx  # Loading skeleton matching content shape
│   │   ├── ScreenTooltip.tsx   # Contextual help tooltip (dismissible)
│   │   ├── SearchBar.tsx       # Search input with clear + focus management
│   │   ├── SettingsStepper.tsx # Stepper for numeric settings
│   │   ├── SettingsToggle.tsx  # Toggle switch for boolean settings
│   │   ├── SetStockSheet.tsx   # Batch quantity setter bottom-sheet
│   │   ├── Toast.tsx           # Transient notification (auto-dismiss)
│   │   ├── TutorialOverlay.tsx # Full-screen guided tour (step-by-step)
│   │   └── UserInteractionPrompt.tsx # Dexie Cloud unsynced-changes logout guard
│   ├── context/                # React Context providers (cross-cutting state)
│   │   ├── AuthContext.tsx     # Dexie Cloud sign-in/sign-out actions
│   │   ├── ModeContext.tsx     # App mode (Shop / Sell / Cashier) + localStorage persistence
│   │   ├── ScanCartContext.tsx # Scan-to-cart basket state (Sell mode)
│   │   ├── SettingsContext.tsx # User settings (theme, alerts, notifications, tutorial)
│   │   └── TutorialContext.tsx # Tutorial step progress + screen hints
│   ├── data/                   # Static data files
│   │   ├── phGrocerySeed.ts    # 506 Filipino grocery products (barcode, name, brand, SRP, expiry)
│   │   └── tutorialSteps.ts    # Tutorial overlay step definitions
│   ├── db/                     # Dexie database layer
│   │   ├── dexie.ts            # Schema (v12), Dexie Cloud configure, table definitions
│   │   └── database.ts         # Re-export + resetDB() helper for tests
│   ├── hooks/                  # Custom React hooks (7 hooks)
│   │   ├── useBarcodeScanner.ts# Camera lifecycle + Barcode Detection API + ZXing fallback
│   │   ├── useCloudSession.ts  # Signed-in/out gate; db.open() guard
│   │   ├── useInventory.ts     # Inventory CRUD + reactive state
│   │   ├── useModalFocus.ts    # Focus trap + restore for modals/sheets
│   │   ├── useProductLookup.ts # Local catalog → OpenFoodFacts API fallback (AbortController)
│   │   ├── useSettings.ts      # SettingsContext consumer hook
│   │   └── useTheme.ts         # Theme resolver (localStorage + prefers-color-scheme) + apply to <html>
│   ├── screens/                # Page-level components (8 screens)
│   │   ├── CartReviewScreen.tsx# Review scan-to-cart basket → save all to inventory
│   │   ├── InventoryScreen.tsx # Grouped inventory list (search, filter, batch actions)
│   │   ├── LoginScreen.tsx     # Email → code sign-in (Dexie Cloud)
│   │   ├── ProductDetailScreen.tsx # Product view + add batch / edit / delete
│   │   ├── SalesScreen.tsx     # Daily sales reports (Sell mode only)
│   │   ├── ScannerScreen.tsx   # Shop mode: camera scan → product lookup → detail
│   │   ├── SettingsScreen.tsx  # All settings (theme, mode, alerts, tutorial reset, seed)
│   │   └── TillScreen.tsx      # Sell mode: rapid scan → line items → checkout → sale record
│   ├── services/               # Business logic (pure TS, no React)
│   │   ├── catalogService.ts   # Product CRUD + upsert + search
│   │   ├── inventoryService.ts # Batch CRUD + FIFO grouping + status computation
│   │   ├── notificationService.ts # Browser Notification API (expiry alerts)
│   │   ├── productLookupService.ts # Local → OpenFoodFacts → manual fallback
│   │   ├── saleService.ts      # Sale creation + stock deduction + undo
│   │   ├── seedService.ts      # One-time per-account catalog seeding (506 PH products)
│   │   ├── settingsService.ts  # Settings persistence (IndexedDB)
│   │   ├── settingsValidation.ts# Settings schema validation
│   │   ├── stockService.ts     # Stock aggregation helpers
│   │   └── tutorialService.ts  # Tutorial progress persistence
│   ├── types/
│   │   └── index.ts            # Domain types: Product, Batch, Settings, Sale, InventoryGroup, etc.
│   ├── utils/                  # Pure utilities (7 files)
│   │   ├── basename.ts         # resolveBasename({isProd, isVercel}) → '/' or '/barcode-inventory/'
│   │   ├── dayKey.ts           # YYYY-MM-DD local date key for sales grouping
│   │   ├── formatAlert.ts      # Expiry status text formatting
│   │   ├── helpers.ts          # Misc: cn(), debounce, formatCurrency, etc.
│   │   ├── privateId.ts        # '#' + barcode → per-user private key (Dexie Cloud)
│   │   ├── productUpdate.ts    # Product merge/upsert logic
│   │   └── statusConfig.ts     # Expiry status thresholds + badge color mapping
│   └── __tests__/              # Vitest tests (co-located with source via setup)
│       ├── qa-firstrun/        # End-to-end first-run QA scenarios
│       └── *.test.ts[x]        # Unit + integration tests (467 passing)
├── tests/
│   └── setup.ts                # Vitest global setup: fake-indexeddb + per-test DB isolation
├── dist/                       # Production build output (gitignored)
├── node_modules/               # Dependencies (gitignored)
├── package.json
├── package-lock.json
├── tsconfig.json               # App TS config (strict, bundler moduleResolution, @/* → src/*)
├── tsconfig.node.json          # Node-only config for vite.config.ts + vitest.config.ts
├── vite.config.ts              # Vite + PWA + SPA 404 fallback + base path logic
├── vitest.config.ts            # Vitest config (jsdom, @ alias, coverage)
├── eslint.config.js            # Flat ESLint config (TS + React hooks + refresh)
├── vercel.json                 # Vercel SPA rewrite (/* → /index.html)
├── index.html                  # HTML shell + CSP meta tag + theme-preload + root mount
├── README.md                   # Project docs (features, architecture, deploy, getting started)
├── PRD.md                      # Product Requirements Document
├── AUDIT_FLOW_NAVIGATION.md    # Internal audit notes
└── LICENSE                     # MIT
```

---

## 3. Top-Level Files (entry, config, build, deploy)

| File | Purpose |
|------|---------|
| `package.json` | Scripts (dev, build, test, lint, type-check), deps, devDeps |
| `vite.config.ts` | **Core build config**: base path (`/` or `/barcode-inventory/`), PWA plugin (manifest, Workbox, runtime caching for openfoodfacts.org), SPA 404 fallback (copies index.html → 404.html for GitHub Pages), chunk splitting (vendor), `__IS_VERCEL__` define |
| `tsconfig.json` | App TypeScript: ES2020, strict, bundler resolution, JSX react-jsx, @/* alias |
| `tsconfig.node.json` | Node-only TS config for vite.config.ts / vitest.config.ts (composite, emitDeclarationOnly) |
| `index.html` | HTML shell: CSP meta tag, theme-preload.js (defer), viewport-fit=cover, apple-mobile-web-app-capable, root mount (`#root`), module entry (`/src/main.tsx`) |
| `vercel.json` | Vercel SPA rewrite: `/*` → `/index.html`, outputDirectory: `dist` |
| `.github/workflows/deploy.yml` | GitHub Pages deploy: checkout → setup-node → npm ci → type-check → test → build → peaceiris/actions-gh-pages@v4 (publish_dir: ./dist) |
| `scripts/gen-icons.py` | Generates PNG icons from favicon.svg (192, 512, maskable 512, apple-touch-icon 180) |
| `vitest.config.ts` | Test config: jsdom, globals, @ alias, setupFiles: tests/setup.ts, coverage (v8) |
| `eslint.config.js` | Flat config: TS recommended + React hooks + React refresh, ignores dist/node_modules |
| `README.md` | Full project documentation (features, architecture diagram, files, deploy, getting started) |

---

## 4. Routing / Screen Organization

**Router**: `react-router-dom` v7 `BrowserRouter` with dynamic `basename` resolved at runtime:

```ts
// src/utils/basename.ts
export function resolveBasename({ isProd, isVercel }): string {
  return isProd && !isVercel ? '/barcode-inventory/' : '/';
}
```

- Injected via `vite.config.ts` `define: { __IS_VERCEL__: JSON.stringify(isVercel) }`
- `src/main.tsx` reads `__IS_VERCEL__` + `import.meta.env.PROD` → passes to `BrowserRouter basename`

**Routes (src/App.tsx → AppRoutes)**:

| Path | Screen | Mode Guard |
|------|--------|------------|
| `/` | `ScannerScreen` (Shop) **or** `TillScreen` (Sell) | `useMode()` → `isSell` |
| `/product/:barcode` | `ProductDetailScreen` | — |
| `/inventory` | `InventoryScreen` | — |
| `/settings` | `SettingsScreen` | — |
| `/cart` | `CartReviewScreen` | Sell / Cashier only (nav hidden in Shop) |
| `/sales` | `SalesScreen` | Sell only (nav hidden in Shop) |

**Navigation**: BottomNav (src/App.tsx:291-330) — 3 tabs in Shop (Scan, Inventory, Settings), 4 in Sell (Scan, Sales, Inventory, Settings), 5 in Cashier (adds Cart). Active state covers `/`, `/product/*`, `/cart`.

**Auth Gate**: `AuthGate` (App.tsx:49-85) — three states via `useCloudSession()`:
1. `isLoading` → spinner
2. `error` → "Storage unavailable" card
3. `isLoggedIn` → `MainApp`
4. else → `LoginScreen`

**Provider Stack** (MainApp, App.tsx:124-146):
```
SettingsProvider
  ModeProvider
    TutorialProvider
      ScanCartProvider
        InstallBanner + OfflineIndicator + <AppRoutes /> + TutorialOverlay
```

---

## 5. Build + Deploy Setup

### GitHub Pages (primary)
- **Workflow**: `.github/workflows/deploy.yml` on push to `master` + manual dispatch
- **Steps**: `npm ci` → `npm run type-check` → `npm test` → `npm run build` → `peaceiris/actions-gh-pages@v4` publishes `./dist`
- **Base path**: `vite.config.ts` sets `base: '/barcode-inventory/'` for production (non-Vercel)
- **SPA fallback**: Custom Vite plugin `spa-404-fallback` copies `dist/index.html` → `dist/404.html` (GitHub Pages has no SPA fallback)
- **URL**: `https://dcyngraphics-glitch.github.io/barcode-inventory/`

### Vercel (secondary)
- **Config**: `vercel.json` rewrites `/*` → `/index.html`, `outputDirectory: "dist"`
- **Base path**: `vite.config.ts` detects `VERCEL` / `VERCEL_ENV` / `VERCEL_URL` → `base: '/'`
- **Router basename**: `__IS_VERCEL__` define → `resolveBasename` returns `'/'` on Vercel
- **URL**: `https://barcode-inventory-beige.vercel.app`

### Content-Security-Policy (meta tag in index.html)
```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self';
           script-src 'self' 'unsafe-inline' https://world.openfoodfacts.org;
           style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
           img-src 'self' data: https:;
           font-src 'self' data: https://fonts.gstatic.com;
           connect-src 'self' https://zo7vbabeq.dexie.cloud https://world.openfoodfacts.org;">
```
- Delivered via `<meta http-equiv>` because GitHub Pages / Vercel don't allow custom response headers without extra config
- `frame-ancestors` omitted (ignored in meta tag)
- Allows Google Fonts (Inter, SF Mono) + OpenFoodFacts API + Dexie Cloud sync endpoint

### PWA / Service Worker
- `vite-plugin-pwa` with `registerType: 'autoUpdate'`, `skipWaiting: true`, `clientsClaim: true`
- Manifest: `name: 'Barcode Inventory'`, `short_name: 'BarInv'`, `display: 'standalone'`, `orientation: 'portrait'`
- Icons: 192×192 PNG, 512×512 PNG, maskable 512×512 PNG, SVG favicon (any), apple-touch-icon 180×180 PNG
- Runtime caching: `NetworkFirst` for `openfoodfacts.org` (max 100 entries, 24h TTL)

---

## 6. External Dependencies (Visual / UI / Animation)

| Package | Version | Category | Usage |
|---------|---------|----------|-------|
| **lucide-react** | 1.47.0 | Icon library | All UI icons (ScanLine, Package, Settings, Receipt, AlertTriangle, etc.) — tree-shaken, zero runtime overhead |
| **@zxing/browser** | 0.1.5 | Barcode scanning | Camera access + Barcode Detection API bridge; falls back to WASM decoder |
| **@zxing/library** | 0.21.3 | Barcode core | WASM multi-format decoder (EAN-13, UPC-A, Code 128, QR, etc.) |
| **Google Fonts (Inter, SF Mono)** | — | Typography | `@import` in `index.css:1` — Inter (300-700) for UI, SF Mono (400,500) for monospace (barcodes, prices) |
| **Web Animations API** | Native | Animation | CSS transitions keyed to design tokens (`--transition-*`); no external animation library |
| **Workbox (via vite-plugin-pwa)** | 0.21.1 | PWA / SW | Precaching + runtime caching; `autoUpdate` registration |
| **Dexie Cloud** | 4.4.15 | Sync / Auth | Backend-as-a-service: auth (email + OTP), real-time sync, conflict resolution |

**No heavy UI component libraries** (no MUI, Chakra, Radix, etc.) — all components are custom, styled via CSS custom properties in `index.css`.

**No animation libraries** (no Framer Motion, React Spring) — transitions/animations via CSS (`transition: var(--transition-base)`, keyframes for spinner/scan-line).

**No charting / visualization libraries** — sales reports are simple HTML tables + CSS.

---

## 7. Notable Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **Dexie Cloud for auth + sync** | Eliminates custom backend; per-user private realms via `#`-prefixed keys; offline-first |
| **Database name versioning (`barcode-inventory-v2`)** | Primary key changes (catalog→products, barcode→productId) cannot be migrated in IndexedDB; new DB name = clean wipe |
| **Dual deploy (GitHub Pages + Vercel) from one codebase** | `vite.config.ts` detects target at build time; `__IS_VERCEL__` define passed to bundle for correct basename |
| **Theme preload script (public/theme-preload.js)** | Runs before React; reads `localStorage.resolvedTheme` → sets `data-theme` on `<html>`; eliminates FOUC on cold start |
| **SPA 404 fallback for GitHub Pages** | Custom Vite plugin copies `index.html` → `404.html` so deep links work on reload |
| **Private ID convention (`#` + barcode)** | Dexie Cloud scopes keys per user; two accounts can hold same barcode without collision |
| **Seed data as code (`src/data/phGrocerySeed.ts`)** | 506 products committed to repo; seeded once per account via deterministic ID; safe to extend post-launch |
| **Mode stored in localStorage (per device)** | Shop vs Sell is a device role (tablet vs phone), not user preference |
| **CSP via meta tag** | GitHub Pages/Vercel don't expose header config; partial protection but covers XSS vectors for external resources |
| **Strict TypeScript (noUnusedLocals, noUnusedParameters, noUncheckedIndexedAccess)** | Catches dead code and nullable access at compile time; 0 type errors in CI |

---

## 8. Key File Paths Reference

```
Entry:                    src/main.tsx
Root component:           src/App.tsx
Router basename:          src/utils/basename.ts
Design tokens:            src/index.css (lines 1-3360)
Dexie schema:             src/db/dexie.ts (version 12)
Domain types:             src/types/index.ts
PWA config:               vite.config.ts (VitePWA plugin)
GH Pages deploy:          .github/workflows/deploy.yml
Vercel config:            vercel.json
CSP policy:               index.html (lines 18-27)
Icon generation:          scripts/gen-icons.py
Test setup:               tests/setup.ts
Seed data:                src/data/phGrocerySeed.ts
```
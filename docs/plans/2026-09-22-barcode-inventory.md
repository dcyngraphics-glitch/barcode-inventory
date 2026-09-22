# Barcode Inventory Implementation Plan

> **For implementer:** Use TDD throughout. Write failing test first. Watch it fail. Then implement.

**Goal:** Build a React PWA that scans barcodes, looks up products, tracks inventory batches with FIFO sorting, and sends expiry notifications.

**Architecture:** Single-page React app with IndexedDB for local storage, Open Food Facts API fallback, and service worker for push notifications. Three core services (catalog, inventory, notification) wrap the data layer.

**Tech Stack:** React 18 + TypeScript + Vite, idb (IndexedDB), @zxing/library (barcode fallback), lucide-react (icons), vite-plugin-pwa, Vitest + fake-indexeddb (testing).

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/vite-env.d.ts`

**Step 1: Create package.json with dependencies**

```json
{
  "name": "barcode-inventory",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "idb": "^8.0.0",
    "lucide-react": "^0.454.0",
    "@zxing/library": "^0.21.3",
    "@zxing/browser": "^0.1.5"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.3",
    "vite": "^5.4.2",
    "vite-plugin-pwa": "^0.20.5",
    "vitest": "^2.0.5",
    "@testing-library/react": "^16.0.0",
    "jsdom": "^25.0.0",
    "fake-indexeddb": "^6.0.0"
  }
}
```

**Step 2: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Barcode Inventory',
        short_name: 'ScanInv',
        start_url: '/',
        display: 'standalone',
        background_color: '#F8FAFC',
        theme_color: '#334155',
        orientation: 'portrait',
        icons: []
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ]
});
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vite/client", "vitest/globals"]
  },
  "include": ["src"]
}
```

**Step 4: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#334155" />
    <title>Barcode Inventory</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 5: Create src/main.tsx**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

**Step 6: Create src/App.tsx (placeholder routes)**

```typescript
import { Routes, Route } from 'react-router-dom';
import ScannerScreen from './screens/ScannerScreen';
import InventoryScreen from './screens/InventoryScreen';
import SettingsScreen from './screens/SettingsScreen';
import BottomNav from './components/BottomNav';

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<ScannerScreen />} />
        <Route path="/product/:barcode" element={<ScannerScreen />} />
        <Route path="/inventory" element={<InventoryScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
      <BottomNav />
    </div>
  );
}
```

**Step 7: Create src/vite-env.d.ts**

```typescript
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
```

**Step 8: Create src/index.css (design tokens)**

The full design tokens from our UI/UX spec go here — CSS custom properties for colors, spacing, typography, shadows.

**Step 9: Create placeholder screen components**

Each screen file exports a minimal component that we'll fill in later tasks.

**Step 10: Create src/components/BottomNav.tsx**

Navigation bar with 3 tabs (Scan, Inventory, Settings) using react-router-dom NavLink.

**Step 11: Install dependencies**

Command: `cd C:/Users/bryan/Documents/Hermes/Projects/barcode-inventory && npm install`

**Step 12: Build and verify**

Command: `cd C:/Users/bryan/Documents/Hermes/Projects/barcode-inventory && npm run build`

**Step 13: Commit**

`git init && git add . && git commit -m "chore: initial project scaffold"`

---

## Task 2: Data Layer — IndexedDB + Services

**Files:**
- Create: `src/types.ts`
- Create: `src/db/database.ts`
- Create: `src/services/catalogService.ts`
- Create: `src/services/inventoryService.ts`
- Create: `src/services/notificationService.ts`
- Test: `src/__tests__/catalogService.test.ts`
- Test: `src/__tests__/inventoryService.test.ts`
- Test: `src/__tests__/notificationService.test.ts`

### Task 2a: Types

**Step 1: Write src/types.ts**

```typescript
export interface Product {
  barcode: string;
  name: string;
  brand: string;
  category: string;
  storePrice: number;
  defaultExpiry: string; // YYYY-MM-DD
  imageUrl?: string;
  source: 'local' | 'openfoodfacts' | 'manual';
  createdAt: string;
  updatedAt: string;
}

export interface Batch {
  batchId: string;
  barcode: string;
  quantity: number;
  expiryDate: string; // YYYY-MM-DD
  scannedAt: string;  // ISO datetime
  notes?: string;
}

export interface UserSettings {
  id: 'settings';
  alertWindowDays: number;
  notificationsEnabled: boolean;
  theme: 'auto' | 'light' | 'dark';
}

export type ExpiryStatus = 'good' | 'expiring' | 'expired';
```

### Task 2b: Database

**Step 1: Write failing test (src/__tests__/database.test.ts)**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { getDB } from '../db/database';

describe('database', () => {
  beforeEach(async () => {
    // Reset between tests
  });

  it('should create catalog and inventory stores', async () => {
    const db = await getDB();
    expect(db.objectStoreNames.contains('catalog')).toBe(true);
    expect(db.objectStoreNames.contains('inventory')).toBe(true);
  });

  it('should create settings store', async () => {
    const db = await getDB();
    expect(db.objectStoreNames.contains('settings')).toBe(true);
  });
});
```

**Step 2: Run test — expect fail**

**Step 3: Write src/db/database.ts**

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Product, Batch, UserSettings } from '../types';

interface BarcodeDB extends DBSchema {
  catalog: {
    key: string;
    value: Product;
    indexes: { 'by-name': string };
  };
  inventory: {
    key: string;
    value: Batch;
    indexes: { 'by-barcode': string; 'by-expiry': string };
  };
  settings: {
    key: string;
    value: UserSettings;
  };
}

let dbPromise: Promise<IDBPDatabase<BarcodeDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<BarcodeDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BarcodeDB>('barcode-inventory', 1, {
      upgrade(db) {
        const catalog = db.createObjectStore('catalog', { keyPath: 'barcode' });
        catalog.createIndex('by-name', 'name');

        const inventory = db.createObjectStore('inventory', { keyPath: 'batchId' });
        inventory.createIndex('by-barcode', 'barcode');
        inventory.createIndex('by-expiry', 'expiryDate');

        db.createObjectStore('settings', { keyPath: 'id' });
      }
    });
  }
  return dbPromise;
}
```

### Task 2c: Catalog Service

**Step 1: Write failing test (src/__tests__/catalogService.test.ts)**

Tests: getProduct, saveProduct, updateProduct, deleteProduct, getAllProducts, searchProducts

**Step 2: Run tests — expect fail**

**Step 3: Write src/services/catalogService.ts**

Functions:
- `getProduct(barcode: string): Promise<Product | undefined>`
- `getAllProducts(): Promise<Product[]>`
- `saveProduct(product: Product): Promise<void>`
- `updateProduct(product: Product): Promise<void>`
- `deleteProduct(barcode: string): Promise<void>`
- `searchProducts(query: string): Promise<Product[]>`

### Task 2d: Inventory Service

**Step 1: Write failing test (src/__tests__/inventoryService.test.ts)**

Tests: addBatch, getBatchesByBarcode, getAllBatches, deleteBatch, getInventoryGroups (grouped by product, sorted FIFO), getExpiringBatches

**Step 2: Run tests — expect fail**

**Step 3: Write src/services/inventoryService.ts**

Functions:
- `addBatch(batch: Batch): Promise<void>`
- `getBatchesByBarcode(barcode: string): Promise<Batch[]>`
- `getAllBatches(): Promise<Batch[]>`
- `deleteBatch(batchId: string): Promise<void>`
- `getInventoryGroups(): Promise<InventoryGroup[]>`
- `getExpiringBatches(days: number): Promise<Batch[]>`

Where `InventoryGroup = { product: Product; batches: Batch[]; totalQuantity: number; earliestExpiry: string }`

### Task 2e: Notification Service

**Step 1: Write failing test (src/__tests__/notificationService.test.ts)**

Tests: requestPermission, getPermissionStatus, notifyExpiringItems (filters batches within window), calculateExpiryStatus

**Step 2: Run tests — expect fail**

**Step 3: Write src/services/notificationService.ts**

Functions:
- `requestPermission(): Promise<NotificationPermission>`
- `getPermissionStatus(): NotificationPermission`
- `notifyExpiringItems(batches: Batch[], alertWindowDays: number): Promise<void>`
- `calculateExpiryStatus(expiryDate: string, alertWindowDays: number): ExpiryStatus`

---

## Task 3: Scanner Screen

**Files:**
- Create: `src/screens/ScannerScreen.tsx`
- Create: `src/components/CameraViewfinder.tsx`
- Create: `src/components/ManualEntrySheet.tsx`
- Create: `src/components/RecentScans.tsx`
- Create: `src/hooks/useBarcodeScanner.ts`
- Test: `src/__tests__/ScannerScreen.test.tsx`

**Step 1: Write failing test**

**Step 2: Implement useBarcodeScanner hook**

Checks for Barcode Detection API support, falls back to @zxing/browser, exposes `scanning`, `error`, `start`, `stop` state.

**Step 3: Implement CameraViewfinder**

Video element, scan frame overlay, corner brackets, flash toggle.

**Step 4: Implement ManualEntrySheet**

Bottom sheet with input + submit.

**Step 5: Implement RecentScans**

Fetches recent batches + their products, displays horizontal scroll cards.

**Step 6: Implement ScannerScreen**

Composes all camera components + recent scans.

**Step 7: Test**

**Step 8: Commit**

---

## Task 4: Product Detail Screen

**Files:**
- Create: `src/screens/ProductDetailScreen.tsx`
- Create: `src/components/ProductForm.tsx`
- Create: `src/components/ProductImage.tsx`
- Create: `src/hooks/useProductLookup.ts`
- Test: `src/__tests__/ProductDetailScreen.test.tsx`

**Step 1: Write failing test**

**Step 2: Implement useProductLookup hook**

Checks local catalog → falls back to Open Food Facts API → returns product data or null.

**Step 3: Implement ProductForm**

Editable fields: name, brand, category, price, expiry date, quantity. Validation.

**Step 4: Implement ProductImage**

Shows product image from URL, or placeholder icon.

**Step 5: Implement ProductDetailScreen**

Composes form + image, handles save (creates Product + Batch), navigates to inventory on success.

**Step 6: Test**

**Step 7: Commit**

---

## Task 5: Inventory Screen

**Files:**
- Create: `src/screens/InventoryScreen.tsx`
- Create: `src/components/InventoryGroup.tsx`
- Create: `src/components/BatchRow.tsx`
- Create: `src/components/SearchBar.tsx`
- Create: `src/components/FilterChips.tsx`
- Create: `src/components/EmptyState.tsx`
- Create: `src/components/ConfirmDialog.tsx`
- Create: `src/components/Toast.tsx`
- Test: `src/__tests__/InventoryScreen.test.tsx`

**Step 1: Write failing tests**

**Step 2: Implement Toast component**

Bottom-center, auto-dismiss, queue.

**Step 3: Implement ConfirmDialog**

Modal with title, body, cancel/confirm actions.

**Step 4: Implement EmptyState**

Large icon, title, subtitle, CTA button.

**Step 5: Implement SearchBar**

Input with search icon, debounced onChange.

**Step 6: Implement FilterChips**

Horizontal scroll chips: All, Expiring, Expired, Good.

**Step 7: Implement BatchRow**

Expiry date + quantity + status badge, swipe-to-delete or long-press actions.

**Step 8: Implement InventoryGroup**

Product header with expand/collapse, batch list inside.

**Step 9: Implement InventoryScreen**

Fetches inventory groups, search, filter, empty state, pull-to-refresh.

**Step 10: Test**

**Step 11: Commit**

---

## Task 6: Settings Screen

**Files:**
- Create: `src/screens/SettingsScreen.tsx`
- Create: `src/components/SettingsToggle.tsx`
- Create: `src/components/SettingsStepper.tsx`
- Test: `src/__tests__/SettingsScreen.test.tsx`

**Step 1: Write failing tests**

**Step 2: Implement SettingsToggle**

Switch component for notifications + theme.

**Step 3: Implement SettingsStepper**

Numeric stepper with +/- buttons for alert window.

**Step 4: Implement SettingsScreen**

Notifications toggle, alert window, export (JSON download), clear all data (with confirm), about section, theme selector.

**Step 5: Test**

**Step 6: Commit**

---

## Task 7: Open Food Facts API + Barcode Lookup

**Files:**
- Create: `src/services/apiService.ts`
- Test: `src/__tests__/apiService.test.ts`

**Step 1: Write failing test (mock fetch)**

**Step 2: Implement apiService.ts**

`lookupBarcode(barcode: string): Promise<OpenFoodFactsResponse | null>`

Calls `https://world.openfoodfacts.org/api/v0/product/{barcode}.json`, parses response, returns product data or null.

**Step 3: Test**

**Step 4: Commit**

---

## Task 8: Design System CSS

**Files:**
- Modify: `src/index.css`
- Create: `src/components/*.css` (co-located component styles)

**Step 1: Write design tokens as CSS custom properties**

All colors, spacing, typography, shadows from the UI/UX spec.

**Step 2: Write global styles**

Reset, body, app container, bottom nav padding, safe area insets.

**Step 3: Write component styles**

Buttons, cards, inputs, badges, modals, bottom sheets, toasts — all per the spec.

**Step 4: Write dark mode**

`@media (prefers-color-scheme: dark)` and `[data-theme="dark"]` overrides.

**Step 5: Write reduced motion**

`@media (prefers-reduced-motion: reduce)` — disable all transitions/animations.

**Step 6: Commit**

---

## Task 9: Build + Integration Test

**Step 1: Run `npm run build`** — verify no TypeScript or build errors

**Step 2: Run `npm test`** — verify all tests pass

**Step 3: Fix any issues**

**Step 4: Commit**

---

## Task 10: Finishing

**Step 1: Verify all tests pass**

**Step 2: Present options** — push to GitHub / keep local / continue iterating

---

# Barcode Inventory — Product Requirements Document

## Problem Statement

A user in the Philippines needs a cellphone app that works like a supermarket barcode scanner: scan a product's barcode, see its price and expiry date, and automatically record it in a personal inventory. The app should track multiple batches of the same product (old groceries vs. new groceries), sort them by expiry date (FIFO), and notify the user before items expire — so nothing gets wasted.

## Solution

A Progressive Web App (PWA) built with React that uses the phone's camera to scan barcodes. Product data comes from a local catalog (IndexedDB) first, falling back to the Open Food Facts API when online. Each scan creates a new batch in the inventory with its own expiry date and quantity. The inventory is grouped by product and sorted by expiry date within each group. Push notifications alert the user when items enter the configurable alert window (default: 3 days before expiry).

## User Stories

1. As a user, I want to scan a barcode and see the product name, price, and expiry date immediately — so I know what I'm buying/using.
2. As a user, I want the app to recognize products I've scanned before — so I don't need to re-enter details every time.
3. As a user, I want to set my own price per product (since prices vary by store) — so the inventory reflects what I actually paid.
4. As a user, I want to scan the same product multiple times and have each scan tracked as a separate batch — so I can distinguish old stock from new stock.
5. As a user, I want my inventory sorted by expiry date (FIFO) within each product group — so I know which items to consume first.
6. As a user, I want to set the quantity per scan (not just 1) — so scanning a 5-can pack of Pringles adds 5 units, not 1.
7. As a user, I want push notifications when items are about to expire — so I use them before they go bad.
8. As a user, I want to configure how many days before expiry I get notified — so I can set it to 3, 7, or whatever works for me.
9. As a user, I want the app to work offline using my local catalog — so I can scan even without WiFi.
10. As a user, I want the app to look up unknown barcodes online via Open Food Facts — so I don't have to manually enter every new product.
11. As a user, I want to edit a product's details (name, brand, price, default expiry) — so I can fix mistakes or update info.
12. As a user, I want to delete items from my inventory — so I can remove things I've already consumed or thrown away.

## Implementation Decisions

### Stack & Platform
- **React + Vite** PWA, installable on Android/iOS/home screen
- **TypeScript** for type safety
- **Workbox** (via `vite-plugin-pwa`) for service worker, offline caching, and push notifications
- **Capacitor** wrapper for native app store distribution (future)

### Barcode Scanning
- Primary: **Barcode Detection API** (native browser API, Chrome/Android)
- Fallback: **`@zxing/library`** (pure JS, works on iOS/Safari)
- Scanning UI: camera viewfinder with a scan button + manual barcode entry option

### Data Storage
- **IndexedDB** (via `idb` library) for both catalog and inventory
- Two object stores:
  - `catalog` — keyed by barcode (string), value: Product record
  - `inventory` — keyed by auto-incrementing batchId, value: Batch record
- localStorage for user settings (alert window, theme)

### Data Models

```typescript
interface Product {
  barcode: string;          // EAN-13 / UPC-A
  name: string;
  brand: string;
  category: string;
  storePrice: number;       // user-set price (PHP)
  defaultExpiry: string;    // ISO date (YYYY-MM-DD), set on first add
  imageUrl?: string;        // from API or user-added
  source: 'local' | 'openfoodfacts' | 'manual';
  createdAt: string;
  updatedAt: string;
}

interface Batch {
  batchId: string;          // uuid
  barcode: string;          // FK to Product
  quantity: number;         // default 1
  expiryDate: string;       // ISO date (YYYY-MM-DD)
  scannedAt: string;        // ISO datetime
  notes?: string;
}
```

### Product Lookup Flow
1. Scan barcode → check local `catalog` in IndexedDB
2. If found → display product info + `storePrice` + `defaultExpiry`
3. If not found and online → query Open Food Facts API (`https://world.openfoodfacts.org/api/v0/product/{barcode}.json`)
4. If API returns result → pre-fill name, brand, category, image; prompt user to set price and expiry
5. If API fails or no result → show manual entry form (name, brand, price, expiry, category)

### Scan → Save Flow
1. Scan barcode
2. App displays product info with editable fields: **price**, **expiry date**, **quantity**
3. User can adjust any field, or accept defaults
4. Tap "Add to Inventory"
5. New **Batch** created in IndexedDB with the entered expiry date and quantity
6. If product was new → also saved to `catalog` with `storePrice` and `defaultExpiry`

### Inventory View
- Grouped by product (alphabetical or by urgency)
- Within each product group, batches sorted by **FIFO** (earliest expiry first)
- Each product row shows: name, brand, total quantity, earliest expiry date, status badge
- Status badges: **Expiring Soon** (within alert window), **Expired**, **Good**
- Expand a product to see individual batch details (expiry date, quantity, scan date)
- Swipe or long-press to delete a batch (mark as consumed/thrown away)

### Expiry Notifications
- Service worker periodic background sync (or daily check on app open)
- On app load: scan all batches, identify those within alert window or expired
- Show in-app notification banner + browser push notification (if permission granted)
- **Alert Window** setting (default: 3 days) — configurable in Settings screen
- Notification content: "Pringles (3 cans) expiring in 2 days" / "Coca-Cola 1.5L expired yesterday"

### Settings
- Alert window (days before expiry): number input, default 3
- Notification permission toggle
- Export inventory (JSON/CSV)
- Clear all data (with confirmation)
- About / version info

### UI Screens
1. **Home / Scanner** — camera viewfinder, recent scans list
2. **Product Detail** — after scan, editable form (price, expiry, quantity, name, brand)
3. **Inventory** — grouped list of all products with batches
4. **Settings** — alert window, notifications, export, clear data
5. **Product Management** — edit/delete catalog products

### API Contract (Open Food Facts)
- Endpoint: `GET https://world.openfoodfacts.org/api/v0/product/{barcode}.json`
- Response fields used: `product.product_name`, `product.brands`, `product.categories`, `product.image_front_url`
- No API key required
- Rate limit: 100 requests/minute (generous for personal use)

## Testing Decisions

- **Unit tests**: Product lookup logic (local vs. API fallback), batch sorting (FIFO), expiry alert window calculation, quantity aggregation per product
- **Integration tests**: Scan → save → inventory display flow (mock IndexedDB with `fake-indexeddb`)
- **E2E tests**: Playwright — scan flow, inventory management, settings
- Test seams: service layer (catalogService, inventoryService, notificationService) — test through these, not through UI components

## Out of Scope

- Multi-user / cloud sync (single-user local-first app)
- Receipt OCR or OCR-based product recognition
- Price comparison across stores
- Barcode generation or printing
- iOS native build (PWA first, Capacitor wrap later)
- In-app purchases or monetization
- Social/sharing features

## Further Notes

- All prices in **Philippine Peso (PHP)** by default
- Barcode formats: EAN-13, EAN-8, UPC-A, UPC-E
- The app should be usable one-handed (thumb-friendly buttons)
- Dark mode support via CSS custom properties
- The PWA manifest should include a scanner-appropriate theme color
- Future: Capacitor wrapper for app store distribution, cloud backup via Google Drive/Dropbox

# Cashier Mode (Till) Implementation Plan

> **For implementer:** Use TDD throughout. Write the failing test first. Watch it fail. Then implement. Commit after each green test.
> Design doc: `docs/plans/2026-10-15-cashier-mode-design.md` — read it first.

**Goal:** Turn Cashier Mode into a working till — scan a customer's items, take payment, store the sale locally, subtract stock, and report the day's takings.

**Architecture:** A dedicated `TillScreen` is rendered as the Scan tab's element when `cashierMode` is on; `ScannerScreen` (receiving) is untouched. A new `sales` IndexedDB store (DB v2) holds completed sales. One `saleService` owns recording, deduction, undo and reporting. `sellerMode` is deleted end-to-end.

**Tech Stack:** React 18 + TypeScript, Vite, `idb` (IndexedDB), react-router-dom, Vitest + @testing-library/react + fake-indexeddb.

**Project root (absolute):** `C:/Users/bryan/Documents/Hermes/Projects/barcode-inventory`

**Test command (exact):**
```bash
C:/nvm4w/nodejs/node.exe node_modules/vitest/vitest.mjs run <test-file>
```
**Typecheck:** `C:/nvm4w/nodejs/node.exe node_modules/typescript/bin/tsc --noEmit`
**Build:** `C:/nvm4w/nodejs/node.exe node_modules/vite/bin/vite.js build`

---

## Task A — DB migration: add the `sales` store

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/db/database.ts`
- Test: `src/__tests__/database.test.ts`

**Step 1 — write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getDB, resetDB } from '@/db/database';

describe('database v2', () => {
  beforeEach(() => { resetDB(); });

  it('exposes a sales store indexed by day', async () => {
    const db = await getDB();
    expect(db.objectStoreNames.contains('sales')).toBe(true);
    const tx = db.transaction('sales');
    expect(tx.store.indexNames.contains('by-day')).toBe(true);
  });
});
```

**Step 2 — run it.** Expected: FAIL — `sales` store missing.

**Step 3 — implement**

In `src/types/index.ts` add:

```ts
export interface SaleDeduction {
  batchId: string;
  quantity: number;
  expiryDate: string;   // snapshot so a deleted batch can be recreated on undo
  scannedAt: string;    // snapshot
}

export interface SaleLine {
  barcode: string;
  name: string;
  brand: string;
  unitPrice: number;    // snapshot — later price edits must not rewrite history
  quantity: number;
  lineTotal: number;
  deductions: SaleDeduction[];
  shortfall: number;    // units sold with no stock to deduct
}

export interface Sale {
  saleId: string;
  soldAt: string;
  dayKey: string;       // local 'YYYY-MM-DD'
  lines: SaleLine[];
  total: number;
  itemCount: number;
}
```

In `src/db/database.ts`: add `Sale` to the import, add the store to the schema interface, bump the version, and extend `upgrade` **additively**:

```ts
export interface BarcodeInventoryDB extends DBSchema {
  catalog: { key: string; value: Product; indexes: { 'by-name': string } };
  inventory: { key: string; value: Batch; indexes: { 'by-barcode': string; 'by-expiry': string } };
  settings: { key: string; value: Settings };
  sales: { key: string; value: Sale; indexes: { 'by-day': string } };
}

const DB_VERSION = 2;
```
```ts
// inside upgrade(db), after the existing blocks
if (!db.objectStoreNames.contains('sales')) {
  const salesStore = db.createObjectStore('sales', { keyPath: 'saleId' });
  salesStore.createIndex('by-day', 'dayKey');
}
```

**Step 4 — run it.** Expected: PASS.
**Step 5 — commit:** `feat: add sales store (db v2, additive upgrade)`

---

## Task B — `dayKey` local-date helper

**Files:**
- Create: `src/utils/dayKey.ts`
- Test: `src/__tests__/dayKey.test.ts`

**Step 1 — write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { toDayKey } from '@/utils/dayKey';

describe('toDayKey', () => {
  it('uses local date parts, not UTC', () => {
    // 23:30 local on 15 Oct — must be 2026-10-15 even where UTC has rolled over
    const d = new Date(2026, 9, 15, 23, 30, 0);
    expect(toDayKey(d)).toBe('2026-10-15');
  });

  it('zero-pads month and day', () => {
    expect(toDayKey(new Date(2026, 0, 5, 9, 0, 0))).toBe('2026-01-05');
  });
});
```

**Step 2 — run it.** Expected: FAIL — cannot resolve `@/utils/dayKey`.

**Step 3 — implement**

```ts
/** Local 'YYYY-MM-DD'. Never use toISOString() here — that is UTC and would
 *  push a late-evening sale into the next day. */
export function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```

**Step 4 — run it.** Expected: PASS.
**Step 5 — commit:** `feat: local-day key helper`

---

## Task C — `saleService`: FIFO deduction + shortfall

**Files:**
- Create: `src/services/saleService.ts`
- Test: `src/__tests__/saleService.test.ts`

**Step 1 — write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { resetDB } from '@/db/database';
import { addBatch, getAllBatches } from '@/services/inventoryService';
import { deductStockFIFO } from '@/services/saleService';

const batch = (batchId: string, qty: number, expiryDate: string, scannedAt: string) =>
  ({ batchId, barcode: 'B1', quantity: qty, expiryDate, scannedAt });

describe('deductStockFIFO', () => {
  beforeEach(async () => { resetDB(); });

  it('takes from the earliest expiry first', async () => {
    await addBatch(batch('late', 5, '2027-01-01', '2026-01-01T00:00:00.000Z'));
    await addBatch(batch('early', 5, '2026-06-01', '2026-01-01T00:00:00.000Z'));

    const { deductions, shortfall } = await deductStockFIFO('B1', 7);

    expect(shortfall).toBe(0);
    expect(deductions).toEqual([
      { batchId: 'early', quantity: 5, expiryDate: '2026-06-01', scannedAt: '2026-01-01T00:00:00.000Z' },
      { batchId: 'late', quantity: 2, expiryDate: '2027-01-01', scannedAt: '2026-01-01T00:00:00.000Z' },
    ]);

    const left = await getAllBatches();
    expect(left.find(b => b.batchId === 'early')).toBeUndefined();   // emptied → deleted
    expect(left.find(b => b.batchId === 'late')!.quantity).toBe(3);
  });

  it('records a shortfall instead of blocking when stock is insufficient', async () => {
    await addBatch(batch('only', 2, '2026-06-01', '2026-01-01T00:00:00.000Z'));
    const { deductions, shortfall } = await deductStockFIFO('B1', 5);
    expect(deductions[0]!.quantity).toBe(2);
    expect(shortfall).toBe(3);
  });

  it('returns a full shortfall when there is no stock at all', async () => {
    const { deductions, shortfall } = await deductStockFIFO('NOPE', 4);
    expect(deductions).toEqual([]);
    expect(shortfall).toBe(4);
  });
});
```

**Step 2 — run it.** Expected: FAIL — cannot resolve `deductStockFIFO`.

**Step 3 — implement**

```ts
import type { Sale, SaleDeduction, SaleLine } from '@/types';
import { getDB } from '@/db/database';
import { getBatchesByBarcode, sortBatchesByFIFO, updateBatch, deleteBatch } from './inventoryService';
import { toDayKey } from '@/utils/dayKey';

export interface DeductResult {
  deductions: SaleDeduction[];
  shortfall: number;
}

/** Take `quantity` of `barcode` from stock, earliest expiry first.
 *  Never throws for insufficient stock — reports a shortfall instead, because a
 *  paying customer is never refused over a wrong count. */
export async function deductStockFIFO(barcode: string, quantity: number): Promise<DeductResult> {
  const batches = sortBatchesByFIFO(await getBatchesByBarcode(barcode));
  const deductions: SaleDeduction[] = [];
  let remaining = quantity;

  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    if (take <= 0) continue;

    deductions.push({
      batchId: batch.batchId,
      quantity: take,
      expiryDate: batch.expiryDate,
      scannedAt: batch.scannedAt,
    });

    const left = batch.quantity - take;
    if (left === 0) {
      await deleteBatch(batch.batchId);
    } else {
      await updateBatch({ ...batch, quantity: left });
    }
    remaining -= take;
  }

  return { deductions, shortfall: Math.max(0, remaining) };
}
```

**Step 4 — run it.** Expected: PASS.
**Step 5 — commit:** `feat: FIFO stock deduction with shortfall reporting`

---

## Task D — `saleService`: `recordSale`

**Files:**
- Modify: `src/services/saleService.ts`
- Modify: `src/__tests__/saleService.test.ts`

**Step 1 — write the failing test**

```ts
import { recordSale, getSalesForDay } from '@/services/saleService';
import type { ScanCartItem } from '@/context/ScanCartContext';

const cartItem = (over: Partial<ScanCartItem> = {}): ScanCartItem => ({
  id: 'c1', barcode: 'B1', product: null, name: 'Bear Brand', brand: 'Bear Brand',
  price: 12.5, expiryDate: '2026-06-01', quantity: 2, needsInfo: false, source: 'local',
  ...over,
});

it('records a sale, snapshots prices, and deducts stock', async () => {
  await addBatch(batch('b1', 10, '2026-06-01', '2026-01-01T00:00:00.000Z'));

  const sale = await recordSale([cartItem()], new Date(2026, 9, 15, 14, 0, 0));

  expect(sale.total).toBe(25);              // 12.5 × 2
  expect(sale.itemCount).toBe(2);
  expect(sale.dayKey).toBe('2026-10-15');
  expect(sale.lines[0]!.unitPrice).toBe(12.5);
  expect(sale.lines[0]!.shortfall).toBe(0);

  const left = await getAllBatches();
  expect(left.find(b => b.batchId === 'b1')!.quantity).toBe(8);

  const today = await getSalesForDay('2026-10-15');
  expect(today).toHaveLength(1);
  expect(today[0]!.saleId).toBe(sale.saleId);
});

it('keeps the sale even when there is no stock to deduct', async () => {
  const sale = await recordSale([cartItem({ barcode: 'GHOST' })], new Date(2026, 9, 15));
  expect(sale.total).toBe(25);
  expect(sale.lines[0]!.shortfall).toBe(2);
  expect(sale.lines[0]!.deductions).toEqual([]);
});
```

**Step 2 — run it.** Expected: FAIL — `recordSale` not exported.

**Step 3 — implement**

```ts
export async function recordSale(items: ScanCartItem[], now: Date = new Date()): Promise<Sale> {
  const lines: SaleLine[] = [];

  for (const item of items) {
    const { deductions, shortfall } = await deductStockFIFO(item.barcode, item.quantity);
    lines.push({
      barcode: item.barcode,
      name: item.name,
      brand: item.brand,
      unitPrice: item.price,          // snapshot
      quantity: item.quantity,
      lineTotal: item.price * item.quantity,
      deductions,
      shortfall,
    });
  }

  const sale: Sale = {
    saleId: generateId(),
    soldAt: now.toISOString(),
    dayKey: toDayKey(now),
    lines,
    total: lines.reduce((s, l) => s + l.lineTotal, 0),
    itemCount: lines.reduce((s, l) => s + l.quantity, 0),
  };

  const db = await getDB();
  await db.put('sales', sale);        // write LAST: stock is already correct either way,
  return sale;                        // but a sale that was not written must not look recorded
}
```

**Step 4 — run it.** Expected: PASS.
**Step 5 — commit:** `feat: recordSale with price snapshots and stock deduction`

---

## Task E — `saleService`: `undoLastSale`

**Files:**
- Modify: `src/services/saleService.ts`
- Modify: `src/__tests__/saleService.test.ts`

**Step 1 — write the failing test**

```ts
import { undoLastSale, getSale } from '@/services/saleService';

it('restores stock to the exact batches it came from', async () => {
  await addBatch(batch('b1', 10, '2026-06-01', '2026-01-01T00:00:00.000Z'));
  const sale = await recordSale([cartItem({ quantity: 4 })], new Date(2026, 9, 15));
  expect((await getAllBatches()).find(b => b.batchId === 'b1')!.quantity).toBe(6);

  await undoLastSale(sale.saleId);

  expect((await getAllBatches()).find(b => b.batchId === 'b1')!.quantity).toBe(10);
  expect(await getSale(sale.saleId)).toBeUndefined();
});

it('recreates a batch that was deleted at zero', async () => {
  await addBatch(batch('b1', 3, '2026-06-01', '2026-01-01T00:00:00.000Z'));
  const sale = await recordSale([cartItem({ quantity: 3 })], new Date(2026, 9, 15));
  expect((await getAllBatches()).find(b => b.batchId === 'b1')).toBeUndefined();

  await undoLastSale(sale.saleId);

  const restored = (await getAllBatches()).find(b => b.batchId === 'b1');
  expect(restored!.quantity).toBe(3);
  expect(restored!.expiryDate).toBe('2026-06-01');   // snapshot used
});
```

**Step 2 — run it.** Expected: FAIL.

**Step 3 — implement**

```ts
export async function getSale(saleId: string): Promise<Sale | undefined> {
  const db = await getDB();
  return db.get('sales', saleId);
}

/** Reverse a sale exactly: put every deducted unit back where it came from,
 *  recreating any batch that had been deleted at zero, then remove the sale. */
export async function undoLastSale(saleId: string): Promise<void> {
  const sale = await getSale(saleId);
  if (!sale) return;

  for (const line of sale.lines) {
    for (const d of line.deductions) {
      const existing = await getBatch(d.batchId);
      if (existing) {
        await updateBatch({ ...existing, quantity: existing.quantity + d.quantity });
      } else {
        await addBatch({
          batchId: d.batchId,
          barcode: line.barcode,
          quantity: d.quantity,
          expiryDate: d.expiryDate,
          scannedAt: d.scannedAt,
        });
      }
    }
  }

  const db = await getDB();
  await db.delete('sales', saleId);
}
```
Add `getBatch, addBatch` to the `inventoryService` import.

**Step 4 — run it.** Expected: PASS.
**Step 5 — commit:** `feat: undo a sale and restore stock exactly`

---

## Task F — `saleService`: reporting queries

**Files:**
- Modify: `src/services/saleService.ts`
- Modify: `src/__tests__/saleService.test.ts`

**Step 1 — write the failing test**

```ts
import { getSalesForDay, getDayKeys, summarizeDay } from '@/services/saleService';

it('scopes sales to a day and lists days newest-first', async () => {
  await recordSale([cartItem()], new Date(2026, 9, 15, 10, 0, 0));
  await recordSale([cartItem()], new Date(2026, 9, 16, 10, 0, 0));

  expect(await getSalesForDay('2026-10-15')).toHaveLength(1);
  expect(await getDayKeys()).toEqual(['2026-10-16', '2026-10-15']);
});

it('summarises a day', async () => {
  const s1 = await recordSale([cartItem({ quantity: 2, price: 10 })], new Date(2026, 9, 15));
  const sales = await getSalesForDay('2026-10-15');
  const sum = summarizeDay(sales);
  expect(sum.total).toBe(20);
  expect(sum.saleCount).toBe(1);
  expect(sum.itemCount).toBe(2);
  expect(sum.topSellers[0]).toEqual({ name: 'Bear Brand', quantity: 2 });
  expect(sum.shortfalls).toEqual([]);
});
```

**Step 2 — run it.** Expected: FAIL.

**Step 3 — implement**

```ts
export async function getSalesForDay(dayKey: string): Promise<Sale[]> {
  const db = await getDB();
  return db.getAllFromIndex('sales', 'by-day', dayKey);
}

export async function getDayKeys(): Promise<string[]> {
  const db = await getDB();
  const keys = await db.getAllKeysFromIndex('sales', 'by-day');
  return [...new Set(keys as string[])].sort((a, b) => b.localeCompare(a));
}

export interface DaySummary {
  total: number;
  saleCount: number;
  itemCount: number;
  topSellers: { name: string; quantity: number }[];
  shortfalls: { name: string; quantity: number }[];
}

export function summarizeDay(sales: Sale[]): DaySummary {
  const byName = new Map<string, number>();
  const shortfalls: { name: string; quantity: number }[] = [];

  for (const sale of sales) {
    for (const line of sale.lines) {
      byName.set(line.name || line.barcode, (byName.get(line.name || line.barcode) ?? 0) + line.quantity);
      if (line.shortfall > 0) {
        shortfalls.push({ name: line.name || line.barcode, quantity: line.shortfall });
      }
    }
  }

  return {
    total: sales.reduce((s, x) => s + x.total, 0),
    saleCount: sales.length,
    itemCount: sales.reduce((s, x) => s + x.itemCount, 0),
    topSellers: [...byName.entries()]
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity),
    shortfalls,
  };
}
```

**Step 4 — run it.** Expected: PASS.
**Step 5 — commit:** `feat: daily sales queries and summary`

---

## Task G — Delete `sellerMode` + fix name/brand persistence

> One atomic task — this flag spans 7 files and half-removing it will not typecheck.

**Files:**
- Modify: `src/types/index.ts`, `src/screens/SettingsScreen.tsx`, `src/components/ProductForm.tsx`,
  `src/screens/ProductDetailScreen.tsx`, `src/components/ModeIndicatorChip.tsx`
- Modify: `src/__tests__/ModeIndicatorChip.test.tsx`, `src/__tests__/ProductForm.test.tsx`,
  `src/__tests__/TutorialContext.test.tsx`
- Test: `src/__tests__/ProductDetailPersistence.test.tsx` (new)

**Step 1 — write the failing test**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { resetDB } from '@/db/database';
import { saveProduct, getProduct } from '@/services/catalogService';

describe('product name/brand persistence', () => {
  beforeEach(async () => { resetDB(); });

  it('persists an edited name and brand', async () => {
    const now = new Date().toISOString();
    await saveProduct({
      barcode: 'P1', name: 'Original', brand: 'OrigBrand', category: '',
      storePrice: 10, defaultExpiry: '', source: 'manual', createdAt: now, updatedAt: now,
    });

    const existing = await getProduct('P1');
    await updateProduct({ ...existing!, name: 'Renamed', brand: 'NewBrand', updatedAt: now });

    const after = await getProduct('P1');
    expect(after!.name).toBe('Renamed');
    expect(after!.brand).toBe('NewBrand');
  });
});
```

**Step 2 — run it.** Expected: PASS immediately (the service is fine) — this test guards the *contract*. The real regression is the UI gate; assert it in Step 3's manual check.

**Step 3 — implement**

1. `src/types/index.ts` — delete `sellerMode: boolean` from `Settings` and `DEFAULT_SETTINGS`.
2. `src/screens/SettingsScreen.tsx` — delete the entire Seller Mode `<SettingsToggle>` (lines 203-208). Reword Cashier Mode: `"Scan a customer's items straight into the till, take payment, and track the day's sales"`.
3. `src/components/ProductForm.tsx` — delete the `sellerMode` prop from the interface, the destructure, and simplify line 227 to `'Update Inventory'`.
4. `src/screens/ProductDetailScreen.tsx`:
   - delete `const sellerMode = ...` (line 21) and `sellerMode={sellerMode}` (line 585)
   - **replace the whole `else` block at lines 208-236 with unconditional persistence:**

```ts
} else {
  if (product) {
    const needsUpdate =
      product.name !== data.name.trim() ||
      product.brand !== data.brand.trim() ||
      product.storePrice !== price ||
      product.defaultExpiry !== data.expiryDate;

    if (needsUpdate) {
      await updateProduct({
        ...product,
        name: data.name.trim(),
        brand: data.brand.trim(),
        storePrice: price,
        defaultExpiry: data.expiryDate,
        updatedAt: now,
      });
    }
  }
  await addBatch({
    batchId: generateId(), barcode, quantity: data.quantity,
    expiryDate: data.expiryDate, scannedAt: now,
  });
}
```
   - simplify the toast branch (lines 264-268) to a single `showToast('Saved!', 'success')`
5. `src/components/ModeIndicatorChip.tsx:5` — `const activeMode = settings.cashierMode ? 'cashier' : 'default'`
6. Update the three test files: remove `sellerMode` from fixtures/mocks; drop the "renders seller mode indicator" case.

**Step 4 — verify**
```bash
C:/nvm4w/nodejs/node.exe node_modules/typescript/bin/tsc --noEmit      # expect: clean
C:/nvm4w/nodejs/node.exe node_modules/vitest/vitest.mjs run            # expect: all green
```
**Manual check:** with Cashier Mode off, scan `4800361394093`, change the Product Name, submit, reopen — the new name must be there.

**Step 5 — commit:** `fix: persist name/brand on edit; remove sellerMode (single cashier switch)`

---

## Task H — `TillScreen` (basket + Paid)

**Files:**
- Create: `src/screens/TillScreen.tsx`
- Modify: `src/App.tsx` (route + Scan-tab element selection)
- Test: `src/__tests__/TillScreen.test.tsx`

**Step 1 — write the failing test**

```tsx
// Mock CameraViewfinder (as ScannerScreen.test.tsx does), mock useScanCart with 2 items,
// mock useSettings → { cashierMode: true }, mock saleService.recordSale.
it('shows the basket and records a sale on Paid', async () => {
  render(<TillScreen />);
  expect(screen.getByText('Bear Brand')).toBeInTheDocument();
  expect(screen.getByText('₱25.00')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /paid/i }));
  expect(recordSale).toHaveBeenCalledTimes(1);
  expect(clearCart).toHaveBeenCalled();
});

it('disables Paid when the basket is empty', () => {
  // useScanCart → items: []
  render(<TillScreen />);
  expect(screen.getByRole('button', { name: /paid/i })).toBeDisabled();
});
```

**Step 2 — run it.** Expected: FAIL — cannot resolve `@/screens/TillScreen`.

**Step 3 — implement**

`TillScreen` structure:
- Header: `Till` + item count
- `CameraViewfinder` (`ref`, `onScan`, `cameraActive`) + the existing auto/manual toggle
  (copy the minimal scan-mode wiring; **do not** copy `ScannerScreen`'s 509 lines)
- Basket list from `useScanCart()`: name, `qty × ₱unit`, line total, +/−, remove
- Empty state: "No items yet — scan a product"
- Sticky footer: `Total ₱X` + `Paid` (disabled when `items.length === 0`)
- On Paid: `await recordSale(items)` → `clearCart()` → toast `Sale recorded ₱X` + Undo
- Errors: on throw, keep the cart and toast the error

In `src/App.tsx`:
```tsx
const { settings } = useSettingsContext();   // already inside SettingsProvider
// Scan tab element:
<Route path="/" element={settings.cashierMode ? <TillScreen /> : <ScannerScreen />} />
<Route path="/till" element={<TillScreen />} />
```
`BottomNav` marks Scan active for `/till` too.

**Step 4 — run it.** Expected: PASS.
**Step 5 — commit:** `feat: TillScreen — customer basket and Paid`

---

## Task I — Undo in the success toast

**Files:**
- Modify: `src/screens/TillScreen.tsx`
- Modify: `src/__tests__/TillScreen.test.tsx`

**Step 1 — write the failing test**

```tsx
it('restores stock and the basket when Undo is tapped', async () => {
  vi.useFakeTimers();
  render(<TillScreen />);
  await userEvent.click(screen.getByRole('button', { name: /paid/i }));
  await userEvent.click(await screen.findByRole('button', { name: /undo/i }));
  expect(undoLastSale).toHaveBeenCalledWith(expect.any(String));
  vi.useRealTimers();
});

it('hides Undo after the window closes', async () => {
  vi.useFakeTimers();
  render(<TillScreen />);
  await userEvent.click(screen.getByRole('button', { name: /paid/i }));
  await vi.advanceTimersByTimeAsync(7000);
  expect(screen.queryByRole('button', { name: /undo/i })).toBeNull();
  vi.useRealTimers();
});
```

> Timer note: use `vi.useFakeTimers()` + `advanceTimersByTimeAsync`, and keep fake timers **out** of
> `beforeEach` for any test touching IndexedDB — fake timers deadlock `fake-indexeddb`.

**Step 2 — run it.** Expected: FAIL.

**Step 3 — implement** — hold `lastSale` in state with a 6s timer. Undo calls `undoLastSale(saleId)`,
then **appends** the restored lines back into the cart (`addItem` per line) — never replaces the cart,
because a new customer may already have scanned something.

**Step 4 — run it.** Expected: PASS.
**Step 5 — commit:** `feat: undo a recorded sale from the toast`

---

## Task J — `SalesScreen` + the Sales nav item

**Files:**
- Create: `src/screens/SalesScreen.tsx`
- Modify: `src/App.tsx` (route + guard), `src/App.tsx` `navItems`
- Test: `src/__tests__/SalesScreen.test.tsx`

**Step 1 — write the failing test**

```tsx
it("shows today's total and sale count", async () => {
  // mock getSalesForDay → two sales totalling ₱120, itemCount 5
  render(<SalesScreen />);
  expect(await screen.findByText('₱120.00')).toBeInTheDocument();
  expect(screen.getByText(/2 sales/)).toBeInTheDocument();
});

it('lists past days and shows one when selected', async () => { /* mock getDayKeys */ });

it('flags items sold without stock', async () => { /* sale with shortfall > 0 */ });
```

**Step 2 — run it.** Expected: FAIL.

**Step 3 — implement**
- Today card: total, sale count, item count, top sellers
- Day list from `getDayKeys()`; selecting a day re-renders the summary for it
- Shortfall section, only when non-empty: "Sold without stock"
- Guard: `if (!settings.cashierMode) return <Navigate to="/" replace />;`
- `navItems` gains `{ path: '/sales', icon: Receipt, label: 'Sales' }`, filtered on `cashierMode`

**Step 4 — run it.** Expected: PASS.
**Step 5 — commit:** `feat: daily sales report and Sales nav item`

---

## Task K — "Set stock" in Inventory

**Files:**
- Create: `src/components/SetStockSheet.tsx`
- Modify: `src/screens/InventoryScreen.tsx`
- Test: `src/__tests__/SetStockSheet.test.tsx`

**Step 1 — write the failing test**

```ts
it('adds stock when the target is higher', async () => {
  await addBatch(batch('b1', 12, '2026-06-01', '2026-01-01T00:00:00.000Z'));
  await setStock('B1', 20, '2026-06-01');
  expect(totalFor('B1')).toBe(20);
});

it('removes oldest-expiry-first when the target is lower', async () => {
  await addBatch(batch('early', 5, '2026-06-01', '2026-01-01T00:00:00.000Z'));
  await addBatch(batch('late', 5, '2027-01-01', '2026-01-01T00:00:00.000Z'));
  await setStock('B1', 3, '2027-01-01');
  const left = await getAllBatches();
  expect(left.find(b => b.batchId === 'early')).toBeUndefined();
  expect(left.find(b => b.batchId === 'late')!.quantity).toBe(3);
});
```

**Step 2 — run it.** Expected: FAIL.

**Step 3 — implement** — `setStock(barcode, target, expiryDate)`:
- `current = sum of batch quantities`
- `target > current` → `addBatch` the difference with the given expiry
- `target < current` → `deductStockFIFO(barcode, current - target)` (reuses Task C)
- `target === current` → no-op
Wire a "Set stock" action on the inventory product row opening `SetStockSheet` (numeric input + expiry).

**Step 4 — run it.** Expected: PASS.
**Step 5 — commit:** `feat: set stock to a target quantity`

---

## Task L — `QuickEntryModal`: collect name and brand

**Files:**
- Modify: `src/components/QuickEntryModal.tsx`
- Modify: `src/screens/ScannerScreen.tsx` (`handleQuickEntrySave`)
- Modify: `src/__tests__/ScannerScreen.test.tsx`
- Test: `src/__tests__/QuickEntryModal.test.tsx`

**Step 1 — write the failing test**

```tsx
it('passes name and brand through on save', async () => {
  const onSave = vi.fn();
  render(<QuickEntryModal barcode="B1" onSave={onSave} onCancel={vi.fn()} />);
  await userEvent.type(screen.getByLabelText(/product name/i), 'Bear Brand');
  await userEvent.type(screen.getByLabelText(/brand/i), 'Bear Brand');
  await userEvent.type(screen.getByLabelText(/price/i), '12.50');
  await userEvent.click(screen.getByRole('button', { name: /add to cart/i }));
  expect(onSave).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'Bear Brand', brand: 'Bear Brand', price: 12.5 }),
  );
});
```

**Step 2 — run it.** Expected: FAIL.

**Step 3 — implement** — change `onSave` to take one object
`{ name, brand, price, expiryDate }`; add the two inputs above Price (name required, brand optional);
update `handleQuickEntrySave` and `CartReviewScreen`'s `Unknown (barcode)` fallback so a named item
saves under its real name.

**Step 4 — run it.** Expected: PASS.
**Step 5 — commit:** `feat: capture name and brand for unknown products`

---

## Task M — Final verification and ship

**Step 1 — full gates**
```bash
C:/nvm4w/nodejs/node.exe node_modules/typescript/bin/tsc --noEmit          # expect clean
C:/nvm4w/nodejs/node.exe node_modules/vitest/vitest.mjs run                # expect all green
C:/nvm4w/nodejs/node.exe node_modules/vite/bin/vite.js build               # expect success
```

**Step 2 — end-to-end on the built app.** Serve `dist/`, then drive it with Playwright:
1. Log in, enable Cashier Mode in Settings
2. Confirm the nav shows **Sales** and the Scan tab is the **till**
3. Set stock for a known barcode (e.g. 50)
4. Scan it twice → basket shows qty 2 → **Paid**
5. Sales → today shows the correct total and item count
6. Inventory → stock is 48
7. Reload the page → **must not 404**, and today's sale must still be there (persistence)

**Step 3 — deploy** to `gh-pages` with a clean build directory (never `cp -r dist <existing-dir>`),
then re-run the Step 2 checks against the live URL.

**Step 4 — commit:** `chore: verify cashier mode end-to-end`

---

## Status log

| Task | Description | Status |
|---|---|---|
| A | DB v2 + sales store | ⬜ |
| B | `toDayKey` helper | ⬜ |
| C | FIFO deduction + shortfall | ⬜ |
| D | `recordSale` | ⬜ |
| E | `undoLastSale` | ⬜ |
| F | Reporting queries | ⬜ |
| G | Remove `sellerMode` + fix persistence | ⬜ |
| H | `TillScreen` | ⬜ |
| I | Undo toast | ⬜ |
| J | `SalesScreen` + nav | ⬜ |
| K | Set stock | ⬜ |
| L | QuickEntry name/brand | ⬜ |
| M | Verify + ship | ⬜ |

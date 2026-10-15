# Cashier Mode (Till) — Design

**Date:** 2026-10-15
**Status:** Approved — ready for implementation planning
**Approach:** **B** — a dedicated `TillScreen` at its own route, selected as the Scan tab's element by `cashierMode`

---

## Goal

Turn Cashier Mode into a working till: scan a customer's items, take payment, store the sale
locally, subtract the sold quantities from stock, and report the day's takings.

---

## Decisions (confirmed by the user)

| # | Question | Decision |
|---|---|---|
| 1 | The two Scanner toggles | **One "Cashier Mode" switch.** `sellerMode` is deleted end-to-end; product editing lives in Inventory mode |
| 2 | End-of-day reset | **Auto-scope to today.** Past days remain viewable as history |
| 3 | Where receiving lives | **Stays on the Scan tab, only when Cashier Mode is OFF** |
| 4 | What "Paid" does | **Records the sale and the total only** — no cash tendered, no change, no payment method |
| 5 | Report placement | **4th nav item "Sales"**, visible only when Cashier Mode is on |
| 6 | Undo after Paid | **Yes** — an Undo action in the success toast, ~6 seconds |

---

## Bug fix folded into this work

**Name/brand edits are silently discarded.** `ProductDetailScreen.tsx:208-236` gates name and
brand persistence behind `sellerMode`:

```js
const needsUpdate = sellerMode
  ? (name || brand || price || expiry changed)
  : (product.storePrice !== price);            // default mode: price ONLY

await updateProduct(sellerMode
  ? { ...product, name, brand, storePrice, defaultExpiry, updatedAt }
  : { ...product, storePrice: price, updatedAt });   // name/brand dropped
```

With Seller Mode off, `ProductForm` still renders editable Name and Brand fields
(`ProductForm.tsx:93-117`) and the toast still says "Added!" — but only the price is written.
If *only* the name changed, `needsUpdate` is `false` and nothing is saved at all.

A second path, `handleEditSave` via `ProductManagementSheet` (`ProductDetailScreen.tsx:282`),
*does* persist everything — so the app has two edit paths with different behaviour.

**Fix:** deleting `sellerMode` removes the gate by construction. Both edit paths must converge on
one behaviour: always persist name, brand, price and expiry.

**Related:** `QuickEntryModal` only collects price and expiry, so an item the API doesn't know is
saved as `Unknown (4800…)` (`CartReviewScreen.tsx:44`). It must collect name and brand too, or
"persist when scanning" cannot hold for unknown products.

---

## Architecture

`cashierMode` selects which component the Scan tab renders. `ScannerScreen` (the receiving flow)
is **not modified** beyond removing `sellerMode`, so its existing test suite stays green.

```
cashierMode OFF  →  Scan tab = ScannerScreen   (today's behaviour, unchanged)
cashierMode ON   →  Scan tab = TillScreen      (new)
                →  Nav gains a 4th item: Sales → SalesScreen (new)
```

`TillScreen` reuses the existing cart (`ScanCartContext`) — the same cart `CartReviewScreen` uses
for receiving. The two screens are simply different **exits** from one cart:

| Screen | Exit action | Effect on stock |
|---|---|---|
| `CartReviewScreen` | "Add All to Inventory" | **increases** (receiving) |
| `TillScreen` | "Paid" | **decreases** (sale) |

---

## Data model

New IndexedDB object store. `db/database.ts` goes from `DB_VERSION = 1` to `2` with an **additive**
upgrade so existing installs keep their data.

```ts
interface SaleDeduction {        // what this line took from stock — enough to reverse it
  batchId: string;
  quantity: number;
  expiryDate: string;            // snapshot, so a deleted batch can be recreated on undo
  scannedAt: string;             // snapshot
}

interface SaleLine {
  barcode: string;
  name: string;                  // snapshot at time of sale
  brand: string;                 // snapshot
  unitPrice: number;             // snapshot — later price edits must not rewrite history
  quantity: number;
  lineTotal: number;
  deductions: SaleDeduction[];
  shortfall: number;             // units sold with no stock to deduct
}

interface Sale {
  saleId: string;
  soldAt: string;                // ISO timestamp
  dayKey: string;                // local 'YYYY-MM-DD' — the report index
  lines: SaleLine[];
  total: number;
  itemCount: number;
}
```

Store: `sales`, keyPath `saleId`, index `by-day` on `dayKey`.

**Why `dayKey` is stored rather than derived:** the report is a range query on an index instead of
a full-table scan, and it uses **local** date parts — an 11pm Manila sale must count as today, not
tomorrow-as-UTC.

**Why prices are snapshotted:** a report you'll trust cannot change retroactively when a price is
edited next week.

**Why deductions are recorded:** Undo has to put stock back exactly where it came from. A batch that
was deleted at zero is recreated from the snapshot.

---

## Screens

### `TillScreen` (new) — route `/till`
- Header: "Till" + cart item count
- Camera viewfinder — reuse `CameraViewfinder` and the existing auto/manual scan-mode toggle
- **Customer basket replacing RecentScans**: one row per line (name, qty × unit price, line total),
  quantity +/− and remove
- Sticky footer: large total + **Paid** button
- Empty state: "No items yet — scan a product"
- On Paid: record sale → deduct stock → clear cart → toast `Sale recorded ₱X` with **Undo**

### `SalesScreen` (new) — route `/sales`
- Today: total ₱, number of sales, items sold, top sellers by quantity
- History: list of past `dayKey`s; selecting one shows that day's summary and sales
- Flagged section: lines with a `shortfall` ("sold without stock")

### `InventoryScreen` (existing) — gains stock editing
- **"Set stock"**: type a target quantity; the app adjusts FIFO to match
  (12 → 20 adds 8; 12 → 5 removes 7 oldest-expiry-first)
- Price editing already exists via `ProductDetailScreen` / `ProductManagementSheet`

### `SettingsScreen` (existing) — one toggle
- Delete the Seller Mode toggle; keep "Cashier Mode" with a clearer description

### `BottomNav` (existing)
- Add a "Sales" item, rendered **only** when `cashierMode` is on
- `/sales` must be guarded: if `cashierMode` is off, redirect to `/`

---

## Data flow

**A sale**
1. Scan → `lookupProduct(barcode)` (local catalog first, then Open Food Facts)
2. Known → `addItem` to cart. Unknown → `QuickEntryModal` (now name + brand + price) → cart
3. Cashier taps **Paid**
4. `recordSale(cart, now)`:
   - snapshot lines (name, brand, unitPrice at this moment)
   - for each line, deduct FIFO via `sortBatchesByFIFO` (`inventoryService.ts:37`)
   - record deductions; delete batches that reach 0
   - compute `shortfall` where stock was insufficient
   - write the `Sale`
5. Clear cart → toast with the total + Undo

**Undo (within ~6s)**
- `undoLastSale(saleId)`: re-add each deduction to its batch (recreating deleted batches from the
  snapshot), delete the `Sale`, restore the cart lines
- If the cart has since changed, restore by adding lines back rather than overwriting

**The report**
- `getSalesForDay(dayKey)` → range query on `by-day`
- `summarizeDay(sales)` → total, sale count, item count, top sellers, shortfalls
- `getDayKeys()` → distinct days, newest first

**Stock decrement rule** — FIFO by expiry, then by `scannedAt`. Never blocks a sale: selling an
item with no stock records a `shortfall` instead. A paying customer is never refused because the
count is wrong.

---

## Error handling

| Failure | Behaviour |
|---|---|
| Sale write fails (IndexedDB error/quota) | Keep the cart, show an error, let the cashier retry. **Never lose a sale silently.** |
| Stock deduction fails | The sale is still written (the money is the truth); log it and flag it in the report |
| Undo fails | Keep the sale, tell the user — do not leave stock half-restored |
| Empty basket + Paid | Button disabled |
| Unknown barcode | `QuickEntryModal` |
| DB upgrade fails | Existing `getDB()` rejection path surfaces; no data loss (additive upgrade) |

---

## Testing strategy

TDD throughout — failing test first, watch it fail, then implement.

- `saleService`: record, day range query, `dayKey` local-date correctness, FIFO deduction across
  multiple batches, batch deletion at zero, shortfall when stock is insufficient, undo restores
  stock exactly (including recreating a deleted batch)
- `TillScreen`: renders basket lines, Paid records and clears, Paid disabled when empty, undo
  restores
- `SalesScreen`: today's totals, history day selection, shortfall flag shown
- `ProductDetailScreen`: **regression** — edit name with Seller Mode absent, assert it persists
- `ProductForm` / `SettingsScreen`: `sellerMode` prop and toggle are gone
- `setStock`: adjust-to-target adds and removes correctly, FIFO order respected
- `BottomNav`: Sales item present only in cashier mode

---

## Out of scope

Cash tendered and change · payment method (cash/GCash/Maya) · receipt printing or sharing ·
refunds · multi-cashier or accounts · barcode-less PLU items · weight-based goods · desktop layout
(phone only)

---

## Open risks

1. **`ScannerScreen` is 509 lines of tangled state.** The till deliberately does not inherit that —
   but `TillScreen` must not grow into a copy of it. Keep scan handling in the service layer.
2. **Undo window vs. the next customer.** If a new scan arrives during the undo window, Undo must
   not clobber the new basket. Restore by appending, never by replacing.
3. **`sellerMode` removal touches 7 files** — `types`, `SettingsScreen`, `ProductForm`,
   `ProductDetailScreen`, `ModeIndicatorChip`, and 3 test files. Do it as one atomic task.

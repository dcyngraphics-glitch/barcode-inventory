# Cashier Mode — Implementation Status

Plan: `docs/plans/2026-10-15-cashier-mode.md`
Design: `docs/plans/2026-10-15-cashier-mode-design.md`
Project: `C:/Users/bryan/Documents/Hermes/Projects/barcode-inventory`
Branch: `master` (source) · deploy target: `gh-pages` — **GitHub Pages ONLY. Never deploy to Vercel.**

Loop rule: keep dispatching until every task reads PASS.

| Task | Description | Implement | Spec review | Quality review | Status |
|---|---|---|---|---|---|
| A | DB v2 + `sales` store | ✅ `675b8e5` | ✅ PASS | ✅ APPROVE | DONE |
| B | `toDayKey` local-day helper | ✅ `e29ed38` | ✅ PASS | ✅ APPROVE | DONE |
| C | FIFO deduction + shortfall | ✅ `e3f1e42` | ✅ PASS | ⚠️ fixed in `db224e8` | DONE |
| D | `recordSale` | ✅ `d914317` | ✅ PASS | ✅ APPROVE | DONE |
| E | `undoLastSale` | ✅ `d914317` | ✅ PASS | ✅ APPROVE | DONE |
| F | Reporting queries | ✅ `d914317` | ✅ PASS | ✅ APPROVE | DONE |
| G | Remove `sellerMode` + fix name/brand persistence | ✅ `695c708` | ✅ PASS | ⚠️ fixed in `db224e8` | DONE |
| H | `TillScreen` | ✅ `c573334` | ✅ PASS | ⚠️ overcharge re-fixed (see below) | DONE |
| I | Undo toast | ✅ `c573334` | ✅ PASS | ✅ APPROVE | DONE |
| J | `SalesScreen` + Sales nav item | ✅ uncommitted | ✅ | ✅ | DONE |
| K | Set stock | ✅ uncommitted | ✅ | ✅ | DONE |
| L | `QuickEntryModal` name/brand | ✅ uncommitted | ✅ | ✅ | DONE |
| M | Verify + ship to GitHub Pages | verify ✅ DONE · deploy ⏸ held for go signal | — | — | AWAITING GO |

## Commit log

| Task | SHA | Message |
|---|---|---|
| A | `675b8e5` | feat: add sales store (db v2, additive upgrade) |
| B | `e29ed38` | feat: local-day key helper |
| B+ | `0d40d65` | test: strengthen toDayKey guard — catch a UTC implementation in any timezone (parent) |
| C | `e3f1e42` | feat: FIFO stock deduction with shortfall reporting |
| G | `695c708` | fix: persist name/brand on edit; remove sellerMode (single cashier switch) |
| C+G | `db224e8` | fix: atomic stock deduction; guard the real persistence path; drop dead test props (parent, after review) |
| D-F | `d914317` | feat: recordSale, undoLastSale and daily sales reporting (parent — hybrid mode) |
| H-I | `c573334` | feat: TillScreen — customer basket, Paid, and undo (parent — hybrid mode) |

## Review outcomes — wave 2 (C, G)

**Spec review: PASS.** No spec gaps beyond one cosmetic toast-wording deviation (left as-is deliberately).

**Quality review: NOT APPROVED** — 2 Important, 3 Minor. Resolved as follows:

| Finding | Sev | Resolution |
|---|---|---|
| `deductStockFIFO` loop had no transaction — mid-loop failure left stock partially deducted, no sale recorded | Important | ✅ Fixed in `db224e8`: single `readwrite` transaction + `await tx.done` |
| `ProductDetailPersistence.test.tsx` called `catalogService.updateProduct` with all fields pre-set, so it passed against the very bug it was named after | Important | ✅ Fixed: extracted `buildProductUpdate()`, test rewritten to guard that function. Mutation-verified — breaking the name comparison fails 2 tests |
| No guard on non-finite quantity (`put({quantity: NaN})`) | Minor | ✅ Fixed: `Number.isFinite` guard + test |
| Dead `mode=` props in `ModeIndicatorChip.test.tsx` (component takes no props) | Minor | ✅ Fixed |
| Stale `sellerMode` key lingers in existing users' persisted settings | Minor | ⏸ Deferred — harmless, nothing reads it, `validateSettings` ignores unknown keys |

**NOTE:** the quality issues were fixed by the parent and self-verified (tsc clean, 217/217, mutation test). An independent re-review was NOT re-run — flagged rather than silently claimed as approved.

**Subagent failure:** the dispatched fix agent ran 36m43s, oscillating on an untestable mid-transaction failure-injection test, then died in a repetition loop (status=failed, 29 api calls). Its atomicity *code* change was sound and was kept; its broken test was deleted. Remaining work was completed by the parent.

## Parent verification log

| Wave | tsc | full suite | contrast probe | Notes |
|---|---|---|---|---|
| 1 (A,B) | clean | **203/203 passed** (37 files) | 0 light / 0 dark | Subagent self-reports were wrong in BOTH directions: B reported `commit_sha: "unknown"` and claimed the export was `getDayKey`, but the commit exists and the file correctly exports `toDayKey`. Also claimed 3 tests, committed 2. Artifacts verified directly. |
| 2 (C,G) | clean | **208/208 passed** (39 files) | 0 light / 0 dark | `grep -rn sellerMode src/` → NONE. Verified `ProductDetailScreen.tsx:205-228` persists name/brand/price/expiry unconditionally — the gate is gone. Parent mutation-tested `toDayKey` (buggy UTC impl fails 3/4 tests). |
| 3 (D,E,F) | clean | **228/228 passed** (39 files) | 0 light / 0 dark | Written by the parent (hybrid mode), tests-first. TDD caught two real defects: `getDayKeys` returned primary keys not index keys (fixed with an index key cursor), and one of my own test expectations was wrong (asserted no shortfall without stocking the item). |
| 4 (H,I) | clean | **237/237 passed** (40 files) | 0 light / 0 dark | Parent-written. TDD caught a real bug: the toast's Undo closure captured `handleUndo` from a render where `recorded` was still null, so Undo silently did nothing — fixed by passing the sale as an argument. Also removed the now-dead `recorded` state + undo timer. AppAuthGate's SettingsContext mock returned `{settings: null}`, which the real context type forbids; mock corrected and 2 route-switch tests added. |
| 5 (J,K,L + review) | clean | **262/262 passed** (44 files) | 0 light / 0 dark | Parent-written. Review pass found 4 real defects (below). Every fix mutation-verified or browser-verified. |

## Review pass before commit (tasks J-M) — defects found and fixed

Four genuine defects were found by driving the **built app** in a browser (Playwright,
390×844, fake camera + fake `BarcodeDetector`), not by reading code.

### 1. Existing products opened with a blank form (blocked stock entry) — HIGH

`ProductDetailScreen` held the form values in state and remounted `ProductForm` via
`key={product?.barcode || 'new'}`. The remount fires in the same commit as the lookup
resolving — *before* the `useEffect` that refreshed that state — so the form remounted
with the previous, empty values and never re-seeded. Opening any product from the
catalog showed an empty name/brand/price, and "Update Inventory" failed validation with
*"Product name is required"* / *"Price must be greater than 0"*, making it impossible to
stock an existing product without retyping it.

**Fix:** derive the values instead of storing them (`initialData={getInitialFormData()}`),
so the keyed remount receives current values in that same render. State + sync effect deleted.
**Verified:** new `ProductDetailPrefill.test.tsx` reproduces the async-lookup race;
mutation-checked (restoring the old code fails both tests with
`expected '' to be 'Bear Brand Sterilized Milk'`), and confirmed in the browser.

### 2. One barcode charged up to 9 times — HIGH (money)

The `REPEAT_WINDOW_MS = 2500` guard against the viewfinder's continuous re-reads was a
fixed window, but the real gap between reads is `SCAN_COOLDOWN (2000ms) + detect time`.
Measured in-browser with an instant detector the gap was ~2000–2075ms (just inside the
window), so the bug hid. With a realistic 600ms detector the gap became **~2610ms**, every
read was accepted, and holding one barcode in frame for 20s produced a basket of **9** —
nine times the price for one item.

**Fix:** presence, not timing. `CameraViewfinder` gained an optional `onNoDetection`
callback (fired when an attempt finds nothing); the Till re-arms a code only after the
frame has actually been empty for `ABSENCE_MS = 700` (comfortably above the 500ms attempt
interval, so a dropped frame is a blip, not a new item). This also fixes the inverse
undercount: a cashier re-presenting the same item quickly is now counted.
**Verified:** same 20s hold now yields **1**. Unit tests cover the far-apart-but-never-left
case, the genuine re-scan, and the dropped-frame blip; mutation-checked (the old window
logic adds the item twice).

### 3. `/sales` bounced to the scanner on every reload — MEDIUM

`SettingsContext` exposed no loading state, and settings load asynchronously. On a cold
load `cashierMode` is briefly the default `false`, so `SalesScreen`'s guard fired
`<Navigate to="/" replace />` before the stored value arrived. Reloading or deep-linking
`/sales` always landed on the scanner; the `/` route also flashed the scanner (and its
camera prompt) before swapping to the till.

**Fix:** expose `hasLoaded`; `SalesScreen` and the `/` route wait for it.
**Verified:** `/sales` now stays on `/sales` through a reload, in-browser.

### 4. Duplicate "Skip" in the tutorial — LOW

`TutorialOverlay` rendered two Skip buttons in the same step (one beside the CTA, one
below it). Removed the lower duplicate.
**Verified:** tutorial now renders 1.

### Also added

- `vite.config.ts`: a `closeBundle` step copies `dist/index.html` → `dist/404.html`.
  GitHub Pages has no SPA fallback, so reloading on `/sales` or `/inventory` would 404
  without it. (Root-path reload was fixed earlier; this covers every other route.)
- `QuickEntryModal` now takes a required product name (and optional brand), so scanning an
  unknown item no longer saves it as `Unknown (barcode)`.
- `SetStockSheet` + `stockService.setStock()` — type the counted total; the app works out
  whether that means adding a batch or removing oldest-expiry-first.

### Browser E2E — 13/13, 0 console errors

Login → stock a catalog product → correct the count to 6 → enable Cashier Mode → hold a
barcode in frame 15s (**charged once**) → Paid → stock 6→5 → report shows `1 sale · 1 item`
with no false shortfall → `/sales` deep link + reload survive → Undo restores stock to 5
and leaves exactly one sale.

**Not a defect, but worth knowing:** Undo deliberately restores the basket (it keeps the
original lines so the cashier can re-take payment). An earlier E2E misread the resulting
2-item sale as overcharging.

**Design note (unresolved, not a bug):** on a fresh install the Inventory list is empty —
it is built from batches, and the 559 seeded products populate only the catalog. Stock
enters by scanning into Product Detail ("Update Inventory"), which the empty state prompts
for. So `Set stock` is only reachable once a product has been received at least once.
Worth revisiting if stock should be settable for a catalog product that has never been
scanned.

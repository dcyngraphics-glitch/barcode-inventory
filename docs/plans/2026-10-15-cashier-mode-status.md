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
| H | `TillScreen` | ✅ `c573334` | ⏳ | ⏳ | REVIEW |
| I | Undo toast | ✅ `c573334` | ⏳ | ⏳ | REVIEW |
| J | `SalesScreen` + Sales nav item | ⬜ | ⬜ | ⬜ | PENDING |
| K | Set stock | ⬜ | ⬜ | ⬜ | PENDING |
| L | `QuickEntryModal` name/brand | ⬜ | ⬜ | ⬜ | PENDING |
| M | Verify + ship to GitHub Pages | ⬜ | ⬜ | ⬜ | PENDING |

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

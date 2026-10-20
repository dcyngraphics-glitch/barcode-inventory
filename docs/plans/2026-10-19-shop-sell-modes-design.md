# Shop / Sell Modes — UI/UX Design

**Date:** 2026-10-19
**Status:** Approved (design phase complete — ready for implementation planning)
**Approach:** A — "Modes first", with the trust-and-safety quick wins folded in
**Supersedes:** the UI/UX sections of `2026-10-19-brainstorm-next-phase.md`

---

## Context

The app is a client-side PWA (React 18 + Vite + TypeScript) with two operational
modes, deployed to GitHub Pages. A full codebase analysis plus a live check of the
deployment established that the foundation is sound:

| Check | Result |
|---|---|
| Live deploy loads | `🐴 Barcode Inventory` renders |
| Deep-link refresh (`/inventory`) | serves the SPA, no 404 — basename handling holds |
| Service worker + manifest | registered |
| Mobile 390×844 | 52px buttons (≥44px min), no horizontal scroll |
| Console errors on load | zero |
| Type check / tests / build | 0 errors · 327 tests · clean build |

Because the foundation is sound, the improvements below are additive — none of them
are repairs to a broken base.

### Method and its limits

Findings are grounded in the source with `file:line` evidence, plus the rendered
login screen at 390×844. **The authenticated screens (Scanner, Inventory, Till,
Sales) were not visually inspected** — they sit behind Dexie Cloud email-OTP, which
this workflow never enters. All findings here are structural and therefore hold
without that view. Judgements about spacing, visual hierarchy and colour harmony on
those screens are explicitly **not** made in this document.

---

## Corrections to existing documentation

Two claims in `2026-10-19-brainstorm-next-phase.md` are wrong and would misdirect
implementation if left standing:

| Claim | Reality |
|---|---|
| "Swipe-to-delete on batch rows (already spec'd in UI-UX-SPEC, not implemented)" (line 43) | **Implemented.** `BatchRow.tsx:18,38,46,87` — `swipeX` state, `SWIPE_THRESHOLD`, reveal behaviour |
| "Missing `focus-visible` on custom buttons — High" (line 135) | **Largely covered.** Global rule at `index.css:302-306` (2px accent outline, 2px offset) plus 17 component-specific `:focus-visible` rules |

`AUDIT_FLOW_NAVIGATION.md` is **stale**: it audits a "Seller Mode" that does not
exist anywhere in the codebase, and recommends adding mode indicator chips for it.
It must be corrected or deleted so it cannot mislead a later session.

---

## The core finding

**The mode system is invisible, and it is the product's differentiator.**

`cashierMode` is a single boolean that rewrites the application:

| It controls | Evidence |
|---|---|
| Root route (Till vs Scanner) | `App.tsx:152` |
| Bottom-nav items (3 tabs vs 4) | `App.tsx:261` |
| Scanner behaviour (cart vs product detail) | `ScannerScreen.tsx:109,173` |
| Whether Sales is reachable at all | `SalesScreen.tsx:99` |

Yet its only control surface is a toggle buried in Settings
(`SettingsScreen.tsx:201-202`), and there is **no on-screen indicator anywhere** —
`ModeIndicatorChip.tsx` was deleted as dead code in commit `9465aa5`. The scanner
already reads `cashierMode` (`ScannerScreen.tsx:109`) and displays nothing about it.

Two costs follow:

1. **Three taps to switch** — Scanner → Settings → toggle → back.
2. **No way to tell which mode you are in** while using the app.

Supporting findings, same class of defect (destructive or unannounced state change):

- **Undo is inverted.** A completed sale is undoable for 6 seconds (`TillScreen` →
  `undoLastSale`), while deleting a product *and all of its batches* is permanent —
  `ProductManagementSheet.tsx:409` ("This cannot be undone") and
  `InventoryScreen.tsx:269`. The most destructive actions have the least protection.
- **Three of five screens have no loading feedback.** ScannerScreen, TillScreen and
  SalesScreen have zero skeletons and zero spinners; InventoryScreen has 5 skeleton
  references. `App.tsx:152` renders `null` while settings load, producing a blank
  flash on every launch.
- **No pagination or virtualization.** `InventoryScreen` and `SalesScreen` render
  every row; `getDayKeys` loads all sales into memory. Acceptable at 20 items,
  degrades at 100+.

---

## Section 1 — Mode model and persistence

**Two modes. No third.** The stale audit's "Seller Mode" stays dead (YAGNI).

User-facing names deliberately avoid the word "mode", because that word already
means Auto/Manual scan on the scanner screen (`ModeSegmentedControl`, rendered at
`ScannerScreen.tsx:308`):

| User-facing | Internal | Behaviour |
|---|---|---|
| **Shop** | `'shop'` | scan → product detail → inventory |
| **Sell** | `'sell'` | scan → cart → Paid (Till) |

### Where the mode lives — device-local

Today the mode is `settings.cashierMode`, a Dexie row with a private singleton key,
which means **Dexie Cloud syncs it across every device on the account**. That is a
latent bug for the dual-device personas: switching the store tablet to Sell also
switches the owner's phone to Sell. Mode describes a *device's role*, not an
*account*.

**Decision: the mode is device-local**, stored in `localStorage`, with a one-time
seed from the existing synced `cashierMode` setting.

- A till stays a till; a phone stays a phone.
- No additional sync traffic; `settings` keeps its current shape for everything else.
- Cost: the mode no longer follows the account across devices — which is the intent.
- The synced `cashierMode` field is retained (not deleted) so the seed is available
  and older clients keep working. It stops being read for routing.

### `ModeContext`

A new context exposing:

- `mode: 'shop' | 'sell'`
- `isSell: boolean`
- `setMode(mode)` — one tap, persisted
- `hasLoaded: boolean` — consumers must not render a mode-dependent route before this
  is true, or the root screen will flash the wrong screen

Seeding order: `localStorage` value → else synced `settings.cashierMode` → else
`'shop'`. The seed writes back to `localStorage` so it happens exactly once.

---

## Section 2 — The switcher

### Constraint discovered

`ScannerScreen.tsx:308` already renders `ModeSegmentedControl` — a `role="switch"`
labelled "Scan mode: Auto/Manual". A second segmented control on the same screen
would collide both visually and semantically, and the component name is already
taken.

### `AppModeSwitcher`

- **New component**, distinct name, no collision with `ModeSegmentedControl`.
- Lives in the app header (`.app-bar`), persistent across the main screens.
- Two segments: **Shop** | **Sell**; the active one is filled with `--color-accent`.
- `role="radiogroup"` with `aria-checked` on each segment, arrow-key navigation,
  ≥44px touch targets, `:focus-visible` ring.
- **Deliberately differentiated from Auto/Manual** on three axes so the two controls
  cannot be confused:
  - position — header (top) vs camera area
  - shape — segmented pill vs toggle switch
  - vocabulary — nouns (Shop/Sell) vs adjectives (Auto/Manual)
- **Header budget:** title + switcher + offline indicator + cart badge. On narrow
  widths the title shortens (`Scan Product` → `Scan`) rather than wrapping.

---

## Section 3 — Mode-aware surfaces

| Surface | Shop | Sell |
|---|---|---|
| Root `/` | ScannerScreen | TillScreen |
| Bottom nav | Scan, Inventory, Settings | Scan, **Sales**, Inventory, Settings |
| Scan result | → `/product/:barcode` | → cart |
| Header title | "Scan Product" | "Till" |
| Empty state | "Scan your first product" | "Basket empty — scan to start a sale" |

### Changes

1. `App.tsx:152` and `App.tsx:261` read from `ModeContext` instead of
   `settings.cashierMode`.
2. **`SalesScreen.tsx:99` must stop silently redirecting.** Hitting `/sales` in Shop
   mode currently bounces the user with no explanation. Replace with a prompt —
   *"Sales is part of Sell — switch?"* — and a one-tap switch. The switcher turns a
   dead end into a natural affordance.
3. Mode-aware empty states and copy.
4. **The mode switch must be legible.** The root screen swaps entirely, which is
   jarring with no feedback. Add a brief transition and a toast on switch
   ("Sell — sales will be recorded").
5. **Guard the basket.** `ScanCartContext` is in-memory. Switching Sell → Shop with
   items in the basket destroys them silently. Warn and offer to keep the basket or
   clear it. This is the same defect class as the inverted-undo finding: destructive
   and unannounced.

---

## Section 4 — Folded-in trust-and-safety quick wins

1. **Undo for destructive actions.** The codebase already has a proven, tested
   pattern: `undoLastSale` restores deleted batches from `SaleDeduction` snapshots
   (`src/services/saleService.ts`). **Reuse that pattern** rather than inventing a
   second one — soft-delete plus a snapshot, surfaced through the Toast action button
   already built for the Till screen.
   - Applies to batch delete (`InventoryScreen.tsx:269`) and product delete
     (`ProductManagementSheet.tsx:409`).
   - Settings → Delete Everything keeps its hard confirm; no undo (scope too large).
2. **Loading states** for ScannerScreen, TillScreen and SalesScreen — reuse the
   skeleton classes InventoryScreen already has (5 references). Do not invent new
   ones.
3. **Kill the launch flash** — `App.tsx:152` returns `null` while settings load.
   Render the existing `.loading-screen` class instead.
4. **Retire the stale docs** — correct or delete `AUDIT_FLOW_NAVIGATION.md`, and fix
   the two incorrect claims in `2026-10-19-brainstorm-next-phase.md`.

---

## Section 5 — Testing strategy

TDD for every task. Reuse existing infrastructure: 53 test files / 327 tests,
`fake-indexeddb` (via `tests/setup.ts`), `ariaProbe.test.tsx`, `wcagContrast.ts`,
`dark-mode.test.tsx`. Wrap components using router hooks in `MemoryRouter`. Clear
`localStorage` in `beforeEach` for every mode-persistence test.

| # | Test | Asserts |
|---|---|---|
| 1 | `ModeContext.test.tsx` | default Shop; persists to `localStorage`; seeds from synced `cashierMode`; safe fallback when both are absent |
| 2 | `AppModeSwitcher.test.tsx` | both segments render; `aria-checked` tracks mode; click switches; arrow keys navigate; ≥44px; focus-visible present |
| 3 | `App.routing.test.tsx` | `/` renders Scanner in Shop and Till in Sell; nav renders 3 vs 4 tabs |
| 4 | `SalesScreen.guard.test.tsx` | Shop + `/sales` shows the switch prompt, **not** a silent redirect |
| 5 | mode-switch safety | leaving Sell with a non-empty basket warns |
| 6 | `undoDelete.test.ts` | delete then undo restores exact state (mirrors the `saleService` undo tests) |
| 7 | loading states | each of the three screens renders a skeleton before data resolves |
| 8 | contrast | the switcher passes WCAG in light **and** dark (reuse `wcagContrast.ts`) |
| 9 | migration | a synced `cashierMode: true` yields Sell on first load |

**Gates per task:** `tsc --noEmit` (must stay at 0), full `vitest run`, `vite build`.
CI now runs type-check + test + build on every push to `master`, so these are
enforced by the pipeline rather than by discipline.

---

## Out of scope (deliberately)

Deferred to a later tier, per the "both personas equally" priority:

- List virtualization and bulk-select/bulk-delete (power-user scale, Approach C)
- Third mode / "Seller Mode"
- Bundle splitting (1MB JS) — real, but a performance concern rather than UI/UX
- E2E suite, error tracking, Settings reorganisation
- Visual/aesthetic restyling of the authenticated screens (needs screenshots first)

---

## Risks

| Risk | Mitigation |
|---|---|
| `App.tsx` is shared and routing-tested — high blast radius | Change it in one wave, run the full suite; routing tests (#3) cover both modes |
| Device-local mode could surprise a user who expects it to follow them | The switcher is always visible, so the current mode is never ambiguous; toast on switch |
| Snapshot-based undo for products is more data than a sale's deduction | Snapshot only the deleted rows, mirroring `SaleDeduction`; discard on toast expiry |
| Seeding reads a Dexie row that may not exist yet on first run | Order is localStorage → Dexie → default, and the Dexie read is wrapped so failure falls through to `'shop'` |

---

## Sizing and dispatch plan

| Work | Estimate | File set |
|---|---|---|
| Section 4 (quick wins) | ~2–3 days | `InventoryScreen`, `ProductManagementSheet`, `Toast`, `App.tsx`, `ScannerScreen`, `TillScreen`, `SalesScreen`, docs |
| Sections 1–3 (modes) | ~5–7 days | new `ModeContext`, new `AppModeSwitcher`, `App.tsx`, `ScannerScreen`, `TillScreen`, `SalesScreen`, `index.css` |

Nine TDD tasks. Section 4's file set is disjoint from Sections 1–3's **except for
`App.tsx`, `SalesScreen` and `index.css`**, which are shared — so the two groups
cannot run fully in parallel. Waves:

- **Wave 1** — Section 1 foundation (`ModeContext` + tests) and the Section 4
  quick wins that do not touch `App.tsx` (undo, loading states) — disjoint.
- **Wave 2** — Section 2 switcher + Section 3 surfaces (both need `App.tsx`).
- **Wave 3** — doc corrections and final combined verification.

Shared files (`App.tsx`, `SalesScreen.tsx`, `index.css`) are main-session territory
rather than subagent territory, per the standing dispatch rules.

---

## Handoff

Design approved 2026-10-19. Next phase: **writing-plans** — break the nine tasks
into 2–5 minute TDD steps (write failing test → watch it fail → implement → watch it
pass → commit) and save to `docs/plans/2026-10-19-shop-sell-modes.md`.

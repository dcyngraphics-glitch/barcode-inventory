# Brainstorming: Barcode Inventory — Next Phase Improvements

**Date:** 2026-10-19
**Context:** Post token-migration (329 tests, 56 baseline type errors, PWA deployed)
**Goals:** Polish/refine + Production launch prep
**Personas:** Small business (cashier mode) + Power users (100+ items)
**Scope:** Quick wins (1-2 week sprints)

---

## Current State Summary

| Area | Status |
|------|--------|
| **Core features** | Scanner, Product Detail, Inventory, Settings, Cart, Till, Sales |
| **Sync** | Dexie Cloud (working, occasional 422s) |
| **Tests** | 329 passing, no new type errors |
| **Design tokens** | Complete migration done |
| **PWA** | Deployed to GitHub Pages, installable |
| **Dark mode** | Verified via integration tests |
| **Bundle** | ~1MB (1008KB JS) |

---

## Quick Wins (1-2 weeks each)

### 1. Scanner Screen Polish ⭐ HIGH IMPACT
**Problem:** Camera init feels slow; no visual feedback during scan attempt; offline indicator subtle
**Fixes:**
- Add skeleton loader while camera initializes (already have `.loading-spinner` tokens)
- Scan frame flash green on success + haptic (already implemented in `playBeep()`)
- Make offline indicator more visible (top-right, not buried in app bar)
- Add "torch unavailable" fallback notice when device lacks flash
- Reduce camera startup time: pre-warm `getUserMedia` on app load (not on tab switch)

**Effort:** 3-4 days | **Files:** `ScannerScreen.tsx`, `CameraViewfinder.tsx`, `index.css`

---

### 2. Inventory Screen — Batch Actions ⭐ HIGH IMPACT (Power User)
**Problem:** Managing 100+ items requires repetitive tap → expand → delete/edit
**Fixes:**
- Swipe-to-delete on batch rows (already spec'd in UI-UX-SPEC, not implemented)
- Long-press context menu: Delete / Edit / Set Stock / Duplicate
- Bulk select mode (checkboxes) → bulk delete / bulk set stock / bulk extend expiry
- "Sort by" dropdown: Expiry (FIFO/LIFO), Quantity, Name, Brand, Date Added

**Effort:** 4-5 days | **Files:** `InventoryScreen.tsx`, `InventoryGroup.tsx`, `BatchRow.tsx`, new `BulkActionsBar.tsx`

---

### 3. Cashier Mode — Till Screen Polish ⭐ HIGH IMPACT (Small Business)
**Problem:** Till screen is basic; no transaction history during session; no refund flow
**Fixes:**
- Running transaction list (scrollable) with line-item remove
- Refund/void button per line (destructive, confirms)
- Session summary on close: total sales, items, cash/expected vs actual
- Keyboard shortcut: Enter = scan, Escape = clear, F2 = refund last
- Offline indicator: show "Cached X sales, will sync" when offline

**Effort:** 4-5 days | **Files:** `TillScreen.tsx`, `ScanCartContext.tsx`, new `TransactionList.tsx`

---

### 4. Bundle Size Optimization ⭐ MEDIUM (Production Launch)
**Problem:** 1MB JS bundle slow on 3G; impacts PWA install rate
**Fixes:**
- Code-split routes: `ScannerScreen`, `InventoryScreen`, `SettingsScreen`, `TillScreen`, `SalesScreen`, `ProductDetailScreen` → lazy load
- Tree-shake Lucide: import only used icons (currently imports full lib)
- Replace `@zxing/library` with lighter build (ESM, no polyfills) or dynamic import
- Analyze with `vite-bundle-analyzer` to find other heavy deps

**Effort:** 2-3 days | **Files:** `App.tsx`, `vite.config.ts`, all route imports

---

### 5. E2E Test Setup ⭐ MEDIUM (Production Launch)
**Problem:** No end-to-end tests; manual verification only
**Fixes:**
- Add Playwright with `@playwright/test`
- Critical paths: Login → Scan → Add to Inventory → Verify in Inventory → Settings toggle
- CI: Run on every PR against preview deployment
- Visual regression: Screenshot diff for key screens (3 viewports)

**Effort:** 3-4 days | **Files:** New `e2e/` dir, GitHub Actions workflow

---

### 6. Error Tracking & Monitoring ⭐ MEDIUM (Production Launch)
**Problem:** No visibility into production errors; sync failures silent
**Fixes:**
- Add Sentry (free tier) or self-hosted alternative
- Capture: JS errors, unhandled promise rejections, Dexie Cloud sync failures
- Custom events: Scan success/failure, Sync success/failure, Login flow drop-off
- Alert on: Sync failure rate > 5%, Crash rate > 1%

**Effort:** 2 days | **Files:** New `src/lib/monitoring.ts`, `App.tsx` init

---

### 7. Settings Reorganization ⭐ LOW-MEDIUM
**Problem:** Settings screen mixes user prefs, data ops, about info
**Fixes:**
- Group 1: **Experience** (Theme, Notifications, Alert Window)
- Group 2: **Data** (Export, Clear, Import — add CSV import)
- Group 3: **Account** (Sync status, Logout, Linked devices)
- Group 4: **About** (Version, GitHub, Licenses, Privacy)
- Add sync status indicator: "Last synced 2 min ago" / "Offline — 47 changes pending"

**Effort:** 3 days | **Files:** `SettingsScreen.tsx`, `SettingsContext.tsx`

---

## Medium Features (3-6 weeks) — For Later

| Feature | Persona | Value |
|---------|---------|-------|
| **Multi-location inventory** (fridge/pantry/freezer tabs) | Power user | Organize by storage |
| **Shopping list from expiring items** | Home + Power | Auto-generate reorders |
| **Categories/tags + filter by category** | Power user | Better organization |
| **CSV/Excel import/export** | Small biz + Power | Interop with spreadsheets |
| **Shared household (invite family)** | Shared household | Multi-device sync |
| **Price history charts** | Power user | Track price changes |
| **Recipe integration** | Home | Meal planning |

---

## Technical Debt (Ongoing)

| Item | Priority | Notes |
|------|----------|-------|
| Fix 56 baseline type errors | Low | Mostly Dexie Cloud addon types; doesn't affect runtime |
| Dexie Cloud 422 sync errors | Medium | Add retry with backoff; better user feedback |
| Large components (>300 lines) | Medium | Split `ScannerScreen`, `InventoryScreen`, `SettingsScreen` |
| Missing `focus-visible` on custom buttons | High | Accessibility regression risk |
| No performance budgets in CI | Medium | Add `vite-bundle-analyzer` threshold |

---

## Recommended Sprint Order

| Sprint | Focus | Deliverable |
|--------|-------|-------------|
| 1 | Scanner + Inventory batch actions | Faster scan UX, bulk ops |
| 2 | Till polish + Bundle splitting | Cashier-ready, <500KB initial JS |
| 3 | E2E tests + Error tracking | CI gate, production visibility |
| 4 | Settings reorg + Sync status | Better UX, sync transparency |

---

## Questions for Clarification

1. **Cashier mode:** Is the till screen used daily in production, or still experimental?
2. **Sync reliability:** How often do users report "data not syncing"? (Seen 422 errors in logs)
3. **Bundle size:** Is 3G performance a real complaint, or preemptive?
4. **Team:** Solo dev or multiple? Affects E2E maintenance burden.
5. **App store:** Planning to ship to Play Store / App Store via PWA wrapper (Capacitor/TWA)?

---

## Next Steps

If direction looks good, I'll:
1. Write detailed implementation plan (`docs/plans/YYYY-MM-DD-<topic>.md`)
2. Break into TDD tasks with tests
3. Execute via subagent-driven or hybrid mode per superpowers workflow

**Which sprint should we start with?** (1=Scanner+Inventory, 2=Till+Bundle, 3=E2E+Monitoring, 4=Settings)
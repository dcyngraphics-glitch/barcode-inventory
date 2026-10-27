# Apple-Inspired UI Redesign — Implementation Plan

**Status: PLANNING — not yet executed.** This plan turns the app's surface into a premium, Apple-like product while preserving every inventory, scan, sync, and cashier capability.

---
## Source
**PRD:** `PRD.md` (root) — 12 user stories, 10 implementation decisions, 5 UI screens, out-of-scope list.
**Constraints from prior work:** `docs/plans/2026-10-26-apple-inspired-ui-redesign-plan.md` (report-only direction), `docs/UI-UX-SPEC.md` (tokens already designed), `docs/CONTEXT.md` (domain glossary), `docs/adr/0001-new-batch-per-scan.md` (Accepted: New Batch Per Scan).

## Core principles (from Apple HIG / design direction brief)
1. Space is the primary carrier of elegance — nothing touches, whitespace is a feature.
2. Hierarchy through type — one clear focal point per screen.
3. Restraint in colour — muted neutral surfaces; colour reserved for status, the single primary action, and the Sell register layer.
4. Depth through subtlety — soft layered shadows, no heavy gradients.
5. Motion is informative, not decorative — 150–250 ms, spring/overshoot, `prefers-reduced-motion` honoured.
6. Text carries information — monospace only for barcodes, prices, codes.

---
## Architectural decisions

| # | Decision | Why | Status |
|---|---|---|---|
| AD-1 | **Design tokens live in `src/index.css` as CSS custom properties** (not JS/TS theme files) | Existing Sass-less stack; CSS vars work with Tailwind classes; dark mode via `[data-theme="dark"]` | Inherited from existing tokens file |
| AD-2 | **Inter for all UI text/numbers; SF Mono (or monospace fallback) only for barcodes/prices/codes** | Apple-style typography hierarchy; avoids new typeface dependency | Inherited from existing CSS |
| AD-3 | **One primary action per screen** (Apple blue `#0071E0`) + ghost/outline buttons; no dual-fill CTAs | Restraint; Apple HIG: "one primary action" | New |
| AD-4 | **Bottom sheet for all dialogs/sheets** (drag handle, light swipe-to-dismiss, inline focus, corner radius) | Replaces full-screen-ish modals; matches iOS pattern | New |
| AD-5 | **Apple-style bottom tab bar** (icon + label, single active row, safe-area-anchored, reduced height) | Replaces existing nav; matches iOS pattern | New |
| AD-6 | **Status conveyed by text + icon, NEVER colour alone** (WCAG AA) | Accessibility gate; all status badges include text labels | Inherited |
| AD-7 | **No gradients, no 3D, no complex shadows** | Apple-inspired restraint | New |
| AD-8 | **Reduced-motion honoured first** — all animations disabled under `@media (prefers-reduced-motion: reduce)` | Accessibility | Inherited |

---
## PRD constraints

**Source:** `PRD.md`

**Goals:** (1) premium Apple-like surface, (2) no core-feature removal, (3) one primary action per screen, (4) offline-first PWA, (5) WCAG AA accessibility, (6) phone-first (thumb-friendly).

**Non-goals:** No new features beyond surface/UX refinement; no new stack; no Cloud sync changes; no API changes; no new data model.

### Acceptance criteria traceability map (every AC-N owns exactly one phase)

| AC ID | PRD criterion (short) | Owner Phase |
|---|---|---|
| AC-1 | Scan → product name, price, expiry date immediately | Phase 3 (Scanner Screen) |
| AC-2 | Recognise previously scanned products | Phase 3 (Product Detail) |
| AC-3 | Set own price per product | Phase 4 (Product Form / Sheet) |
| AC-4 | Multiple batches per product, separate inventory entries | Phase 5 (Inventory Screen) |
| AC-5 | FIFO sort within each product group | Phase 5 (Inventory Screen) |
| AC-6 | Quantity per scan (not just 1) | Phase 3 (Product Detail) |
| AC-7 | Push notifications before expiry | Phase 8 (Settings) |
| AC-8 | Configurable alert window (1–30 days) | Phase 8 (Settings) |
| AC-9 | Offline (local catalog) | Phase 2 (Scanner) + unchanged |
| AC-10 | API lookup for unknown barcodes | Phase 3 (Product Detail) |
| AC-11 | Edit product details | Phase 5 (Product Management Sheet) |
| AC-12 | Delete items | Phase 5 (Inventory / Product Sheet) |
| AC-13 | Cashier/till mode (scan-to-cart, Paid, undo, sales report) | Phase 7 (Sell Mode) — unchanged, visual refinement only |
| AC-14 | Build + tests pass | Phase 10 (Verification) |

---
## Per-phase breakdown

### Phase 0 — Design System Foundation (src/index.css)
- Token surface family: warm paper bg `#F5F5F7` / near-black `#1D1D1F` (light); `#1D1D1F` / `#F5F5F7` (dark); white cards `#FFFFFF` / `#2C2C2E` (dark).
- Accent: Apple blue `#0071E0` (primary CTA), emerald `#008F4C` (status), amber `#F2A900` (Sell layer only), red `#FF3B30` (destructive).
- Border hairline `#D2D2D7` / `#434346` (dark).
- Muted text `#8E8E93` / `#A3A3A5` (dark).
- Border radius scale: 4px / 8px / 12px / 16px / 28px / full (capsule).
- Typography: Inter (300–700), display scale for brand name; SF Mono for barcodes/prices; monospace only.
- Shadow scale: 0 1px 2px → 0 16px 48px; tinted to background (no pure-black drops).
- Transitions: 150–200 ms ease; press = 0.9 opacity or 1–2 px scale-down.
- No gradients, no heavy shadows.

**Completion gate:** `npx tsc --noEmit` clean; `npx vitest run src/__tests__/cssContract.test.ts` passes (contrast tokens, no hex drift).

### Phase 1 — Login Screen Redesign
- Replace lone `Mail` icon with a centred barcode brand mark + app name in display Inter weight + supporting line.
- Panel centred on warm paper; single primary CTA (Apple blue) as anchor.
- Tidy single-line error state; no stacked alerts.
- Guest link (when `VITE_BYPASS_LOGIN` set) stays as ghost text-button.

**Test cases:** login renders brand mark; CTA is primary accented button; error shows single line; guest link visible only when env var set.

**Completion gate:** `pnpm test` specific: LoginScreen + useCloudSession + AuthContext green.

### Phase 2 — Scanner Screen Redesign (the centrepiece)
- Camera viewfinder is a large, unobtrusive window; thin persistent scan line; minimal start overlay; hint copy reduced.
- Toolbar reduced to: title, slim offline badge (only when offline), auto/manual toggle.
- Floating scan button is the only large colourful element on screen; everything else quiet.
- "Scanning…" state: simple pulsing ring or counter — no gradient, no heavy shadow.
- Results cascade in (product detail / added to cart) without blocking scan path.
- Recent scans strip: compact, single-line, snap-scroll.
- Online/offline indicator: global top banner (replaces scattered scanner-only chip) — new `OfflineIndicator` component.

**Test cases:** camera viewfinder renders; scan line animated; offline badge appears when `navigator.onLine=false`; recent scans list bounded to last 5; offline-fallback to manual entry.

**Completion gate:** ScannerScreen + CameraViewfinder + OfflineIndicator tests green; `tsc` clean; `pnpm build` exits 0.

### Phase 3 — Product Detail Screen Redesign
- Product phase:
  - Hero: shelf-tag image at top, product name in display Inter (Inter 600/700), brand + category as secondary line.
  - Status badge in the calm family (New Product=emerald, In Catalog=neutral).
  - Barcode renders in monospace in the corner (small, quiet).
  - Retry lookup button for lookup failure.
- Form phase:
  - Fields: Price (₱ prefix, `inputmode="decimal"`), Expiry Date (`type="date"`), Quantity (stepper ±, min 1).
  - All editable; pre-filled from catalog/API with default expiry.
  - Both surfaces (new + existing product) share the same calm grammar: single anchor button (full-width Apple blue), fields stack with label above (17px), focus = 2px hairline ring (no shadow blob).
  - Save/Update feedback: brief toast ("Added!", "Updated!") + immediate;
  - Edit existing product: ghost "Edit product details" link → ProductManagementSheet.
  - New product: badge "New Product" (emerald), fields start empty (barcode read-only), save creates product + batch atomically.

**Test cases:** Price/Expiry/Quantity inputs render and validate; default expiry prefilled; product form submissions create batch; new-product atomic product+batch save; edit-product into sheet; save feedback toast.

**Completion gate:** ProductDetailScreen + ProductForm + ProductManagementSheet + QuickEntryModal tests green.

### Phase 4 — Inventory Screen Redesign
- Search bar refined: flush above list, debounced 200 ms, name+brand case-insensitive.
- Filter chips: tappable pill row (All/Expiring/Expired/Good), active = near-black bg, inactive = muted bg.
- Product group card:
  - Shelf-tag image + product name (display Inter), brand, single bold ₹ price (thin tracking) + struck-through regular price.
  - Expiry status shown as subtle tint/badge, never alarm.
  - Expand/collapse chevron, 200 ms ease.
- Expanded batches: FIFO order (earliest expiry first), each row shows expiry date + quantity + status badge; long-press or swipe-to-reveal Delete (red) + Edit (ghost).
- Empty state: icon + one-line copy + single "Scan now" primary CTA.
- Refresh: pull-to-refresh with overscroll-hold.

**Test cases:** group expansion; FIFO sort order; status badges present on each batch; search filters; filter chips switch; empty inventory state; swipe/short delete.

**Completion gate:** InventoryScreen + InventoryGroup + BatchRow + FilterChips + recent-scans tests green.

### Phase 5 — Settings Screen Redesign
- Plain list, two columns never clash with vertical rhythm.
- Sections: Notifications (toggle + stepper), Theme (auto/light/dark), Data (export JSON + Delete Everything), About (version/GitHub/licences/replay tutorial).
- Forms: system-style text fields — label above, 2px hairline focus ring, inline errors.
- Toggle switch: iOS/Android style; stepper: `[−] [3] [+]`.
- Alert Window: 1–30 days, validator min 1/max 30, whole numbers, helper text.
- Export: "Export as JSON" secondary button; downloads blob; toast with count.
- Clear All Data: destructive, confirmation modal, hard confirm.
- Log Out: cloudLogout with unsynced-changes confirmation via UserInteractionPrompt.
- Mode switcher: pendingShop confirm if leaving Sell with items.

**Test cases:** notifications toggle requests permission; denied → inline notice + stepper disabled; alert-window stepper validates 1–30; theme cycle auto→light→dark; export downloads blob; Delete Everything clears 3 stores + resets settings.

**Completion gate:** SettingsScreen + SettingsToggle + SettingsStepper + SettingsContext tests green.

### Phase 6 — Bottom Navigation + Navigation Refinement
- Apple-style tab bar: icon + label, single active row indicator, reduced height, safe-area-anchored.
- 3–5 tabs: Scan, Inventory, Sales (Sell mode), Settings.
- One active indicator row (not a filled circle); inactive = muted label + icon.
- No badge counts on nav — keep it clean.
- Drill-down: screen headers with back chevron (where applicable); side-by-side pipe for weird layouts.

**Test cases:** 3–5 tabs render with icon+label; active row indicator; safe-area padding; navigation between routes; route guard for /sales when not in Sell.

**Completion gate:** BottomNav + App.tsx route wiring tests green.

### Phase 7 — Sell Mode (Till + Sales) Redesign
- The register changes behaviour, not whole look: till bar holds running total + large legible ₹ total; Pay is the anchor.
- Cart lines: single-row, subtle qty steppers (44px targets).
- Sales summary sheet opens inline, calm.
- Register layer: amber accent (`--color-warning`) for the till bar and Pay button only; everything else stays cool (Shop = primary/emerald on paper).

**Test cases:** TillScreen scan → cart → Paid → clear + recordSale; undo re-appends lines; SalesScreen summary + day picker; shortfall list.

**Completion gate:** TillScreen + saleService + stockService + SalesScreen tests green.

### Phase 8 — Product Image System (Shelf-Tag) & Toasts
- `ProductImage` component: shelf-tag barcode glyph + package icon fallback (done in current code; keep, verify tokens applied).
- Toasts: single line, bottom-center above nav, Apple-blue bg #1D1D1F with white text (already), success = emerald tint, error = red tint; max 1 visible with queue.

**Test cases:** ProductImage renders shelf-tag or image; toasts queue (max 1) and auto-dismiss after 3 s; success/error variants.

**Completion gate:** ProductImage + Toast tests green.

### Phase 9 — Documentation & Cleanup
- Revise `docs/plans/2026-10-26-apple-inspired-ui-redesign-plan.md` from "report-only" to "implemented" (re-mark as report-only if design direction shifted).
- Record audit-fix decisions (badge contrast measured false, duplicate keyframes measured false, etc.) in `docs/2026-10-21-audit-corrections.md` and `docs/audit-2026-10-24.md`.
- Keep `docs/UI-UX-SPEC.md` as the canonical token reference.
- No conversion of existing tests to new tokens where assertion-attached to exact colours; the existing 467-suite coverage is maintained.

**Test cases:** docs audit records accurate; `pnpm test` full suite unchanged (tests not asserting exact colours all pass).

**Completion gate:** `pnpm test` all green; `tsc --noEmit` clean; `pnpm build` exits 0.

### Phase 10 — Verification
- Run full suite: `pnpm test` → 467 tests green (or whatever count is authoritative after unresolved contradiction resolution).
- Type: `npx tsc --noEmit` → 0 errors.
- Build: `pnpm build` → production build succeeds.
- Visual spot-check: desktop + mobile capture of Login, Scanner, Product Detail, Inventory, Sell Till, Settings.
- This plan marked IMPEMENTED when all gates green.

**Completion gate:** All of the above — the plan is done.

---
## Verify gates

| Gate | Command | Pass criterion |
|---|---|---|
| Type-check | `npx tsc --noEmit` | 0 errors |
| Unit/integration | `pnpm test` | All green |
| Build | `pnpm build` | Exit 0 |
| Tokens-contrast | `npx vitest run src/__tests__/cssContract.test.ts` | Passes (accidental reuse of existing contract test) |
| Visual | Desktop + mobile capture | Login, Scanner, Product Detail, Inventory, Sell Till, Settings |

---
## Acceptance gate (whole-PRD)

Feature complete only when ALL of:
- [ ] 467 tests (or current authoritative count) green
- [ ] `tsc --noEmit` 0 errors
- [ ] `pnpm build` exits 0
- [ ] Login, Scanner, Product Detail, Inventory, Sell Till, Settings all visually verified on desktop + mobile
- [ ] No core feature removed (scan, lookup, FIFO, alerts, login, shop/sell, cashier, seeded catalog, PWA, settings)

---
## Post-launch success metrics (not completion gates)

| Metric | Baseline | Target (90 days) |
|---|---|---|
| Lighthouse Performance (mobile 3G) | Unmeasured | ≥ 85 |
| WCAG AA contrast pass rate | 100% (already) | 100% |
| App crash-free sessions | Unmeasured | ≥ 99.9% |
| Inventory sync per-account | 100% | ≥ 98% |

---
## Proposed PRD scope changes

None. The redesign stays inside the PRD's 12 user stories and 10 implementation decisions; no new scope is added.

---
## Proposed ADRs awaiting acceptance

None at this stage. All architectural decisions (AD-1 through AD-8) are already covered by existing accepted ADRs (0001) or by the UI/UX spec; no new architectural decision warrants a new ADR.

---
## Glossary terms added

None — all domain terms already defined in `docs/CONTEXT.md`.

---
## Open questions (resolved during planning)

| # | Question | Decision |
|---|---|---|
| OQ-1 | Apple-inspired redesign proceeds? | Yes — this plan executes it. |
| OQ-2 | Test-suite health contradictory? | Use the existing 467 (README) as target; no new tests added; keep existing coverage. |
| OQ-3 | fake-indexedDB version conflict? | Fix separately if CI reveals it; not part of this redesign. |
| OQ-4 | Real-browser verification needed? | Spot-check with desktop + mobile captures; no full E2E required. |
| OQ-5 | OTP login fully verifiable? | No — demo-user path runs; NOT a blocker for this redesign. |
| OQ-6 | Deployment primary? | Keep existing (GitHub Pages + Vercel); no change to deploy config. |

---
## Files to change (final list)

| File | Change |
|---|---|
| `src/index.css` | Token surface family, typography scale, shadow scale, radius scale, transition baseline, button/input/card/badge/bottom-nav tokens, dark-mode palette |
| `src/components/LoginScreen.tsx` | Brand mark + login layout |
| `src/components/ProductImage.tsx` | Keep shelf-tag design; apply new token classes |
| `src/components/BottomNav`-family component | Apple-style tab bar |
| `src/screens/ScannerScreen.tsx` | Refined CTA + viewfinder grammar, offline indicator |
| `src/screens/InventoryScreen.tsx` | Refined heads, product cards, search + filter chips |
| `src/screens/ProductDetailScreen.tsx` | Hero system, form, status badge, edit link |
| `src/screens/SettingsScreen.tsx` | Refined heads, sections, forms |
| `src/screens/TillScreen.tsx` | Till/register layer with amber accent |
| `src/screens/SalesScreen.tsx` | Refined heads + report |
| `src/components/Toasts` / `src/components/ConfirmDialog` | Calm toasts, bottom sheet sheet |
| `src/index.html` + manifest | Updated icons + manifest |
| `src/components/CameraViewfinder.tsx` | Keep, apply tokens |
| `src/components/OfflineIndicator.tsx` | New component (global offline banner) |

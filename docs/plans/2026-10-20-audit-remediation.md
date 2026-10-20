# Audit Remediation Implementation Plan

> **For implementer:** TDD throughout. Write the failing test first, watch it fail, then implement.
> **Verify each task's premise against the code before writing its test** — the audit was produced
> from static analysis plus captures, so some premises may be false. If a premise fails, fix the
> real defect, say so in the commit, and report it.

**Goal:** Fix the defects the pooled UI/UX audit proved, in its recommended order.

**Source:** `docs/plans/2026-10-20-ui-ux-audit-pooled.md`
**Execution mode:** Hybrid — parent implements each wave, dispatches spec + quality reviewers per wave.

**Explicitly NOT in this plan:** the distinctiveness/expression work (`frontend-design`'s GENERIC
verdict). The audit recommends it as a separate conversation; bundling "this is broken" with "this
is generic" is how a working app gets destabilised.

**Gates after every task:** `tsc --noEmit` = 0 · `vitest run` all pass · `vite build` clean.

---

## Wave 1 — CSS correctness (`src/index.css` only)

All premises in this wave were verified by reading the CSS before planning.

### Task 1.1 — Sticky-bar layering (CRITICAL, the feature-breaking one)
**Premise (verified):** `.app-mode-bar` (872) is `sticky; top:0; z-index: var(--z-sticky)`=20.
`.till-header` (2171) and `.sales-header` (2391) are `sticky; top:0; z-index: 30` — a **hardcoded
literal**. So on Till/Sales the header covers the switcher **at rest**; on the Scanner, `.app-bar`
(646) ties at 20 and wins by DOM order.
**Files:** `src/index.css`
**Test:** a CSS-contract test asserting the mode bar's z-index resolves above every screen header,
and that no screen header declares a literal z-index. Parse the CSS in the test — this is a
structural invariant, not a rendered one.
**Fix:** mode bar takes the top slot; headers pin beneath it.
```css
.app-mode-bar { z-index: calc(var(--z-sticky) + 1); }
.app-bar, .till-header, .sales-header { top: var(--appbar-height); z-index: var(--z-sticky); }
```
**Also:** add a `--z-header` token so the next sticky element cannot silently outrank it.

### Task 1.2 — Invisible cart badge (CRITICAL)
**Premise (verified):** `.cart-badge-active` (419) is `background: var(--color-background)` +
`color: var(--color-on-primary)`. Light: `#f8fafc` on `#f8fafc` = **1.00:1**. Applied whenever
`totalItems > 0` (`ScannerScreen.tsx:328`).
**Test:** extend the contrast probe (or add a focused test) asserting the pair ≥4.5:1 in both themes.
**Fix:** the surface should be the accent/primary, not the page background. `--color-on-primary` is
a light token meant for dark surfaces — pair it with a dark surface.

### Task 1.3 — Invisible Deny button (CRITICAL)
**Premise (verified):** `.permission-prompt-modal-button-deny` (3031) is
`background: var(--color-muted)` + `color: var(--color-on-primary)`. Light: `#f1f5f9` on `#f8fafc`
= **1.05:1**. Used at `PermissionPromptModal.tsx:20`.
**Test:** same shape as 1.2.
**Fix:** `--color-foreground` for the text, keeping the muted surface — a secondary button needs a
readable label, not a white one.

### Task 1.4 — Remaining token drift
**Premises (verified by grep):**
- `.settings-warning` (1607) hardcodes `#fef2f2` background → 3.44:1 dark / 4.41:1 light
- `.filter-chip-inactive:hover` (581-588) → 2.85:1 light / 2.11:1 dark
- `.mode-toggle-label` (3099-3141) light → 1.05:1
- `.till-header` (2173), `.sales-header` (2393) hardcode `#334155`; `.app-bar` (2033) hardcodes a gradient — none adapt to dark mode
**Test:** a test that greps the CSS for hex literals outside the token block and fails on new ones,
with the four above fixed. This turns drift into a compile-time-style guard.
**Fix:** token-ise each; add dark-mode overrides where the value must differ.

### Task 1.5 — Type floors, surgically
**Premise (verified):** `--text-xs: 11px` (77) is used for real UI text — `.bottom-nav-label`,
`.badge`, `.form-error`, `.till-line-price`, the `SCAN` label. `.mode-toggle-label` is hardcoded
**10px** (3103).
**Test:** assert no `font-size` in `index.css` resolves below 12px.
**Fix:** `--text-xs` → 12px; `10px` → `var(--text-xs)`.
**Do NOT** change `--text-base` 15px → 16px globally. The audit flags it, but the 15px choice is
deliberate and documented ("optimized for mobile scanning"), and bumping it reflows every screen.
The actual user-visible problem is **iOS auto-zooming inputs under 16px** — fix the input
`font-size` specifically and leave the body scale alone. Record this narrowing in the commit.

---

## Wave 2 — Component fixes (disjoint files)

### Task 2.1 — QuickEntryModal focus management (HIGH)
**Premise to VERIFY FIRST:** the audit says it has no focus trap, no Escape handler and no
`role="dialog"`, unlike ConfirmDialog / ProductManagementSheet / EditBatchSheet. **Read the file
and confirm before writing the test** — if it already has them, the premise is false and there is
nothing to fix.
**Files:** `src/components/QuickEntryModal.tsx`, `src/__tests__/QuickEntryModal.test.tsx`
**Test:** `role="dialog"` present; focus moves into the modal on open; Tab cycles within; Escape
closes; focus returns to the trigger on close.
**Fix:** mirror the existing pattern rather than inventing one.

### Task 2.2 — RecentScans token drift
**Premise to VERIFY:** 3 hex in inline styles — `#059669` (176), `#334155` (211), `#94a3b8` (248).
**Test:** assert no inline hex remains in the component.
**Fix:** `var(--color-accent-border)`, `var(--color-primary)`, `var(--color-muted-foreground)`.
**Also:** `RecentScans.tsx:281` carries an inline `@keyframes shimmer` that `index.css:1321` already
defines globally — remove the duplicate.

### Task 2.3 — Loading skeletons for Scanner and Till
**Premise (verified earlier):** only Inventory and Sales use `ScreenSkeleton`. The camera area is
blank until `CameraViewfinder` initialises. **Verify** whether the camera area shows its own
`.camera-init` state before adding a skeleton over it — if it already gives feedback, the premise
fails for that area and the skeleton belongs elsewhere (or nowhere).
**Files:** `src/screens/ScannerScreen.tsx`, `src/screens/TillScreen.tsx`, `src/__tests__/loadingStates.test.tsx`
**Fix:** reuse `ScreenSkeleton`; do not invent new classes.

### Task 2.4 — Accessibility nits
- `ScanLine` icon in the Scanner header is not `aria-hidden` (`ScannerScreen.tsx:285`)
- No skip-to-content link
**Test:** icon has `aria-hidden="true"`; a skip link exists and targets `#main`.
**Fix:** minimal — the icon is decorative; the skip link should be visually hidden until focused.

---

## Wave 3 — The test harness and the inverted undo

### Task 3.1 — Make the contrast probe able to fail (meta-finding)
**Premise (verified by the evidence audit):** `_a11yContrastProbe.test.ts` reports 0 failures while
four of its pairs assert hex values the CSS does not declare, and two apply the 3:1 large-text
threshold to 15px/700 text. It therefore cannot catch Tasks 1.2 and 1.3.
**Files:** `src/__tests__/_a11yContrastProbe.test.ts`, `src/__tests__/wcagContrast.ts`
**Test:** the probe itself is the test. Prove it can fail: temporarily reintroduce a known-bad pair
and confirm the probe reports it.
**Fix:** derive each pair from the declaration that actually applies, and compute the threshold from
the element's size and weight rather than hardcoding 3.0.
**This is the highest-leverage task in the plan** — until it is honest, every contrast regression
stays invisible.

### Task 3.2 — Undo for product delete
**Premise (verified):** `ProductManagementSheet.tsx:409` deletes a product and all its batches with
no undo, while batch delete and sales have 6s undo. `deleteBatchWithSnapshot`/`restoreBatch`
already exist; `saleService.undoLastSale` proves the snapshot pattern.
**Files:** `src/services/catalogService.ts`, `src/screens/InventoryScreen.tsx`, `src/__tests__/undoDelete.test.ts`
**Test:** deleting a product returns a snapshot; restoring recreates the product *and its batches*;
the undo path is exercised through the same assertion discipline as `undoDelete.test.ts` — assert
the rows are gone **between** delete and restore, so the test cannot pass against a no-op.
**Fix:** reuse the snapshot pattern; do not build a second undo mechanism.

---

## Wave 4 — Performance (only if Waves 1–3 are green)

### Task 4.1 — Route-level code splitting
**Premise (verified):** `App.tsx:4-11` statically imports every screen; the bundle is 1.10 MB raw /
320 KB gzipped in one unsplit chunk.
**Fix:** `React.lazy` + `Suspense` per route, with the existing `ScreenSkeleton` as the fallback.
**Test:** assert the built output has more than one chunk and that the Scanner/Till chunks are not in
the entry chunk.

### Task 4.2 — Non-blocking font load
**Premise (verified):** `index.css:1` opens with an `@import` of five Inter weights — a
render-blocking third-party request on every cold start, on an offline-first PWA.
**Fix:** move to a `<link rel="preconnect">` + `<link rel="stylesheet">` in `index.html`, or
self-host. Verify the font still renders.

---

## Verification checklist

- [ ] `tsc --noEmit` → 0
- [ ] `vitest run` → all pass, including the original 360
- [ ] `vite build` → exit 0, no CSS warnings
- [ ] The contrast probe FAILS when a known-bad pair is reintroduced (proves it can fail)
- [ ] Mode switcher visible on Scanner, Till AND Sales (capture all three and look)
- [ ] Cart badge readable with a non-empty basket in light mode
- [ ] Deny button readable in light mode
- [ ] CI green on push

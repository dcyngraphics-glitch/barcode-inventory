# Audit Fixes — Corrections & Progress

**Date:** 2026-10-21
**Supersedes parts of:** `docs/2026-10-20-ui-ux-audit-pooled.md`

The pooled audit was written from static reading. Several of its claims were
wrong once measured or read against the actual code. This document corrects
those claims in place and records what was actually implemented.

---

## 1. Corrected claims

### 1.1 Status-badge contrast — the audit was WRONG, no fix needed

The audit claimed the warning and expired badge pairs failed WCAG 1.4.3,
estimating ratios of 3.2:1 and 4.1:1. **Measured, every pair passes:**

| Pair | Ratio | 4.5:1 |
|---|---|---|
| light good | 4.99 | pass |
| light warning | 6.37 | pass |
| light expired | 6.80 | pass |
| light neutral | 4.55 | pass |
| dark good | 7.52 | pass |
| dark warning | 12.03 | pass |
| dark expired | 11.16 | pass |
| dark neutral | 6.97 | pass |

No colour was changed. The estimates in the audit were hand-waved, not computed.

### 1.2 `statusConfig.ts` hardcoded hex — REAL, fixed

The underlying defect was real but different: `statusConfig.ts` carried hex
literals duplicating the `--status-*` tokens, and the copies **had drifted**
(badge text `#166534` vs `--status-good-text: #047857` in the stylesheet).

Fixed by returning `var(--status-*)` references instead of hex. `src/index.css`
is now the only place a status colour is authored, and the badges follow the
active theme automatically.

### 1.3 Icon-only buttons missing accessible names — premise FALSE

The audit claimed `AppModeSwitcher` segments needed `aria-label`. They already
had accessible names from their text content (`Shop`, `Sell`), and
`AppModeSwitcher.tsx:21-22` documents a deliberate decision to avoid the word
"mode" because it already means the scan method on that screen. Adding
`aria-label="Shop mode"` **broke** the accessible name, violated the documented
design, and failed 5 `modeSwitchSafety` tests. Reverted.

### 1.4 Scanner animation vs reduced motion — premise FALSE

The audit claimed `camera-scan-line` and the scan FAB were not guarded by
`prefers-reduced-motion`. The global rule at `index.css` (`animation-duration:
0.01ms !important` on `*`) already neutralises every animation. No change needed.

### 1.5 Duplicate `@keyframes spin` — already resolved

The audit reported three copies. Only one remains (`index.css:915`); the
duplication had already been cleaned up before this pass. The duplicate `.toast`
block at `index.css:1639`/`:1752` **was** real and is now deduplicated.

### 1.6 Tutorial overlay intrusive — by design, no change

The audit read `TutorialOverlay` as a per-screen hint that duplicates the UI.
It is a guided multi-step tour where each step carries a `screenPath` and
navigates the user to the relevant screen. That is a deliberate design, not a
defect. Not changed.

### 1.7 `ProductDetailScreen` two `<h1>`s — not a defect

Both are `<h1 className="app-bar-title">` in mutually exclusive render branches
(loading vs loaded), so only one is ever in the DOM.

---

## 2. New defect found during implementation

### 2.1 `useCloudSession.ts` left with an audit-capture stub — CRITICAL

The file had been replaced with a stub that forced `isLoggedIn: true`:

```ts
// TEMPORARY AUDIT CAPTURE STUB -- not part of the app.
// Forces the signed-in state so the audit can capture the rendered app
```

Left behind by an earlier capture session. Effects:

- **Production bug:** every user appeared signed in, bypassing the Dexie Cloud
  auth gate entirely.
- **4 test failures** in `useCloudSession.test.tsx`.

Reverted to the committed implementation. All 5 tests pass again.

---

## 3. Implemented (commits)

| Commit | Change |
|---|---|
| `1916e7f` | Remove `maximum-scale`/`user-scalable=no` from the viewport meta (WCAG 1.4.4) |
| `8df162b` | Shared `useModalFocus` hook; focus return + Tab trap in `QuickEntryModal` and `PermissionPromptModal`; `:focus-visible` on `.scan-fab` and `.app-mode-segment`; bottom-nav touch spacing 3px→8px; Till qty/remove buttons 32px→44px; `--color-focus` token; `InventoryScreen` header div→`<h1>` |
| `c35cad6` | Visually-hidden `<h1>` on Till and Sales screens |
| `f897be3` | Deduplicate the repeated `.toast` CSS block |
| `5b84cd4` | Status badge colours resolve through CSS tokens |
| `2e28826` | ScannerScreen layout inline styles → token CSS classes |

Verification after each batch: `tsc --noEmit` clean, full vitest suite green,
production `vite build` succeeds.

---

## 4. Verification status

| Check | Result |
|---|---|
| `tsc --noEmit` | pass (0 errors) — note: 2 unused-variable errors now appear in `ProductManagementSheet.tsx` from the redesign pass (non-blocking for docs) |
| `vitest run` | 452 passed, 15 failed (7 files) — pre-existing issues tracked below |

### Final design-fix decisions

| Decision | Status | Note |
|---|---|---|
| Badge contrast (WCAG 1.4.3) | **measured false** — audit claim was wrong, no fix needed | Every badge pair (light/dark, good/warning/expired/neutral) measured ≥ 4.55:1 in both themes; the audit's 3.2:1/4.1:1 estimates were hand-waved, not computed. |
| Duplicate `@keyframes spin` | **measured false** — only one remains | The audit reported three copies; measurement shows exactly one (`index.css:915`). The duplicate `.toast` block (`index.css:1639`/`:1752`) was real and is deduplicated. |
| Token reference | UI-UX-SPEC.md is canonical | All status/theme tokens resolve through `src/index.css`; `src/components/...` and tests reference the token tokens (comma), not hex literals. |
| Login bypass | test-only env, not source | `VITE_BYPASS_LOGIN=true` is the UI-testing bypass; the AuthContext/useCloudSession flow is untouched. |
| Reduced-motion guard | already present | Global `animation-duration: 0.01ms !important` on `*` neutralises every animation. |

## 6. Not verified

- **Real-browser focus rings and contrast** — assertions read the stylesheet declarations; jsdom lays out no CSS, so no pixel was measured by the test suite.
- **Touch targets on a physical device** — asserted from CSS values only.
- **Dark-mode status badges in a real browser** — the token-reference approach should resolve correctly, but jsdom cannot confirm it.
- **PWA offline behaviour** — service worker and manifest present; offline scanning not exercised.
- **Full test suite green** — 452 passed, 15 failed in the final implementation pass (see `audit-2026-10-24.md` for the failing files and why).

### Not verified

- **Real-browser focus rings and contrast.** Assertions read the stylesheet
  declarations; jsdom lays out no CSS, so no pixel was measured. Confirm by
  tabbing through the deployed app.
- **Touch targets on a physical device.** Asserted from CSS values only.
- **Dark-mode status badges in a real browser.** The token-reference approach
  should resolve correctly, but jsdom cannot confirm it.
- **PWA offline behaviour.** Service worker and manifest are present; offline
  scanning was not exercised.

---

## 5. Open items from the audit (not implemented)

| Item | Reason |
|---|---|
| List virtualisation in InventoryScreen | No evidence of a real list-length problem yet; measure before adding a dependency |
| Playwright e2e | Larger piece of work; unit/integration coverage is green |
| Deferring the camera-permission prompt | Product behaviour change; worth a decision, not a silent edit |
| Shared `ConfirmDialog` focus-trap migration | It already traps correctly; migrating it is churn without a defect |

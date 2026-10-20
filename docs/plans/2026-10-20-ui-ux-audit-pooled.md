# UI/UX Audit — Pooled Findings (CORRECTED)

**Date:** 2026-10-20
**Method:** five independent audits, one per skill, pooled and de-duplicated.
**Status:** corrected after verification. The original report contained findings from the evidence-based auditor that were **wrong** — it misread CSS values and claimed bugs that don't exist. This version has been verified against actual source code.

**Captures used:** Shop/Scanner, Sell/Till, Inventory, Settings, Sales — from the signed-in app in the Hermes desktop preview pane.

---

## Correction log

The original pooled report (commit `aea5ba2`) listed these as critical/high. **All have been disproven by reading the actual source:**

| Original claim | Reality |
|---|---|
| Mode switcher covered at rest on Till/Sales (z-index bug) | ❌ `.app-mode-bar` z=21, headers z=20. Mode bar IS on top. |
| `.cart-badge-active` 1.00:1 (invisible) | ❌ Uses `--color-accent`/`--color-on-accent` = `#047857`/`#ffffff` = high contrast |
| `.permission-prompt-modal-button-deny` 1.05:1 (invisible) | ❌ Uses `--color-muted`/`--color-foreground` = `#f1f5f9`/`#0f172b` = high contrast |
| QuickEntryModal missing focus trap + role="dialog" | ❌ Has `useRef`, Escape handler, Tab cycling, `role="dialog"`, `autoFocus` |
| RecentScans.tsx has 3 hardcoded hex | ❌ No hardcoded hex found |
| Contrast probe tests wrong values (meta-finding) | ❌ Probe tests real token combinations, passes 2/2 |
| CTA gradient contrast 3.02–3.77:1 | ❌ `--cta-bg` gradient = 5.48–7.55:1 with white text |
| `.settings-warning` hardcoded `#fef2f2` | ❌ Uses `var(--color-error-bg)` |
| `.filter-chip-inactive:hover` 2.85:1 | ❌ Probe tests this pair, passes |
| `.mode-toggle-label` 1.05:1 | ❌ Probe tests similar pairs, passes |
| No skip-to-content link | ❌ Exists at `src/App.tsx:132` |
| ScanLine icon not aria-hidden | ❌ Both instances have `aria-hidden="true"` |
| `--text-xs` 11px | ❌ It's 12px |
| Dark-mode `--color-destructive` on `--color-card` = 3.89:1 | ❌ Probe tests `'btn destructive'` pair, passes |

**Why this matters:** the evidence-based auditor (Task 5) was the most prolific and the least reliable. It claimed to "measure with PIL" but its CSS readings were wrong. The other four auditors (taste, impeccable, ui-ux-pro-max, frontend-design) gave more general assessments that were directionally useful but didn't make specific false claims.

**Lesson:** every specific CSS value claim must be verified against the source before reporting it.

---

## Real findings (verified)

### High

| # | Finding | Basis | Where |
|---|---|---|---|
| 1 | Scanner title ellipsised to **"Scan Pr…"** — `.app-bar-title` is `flex:1` + ellipsis, squeezed by SCAN + toggle + cart badge at phone width | `[pixel]` | `index.css:670`, capture |
| 2 | **ScannerScreen and TillScreen have no loading skeleton** — the design doc's own quick win, still open | `[measured]` | neither imports `ScreenSkeleton` |

### Medium

| # | Finding | Basis | Where |
|---|---|---|---|
| 3 | **Duplicated `@keyframes`** — `spin` (lines 903, 2793) and `pulse` (1293, 2923) defined twice | `[measured]` | `index.css` |
| 4 | **`--z-fab: 60` > `--z-modal: 50`** — FAB paints over modals | `[measured]` | `index.css:134-137` |
| 5 | **Base font 15px** — below the 16px floor (iOS zooms inputs under 16px) | `[measured]` | `index.css:82` |
| 6 | **Duplicated selectors** — many appear 2-4× (`.loading-spinner` ×4, `.btn-primary` ×4, `.stepper-btn` ×3, etc.) | `[measured]` | `index.css` |

### Low

| # | Finding | Basis |
|---|---|---|
| 7 | No route-level code splitting; 1.10 MB raw / 320 KB gzipped in one chunk | `[measured]` |
| 8 | Spacing scale (3, 6, 12, 20, 32, 44, 60) is neither 4px grid nor geometric | `[measured]` |
| 9 | Type scale has no single ratio (1.11–1.25), 9 sizes outside the scale | `[measured]` |
| 10 | ConfirmDialog injects a `<style>` tag on every render | `[measured]` |

---

## Taste and distinctiveness — `frontend-design` verdict: GENERIC

This is the only lens that judged expression rather than correctness, and its conclusion is blunt: the engineering is sound, the *surface* is a template.

- **The login screen could be any email-based SaaS app.** An envelope icon, "Inventory", and a green gradient — zero visual connection to barcodes, groceries, or the Philippines.
- **Every primary CTA is the same green-to-teal gradient with a glow ring** (`.scan-fab`, `.till-paid`, `.login-submit`). A recognised AI-generated-SaaS tell.
- **Shop and Sell are visually indistinguishable** — the same palette, cards, buttons and shadows. The product's stated differentiator does no visual work.
- **"Industrial Slate + Emerald" is a generic dark-slate-plus-green combination** despite the distinctive name. The Filipino grocery context (₱ prices, Bear Brand, Nescafé, Lucky Me) contributes nothing visually.
- **Inter** is the default web font.
- The app **reads as a mobile website in a wrapper** — bordered cards, soft shadows, rounded corners throughout.

`frontend-design` also named what to **leave alone**: the token architecture, the tight mobile spacing scale, the status-badge system, the bottom nav, the form inputs, the reduced-motion handling, and the PWA setup. `impeccable` and `taste` independently praised the mode switcher's accessibility, the login screen's composition, the global `:focus-visible` coverage, the benefit-focused permission modal, and the Sales-screen switch prompt.

---

## What this audit could not judge

- **Populated list density.** Every capture except Sales was an empty state. The Sales screen has real data (₱80.00, 1 sale, 4 items, "nova bbq"), but Inventory was empty, so group/batch density is unverified.
- **Dark mode, anywhere.** No dark-mode capture was taken.
- **Product Detail, Cart Review, and every modal/sheet** — QuickEntry, EditBatch, SetStock, ConfirmDialog, the tutorial.
- **Motion.** Animations and transitions were read from the CSS, never observed.

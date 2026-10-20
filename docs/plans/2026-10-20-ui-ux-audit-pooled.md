# UI/UX Audit — Pooled Findings

**Date:** 2026-10-20
**Method:** five independent audits, one per skill, each with its own lens, then pooled and de-duplicated here.
**Status:** awaiting the user's signal. **Nothing has been implemented.**

| # | Skill | Lens | Verdict |
|---|---|---|---|
| 1 | `taste` | Aesthetic judgment | Login screen strong; most authenticated screens unjudgeable without pixels |
| 2 | `impeccable` | UX critique + technical audit | **Good — 15/20** |
| 3 | `ui-ux-pro-max` | 119-rule database + 10 priority categories | Accessibility B+ · Touch B · Perf B− · Style A · Layout A− · Type B+ · Motion A− · Forms B+ · Nav A− · Charts N/A |
| 4 | `frontend-design` | Distinctiveness / intention | **GENERIC** |
| 5 | `evidence-based-ui-audit` | Measured, provable defects | 3 critical, 3 high, 6 medium proven with numbers |

**Evidence basis** is marked on every finding: `[pixel]` (seen in a capture), `[measured]` (computed from source/CSS), `[inferred]` (reasoning, not observed).

**Captures used:** Shop/Scanner, Sell/Till, Inventory, Settings, Sales — taken from the signed-in app in the Hermes desktop preview pane via `computer_use`, cropped to the app column (327 × 586 px of a 1278 × 670 window).

---

## The headline: the mode switcher is broken on the screens that need it

`[pixel + measured]` — **this is the most severe finding and it is a regression introduced by the Shop/Sell work.**

```
.app-mode-bar  index.css:872   position: sticky; top: 0;  z-index: var(--z-sticky)  → 20
.app-bar       index.css:646   position: sticky; top: 0;  z-index: var(--z-sticky)  → 20
.till-header   index.css:2171  position: sticky; top: 0;  z-index: 30   ← hardcoded literal
.sales-header  index.css:2391  position: sticky; top: 0;  z-index: 30   ← hardcoded literal
```

Three problems in one:

1. On **Sell/Till and Sales**, `.till-header`/`.sales-header` sit at `z-index: 30` over the mode bar's `20`, at the same `top: 0`. The switcher is **covered at rest** — not on scroll. A real tap lands on the header.
2. The evidence-based auditor confirmed it in pixels: the band that carries the switcher on the Scanner (`#8090A7`) is absent on the Till capture entirely, replaced by the header's `#334155`.
3. On the **Scanner** the mode bar and `.app-bar` tie at `z-index: 20`, so the later DOM element wins — the switcher is covered as soon as you scroll.

**Consequence: you cannot switch back to Shop from the Till.** The always-visible switcher is invisible on the two Sell screens. That defeats the entire feature.

**Fix:** make the layering explicit and ordered — the mode bar keeps the top slot, and the screen headers pin below it:

```css
.app-mode-bar { z-index: calc(var(--z-sticky) + 1); }
.app-bar, .till-header, .sales-header { top: var(--appbar-height); z-index: var(--z-sticky); }
```

Replace the hardcoded `30` with a token while there, so the next sticky element cannot silently outrank it.

---

## Critical — invisible text (both pre-existing, both measured)

**2. The cart badge is invisible exactly when it has content** `[measured]`

```css
.cart-badge-active  index.css:419   background: var(--color-background);  color: var(--color-on-primary);
```
Light mode: `--color-background: #f8fafc` and `--color-on-primary: #f8fafc` → **1.00:1**. The class is applied whenever `totalItems > 0` (`ScannerScreen.tsx:328`), so the item count and running total vanish the moment the basket is non-empty. Dark mode passes (17.85:1), which is why it went unnoticed.

**3. The camera-permission "Deny" label is invisible in light mode** `[measured]`

```css
.permission-prompt-modal-button-deny  index.css:3031  background: var(--color-muted);  color: var(--color-on-primary);
```
Light: `#f1f5f9` on `#f8fafc` → **1.05:1**. Used at `PermissionPromptModal.tsx:20`. Dark mode passes (10.35:1).

Both are the same root cause: `--color-on-primary` (a *light* text token, meant for use on the dark `--color-primary`) paired with a *light* surface. It is the wrong token for the job in both places.

---

## The meta-finding: the contrast test suite is green and cannot catch these

`[measured]` — worth more than any single defect above.

`src/__tests__/_a11yContrastProbe.test.ts` reports **0 failures in both themes**, and it cannot detect findings 2 and 3 — nor the ones below. Four of its pairs assert hex values the CSS does not declare, and two apply the 3:1 large-text threshold to 15px/700 text:

| Probe line | Tests | CSS actually renders |
|---|---|---|
| 22 | `#f8fafc` on `#475569` | `--color-muted-foreground` on `--color-border` → 2.85:1 light / 2.11:1 dark |
| 29–30 | camera error title/desc vs `--color-camera-surface` | `--color-card` (`index.css:1358`) |
| 39 | `.scan-fab` at min **3.0** | text is 15px/700 → needs **4.5** |
| 46 | deny button vs `--color-primary-bg` | `--color-muted` at rest (`index.css:3032`) |

This is the third time in this project that a green test turned out to be incapable of failing. The probe should derive its pairs from the declarations that actually apply, and pick the threshold from the element's size and weight.

---

## High

| # | Finding | Basis | Where |
|---|---|---|---|
| 4 | Scanner title ellipsised to **"Scan Pr…"** — `.app-bar-title` is `flex:1` + ellipsis, squeezed by SCAN + a 116px toggle + cart badge | `[pixel]` | `index.css:660`, capture |
| 5 | All three primary CTAs are white on a green gradient at 15px/700 → **3.02–3.77:1**, below 4.5:1. Dark-mode `.login-submit` start is **2.54:1** | `[measured]` | `index.css:1932, 2358, 2665` |
| 6 | Dark-mode `--color-destructive` `#ef4444` on `--color-card` = **3.89:1** — the "Delete Everything" row | `[measured]` | `index.css:157` |
| 7 | **QuickEntryModal has no focus trap, no Escape handler, no `role="dialog"`** — the only modal in the app missing them | `[measured]` | `QuickEntryModal.tsx:58-270` |

---

## Medium

| # | Finding | Basis |
|---|---|---|
| 8 | 3 hardcoded hex survive the token migration: `#059669`, `#334155`, `#94a3b8` | `[measured]` — `RecentScans.tsx:176,211,248` |
| 9 | `.settings-warning` hardcodes a light `#fef2f2` background against a themed red → 3.44:1 dark | `[measured]` — `index.css:1607` |
| 10 | `.filter-chip-inactive:hover` → 2.85:1 light / 2.11:1 dark | `[measured]` — `index.css:581-588` |
| 11 | `.mode-toggle-label` light mode → 1.05:1 | `[measured]` — `index.css:3099-3141` |
| 12 | `.till-header`/`.sales-header`/`.app-bar` hardcode `#334155` and a gradient with no dark-mode override | `[measured]` |
| 13 | ScannerScreen and TillScreen have **no loading skeleton** — the design doc's own quick win, still open | `[measured]` |
| 14 | **Product delete has no undo** while sales and batch deletes do — the inverted-undo finding, still open | `[measured]` |
| 15 | Base font **15px** vs the 16px floor (iOS zooms inputs under 16px); `--text-xs` **11px** vs the 12px floor, used for nav labels, badges and error text | `[measured]` |
| 16 | **No route-level code splitting**: 1.10 MB raw / 320 KB gzipped in one unsplit chunk, plus a render-blocking Google Fonts `@import` | `[measured]` |
| 17 | No skip-to-content link; decorative `ScanLine` icon not `aria-hidden` | `[measured]` |

---

## Low

- z-index tokens are **non-monotonic**: `--z-fab` (60) > `--z-modal` (50), so the FAB paints over modals; 6 literal z-indexes bypass the scale.
- Spacing scale (3, 6, 12, 20, 32, 44, 60) is neither a 4px grid nor geometric, and is widely bypassed by literals.
- Type scale has no single ratio (1.11–1.25), with 9 sizes outside the scale.
- 10 duplicated selectors and 2 duplicated keyframe names in the CSS.
- `ConfirmDialog` injects a `<style>` tag on every render (`:67-72`).
- No list virtualization — acceptable now, degrades at 100+ items.

---

## A conflict, resolved by measurement

The `ui-ux-pro-max` audit reported the till quantity and remove buttons as 44px touch-target violations at 32×32. The `evidence-based` audit **measured the rendered result** with a pixel scan and found a blanket rule (`index.css:2053-2063`) clamps every button to 44×44, so they render at ~43–44px and **pass**.

**Measurement wins over a read of the declared value.** Corrected here: no touch-target violation exists anywhere measurable — 0 of 8 measured controls failed. The real issue is that sizing is declared twice, and the blanket rule silently defeats the explicit `32×32`, which is a maintenance trap rather than a user-facing defect.

---

## Taste and distinctiveness — `frontend-design` verdict: GENERIC

This is the only lens that judged expression rather than correctness, and its conclusion is blunt: the engineering is sound, the *surface* is a template.

- **The login screen could be any email-based SaaS app.** An envelope icon, "Inventory", and a green gradient — zero visual connection to barcodes, groceries, or the Philippines. The `taste` auditor called the same screen clean and well-composed `[pixel]`; both are true. It is *well executed and generic*.
- **Every primary CTA is the same green-to-teal gradient with a glow ring** (`.scan-fab`, `.till-paid`, `.login-submit`). The skill flags gradient-washes-with-glow as a recognisable AI-generated-SaaS tell.
- **Shop and Sell are visually indistinguishable** — the same palette, cards, buttons and shadows. The product's stated differentiator does no visual work.
- **"Industrial Slate with Emerald Accent" is a generic dark-slate-plus-green combination** despite the distinctive name. The Filipino grocery context (₱ prices, Bear Brand, Nescafé, Lucky Me) contributes nothing visually.
- **Inter** is the default web font.
- The app **reads as a mobile website in a wrapper** — bordered cards, soft shadows, rounded corners throughout — rather than a native-feeling phone tool.

`frontend-design` also named what to **leave alone**: the token architecture, the tight mobile spacing scale, the status-badge system, the bottom nav, the form inputs, the reduced-motion handling, and the PWA setup. `impeccable` and `taste` independently praised the mode switcher's accessibility, the login screen's composition, the global `:focus-visible` coverage, the benefit-focused permission modal, and the Sales-screen switch prompt.

---

## Recommended order

1. **The sticky-bar collision** (finding 1). It is a functional break in a shipped feature, it is small, and it is mine.
2. **The two invisible-text bugs** (2, 3). One-line token corrections; both are silent accessibility failures.
3. **The contrast probe** (meta-finding). Until it tests real values, every contrast regression is invisible — fixing it makes the rest of the list verifiable.
4. **QuickEntryModal focus trap** (7) — the last modal without one.
5. Then the medium tier, led by the remaining token drift and the two missing skeletons.
6. Distinctiveness is a separate conversation and a larger one. It should not be bundled with defect fixes — mixing "this is broken" with "this is generic" is how a working app gets destabilised.

---

## What this audit could not judge

- **Populated list density.** Every capture except Sales was an empty state. The Sales screen has real data (₱80.00, 1 sale, 4 items, "nova bbq"), but Inventory was empty, so group/batch density is unverified.
- **Dark mode, anywhere.** No dark-mode capture was taken.
- **Product Detail, Cart Review, and every modal/sheet** — QuickEntry, EditBatch, SetStock, ConfirmDialog, the tutorial.
- **Motion.** Animations and transitions were read from the CSS, never observed.
- **One unverified reading:** two vision passes disagreed about faint text near the Scan Barcode button. Not reported as a defect.

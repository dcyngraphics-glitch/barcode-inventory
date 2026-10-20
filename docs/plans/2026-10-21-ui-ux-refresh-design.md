# UI/UX Refresh — Visibility & Brand Design

> **For implementer:** Use TDD throughout. Write failing test first. Watch it fail. Then implement.

**Goal:** Make the Barcode Inventory app read as a recognisable Filipino-grocery product instead of a generic mobile-SaaS wrapper — stronger identity (brand lockup, mode differentiation, ₱ brand mark, display treatment), a product-image system that renders a grocery shelf, a correct app icon set, and a CSS foundation (focus-visible baseline, `fade-in` keyframes, consolidated buttons/tokens, touch targets) that actually supports the visual changes.

**Approach:** Five subagent workstreams, each fully TDD:
- **A — Identity & brand lockup** (login logo, Shop/Sell accent differentiation, ₱ brand mark, display treatment)
- **B — Product image system** (shelf-tag/barcode preview replacing the grey Package icon) + ₱ struck-through treatment on product cards
- **C — App icon set** (icon-192.png / icon-512.png replacing the missing reference)
- **D — CSS foundation** (global `:focus-visible` baseline, `fade-in` keyframes, consolidated `.btn-primary`/`.btn-secondary`, mode-accent tokens)
- **E — Touch targets** (44 px on till qty/remove, toast dismiss/action, bottom-nav)

**Palette decision (authoritative):** keep slate+emerald as ink/primary accent, but add a **caramel-coffee-cream** surface family (coffee-table tones) for the product layer, anchored in the Filipino grocery brand family (Bear Brand, Nescafé, tablea). Emerald reserved for status (fresh/expiry) and primary actions (scan); warm amber (`#b45309` family) for the Sell/register layer. No new web font (load risk) — Inter stays for UI; brand names get a stronger display treatment.

**Typography decision:** Inter for all UI; brand names get bold weights and tightened tracking; no new display-typeface dependency.

**Icon decision:** generate two PNG app icons from the existing barcode glyph; fix the `/icon-192.png` reference in `index.html` + `manifest`.

**Touch-target decision:** 44×44 on all interactive controls (WCAG).

**Verification:** vitest per workstream → `tsc --noEmit` → `vite build` → desktop capture. Visual/a11y checks supplement the unit/component tests (jsdom cannot exercise CSS layout).

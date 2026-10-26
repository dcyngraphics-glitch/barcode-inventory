# Apple-Inspired UI Redesign — Design Plan

**Status: report only.** This file records the plan. No source files are modified.

---

## 1. Goal

Redesign the Barcode Inventory app's surface to read as a **recognisable, premium Apple product** — clean, minimal, refined, expensive — while keeping every inventory/scan/sync capability intact. Direction is a *supersession* of the existing slate + emerald refresh plan (docs/plans/2026-10-21-ui-ux-refresh-design.md).

## 2. Working principles (Apple Human Interface Guidelines)

1. **Space is the primary carrier of elegance.** Room around every element; nothing touches; whitespace is a feature, not an absence of layout.
2. **Hierarchy through type.** One clear focal point per screen. Type sizes, weights, and letter-spacing (only small labels) carry the structure. No all-caps labels except tiny acronyms.
3. **Restraint in colour.** A muted neutral surface family. Colour is reserved for: status (fresh/expiry), the single primary action, and a warm accent for the Sell register layer.
4. **Depth through subtlety.** Soft, layered shadows. No heavy gradients or skeuomorphic edges. Light and dark surfaces that recede.
5. **Motion is informative, not decorative.** Enter/exit at 150–250 ms with spring/overshoot for lively-but-calm feel. Respect `prefers-reduced-motion`.
6. **Text carries information.** Legible at arm's length; monospace only for barcodes and numeric codes.

## 3. Design tokens (replacement surface family)

| Role | Light | Dark | Note |
|---|---|---|---|
| Background | `#F5F5F7` (warm paper) | `#1D1D1F` (near-black) | Calm, not stark |
| Surface / card | `#FFFFFF` | `#2C2C2E` | Soft-edged card on paper |
| Border / divider | `#D2D2D7` | `#434346` | Muted, never harsh |
| Ink (text) | `#1D1D1F` | `#F5F5F7` | Single ink colour per theme |
| Secondary text | `#8E8E93` | `#A3A3A5` | Muted labels |
| Primary action / CTA | `#0071E0` (Apple blue) | `#00A1E2` | One accent only |
| Accent (status) | `#008F4C` (fresh green) | `#00A86B` | Expiry freshness |
| Accent (Sell / register) | `#F2A900` (warm amber) | `#FFC44C` | Reserved for the register layer |
| Destructive | `#FF3B30` | `#FF5555` | Red for destructive only |

**Typography.** Inter (already loaded) for all UI text and numbers. The brand name ("Barcode Inventory") gets heavier weight + tighter tracking as a display mark. No new typeface dependency (download risk is real; SF Pro's system fallback covers it on-device). Monospace (`SF Mono`-family fallback) only for barcodes, prices, and codes.

**Iconography & imagery.** lucide-react already used with consistent stroke. Increase stroke-weight consistency to the sf-style (~1.8px) and keep icons to a single weight. Replace the flat grey `Package` icon with a recognised **shelf-tag / barcode preview** so product cards look like a real grocer's shelf, not a stock photo.

**Elevation.** Layer the page surface, cards, sheets, and the camera viewfinder. Shadows are soft and small; never a 12px blur on everything. The scanner viewfinder is the deepest element on screen — it must feel like a window, not a browser chrome.

## 4. Component direction

| Component | Current | Apple-inspired direction |
|---|---|---|
| App bar | Gradient slate header | Subtle bottom border; title in plain type; left pill back / close for sheets; right: contextual action |
| Buttons | Flat `btn`/`btn-primary`/`btn-secondary` | Single primary (filled, accent) + ghost/outline. Full-width for singletons (login, debit). 44px min touch |
| Forms | Inline `style` inputs | System-style text fields: focus state is a 2px hairline ring (no shadow blob), label above, clear errors in-line |
| Cards | Flat `#fff` with `1px solid` border | Subtle 1px border + soft shadow; lift on press |
| Badges | `badge-good/warning/expired` | Pill, single ink text, lower-opacity background |
| Sheets / modals | Full-screen-ish `fixed` | System-style bottom sheet: drag handle, light swipe-to-dismiss, inline focus, clean corner radius |
| Bottom nav | 3–4 items | Apple-like tab bar: icon + label, active row highlight (not a filled circle), reduced height, sticky to edge |
| Toasts | Opacity/badge toasts | Simple text + optional inline action; fades/slides, never a pop |
| Camera viewfinder | Border + overlay | **The hero**: large, clean window with a thin scan-line; start overlay fades in; results cascade in |
| Empty states | Text-only | Icon + one-line copy + a single primary CTA |
| Recent scans | Inline list | Compact, single-line, could disappear in Scan via "keep scanning" |

## 5. Screen-by-screen treatment

### Login screen
- Remove the lone `Mail` icon; replace with the **barcode brand mark** (a clean, centered lockup with the brand name in display type + supporting line).
- Panel centred on the warm paper; the Sign-in button is the anchor (accent fill, large, generous padding).
- Keep error state tidy and single-line; do not stack alerts.

### Scanner / camera screen (the centrepiece)
- The camera viewfinder is a **large, unobtrusive window** with a thin scan line that persists but never distracts. Start overlay and hint copy are minimal.
- Toolbar above the viewfinder is reduced to: title, a slim offline badge (only when offline), and the auto/manual toggle.
- The floating scan button is the only large, colourful element on screen; everything else is quiet.
- "Scanning…" state is a simple pulsing ring or counter — no gradient, no heavy shadow.
- Results (product detail, added to cart) animate in without blocking the scan path.

### Inventory list
- Search bar is a refined field that sits flush above the list; filter chips are tappable row-equals.
- Product cards: shelf-tag image + product name (display type) + brand + single **₱ price** (bold, thin tracking) + a struck-through regular price (like Apple's sale price), with the expiry status shown as a subtle tint/badge — never an alarm.
- Empty state: one icon, one line, and a "Scan now" CTA.

### Product detail
- Hero: shelf-tag image at the top, name in display type, brand/meta as secondary line.
- Status badge sits in the same calm family as the product name.
- Barcode renders in monospace in the corner (small, quiet).
- Form is a clean sheet — fields stack, the Submit/Update button is the single anchor, and Save/Update feedback is immediate and calm.

### Cart / register (Sell mode)
- The register (cashier) flow changes *behaviour*, not whole look. The till bar holds the running total and a large legible ₱ total; the pay button is the anchor.
- Cart lines are single-row with subtle quantity steppers (44px targets).
- Sales summary sheet opens inline, clean.

### Settings
- Plain list, two columns never clash with the vertical column rhythm. Sections are subtle heading rows; toggles and steppers are refined system copies of the form field.
- Theme toggle uses the system cycle (auto/light/dark), with the icon label reading as a simple list.

### Bottom nav
- 3–4 items (Shop adds Sales). Icon + label, a single active indicator row, reduced height, naturally anchored to the safe area.

### Sheets / modals
- Product management sheet opens as a bottom sheet with a drag handle; settings and quick-entry follow the same calm grammar.

### Toasts / banners
- Toast: single line of text, timer out, optional undo for destructive/long-lived actions. Install banner is a slim bottom bar, set on the 3rd visit, with a single "Install" action.

## 6. Mode differentiation (Shop vs Sell)

Mode should be conveyed **subtly**, not by changing the whole look:
- Shop = default, the "fresh inventory" view (green accent, paper surfaces).
- Sell = the register view (warm amber accent for the till bar, cart flows inline, "Sales" appears in the tab bar).
- The same token system carries both; no separate theme, no jarring switch.

## 7. Motion & micro-interactions

- Screen transitions: cross-fade or matching-slide at 150–200 ms, spring for enter.
- Buttons: press feedback is a gentle 1–2 px scale-down + the fixed button's shadow lifts; not a colour jump.
- Product cards: hover/focus isn't relevant on mobile, so leave as is; focus-visible is a 2px ring (WCAG).
- Value/quantity changes, additions to cart, and status switches animate with the reduced-motion-safe easing.
- Reduced-motion is honoured first (OS setting), not an afterthought.

## 8. Files to change (read-only plan; nothing implemented here)

- `src/index.css` — token surface family, focus baseline, button/card/input/jawforms, bottom nav, shadows, keyframes.
- `src/components/LoginScreen.tsx` — brand mark + login layout.
- `src/components/ProductImage.tsx` — shelf-tag/image system.
- `src/components/BottomNav`-family component — refined tab bar.
- `src/screens/ScannerScreen.tsx` — refined call-to-action + viewfinder grammar.
- `src/screens/InventoryScreen.tsx` / `ProductDetailScreen.tsx` / `SettingsScreen.tsx` — refined heads, cards, and forms.
- `src/index.html` + manifest — app icon set (shelf-tag glyph).
- Tests updated to match the new tokens (no layout assertions in jsdom).

## 9. Verification

- `pnpm test` / `vitest` per component (TDD-first) → green.
- `tsc --noEmit` → no type errors.
- `vite build` → production build succeeds.
- Desktop + mobile capture of: Login, Scanner, Inventory, Product Detail, Sell Till, Settings — recorded in the final report.

---

*Plan draft for review; no files modified.*

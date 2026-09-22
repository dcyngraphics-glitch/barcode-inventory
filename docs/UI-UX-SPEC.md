# UI/UX Design Specification — Barcode Inventory

> Generated with ui-ux-pro-max skill. Master file + page-specific overrides.

---

## 1. Design System (Master)

### Color Palette

| Role | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Primary | `#334155` | `--color-primary` | App bar, headers, focus rings |
| On Primary | `#FFFFFF` | `--color-on-primary` | Text on primary |
| Secondary | `#475569` | `--color-secondary` | Secondary buttons, icons |
| On Secondary | `#FFFFFF` | `--color-on-secondary` | Text on secondary |
| Accent/CTA | `#059669` | `--color-accent` | Scan button, "Add to Inventory", success states |
| On Accent/CTA | `#FFFFFF` | `--color-on-accent` | Text on accent |
| Background | `#F8FAFC` | `--color-background` | App background |
| Foreground | `#0F172A` | `--color-foreground` | Primary text |
| Card | `#FFFFFF` | `--color-card` | Cards, sheets, modals |
| Card Foreground | `#0F172A` | `--color-card-foreground` | Text on cards |
| Muted | `#F2F3F4` | `--color-muted` | Dividers, disabled states |
| Muted Foreground | `#475569` | `--color-muted-foreground` | Secondary text, placeholders |
| Border | `#E6E8EA` | `--color-border` | Card borders, input borders |
| Destructive | `#DC2626` | `--color-destructive` | Delete buttons, expired badges, errors |
| On Destructive | `#FFFFFF` | `--color-on-destructive` | Text on destructive |

**Semantic Status Colors:**
| Status | Hex | Usage |
|--------|-----|-------|
| Good (fresh) | `#16A34A` | Expiry badge — item is safe |
| Warning (expiring soon) | `#D97706` | Expiry badge — within alert window |
| Expired | `#DC2626` | Expiry badge — past expiry date |

### Typography

- **Font:** Inter (Google Fonts)
- **Import:** `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');`
- **Scale:**

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `--text-xs` | 12px | 400 | Timestamps, metadata |
| `--text-sm` | 14px | 400 | Secondary text, badges |
| `--text-base` | 16px | 400 | Body text, inputs |
| `--text-lg` | 18px | 500 | Card titles |
| `--text-xl` | 20px | 600 | Screen headings |
| `--text-2xl` | 24px | 600 | Hero text, large numbers |
| `--text-3xl` | 30px | 700 | Empty states, big stats |

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | 4px | Tight gaps (icon + label) |
| `--space-sm` | 8px | Inline spacing, badge padding |
| `--space-md` | 16px | Standard padding, input spacing |
| `--space-lg` | 24px | Section padding, card gaps |
| `--space-xl` | 32px | Large gaps, screen margins |
| `--space-2xl` | 48px | Section margins |
| `--space-3xl` | 64px | Hero padding |

### Shadows

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift (badges) |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Bottom sheets, dialogs |

### Effects & Motion

- **No gradients, no 3D, no complex shadows**
- **Transitions:** 150–200ms ease for all state changes
- **Hover:** Opacity shift (0.9) or subtle color change — no layout-shifting transforms
- **Entrance:** Fade-in (150ms) for modals, slide-up (200ms) for bottom sheets
- **Exit:** Fade-out (100ms) — exits are faster than entrances
- **Reduced motion:** All animations disabled under `prefers-reduced-motion: reduce`

---

## 2. Global Components

### Bottom Navigation (Primary Nav)

Fixed bottom bar, 3 tabs:

| Tab | Icon (Lucide) | Label | Route |
|-----|---------------|-------|-------|
| 1 | `ScanLine` | Scan | `/` |
| 2 | `Package` | Inventory | `/inventory` |
| 3 | `Settings` | Settings | `/settings` |

**Specs:**
- Height: 64px + safe-area-inset-bottom
- Background: `var(--color-card)` with top border `var(--color-border)`
- Active tab: `var(--color-primary)` icon + label, inactive: `var(--color-muted-foreground)`
- Icon size: 24px, label: 12px (`--text-xs`)
- Transition: color 150ms ease
- Touch target: full width of each tab (min 44×44px)
- **No badge counts on nav** — keep it clean

### Top App Bar

- Height: 56px
- Background: `var(--color-primary)` (#334155)
- Title: Inter 600, 18px (`--text-lg`), white
- Back button: `ArrowLeft` icon, white, 24px
- Action icons: white, 24px, min 44×44px touch target

### Buttons

**Primary Button (CTA):**
```css
.btn-primary {
  background: #059669;
  color: #FFFFFF;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 16px;
  min-height: 44px;
  transition: opacity 200ms ease;
  cursor: pointer;
}
.btn-primary:hover { opacity: 0.9; }
.btn-primary:active { opacity: 0.8; }
```

**Secondary Button:**
```css
.btn-secondary {
  background: transparent;
  color: #334155;
  border: 2px solid #334155;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 16px;
  min-height: 44px;
  transition: all 200ms ease;
  cursor: pointer;
}
```

**Destructive Button:**
```css
.btn-destructive {
  background: #DC2626;
  color: #FFFFFF;
  /* same sizing as primary */
}
```

**Ghost/Text Button:**
```css
.btn-ghost {
  background: transparent;
  color: #334155;
  padding: 8px 16px;
  font-weight: 500;
  min-height: 44px;
  cursor: pointer;
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E6E8EA;
  border-radius: 8px;
  font-size: 16px;
  font-family: Inter;
  background: #FFFFFF;
  color: #0F172A;
  transition: border-color 200ms ease, box-shadow 200ms ease;
  width: 100%;
}

.input:focus {
  border-color: #334155;
  outline: none;
  box-shadow: 0 0 0 3px rgba(51, 65, 85, 0.15);
}

.input::placeholder { color: #475569; }
```

**Input with label:**
- Label: Inter 500, 14px (`--text-sm`), `var(--color-foreground)`, margin-bottom 4px
- Error text: Inter 400, 12px (`--text-xs`), `var(--color-destructive)`, margin-top 4px
- Error state: border `var(--color-destructive)`, no color-only indication (also show error icon)

**Numeric input:**
- `inputmode="decimal"` for price
- `inputmode="numeric"` for quantity

**Date input:**
- `type="date"` for expiry date
- Display format in UI: "Mar 15, 2027"

### Cards

```css
.card {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #E6E8EA;
  transition: box-shadow 200ms ease;
}
```

### Badges / Chips

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.badge-good { background: #DCFCE7; color: #166534; }
.badge-warning { background: #FEF3C7; color: #92400E; }
.badge-expired { background: #FEE2E2; color: #991B1B; }
.badge-neutral { background: #F2F3F4; color: #475569; }
```

**Note:** All status badges include text labels ("Good", "Expiring", "Expired") — never color alone.

### Modal / Bottom Sheet

```css
.bottom-sheet {
  background: #FFFFFF;
  border-radius: 16px 16px 0 0;
  padding: 24px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
  box-shadow: 0 -10px 15px rgba(0,0,0,0.1);
  max-width: 500px;
  margin: 0 auto;
  animation: slide-up 200ms ease;
}

@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
```

---

## 3. Screen Specs

### 3.1 Scanner Screen (Home)

**Layout:**
```
┌─────────────────────────────┐
│  Top App Bar (56px)         │
│  "Scan Product"             │
├─────────────────────────────┤
│                             │
│  Camera Viewfinder          │
│  (flex-1, full width)       │
│  ┌─────────────────────┐    │
│  │                     │    │
│  │   Scan frame        │    │
│  │   (240×240,         │    │
│  │    rounded, border) │    │
│  │                     │    │
│  └─────────────────────┘    │
│                             │
│  "Point camera at barcode"  │
│                             │
├─────────────────────────────┤
│  Manual Entry Button        │
│  "Enter barcode manually"   │
├─────────────────────────────┤
│  Recent Scans (last 5)      │
│  ┌─────────────────────┐    │
│  │ Pringles ... 2d ago │    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │ Coca-Cola ... 1h ago│    │
│  └─────────────────────┘    │
├─────────────────────────────┤
│  Bottom Nav (64px)          │
│  [Scan] [Inventory] [Set]   │
└─────────────────────────────┘
```

**Camera Viewfinder:**
- Full-width camera feed, aspect-ratio 4:3 or fills available space
- Scan frame: 240×240px, centered, border 3px `var(--color-accent)`, border-radius 12px
- Corner brackets (4 L-shaped corners) in `var(--color-accent)` for scan targeting
- Overlay: semi-transparent dark (rgba(0,0,0,0.4)) outside the scan frame area
- Flash toggle button: `Zap` / `ZapOff` icon, positioned top-right of viewfinder
- Auto-focus: continuous, with haptic feedback + beep on successful scan

**Manual Entry:**
- Ghost button below viewfinder: `Keyboard` icon + "Enter barcode manually"
- Opens bottom sheet with input field + "Look Up" button

**Recent Scans:**
- Horizontal scrollable list (snap scrolling)
- Each card: 120px wide, product image (or placeholder), name (truncated), time ago
- Tap → navigate to Product Detail for that barcode
- "View all" link → navigates to Inventory

**States:**
- **Loading:** Skeleton pulse on camera area while camera initializes
- **Camera denied:** Icon + "Camera permission required" + "Enable in Settings" button
- **Camera not available:** Fallback to manual entry only
- **Offline:** Small wifi-off icon in app bar (non-blocking, just informational)

---

### 3.2 Product Detail Screen (Post-Scan)

**Triggered by:** Successful scan

**Layout:**
```
┌─────────────────────────────┐
│  Top App Bar (56px)         │
│  ←  "Product Details"       │
├─────────────────────────────┤
│                             │
│  Product Hero               │
│  ┌─────────────────────┐    │
│  │                     │    │
│  │   Product Image     │    │
│  │   (120×120 or       │    │
│  │    placeholder)     │    │
│  │                     │    │
│  └─────────────────────┘    │
│                             │
│  Product Name               │
│  Brand · Category           │
│                             │
│  ┌─ Status Badge ────────┐  │
│  │ "New Product" or       │  │
│  │  "In Catalog"         │  │
│  └────────────────────────┘  │
│                             │
│  ── Editable Form ────────  │
│                             │
│  Price (₱)                  │
│  ┌─────────────────────┐    │
│  │ 25.00               │    │
│  └─────────────────────┘    │
│                             │
│  Expiry Date                │
│  ┌─────────────────────┐    │
│  │ 03/15/2027          │    │
│  └─────────────────────┘    │
│                             │
│  Quantity                   │
│  ┌─────────────────────┐    │
│  │ 1              [+]  │    │
│  └─────────────────────┘    │
│                             │
│  [    ADD TO INVENTORY    ]  │
│  (full-width primary btn)   │
│                             │
├─────────────────────────────┤
│  Bottom Nav (64px)          │
└─────────────────────────────┘
```

**Behavior:**
- All fields are **editable** — pre-filled from catalog/API, user can adjust
- **Price:** `inputmode="decimal"`, prefix "₱" symbol, validate > 0
- **Expiry Date:** `type="date"`, show formatted date, validate not empty
- **Quantity:** `inputmode="numeric"`, default 1, min 1, stepper buttons (+/−)
- **Add to Inventory:** Primary CTA, full-width, min-height 48px
  - On tap: loading state (spinner) → success feedback (brief toast "Added!") → navigate to Inventory
  - Error state: inline error message if save fails

**New Product State:**
- If barcode not found in catalog: badge shows "New Product" (accent color)
- Fields start empty (except barcode, which is shown read-only)
- User must fill in name, price, expiry at minimum
- On save: creates new Product record + new Batch

**Existing Product State:**
- Fields pre-filled from catalog: `storePrice`, `defaultExpiry`, name, brand
- Badge shows "In Catalog" (neutral/green)
- On save: creates new Batch with entered expiry + quantity, updates `storePrice` if changed

**Edit Existing Product (link):**
- Small text link: "Edit product details" below the form
- Opens Product Management modal for this product

---

### 3.3 Inventory Screen

**Layout:**
```
┌─────────────────────────────┐
│  Top App Bar (56px)         │
│  "My Inventory"             │
├─────────────────────────────┤
│  Search Bar                 │
│  ┌─────────────────────┐    │
│  │ 🔍 Search products  │    │
│  └─────────────────────┘    │
│                             │
│  Filter Chips             │
│  [All] [Expiring] [Expired] │
│                             │
│  ── Product Group ──────    │
│                             │
│  ┌─ Product Header ────┐   │
│  │ Pringles            │   │
│  │ 3 items · Exp: Mar │   │
│  │ ┌────┐ ┌────┐       │   │
│  │ │Warn│ │Good│       │   │
│  │ └────┘ └────┘       │   │
│  │ [Expand ▼]          │   │
│  └─────────────────────┘   │
│                             │
│  ┌─ Expanded Batches ──┐   │
│  │ • Mar 15, 2027  ⚠ 2│   │
│  │ • Jun 30, 2027  ✓ 1│   │
│  │ [Delete] [Edit]     │   │
│  └─────────────────────┘   │
│                             │
│  ┌─ Product Header ────┐   │
│  │ Coca-Cola 1.5L      │   │
│  │ 2 items · Exp: Feb │   │
│  │ ┌────────┐          │   │
│  │ │Expired │          │   │
│  │ └────────┘          │   │
│  │ [Expand ▼]          │   │
│  └─────────────────────┘   │
│                             │
├─────────────────────────────┤
│  Bottom Nav (64px)          │
└─────────────────────────────┘
```

**Product Group Card:**
- Header: Product name (Inter 600, 16px), "N items · Earliest Exp: Mon DD, YYYY" (Inter 400, 12px, muted)
- Status badges: shown for each unique expiry status in the product's batches (e.g., "Expiring" + "Good")
- Expand/Collapse: chevron icon, 200ms ease transition
- Expand reveals batch list, sorted by expiry (FIFO — earliest first)

**Batch Row (inside expanded group):**
- Format: `• Expiry Date · Quantity` with status badge
- Expiry date formatted: "Mar 15, 2027"
- Quantity shown as "× 2" with Package icon
- Actions (long-press or swipe): "Delete" (destructive), "Edit" (ghost)
- Delete: confirmation dialog "Remove this batch? This cannot be undone."
- Swipe-to-delete: red background, `Trash2` icon revealed on swipe left

**Filter Chips:**
- Sticky below search bar, horizontal scroll
- Options: **All** (default), **Expiring Soon**, **Expired**, **Good**
- Active chip: `var(--color-primary)` background, white text
- Inactive chip: `var(--color-muted)` background, `var(--color-muted-foreground)` text
- Border-radius: 999px (pill shape)

**Search:**
- Filters products by name or brand (case-insensitive, partial match)
- Debounced input (200ms)
- Empty result state: Package icon + "No products found" + "Try a different search term"

**Empty State (no inventory):**
- Large Package icon (64px, muted color)
- "Your inventory is empty" (Inter 600, 18px)
- "Scan your first product to get started" (Inter 400, 14px, muted)
- "Scan Now" button → navigates to Scanner

**Pull to Refresh:**
- `overscroll-behavior: contain` (prevents accidental page refresh)
- On pull: reload data from IndexedDB

---

### 3.4 Settings Screen

**Layout:**
```
┌─────────────────────────────┐
│  Top App Bar (56px)         │
│  "Settings"                 │
├─────────────────────────────┤
│                             │
│  ── Notifications ──────    │
│                             │
│  ┌─────────────────────┐    │
│  │ Push Notifications  │    │
│  │ [Toggle switch]     │    │
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │ Alert Window        │    │
│  │ [  3  ] days before │    │
│  │ [−] [+] steppers    │    │
│  └─────────────────────┘    │
│                             │
│  ── Data ───────────────    │
│                             │
│  ┌─────────────────────┐    │
│  │ Export Inventory    │    │
│  │ [Download JSON]     │    │
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │ Clear All Data      │    │
│  │ [Delete Everything] │    │
│  │ (destructive)       │    │
│  └─────────────────────┘    │
│                             │
│  ── About ──────────────    │
│                             │
│  ┌─────────────────────┐    │
│  │ Barcode Inventory   │    │
│  │ Version 1.0.0       │    │
│  │ [GitHub] [Licenses] │    │
│  └─────────────────────┘    │
│                             │
├─────────────────────────────┤
│  Bottom Nav (64px)          │
└─────────────────────────────┘
```

**Push Notifications:**
- Toggle switch (iOS/Android style)
- When off: Alert Window setting is greyed out and disabled
- When on: triggers browser permission request if not already granted
- If permission denied: show inline notice "Notifications blocked by browser"

**Alert Window:**
- Numeric stepper: `[−] [ value ] [+]`
- Range: 1–30 days
- Default: 3
- Validation: min 1, max 30, whole numbers only
- Helper text: "We'll notify you this many days before an item expires"

**Export:**
- Button: "Export as JSON" (secondary button)
- Downloads `barcode-inventory-export-{date}.json`
- Contains: all products, all batches, export timestamp
- Toast on success: "Exported 12 products, 34 batches"

**Clear All Data:**
- Destructive button: "Delete Everything"
- Confirmation modal:
  - Title: "Delete all inventory data?"
  - Body: "This will permanently remove all products and batches. This cannot be undone."
  - Actions: "Cancel" (ghost), "Delete Everything" (destructive)
- On confirm: clears both IndexedDB stores, toast "All data cleared"

---

### 3.5 Product Management (Edit Catalog Product)

**Triggered by:** "Edit product details" link from Product Detail screen

**Layout (Bottom Sheet):**
```
┌─────────────────────────────┐
│  Drag handle (40px)         │
│  ═══════════════════        │
│                             │
│  "Edit Product"             │
│  (Inter 600, 18px)          │
│                             │
│  Product Name               │
│  ┌─────────────────────┐    │
│  │ Pringles            │    │
│  └─────────────────────┘    │
│                             │
│  Brand                      │
│  ┌─────────────────────┐    │
│  │ Pringles Co.        │    │
│  └─────────────────────┘    │
│                             │
│  Category                   │
│  ┌─────────────────────┐    │
│  │ Snacks              │    │
│  └─────────────────────┘    │
│                             │
│  Default Price (₱)          │
│  ┌─────────────────────┐    │
│  │ 25.00               │    │
│  └─────────────────────┘    │
│                             │
│  Default Expiry            │
│  ┌─────────────────────┐    │
│  │ 03/15/2027          │    │
│  └─────────────────────┘    │
│                             │
│  [    SAVE CHANGES    ]     │
│  (primary button)           │
│                             │
│  [  DELETE PRODUCT  ]       │
│  (destructive, text-only)   │
│                             │
└─────────────────────────────┘
```

**Behavior:**
- All fields editable
- Save: updates Product record, does NOT affect existing batches
- Delete Product: confirmation modal, deletes product + all its batches
- Default Expiry is used to pre-fill expiry on future scans

---

## 4. Status & Feedback

### Toast Notifications

- Position: bottom-center, above bottom nav (72px from bottom)
- Background: `var(--foreground)` (#0F172A), text: white
- Padding: 12px 24px, border-radius: 8px
- Duration: 3 seconds, fade-out 200ms
- Types: success (accent icon), error (destructive icon), info (neutral icon)
- Max visible: 1 at a time (queue others)

### Loading States

- **Button loading:** Spinner replaces text, button disabled, opacity 0.7
- **Screen loading:** Skeleton pulse (background: `var(--color-muted)`, shimmer animation)
- **Inline loading:** Small spinner (20px) next to content

### Success Feedback

- Scan success: haptic vibration (50ms) + camera frame flashes green briefly
- Save success: toast "Added to inventory" + brief checkmark animation
- Export success: toast with file size

### Error Feedback

- Camera error: inline error on scanner screen, "Try Again" button
- Save error: inline error below form, red border on failed input
- Network error (API lookup): "Couldn't look up product online. Enter details manually." + manual form

---

## 5. Accessibility

- **Contrast:** All text ≥ 4.5:1 ratio against background
- **Touch targets:** All interactive elements ≥ 44×44px
- **Focus states:** Visible 2px `var(--color-ring)` outline on keyboard focus
- **Color independence:** Status never conveyed by color alone — always include text labels or icons
- **Screen reader:** All icons have `aria-label`, badges have `role="status"`, live regions for toast
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` disables all transitions/animations
- **Viewport:** `width=device-width, initial-scale=1, viewport-fit=cover`
- **Safe areas:** `env(safe-area-inset-*)` for notched phones on all fixed bars
- **Input types:** `inputmode` attributes for appropriate mobile keyboards
- **Labels:** Every input has a visible `<label>` element (not placeholder-only)

---

## 6. Dark Mode

Supported via CSS custom properties + `prefers-color-scheme` media query:

| Role | Light | Dark |
|------|-------|------|
| Background | `#F8FAFC` | `#0F172A` |
| Card | `#FFFFFF` | `#1E293B` |
| Foreground | `#0F172A` | `#F8FAFC` |
| Muted | `#F2F3F4` | `#334155` |
| Muted Foreground | `#475569` | `#94A3B8` |
| Border | `#E6E8EA` | `#334155` |
| Primary | `#334155` | `#64748B` |

- Toggle in Settings: "Dark Mode" (Auto / Light / Dark)
- Auto: follows `prefers-color-scheme`
- Preference stored in localStorage

---

## 7. Responsive Breakpoints

| Breakpoint | Target | Layout Changes |
|------------|--------|----------------|
| 375px | iPhone SE | Single column, compact spacing |
| 768px | iPad / landscape phone | Wider cards, 2-column inventory groups |
| 1024px | Tablet | Side-by-side product detail |
| 1440px | Desktop | Max-width container (500px), centered |

**Mobile-first:** Base styles target 375px, breakpoints use `min-width`.

---

## 8. Icon Set

**Library:** [Lucide](https://lucide.dev) (SVG, tree-shakeable, consistent 24px grid)

| Icon | Usage |
|------|-------|
| `ScanLine` | Scanner tab, scan button |
| `Package` | Inventory tab, product icon |
| `Settings` | Settings tab |
| `ArrowLeft` | Back button |
| `Camera` | Camera states |
| `Zap` / `ZapOff` | Flash toggle |
| `Keyboard` | Manual entry |
| `Search` | Search bar |
| `ChevronDown` / `ChevronUp` | Expand/collapse |
| `Plus` / `Minus` | Quantity stepper |
| `Trash2` | Delete actions |
| `Pencil` | Edit actions |
| `Bell` | Notifications |
| `BellOff` | Notifications disabled |
| `Download` | Export |
| `Calendar` | Expiry date |
| `AlertTriangle` | Expiring/expired |
| `CheckCircle` | Success |
| `X` | Close, dismiss |
| `WifiOff` | Offline indicator |
| `PackageOpen` | Empty inventory state |
| `ExternalLink` | GitHub link |

---

## 9. PWA Manifest

```json
{
  "name": "Barcode Inventory",
  "short_name": "ScanInv",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#F8FAFC",
  "theme_color": "#334155",
  "orientation": "portrait",
  "icons": [...]
}
```

---

## 10. Anti-Patterns to Avoid

- ❌ Emojis as icons (use Lucide SVG)
- ❌ Missing `cursor: pointer` on clickable elements
- ❌ Hover-only interactions (mobile has no hover)
- ❌ Layout-shifting transforms (no scale on hover)
- ❌ Color-only status indication
- ❌ Instant state changes (always 150-200ms transitions)
- ❌ Invisible focus states
- ❌ Placeholder-only labels
- ❌ Horizontal scroll on main screens
- ❌ Content hidden behind fixed bars (use safe-area padding)
- ❌ Desktop-first responsive design

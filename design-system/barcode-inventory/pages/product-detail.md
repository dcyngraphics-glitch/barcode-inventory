# Product Detail Page Overrides

> **PROJECT:** Barcode Inventory
> **Generated:** 2026-09-22 10:17:38
> **Page Type:** Product Detail

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).
> Only deviations from the Master are documented here. For all other rules, refer to the Master.

---

## Page-Specific Rules

### Layout Overrides

- **Max Width:** 1200px (standard)
- **Layout:** Full-width sections, centered content
- **Sections:** Intro (Vertical) > The Journey (Horizontal Track) > Detail Reveal > Vertical Footer

### Spacing Overrides

- No overrides — use Master spacing

### Typography Overrides

- No overrides — use Master typography

### Color Overrides

- **Strategy:** Continuous palette transition. Chapter colors. Progress bar #000000.

### Component Overrides

- Avoid: No feedback after submit
- Avoid: Placeholder-only inputs
- Avoid: Force all chips into one clipped row or hide overflow values

---

## Page-Specific Components

- No unique components for this page

---

## Recommendations

- Effects: WebGL/Three.js 3D, realistic shadows (layers), physics lighting, parallax (3-5 layers), smooth 3D (300-400ms)
- Forms: Show loading then success/error state
- Accessibility: Use label with for attribute or wrap input
- Layout: Wrap the collection or use an operable +n disclosure for hidden overflow values
- CTA Placement: Floating Sticky CTA or End of Horizontal Track

# UI Improvements from Browser Comments — Implementation Plan

> **For implementer:** Use TDD throughout. Write failing test first. Watch it fail. Then implement.

**Goal:** Address 4 in-app browser comments grouped into 3 work units: (1) combine Shop/Sell switch with scan mode toggle, (2) clarify cart badge purpose in scanner app bar, (3) add breathing room to filter chips.

**Architecture:** All changes are localized CSS/JSX tweaks in existing components. No new components, no state changes, no API modifications.

**Tech Stack:** React, TypeScript, Vite, Vitest, Tailwind-like CSS tokens in `src/index.css`

---

### Task 1: Move Shop/Sell switch into ScannerScreen app bar, replace scan mode toggle

**Files:**
- Modify: `src/screens/ScannerScreen.tsx` (main change)
- Modify: `src/components/AppModeSwitcher.tsx` (remove from App.tsx)
- Modify: `src/App.tsx` (remove AppModeSwitcher import and render)
- Test: `src/__tests__/ScannerScreen.test.tsx` (add test for mode switch presence)

**Step 1: Write the failing test**
```tsx
// src/__tests__/ScannerScreen.test.tsx
it('renders AppModeSwitcher (Shop/Sell) in the app bar', () => {
  render(<ScannerScreen />, { wrappers: [MemoryRouter, AuthProvider, SettingsProvider, ModeProvider, ScanCartProvider] });
  expect(screen.getByRole('radiogroup', { name: /app section/i })).toBeInTheDocument();
});
```

**Step 2: Run test — confirm it fails**
Command: `npx vitest run src/__tests__/ScannerScreen.test.tsx -t "renders AppModeSwitcher"`
Expected: FAIL — element not found

**Step 3: Write minimal implementation**
- In `ScannerScreen.tsx` import `AppModeSwitcher` from `@/components/AppModeSwitcher`
- In the app-bar (around line 276-316), replace the `ModeSegmentedControl` (Auto/Manual scan toggle) with `<AppModeSwitcher />`
- Remove the "Scan" label span and `ModeSegmentedControl` import
- In `App.tsx`, remove the `AppModeSwitcher` import and the `<div className="app-mode-bar"><AppModeSwitcher /></div>` from the app container

**Step 4: Run test — confirm it passes**
Command: `npx vitest run src/__tests__/ScannerScreen.test.tsx -t "renders AppModeSwitcher"`
Expected: PASS

**Step 5: Run full test suite**
Command: `npx vitest run`
Expected: 453 tests pass

**Step 6: Commit**
`git add src/screens/ScannerScreen.tsx src/App.tsx src/__tests__/ScannerScreen.test.tsx && git commit -m "ui: move Shop/Sell switch into scanner app bar, replace scan mode toggle"`

---

### Task 2: Clarify cart badge purpose in scanner app bar

**Files:**
- Modify: `src/screens/ScannerScreen.tsx`
- Test: `src/__tests__/ScannerScreen.test.tsx` (add test for cart button aria-label)

**Step 1: Write the failing test**
```tsx
it('cart button has descriptive aria-label explaining its purpose', () => {
  render(<ScannerScreen />, { wrappers: [MemoryRouter, AuthProvider, SettingsProvider, ModeProvider, ScanCartProvider] });
  const cartBtn = screen.getByRole('button', { name: /cart/i });
  expect(cartBtn).toHaveAttribute('aria-label', expect.stringMatching(/view cart|cart review/i));
});
```

**Step 2: Run test — confirm it fails**
Command: `npx vitest run src/__tests__/ScannerScreen.test.tsx -t "cart button has descriptive aria-label"`
Expected: FAIL — aria-label is "Cart with X items"

**Step 3: Write minimal implementation**
- In `ScannerScreen.tsx` line 319-322, change `aria-label={`Cart with ${totalItems} items`}` to `aria-label={\`Review cart (${totalItems} item${totalItems === 1 ? '' : 's'})\`}`
- Optionally add a tooltip or title attribute: `title="Review items before checkout"`

**Step 4: Run test — confirm it passes**
Command: `npx vitest run src/__tests__/ScannerScreen.test.tsx -t "cart button has descriptive aria-label"`
Expected: PASS

**Step 5: Run full test suite**
Command: `npx vitest run`
Expected: 453 tests pass

**Step 6: Commit**
`git add src/screens/ScannerScreen.tsx src/__tests__/ScannerScreen.test.tsx && git commit -m "a11y: clarify cart badge purpose in scanner app bar"`

---

### Task 3: Add breathing room to filter chips

**Files:**
- Modify: `src/components/FilterChips.tsx`
- Test: `src/__tests__/FilterChips.test.tsx` (add test for spacing)

**Step 1: Write the failing test**
```tsx
// src/__tests__/FilterChips.test.tsx
it('filter chips have sufficient horizontal spacing', () => {
  render(<FilterChips active="all" onChange={vi.fn()} />);
  const container = screen.getByRole('tablist');
  expect(container).toHaveClass('filter-chips');
  // Verify CSS gap is present via computed style or class
  expect(container).toHaveStyle({ gap: 'var(--space-sm)' }); // or check className includes spacing utility
});
```

**Step 2: Run test — confirm it fails**
Command: `npx vitest run src/__tests__/FilterChips.test.tsx -t "filter chips have sufficient horizontal spacing"`
Expected: FAIL — no gap or insufficient gap

**Step 3: Write minimal implementation**
- In `FilterChips.tsx` line 17, add a CSS class for spacing: `className="filter-chips filter-chips--spacious"` (or add inline gap via CSS variable)
- In `src/index.css`, add/extend `.filter-chips` rule to include `gap: var(--space-sm)` (or `--space-md` for more breathing room)

**Step 4: Run test — confirm it passes**
Command: `npx vitest run src/__tests__/FilterChips.test.tsx -t "filter chips have sufficient horizontal spacing"`
Expected: PASS

**Step 5: Run full test suite**
Command: `npx vitest run`
Expected: 453 tests pass

**Step 6: Commit**
`git add src/components/FilterChips.tsx src/index.css src/__tests__/FilterChips.test.tsx && git commit -m "ui: add breathing room to filter chips on inventory screen"`

---

### Execution Order

1. Task 1 (Shop/Sell switch move) — highest impact, touches 2 screens
2. Task 2 (Cart badge clarity) — quick a11y win
3. Task 3 (Filter chips spacing) — simple CSS tweak

---

### Rollback / Safety

- Each task is independently revertible
- All changes are behind feature flags? No — direct DOM changes, but scope is narrow
- If Task 1 breaks mode switching, revert commit and keep AppModeSwitcher in App.tsx
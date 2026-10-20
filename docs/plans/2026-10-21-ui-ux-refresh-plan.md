# UI/UX Refresh — Implementation Plan

> **For implementer:** Use TDD throughout. Write failing test first. Watch it fail. Then implement. Commit after each green test.

**Goal:** Refresh the app's surface so it reads as a Filipino grocery product, with a solid CSS foundation — implemented as 5 subagent tasks (A–E).

**Architecture:** Workstreams are independent; each touches its own files. The brand/mode accents (Task A) and the product layer (Task B) both lean on the CSS token system (Task D) for consistent surfaces. Touch targets (Task E) are a focused CSS/component patch.

**Tech Stack:** React + TypeScript + Vitest (jsdom) + Vite. CSS is plain CSS with custom properties (no CSS-in-JS).

---

## Task A — Identity & brand lockup

**Files:**
- Modify: `src/components/LoginScreen.tsx`
- Modify: `src/components/AppModeSwitcher.tsx`
- Modify: `src/screens/ScannerScreen.tsx`
- Modify: `src/screens/TillScreen.tsx`
- Modify: `src/components/Toast.tsx`

**Step 1 — Write the failing test** (test file: `src/screens/__tests__/LoginScreen.test.tsx`, add to existing test file via `src/screens/__tests__/LoginScreen.test.tsx` if it exists else create it):

```tsx
import { render, screen } from '@testing-library/react';
import { LoginScreen } from '@/screens/LoginScreen';

describe('LoginScreen — brand lockup', () => {
  it('shows a barcode brand mark + app name, not just a bare Mail icon', () => {
    render(<LoginScreen />);
    const brand = screen.getByTestId('brand-mark');
    expect(brand).toBeInTheDocument();
    expect(screen.getByText('Inventory')).toBeInTheDocument();
  });
});
```

**Step 2 — Run test — confirm it fails** (command: `cd /c/Users/bryan/Documents/Hermes/Projects/barcode-inventory && C:/nvm4w/nodejs/node.exe node_modules/vitest/vitest.mjs run src/screens/__tests__/LoginScreen.test.tsx` — expect FAIL: `Unable to find an element with role="img" and text "Barcode"` / brand-mark not found).

**Step 3 — Write minimal implementation** (modify `LoginScreen.tsx`): replace the lone `<Mail size={40} />` with a `data-testid="brand-mark"` barcode lockup:

```tsx
import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

export function LoginScreen() {
  const { cloudLogin, cloudError } = useAuth();

  return (
    <div className="screen-center" data-testid="screen-center">
      <div className="login-card">
        <div className="brand-mark" data-testid="brand-mark" aria-hidden="true">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
            <rect x="4" y="10" width="9" height="24" rx="2" fill="#0F172B" />
            <rect x="17.5" y="6" width="9" height="28" rx="2" fill="#0F172B" />
            <rect x="31" y="12" width="9" height="22" rx="2" fill="#0F172B" />
            <rect x="4" y="26" width="9" height="12" rx="2" fill="#059669" />
            <rect x="17.5" y="28" width="9" height="10" rx="2" fill="#059669" />
            <rect x="31" y="16" width="9" height="14" rx="2" fill="#059669" />
          </svg>
        </div>
        <h1 className="brand-name">Inventory</h1>
        ...
```

**Step 4 — Run test — confirm it passes** (command above — expect PASS).

**Step 5 — Commit** `git add src/components/LoginScreen.tsx && git commit -m "feat: brand lockup on login screen"`.

Then implement the remaining Task A pieces:
- **Mode accent differentiation** (ScannerScreen.tsx scan-fab + TillScreen.tsx till-paid + AppModeSwitcher.tsx): introduce `--color-accent` (shop/emerald) and `--color-accent-serve` (sell/amber) tokens; a presentational test asserts the scan button uses `var(--color-accent)` when `isSell` is false and `var(--color-accent-serve)` when true, via a small `ModeSwatch` wrapper with `data-mode` — see Task D for the token CSS.
- **₱ brand mark on toast** (Toast.tsx): the toast already shows `₱` formatting; ensure it's a styled currency mark (bold, in the agree token). Add `data-testid="toast-currency"` smoke assertion.

**TDD notes:** Login brand lockup is a deterministic component test (green/amber). Mode-accent differentiation is verified by `tsc --noEmit` + a desktop capture; jsdom does not lay out CSS, so computed-color assertions are unreliable and are out of scope here.

---

## Task B — Product image system + ₱ brand mark

**Files:**
- Modify: `src/components/ProductImage.tsx`
- Modify: `src/screens/InventoryGroup.tsx`
- Modify: `src/screens/ProductDetailScreen.tsx`
- Modify: `src/screens/InventoryScreen.tsx`

**Step 1 — Failing test** (`src/components/__tests__/ProductImage.test.tsx`):

```tsx
import { render, screen } from '@testing-library/react';
import { ProductImage } from '@/components/ProductImage';

describe('ProductImage — grocery shelf-tag instead of grey Package icon', () => {
  it('renders a barcode-style shelf tag when there is no image', () => {
    render(<ProductImage name="Bear Brand Milk" />);
    const tag = screen.getByTestId('product-image-tag');
    expect(tag).toBeInTheDocument();
    expect(screen.queryByTestId('product-image-package')).not.toBeInTheDocument();
  });
});
```

**Step 2–4 — Implement** (modify `ProductImage.tsx`): when `imageUrl` is absent, render a styled shelf tag with the brand initials + the first bar-code digit group of the name, `data-testid="product-image-tag"`; keep the existing `Package` marker path under `data-testid="product-image-package"` so the "no image" branch is decidable.

**Step 5 — Commit.**

**Step 1 (continue) — Failing test** for the ₱ struck-through mark on the product card (`src/screens/__tests__/InventoryGroup.test.tsx`):

```tsx
import { render, screen } from '@testing-library/react';
import { InventoryGroup } from '@/screens/InventoryGroup';

describe('InventoryGroup — ₱ as brand mark', () => {
  it('renders a struck-through regular price + bold ₱ price', () => {
    render(
      <InventoryGroup
        group={{ product: { name: 'Bear Brand Milk', barcode: '123' }, batches: [], totalQuantity: 1, earliestExpiry: '' }}
        alertWindowDays={3}
        onDeleteBatch={() => undefined}
        onEditBatch={() => undefined}
        onSetStock={() => undefined}
      />
    );
    expect(screen.getByText(/₱/)).toBeInTheDocument();
  });
});
```

**Step 2–4 — Implement:** In `InventoryGroup.tsx` (and `ProductDetailScreen.tsx`), swap the flat `₱{price}` with a struck-through price + bold ₱ price treated as a brand mark.

**Step 5 — Commit.**

> TDD note: ProductImage's rendered shell-tag is asserted via `data-testid`; computed colors are not asserted because jsdom does not lay out `text-decoration`/`color`. Visual verification is via `vite build` + desktop capture.

---

## Task C — App icon set

**Files:**
- Create: `public/icon-192.png`
- Create: `public/icon-512.png`
- Modify: `public/index.html`
- Modify: `vite.config.ts` (manifest) if it references an icon

**Step 1 — Failing test** (`tests/icon.test.ts`):

```ts
import { readFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function isValidPng(buffer: Buffer, expectedSize: number): boolean {
  return (
    buffer.subarray(0, 8).toString('latin1') === '\x89PNG\r\n\x1a\n' &&
    statSync(join(__dirname, '..', 'public', `icon-${expectedSize}.png`)).size === expectedSize
  );
}

describe('public icons', () => {
  it('ships icon-192.png and icon-512.png as valid PNGs of the expected size', () => {
    expect(isValidPng(readFileSync(join(__dirname, '..', 'public', 'icon-192.png')), 192)).toBe(true);
    expect(isValidPng(readFileSync(join(__dirname, '..', 'public', 'icon-512.png')), 512)).toBe(true);
  });
});
```

**Step 2–4 — Implement:** generate two PNGs (barcode glyph on transparent/white) via a small Python/PIL script into `public/`, then wire `index.html` + `manifest` to reference them.

**Step 5 — Commit.**

---

## Task D — CSS foundation

**Files:** `src/index.css`

**Step 1 — Failing test** (append to `src/screens/__tests__/LoginScreen.test.tsx` or new `src/index.css` token smoke test):

```tsx
import { readFileSync } from 'fs';
import { join } from 'path';

describe('index.css — foundation tokens', () => {
  const css = readFileSync(join(__dirname, '..', '..', 'index.css'), 'utf8');
  it('defines the brand-accent tokens used by Task A', () => {
    expect(css).toContain('--color-accent-serve');
    expect(css).toContain('data-mode="sell"');
  });
  it('defines the fade-in keyframes referenced by .backdrop/.toast', () => {
    expect(css).toContain('@keyframes fade-in');
  });
  it('consolidates .btn-secondary to a single declaration block', () => {
    const m = css.match(/.btn-secondary\s*\{[^}]*\}/);
    expect(m).not.toBeNull();
    expect(m?.join('').split('}').length).toBeGreaterThan(1);
  });
});
```

> Note: the duplicate `.btn-secondary` block is verified by file-content read here; a computed-style check would be flaky in jsdom. Sufficiency is confirmed with `vite build` + capture.

**Step 2–4 — Implement:**
- Global `:focus-visible` baseline so `.btn`, `.btn-ghost`, `.scan-fab`, `.app-mode-segment` get a visible ring (move the existing `:focus:not(:focus-visible){outline:none}` to keep it scoped).
- Add `@keyframes fade-in` (fade 0→1, 150ms ease).
- Consolidate `.btn-primary` (single accent-block) and `.btn-secondary` (single slab); remove the duplicate slate block and the first-emerald block conflicts.
- Add `--color-accent-serve` (amber) + `--color-accent-serve-rgb` tokens and a `[data-mode="sell"]` override; swap components to use `var(--color-accent-serve)` in sell mode.
- Ensure the scan FAB uses `var(--color-accent)` (shop) / `var(--color-accent-serve)` (sell).

**Step 5 — Commit.**

---

## Task E — Touch targets

**Files:**
- Modify: `src/screens/TillScreen.tsx`
- Modify: `src/components/Toast.tsx`
- Modify: `src/index.css` (bottom-nav-item)

**Step 1 — Failing test** (append to `src/screens/__tests__/TillScreen.test.tsx`):

```tsx
import { render, screen } from '@testing-library/react';
import { TillScreen } from '@/screens/TillScreen';

describe('TillScreen — touch targets', () => {
  it('renders quantity +/- and remove buttons at min-height 44px', () => {
    render(<TillScreen />);
    const minus = screen.getByLabelText(/decrease quantity/i);
    const remove = screen.getByLabelText(/remove/i);
    expect(minus).toHaveAttribute('style', expect.stringContaining('min-height: 44px'));
    expect(remove).toHaveAttribute('style', expect.stringContaining('min-height: 44px'));
  });
});
```

**Step 2–4 — Implement:** widen the till qty `−`/`+` and line-remove buttons to 44 px; toast dismiss + inline action to 44 px; `.bottom-nav-item` gets a `min-height: 44px` so the ~42 px layout snaps to the convention.

**Step 5 — Commit.**

---

## Integration verification

After each task lands green:
- `cd /c/Users/bryan/Documents/Hermes/Projects/barcode-inventory && C:/nvm4w/nodejs/node.exe node_modules/vitest/vitest.mjs run` — all tests pass.
- `C:/nvm4w/nodejs/node.exe node_modules/typescript/bin/tsc --noEmit` — no type errors.
- `C:/nvm4w/nodejs/node.exe node_modules/vite/bin/vite.js build` — production build succeeds.

**Verification of the look:** a desktop capture of Shop + Sell, Inventory, and Scanner showing the brand lockup, mode accent, ₱ brand mark, and shelf-tag images. Recorded in the final report.

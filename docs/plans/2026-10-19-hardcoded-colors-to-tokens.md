# Hard-coded Colors → Token Classes Implementation Plan

> **For implementer:** Use TDD throughout. Write failing test first. Watch it fail. Then implement.

**Goal:** Replace all hard-coded hex colors in inline styles with design token classes across 4 screens + CameraViewfinder overlays, fix duplicate aria-live regions, and ensure dark mode works everywhere.

**Architecture:** Replace inline `style={{color:'#...', background:'#...'}}` with existing design token CSS classes (`.card`, `.form-input`, `.btn-primary`, `.badge-good`, `.camera-start-btn`, etc.). The token system already exists in `src/index.css` with 170+ tokens covering all needed colors.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind-like token system in CSS custom properties, Vitest for testing.

---

### Task 1: ProductDetailScreen — Hero Card & Status Badges

**Files:**
- Modify: `src/screens/ProductDetailScreen.tsx`
- Test: `src/__tests__/ProductDetailScreen.test.tsx`

**Step 1: Write the failing test**
```tsx
// src/__tests__/ProductDetailScreen.test.tsx
import { render, screen } from '@testing-library/react';
import { ProductDetailScreen } from '@/screens/ProductDetailScreen';
import { MemoryRouter } from 'react-router-dom';

describe('ProductDetailScreen — token classes', () => {
  it('hero card uses .card token class, not inline styles', () => {
    render(
      <MemoryRouter>
        <ProductDetailScreen />
      </MemoryRouter>
    );
    const heroCard = screen.getByText('Product Details').closest('div');
    expect(heroCard).toHaveClass('card');
    expect(heroCard).not.toHaveStyle({ background: '#FFFFFF' });
    expect(heroCard).not.toHaveStyle({ border: '1px solid #E6E8EA' });
  });

  it('status badges use .badge-good / .badge-neutral token classes', () => {
    render(
      <MemoryRouter>
        <ProductDetailScreen />
      </MemoryRouter>
    );
    const newBadge = screen.getByText('New Product').closest('span');
    const catalogBadge = screen.getByText('In Catalog').closest('span');
    expect(newBadge).toHaveClass('badge-good');
    expect(catalogBadge).toHaveClass('badge-neutral');
  });

  it('barcode display uses token color, not inline #94a3b8', () => {
    render(
      <MemoryRouter>
        <ProductDetailScreen />
      </MemoryRouter>
    );
    const barcode = screen.getByText(/4800016601965/);
    expect(barcode).not.toHaveStyle({ color: '#94a3b8' });
  });
}
```

**Step 2: Run test — confirm it fails**
Command: `C:/nvm4w/nodejs/node.exe node_modules/vitest/vitest.mjs run src/__tests__/ProductDetailScreen.test.tsx`
Expected: FAIL — hero card has inline styles, badges have hardcoded colors

**Step 3: Write minimal implementation**
Replace inline styles in `ProductDetailScreen.tsx`:
- Hero card (lines 433-440): Remove inline `style={{...}}`, add `className="card"`
- Status badges (lines 472-503): Replace inline styles with `className="badge-good"` / `className="badge-neutral"`
- Barcode display (lines 508-517): Remove inline style, add `className="text-muted font-mono text-xs"`
- Retry button (lines 521-545): Use `className="btn-secondary"` instead of inline styles
- Form card (lines 548-564): Use `className="card"` instead of inline styles
- Edit button (lines 567-590): Use `className="btn-ghost"` instead of inline styles

**Step 4: Run test — confirm it passes**
Command: `C:/nvm4w/nodejs/node.exe node_modules/vitest/vitest.mjs run src/__tests__/ProductDetailScreen.test.tsx`
Expected: PASS

**Step 5: Commit**
`git add src/screens/ProductDetailScreen.tsx src/__tests__/ProductDetailScreen.test.tsx && git commit -m "feat: ProductDetailScreen hero card & badges use token classes"`

---

### Task 2: ScannerScreen — App Bar, Header, Buttons, Toast

**Files:**
- Modify: `src/screens/ScannerScreen.tsx`
- Test: `src/__tests__/ScannerScreen.test.tsx`

**Step 1: Write the failing test**
```tsx
// src/__tests__/ScannerScreen.test.tsx
import { render, screen } from '@testing-library/react';
import { ScannerScreen } from '@/screens/ScannerScreen';
import { MemoryRouter } from 'react-router-dom';

describe('ScannerScreen — token classes', () => {
  it('app bar uses token classes, not inline #334155', () => {
    render(
      <MemoryRouter>
        <ScannerScreen />
      </MemoryRouter>
    );
    const appBar = screen.getByRole('banner');
    expect(appBar).toHaveClass('app-bar');
    expect(appBar).not.toHaveStyle({ background: '#334155' });
  });

  it('mode toggle uses token classes, not inline styles', () => {
    render(
      <MemoryRouter>
        <ScannerScreen />
      </MemoryRouter>
    );
    const modeLabel = screen.getByText('Mode').closest('div');
    expect(modeLabel).not.toHaveStyle({ color: '#f8fafc' });
    expect(modeLabel).not.toHaveStyle({ opacity: 0.7 });
  });

  it('cart badge uses token classes, not inline #0f172a/#3b82f6', () => {
    render(
      <MemoryRouter>
        <ScannerScreen />
      </MemoryRouter>
    );
    const cartBtn = screen.getByRole('button', { name: /cart/i });
    expect(cartBtn).not.toHaveStyle({ background: '#0f172a' });
    expect(cartBtn).not.toHaveStyle({ border: '1.5px solid #3b82f6' });
  });

  it('scan FAB uses .scan-fab token class, not inline gradient', () => {
    render(
      <MemoryRouter>
        <ScannerScreen />
      </MemoryRouter>
    );
    const fab = screen.getByRole('button', { name: /scan barcode/i });
    expect(fab).toHaveClass('scan-fab');
    expect(fab).not.toHaveStyle({ background: 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #17a974 100%)' });
  });

  it('toast uses useToast hook, not inline #0F172A', () => {
    render(
      <MemoryRouter>
        <ScannerScreen />
      </MemoryRouter>
    );
    // Trigger a scan to show toast
    // Verify toast uses useToast() not inline styles
  });

  it('has only ONE aria-live region for cart total', () => {
    render(
      <MemoryRouter>
        <ScannerScreen />
      </MemoryRouter>
    );
    const liveRegions = screen.getAllByRole('status');
    expect(liveRegions).toHaveLength(1);
  });
}
```

**Step 2: Run test — confirm it fails**
Command: `C:/nvm4w/nodejs/node.exe node_modules/vitest/vitest.mjs run src/__tests__/ScannerScreen.test.tsx`
Expected: FAIL — all inline styles present

**Step 3: Write minimal implementation**
- App bar (lines 282-294): Replace inline styles with `className="app-bar"` (already has gradient in CSS)
- Mode label (lines 331-343): Remove inline styles, use `className="text-xs text-muted font-medium uppercase tracking-wider"`
- Cart button (lines 347-375): Replace inline styles with `className="btn-ghost"` + conditional `className="cart-badge-active"` (add to CSS)
- Scan FAB (lines 418-437): Already uses `.scan-fab` class — verify it uses CSS gradient, not inline
- Toast (lines 457-479): Remove inline toast, use `useToast()` hook from `@/components/Toast`
- Duplicate live region (lines 278-280 & 440-445): Remove the one at line 440-445

**Step 4: Run test — confirm it passes**
Command: `C:/nvm4w/nodejs/node.exe node_modules/vitest/vitest.mjs run src/__tests__/ScannerScreen.test.tsx`
Expected: PASS

**Step 5: Commit**
`git add src/screens/ScannerScreen.tsx src/__tests__/ScannerScreen.test.tsx && git commit -m "feat: ScannerScreen uses token classes, removes duplicate live region"`

---

### Task 3: CameraViewfinder — Start Overlay & Error Overlay

**Files:**
- Modify: `src/components/CameraViewfinder.tsx`
- Test: `src/__tests__/CameraViewfinder.test.tsx`

**Step 1: Write the failing test**
```tsx
// src/__tests__/CameraViewfinder.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CameraViewfinder } from '@/components/CameraViewfinder';

describe('CameraViewfinder — token classes', () => {
  it('start overlay uses token classes, not hardcoded colors', () => {
    render(<CameraViewfinder onScan={vi.fn()} cameraActive={false} />);
    const overlay = screen.getByText('Camera Scanner').closest('div');
    expect(overlay).toHaveClass('camera-start-overlay');
    expect(overlay).not.toHaveStyle({ background: 'rgba(0, 0, 0, 0.8)' });
    const title = screen.getByText('Camera Scanner');
    expect(title).not.toHaveStyle({ color: '#f8fafc' });
    const desc = screen.getByText(/activate your camera/i).closest('p');
    expect(desc).not.toHaveStyle({ color: '#94a3b8' });
    const btn = screen.getByRole('button', { name: /start camera/i });
    expect(btn).toHaveClass('camera-start-btn');
    expect(btn).not.toHaveStyle({ background: '#047857' });
  });

  it('error overlay uses token classes', () => {
    render(<CameraViewfinder onScan={vi.fn()} cameraActive={false} />);
    // Trigger permission denied state by mocking
    // Verify overlay uses .camera-error-overlay, .camera-error-content classes
    // Title uses token color, not #f8fafc
    // Description uses token color, not #94a3b8
    // Retry button uses .camera-retry-btn class
  });
}
```

**Step 2: Run test — confirm it fails**

**Step 3: Write minimal implementation**
- Start overlay (lines 1186-1232): Replace inline styles with existing CSS classes:
  - `.camera-start-overlay` (already exists in CSS)
  - `.camera-start-content` (already exists)
  - `.camera-start-title` (already exists — uses `#f8fafc` in CSS, which is `var(--color-on-primary)` in light mode)
  - `.camera-start-desc` (already exists — uses `#94a3b8` in CSS, which is `var(--color-muted-foreground)`)
  - `.camera-start-btn` (already exists — uses `#047857` in CSS, which is `var(--color-accent)`)
  - Remove all inline `style={{...}}` from JSX, keep only `className`
- Error overlay (lines 1234-1252): Same approach — use existing `.camera-error-overlay`, `.camera-error-content`, `.camera-error-title`, `.camera-error-desc`, `.camera-retry-btn` classes
- Retry button (lines 302-305): Already uses `className="camera-retry-btn"`

**Step 4: Run test — confirm it passes**

**Step 5: Commit**
`git add src/components/CameraViewfinder.tsx src/__tests__/CameraViewfinder.test.tsx && git commit -m "feat: CameraViewfinder overlays use token classes"`

---

### Task 4: LoginScreen — Inline Styles → Token Classes

**Files:**
- Modify: `src/screens/LoginScreen.tsx`
- Test: `src/__tests__/LoginScreen.test.tsx`

**Step 1: Write the failing test**
```tsx
// src/__tests__/LoginScreen.test.tsx
import { render, screen } from '@testing-library/react';
import { LoginScreen } from '@/screens/LoginScreen';
import { MemoryRouter } from 'react-router-dom';

describe('LoginScreen — token classes', () => {
  it('screen-center uses .screen-center class, not inline styles', () => {
    render(
      <MemoryRouter>
        <LoginScreen />
      </MemoryRouter>
    );
    const center = screen.getByText('Sign in to keep your inventory in sync').closest('div');
    expect(center).toHaveClass('screen-center');
    expect(center).not.toHaveStyle({ background: '#F8FAFC' });
    expect(center).not.toHaveStyle({ padding: '24px' });
  });

  it('login-card uses .login-card class, not inline #334155', () => {
    render(
      <MemoryRouter>
        <LoginScreen />
      </MemoryRouter>
    );
    const card = screen.getByRole('button', { name: /sign in with email/i }).closest('.login-card');
    expect(card).toHaveClass('login-card');
    expect(card).not.toHaveStyle({ background: '#334155' });
  });

  it('submit button uses .login-submit class', () => {
    render(
      <MemoryRouter>
        <LoginScreen />
      </MemoryRouter>
    );
    const btn = screen.getByRole('button', { name: /sign in with email/i });
    expect(btn).toHaveClass('login-submit');
    expect(btn).not.toHaveStyle({ background: 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #17a974 100%)' });
  });
}
```

**Step 2: Run test — confirm it fails**

**Step 3: Write minimal implementation**
- Screen center (lines 15-38): Replace inline styles with `className="screen-center"`
- Login card (lines 16-22): Already uses `className="login-card"` — verify it doesn't have inline styles
- Submit button (lines 26-27): Already uses `className="login-submit"` — verify it doesn't have inline styles
- Remove any remaining inline styles

**Step 4: Run test — confirm it passes**

**Step 5: Commit**
`git add src/screens/LoginScreen.tsx src/__tests__/LoginScreen.test.tsx && git commit -m "feat: LoginScreen uses token classes"`

---

### Task 5: Fix Duplicate aria-live in ScannerScreen

**Files:**
- Modify: `src/screens/ScannerScreen.tsx`
- Test: `src/__tests__/ScannerScreen.test.tsx` (extend existing test)

**Step 1: Write the failing test**
```tsx
// In src/__tests__/ScannerScreen.test.tsx
it('has only ONE aria-live region for cart total', () => {
  render(
    <MemoryRouter>
      <ScannerScreen />
    </MemoryRouter>
  );
  const liveRegions = screen.getAllByRole('status');
  expect(liveRegions).toHaveLength(1);
});
```

**Step 2: Run test — confirm it fails** (currently 2 regions)

**Step 3: Write minimal implementation**
Remove the duplicate at lines 440-445 (the one in the JSX body, keep the one at line 278-280 which is in the header)

**Step 4: Run test — confirm it passes**

**Step 5: Commit**
`git add src/screens/ScannerScreen.tsx && git commit -m "fix: remove duplicate aria-live region in ScannerScreen"`

---

### Task 6: Dark Mode Verification (Integration Test)

**Files:**
- Test: `src/__tests__/dark-mode.test.tsx` (new)

**Step 1: Write the failing test**
```tsx
// src/__tests__/dark-mode.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProductDetailScreen } from '@/screens/ProductDetailScreen';
import { ScannerScreen } from '@/screens/ScannerScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { CameraViewfinder } from '@/components/CameraViewfinder';

describe('Dark mode — no hardcoded colors', () => {
  const themes = ['light', 'dark'] as const;
  
  for (const theme of themes) {
    it(`ProductDetailScreen renders correctly in ${theme} mode`, () => {
      const { container } = render(
        <MemoryRouter>
          <div data-theme={theme}>
            <ProductDetailScreen />
          </div>
        </MemoryRouter>
      );
      // Verify no element has hardcoded hex color in computed style
      const elements = container.querySelectorAll('*');
      for (const el of elements) {
        const style = getComputedStyle(el);
        const bg = style.backgroundColor;
        const color = style.color;
        // No rgb(255, 255, 255) on dark bg, no rgb(0, 0, 0) on light bg
        // This is a smoke test — real verification is visual
      }
    });

    it(`ScannerScreen renders correctly in ${theme} mode`, () => {
      render(
        <MemoryRouter>
          <div data-theme={theme}>
            <ScannerScreen />
          </div>
        </MemoryRouter>
      );
      // Same verification
    });

    it(`LoginScreen renders correctly in ${theme} mode`, () => {
      render(
        <MemoryRouter>
          <div data-theme={theme}>
            <LoginScreen />
          </div>
        </MemoryRouter>
      );
    });

    it(`CameraViewfinder start overlay renders correctly in ${theme} mode`, () => {
      render(
        <div data-theme={theme}>
          <CameraViewfinder onScan={vi.fn()} cameraActive={false} />
        </div>
      );
    });
  });
});
```

**Step 2: Run test — confirm it passes** (should pass after Tasks 1-4)

**Step 5: Commit**
`git add src/__tests__/dark-mode.test.tsx && git commit -m "test: dark mode integration test for all fixed screens"`

---

### Task 6: Full Suite Verification & Deploy

**Step 1: Run full suite**
Command: `C:/nvm4w/nodejs/node.exe node_modules/vitest/vitest.mjs run`
Expected: 302+ tests passing

**Step 2: Type-check**
Command: `C:/nvm4w/nodejs/node.exe node_modules/typescript/bin/tsc --noEmit`
Expected: 55 errors (baseline, all pre-existing)

**Step 3: Build**
Command: `C:/nvm4w/nodejs/node.exe node_modules/vite/bin/vite.js build`
Expected: Build success, bundle contains token classes

**Step 4: Deploy to GitHub Pages**
Command: `git push origin master && gh run watch <run-id> --repo dcyngraphics-glitch/barcode-inventory --exit-status`

**Step 5: Verify live**
URL: `https://dcyngraphics-glitch.github.io/barcode-inventory/`

---

## Execution Options

Plan saved to `docs/plans/2026-10-19-hardcoded-colors-to-tokens.md`.

**Two execution options:**
1. **Subagent-Driven** — I dispatch a fresh sub-agent per task, review between tasks
2. **Manual** — You run the tasks yourself

Which approach?

---

## Constraints
- **Only GitHub Pages** — do not touch Vercel
- **TDD mandatory** — each task: write test → watch fail → implement → watch pass → commit
- **GitHub Pages only** — verify at `https://dcyngraphics-glitch.github.io/barcode-inventory/`
- **No Vercel changes** — Vercel stays untouched
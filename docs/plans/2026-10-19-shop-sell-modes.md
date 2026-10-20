# Shop / Sell Modes Implementation Plan

> **For implementer:** Use TDD throughout. Write the failing test first. Watch it fail. Then implement. Commit after each green test.

**Goal:** Make the app's dual-mode split (Shop / Sell) visible and one tap away, and make destructive actions recoverable.

**Architecture:** A new `ModeContext` holds `mode: 'shop' | 'sell'` in `localStorage` (device-local, seeded once from the synced `settings.cashierMode`). A new `AppModeSwitcher` in the app header drives it. `App.tsx` reads mode from context instead of `settings.cashierMode`. Undo for batch/product delete reuses the snapshot-and-restore pattern already proven by `saleService.undoLastSale`.

**Tech Stack:** React 18, TypeScript (strict), Vite, vitest + @testing-library/react, fake-indexeddb, react-router-dom 7.

**Design doc:** `docs/plans/2026-10-19-shop-sell-modes-design.md`

**Verified APIs this plan depends on:**
- `loadSettings(): Promise<Settings>` — `src/services/settingsService.ts:6`
- `Settings.cashierMode: boolean` — `src/types/index.ts:56`
- `deleteBatch(batchId: string): Promise<void>` — `src/services/inventoryService.ts:28`
- `AppRoutes()` reads `useSettingsContext()` and branches on `settings.cashierMode` — `src/App.tsx:143-161`
- Provider nesting — `src/App.tsx:130-136`

**Gates after every task:** `npx tsc --noEmit` must report **0** errors; `npx vitest run` must pass; CI enforces both.

---

## Wave 1 — disjoint files, safe to parallelise

### Task 1: `ModeContext`

**Files:**
- Create: `src/context/ModeContext.tsx`
- Test: `src/__tests__/ModeContext.test.tsx`

**Step 1: Write the failing test**

```tsx
// src/__tests__/ModeContext.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { ModeProvider, useMode } from '@/context/ModeContext';

const Probe = () => {
  const { mode, isSell, setMode, hasLoaded } = useMode();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="isSell">{String(isSell)}</span>
      <span data-testid="hasLoaded">{String(hasLoaded)}</span>
      <button onClick={() => setMode('sell')}>to-sell</button>
      <button onClick={() => setMode('shop')}>to-shop</button>
    </div>
  );
};

describe('ModeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('defaults to shop when nothing is stored and no synced setting exists', async () => {
    render(<ModeProvider><Probe /></ModeProvider>);
    await waitFor(() => expect(screen.getByTestId('hasLoaded').textContent).toBe('true'));
    expect(screen.getByTestId('mode').textContent).toBe('shop');
  });

  it('seeds sell from a synced cashierMode=true setting, exactly once', async () => {
    const { saveSettings } = await import('@/services/settingsService');
    const { DEFAULT_SETTINGS } = await import('@/types');
    await saveSettings({ ...DEFAULT_SETTINGS, cashierMode: true });

    render(<ModeProvider><Probe /></ModeProvider>);
    await waitFor(() => expect(screen.getByTestId('hasLoaded').textContent).toBe('true'));
    expect(screen.getByTestId('mode').textContent).toBe('sell');
    expect(localStorage.getItem('appMode')).toBe('sell');
  });

  it('prefers localStorage over the synced setting', async () => {
    const { saveSettings } = await import('@/services/settingsService');
    const { DEFAULT_SETTINGS } = await import('@/types');
    await saveSettings({ ...DEFAULT_SETTINGS, cashierMode: true });
    localStorage.setItem('appMode', 'shop');

    render(<ModeProvider><Probe /></ModeProvider>);
    await waitFor(() => expect(screen.getByTestId('hasLoaded').textContent).toBe('true'));
    expect(screen.getByTestId('mode').textContent).toBe('shop');
  });

  it('setMode persists to localStorage and updates isSell', async () => {
    render(<ModeProvider><Probe /></ModeProvider>);
    await waitFor(() => expect(screen.getByTestId('hasLoaded').textContent).toBe('true'));

    act(() => { screen.getByText('to-sell').click(); });
    expect(screen.getByTestId('mode').textContent).toBe('sell');
    expect(screen.getByTestId('isSell').textContent).toBe('true');
    expect(localStorage.getItem('appMode')).toBe('sell');
  });

  it('throws when useMode is used outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow('useMode must be used within ModeProvider');
    spy.mockRestore();
  });
});
```

**Step 2: Run test — confirm it fails**

Command: `npx vitest run src/__tests__/ModeContext.test.tsx`
Expected: FAIL — cannot resolve `@/context/ModeContext`

**Step 3: Write minimal implementation**

```tsx
// src/context/ModeContext.tsx
import {
  createContext, useCallback, useContext, useEffect, useState,
  type FC, type ReactNode,
} from 'react';
import { loadSettings } from '@/services/settingsService';

export type AppMode = 'shop' | 'sell';

/** Device-local. Mode describes this device's role, not the account's — a store
 *  till stays a till even when the owner's phone switches to Shop. */
const STORAGE_KEY = 'appMode';

interface ModeContextValue {
  mode: AppMode;
  isSell: boolean;
  setMode: (mode: AppMode) => void;
  /** False until the stored/seeded mode is known. Consumers must not render a
   *  mode-dependent route before this, or the root screen flashes the wrong one. */
  hasLoaded: boolean;
}

const ModeContext = createContext<ModeContextValue | undefined>(undefined);

function readStored(): AppMode | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === 'shop' || raw === 'sell' ? raw : null;
  } catch {
    return null; // storage disabled (private mode)
  }
}

function writeStored(mode: AppMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore — the in-memory mode still works for this session */
  }
}

export const ModeProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<AppMode>('shop');
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const stored = readStored();
      if (stored) {
        if (!cancelled) {
          setModeState(stored);
          setHasLoaded(true);
        }
        return;
      }

      // One-time seed from the synced setting. Any failure falls through to 'shop'
      // rather than blocking the app on a database read.
      let seeded: AppMode = 'shop';
      try {
        const settings = await loadSettings();
        seeded = settings.cashierMode ? 'sell' : 'shop';
      } catch {
        seeded = 'shop';
      }

      if (cancelled) return;
      writeStored(seeded); // writes exactly once, so the seed never re-runs
      setModeState(seeded);
      setHasLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((next: AppMode) => {
    writeStored(next);
    setModeState(next);
  }, []);

  return (
    <ModeContext.Provider value={{ mode, isSell: mode === 'sell', setMode, hasLoaded }}>
      {children}
    </ModeContext.Provider>
  );
};

export function useMode(): ModeContextValue {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useMode must be used within ModeProvider');
  return ctx;
}
```

**Step 4: Run test — confirm it passes**

Command: `npx vitest run src/__tests__/ModeContext.test.tsx`
Expected: PASS — 5 tests

**Step 5: Commit**

`git add src/context/ModeContext.tsx src/__tests__/ModeContext.test.tsx && git commit -m "feat: add device-local ModeContext for shop/sell"`

---

### Task 2: Snapshot undo for batch delete

**Files:**
- Modify: `src/services/inventoryService.ts`
- Modify: `src/screens/InventoryScreen.tsx`
- Test: `src/__tests__/undoDelete.test.ts`

**Why this shape:** `saleService.undoLastSale` already restores deleted batches from a snapshot. Reuse that pattern — do not invent a second undo mechanism.

**Step 1: Write the failing test**

```ts
// src/__tests__/undoDelete.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { deleteBatchWithSnapshot, restoreBatch } from '@/services/inventoryService';
import { getAllBatches } from '@/services/inventoryService';
import type { Batch } from '@/types';

const batch: Batch = {
  batchId: 'b1',
  barcode: '4800361394093',
  quantity: 4,
  expiryDate: '2026-01-01',
  scannedAt: '2025-12-01T00:00:00.000Z',
  notes: 'fridge',
};

describe('batch delete undo', () => {
  beforeEach(async () => {
    for (const b of await getAllBatches()) await deleteBatchWithSnapshot(b.batchId);
  });

  it('returns the deleted row so it can be restored', async () => {
    const { addBatch } = await import('@/services/inventoryService');
    await addBatch(batch);

    const snapshot = await deleteBatchWithSnapshot('b1');
    expect(snapshot).toEqual(batch);
    expect(await getAllBatches()).toHaveLength(0);
  });

  it('restores the exact row, including optional fields', async () => {
    const { addBatch } = await import('@/services/inventoryService');
    await addBatch(batch);
    const snapshot = await deleteBatchWithSnapshot('b1');

    await restoreBatch(snapshot!);
    const after = await getAllBatches();
    expect(after).toHaveLength(1);
    expect(after[0]).toEqual(batch); // notes and scannedAt preserved
  });

  it('returns undefined for a batch that does not exist', async () => {
    expect(await deleteBatchWithSnapshot('nope')).toBeUndefined();
  });
});
```

**Step 2: Run test — confirm it fails**

Command: `npx vitest run src/__tests__/undoDelete.test.ts`
Expected: FAIL — `deleteBatchWithSnapshot` is not exported

**Step 3: Write minimal implementation**

Add to `src/services/inventoryService.ts`, after `deleteBatch` (line 30):

```ts
/**
 * Delete a batch and hand back the row that was removed, so the caller can offer
 * an undo. Mirrors how saleService keeps SaleDeduction snapshots to make
 * undoLastSale able to recreate exactly what it deleted.
 */
export async function deleteBatchWithSnapshot(batchId: string): Promise<Batch | undefined> {
  const existing = await db.inventory.get(batchId);
  if (!existing) return undefined;
  await db.inventory.delete(batchId);
  return existing;
}

/** Put a snapshot back. Used by undo; the batchId is preserved so any reference
 *  held elsewhere still resolves. */
export async function restoreBatch(snapshot: Batch): Promise<void> {
  await db.inventory.put(snapshot);
}
```

**Step 4: Run test — confirm it passes**

Command: `npx vitest run src/__tests__/undoDelete.test.ts`
Expected: PASS — 3 tests

**Step 5: Wire it into the screen (no new test — covered by the service tests)**

In `src/screens/InventoryScreen.tsx`, replace the `deleteBatch` call in the confirm handler with:

```tsx
const snapshot = await deleteBatchWithSnapshot(batchId);
if (snapshot) {
  showToast('success', 'Batch deleted', {
    actionLabel: 'Undo',
    onAction: () => { void restoreBatch(snapshot); void refresh(); },
  });
}
```

Confirm the `showToast` signature supports an action before writing this — `src/components/Toast.tsx:15-17` documents `actionLabel` / `onAction` / a lifetime override. If the InventoryScreen toast helper does not forward those props, extend it in the same commit rather than bypassing it.

**Step 6: Verify and commit**

Commands: `npx tsc --noEmit` (expect 0), `npx vitest run` (expect all pass)
`git add src/services/inventoryService.ts src/screens/InventoryScreen.tsx src/__tests__/undoDelete.test.ts && git commit -m "feat: snapshot-based undo for batch delete"`

---

### Task 3: Loading states for the three bare screens

**Files:**
- Modify: `src/screens/ScannerScreen.tsx`, `src/screens/TillScreen.tsx`, `src/screens/SalesScreen.tsx`
- Test: `src/__tests__/loadingStates.test.tsx`

**Reuse** the skeleton classes InventoryScreen already uses (`.loading-skeleton`, `.shimmer` — confirm exact names with `grep -n "skeleton\|shimmer" src/screens/InventoryScreen.tsx src/index.css`). Do not invent new classes.

**Step 1: Write the failing test**

```tsx
// src/__tests__/loadingStates.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SalesScreen } from '@/screens/SalesScreen';

describe('loading states', () => {
  it('SalesScreen renders a skeleton, never a blank frame', () => {
    render(<MemoryRouter><SalesScreen /></MemoryRouter>);
    // Must not be an empty document on first paint
    expect(document.body.textContent?.trim().length ?? 0).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test — confirm it fails**

Command: `npx vitest run src/__tests__/loadingStates.test.tsx`
Expected: FAIL — `SalesScreen` currently returns `null` while `hasLoaded` is false (`SalesScreen.tsx:99` region), producing an empty body

**Step 3: Implement**

- **SalesScreen** — replace the `if (!hasLoaded) return null;` early return with a skeleton block using the InventoryScreen classes.
- **ScannerScreen** — render a skeleton over the camera area until the camera reports ready, so a slow `getUserMedia` is not a blank rectangle.
- **TillScreen** — render a skeleton until settings/cart state is available.

**Step 4: Run test — confirm it passes**

Command: `npx vitest run src/__tests__/loadingStates.test.tsx`
Expected: PASS

**Step 5: Commit**

`git add src/screens/ScannerScreen.tsx src/screens/TillScreen.tsx src/screens/SalesScreen.tsx src/__tests__/loadingStates.test.tsx && git commit -m "feat: loading skeletons for scanner, till and sales"`

---

## Wave 2 — shared files (`App.tsx`, `SalesScreen.tsx`); serialise these

### Task 4: `AppModeSwitcher`

**Files:**
- Create: `src/components/AppModeSwitcher.tsx`
- Modify: `src/index.css` (append the switcher classes), `src/components/index.ts`
- Test: `src/__tests__/AppModeSwitcher.test.tsx`

**Step 1: Write the failing test**

```tsx
// src/__tests__/AppModeSwitcher.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModeProvider } from '@/context/ModeContext';
import { AppModeSwitcher } from '@/components/AppModeSwitcher';

const setup = () => render(<ModeProvider><AppModeSwitcher /></ModeProvider>);

describe('AppModeSwitcher', () => {
  beforeEach(() => { localStorage.clear(); vi.resetModules(); });

  it('renders both segments with Shop active by default', async () => {
    setup();
    const shop = await screen.findByRole('radio', { name: /shop/i });
    const sell = screen.getByRole('radio', { name: /sell/i });
    expect(shop).toHaveAttribute('aria-checked', 'true');
    expect(sell).toHaveAttribute('aria-checked', 'false');
  });

  it('switches mode on click', async () => {
    setup();
    const sell = await screen.findByRole('radio', { name: /sell/i });
    sell.click();
    expect(sell).toHaveAttribute('aria-checked', 'true');
    expect(localStorage.getItem('appMode')).toBe('sell');
  });

  it('is a radiogroup with arrow-key navigation', async () => {
    setup();
    expect(await screen.findByRole('radiogroup')).toBeInTheDocument();
  });

  it('never uses the word "mode" in its accessible name', async () => {
    setup();
    const group = await screen.findByRole('radiogroup');
    // "mode" already means Auto/Manual scan on this screen
    expect(group.getAttribute('aria-label') ?? '').not.toMatch(/scan mode/i);
  });
});
```

**Step 2: Run test — confirm it fails**

Command: `npx vitest run src/__tests__/AppModeSwitcher.test.tsx`
Expected: FAIL — cannot resolve `@/components/AppModeSwitcher`

**Step 3: Implement the component**

```tsx
// src/components/AppModeSwitcher.tsx
import { type FC, type KeyboardEvent } from 'react';
import { useMode, type AppMode } from '@/context/ModeContext';

const SEGMENTS: { value: AppMode; label: string }[] = [
  { value: 'shop', label: 'Shop' },
  { value: 'sell', label: 'Sell' },
];

/**
 * Always-visible app-mode switcher for the app bar.
 *
 * Deliberately distinct from ModeSegmentedControl (the Auto/Manual scan switch,
 * rendered at ScannerScreen.tsx:308): different position (header vs camera area),
 * different shape (pill vs toggle switch) and different vocabulary (nouns vs
 * adjectives), so the two controls cannot be confused.
 */
export const AppModeSwitcher: FC = () => {
  const { mode, setMode, hasLoaded } = useMode();

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const next = e.key === 'ArrowRight'
      ? (index + 1) % SEGMENTS.length
      : (index - 1 + SEGMENTS.length) % SEGMENTS.length;
    const target = SEGMENTS[next]!;
    setMode(target.value);
    const el = e.currentTarget.parentElement?.children[next] as HTMLElement | undefined;
    el?.focus();
  };

  if (!hasLoaded) return null;

  return (
    <div className="app-mode-switcher" role="radiogroup" aria-label="App section">
      {SEGMENTS.map((seg, i) => {
        const active = mode === seg.value;
        return (
          <button
            key={seg.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            className={`app-mode-segment${active ? ' app-mode-segment--active' : ''}`}
            onClick={() => setMode(seg.value)}
            onKeyDown={(e) => handleKeyDown(e, i)}
          >
            {seg.label}
          </button>
        );
      })}
    </div>
  );
};
```

**Step 4: Add the CSS**

Append to `src/index.css` (use tokens only — no hardcoded colours; the repo has a global `:focus-visible` rule at line 302 that will apply automatically):

```css
.app-mode-switcher {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: var(--radius-full);
  background: var(--color-camera-surface);
}

.app-mode-segment {
  min-height: 32px;
  min-width: 56px;
  padding: 0 var(--space-sm);
  border: 0;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--color-on-primary);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.app-mode-segment--active {
  background: var(--color-accent);
  color: var(--color-on-accent);
}
```

**Step 5: Export it**

Add `export { AppModeSwitcher } from './AppModeSwitcher';` to `src/components/index.ts`.

**Step 6: Run test — confirm it passes**

Command: `npx vitest run src/__tests__/AppModeSwitcher.test.tsx`
Expected: PASS — 4 tests

**Step 7: Commit**

`git add src/components/AppModeSwitcher.tsx src/components/index.ts src/index.css src/__tests__/AppModeSwitcher.test.tsx && git commit -m "feat: add always-visible AppModeSwitcher"`

---

### Task 5: Wire mode into `App.tsx`

**Files:**
- Modify: `src/App.tsx` (provider nesting `:130-136`, `AppRoutes` `:143-161`, `BottomNav` `:261`)
- Test: `src/__tests__/App.routing.test.tsx`

**Step 1: Write the failing test**

```tsx
// src/__tests__/App.routing.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Renders the real App to prove routing follows the mode.
describe('App routing follows mode', () => {
  beforeEach(() => { localStorage.clear(); vi.resetModules(); });

  it('renders the Scanner in Shop mode', async () => {
    localStorage.setItem('appMode', 'shop');
    const { default: App } = await import('@/App');
    render(<App />);
    expect(await screen.findByText(/scan product/i)).toBeInTheDocument();
  });

  it('renders the Till in Sell mode', async () => {
    localStorage.setItem('appMode', 'sell');
    const { default: App } = await import('@/App');
    render(<App />);
    expect(await screen.findByText(/till/i)).toBeInTheDocument();
  });

  it('shows 3 nav tabs in Shop and 4 in Sell', async () => {
    localStorage.setItem('appMode', 'shop');
    const { default: App } = await import('@/App');
    render(<App />);
    const shopTabs = await screen.findAllByRole('link');
    expect(shopTabs).toHaveLength(3);
  });
});
```

**Step 2: Run test — confirm it fails**

Command: `npx vitest run src/__tests__/App.routing.test.tsx`
Expected: FAIL — routing still reads `settings.cashierMode`, so both cases render the Scanner

**Step 3: Implement**

1. Wrap the tree in `ModeProvider`, inside `SettingsProvider` and outside `TutorialProvider` (`App.tsx:130-136`):
   ```tsx
   <SettingsProvider>
     <ModeProvider>
       <TutorialProvider>
         ...
   ```
2. In `AppRoutes` (`:143-161`), replace `useSettingsContext()` with `useMode()` and branch on `isSell` / `hasLoaded` from mode.
3. **Replace the `null` early return with the existing `.loading-screen` class** — this is the blank-launch-flash fix from the design doc (Section 4, item 3). Do not return `null`.
4. In `BottomNav` (`:261`), read `isSell` from `useMode()` instead of `settings.cashierMode`.
5. Render `<AppModeSwitcher />` in the `.app-bar` of ScannerScreen and TillScreen (Task 8's file set) — or, if the app bar is not shared, in `BottomNav`'s parent container. Choose whichever keeps the switcher visible on every main screen, and say which you chose in the commit message.

**Step 4: Run test — confirm it passes**

Command: `npx vitest run src/__tests__/App.routing.test.tsx`
Expected: PASS — 3 tests

**Step 5: Full gate**

Commands: `npx tsc --noEmit` (0), `npx vitest run` (all pass). The existing `AppAuthGate.test.tsx` and `dark-mode.test.tsx` also exercise this tree — they must stay green.

**Step 6: Commit**

`git add src/App.tsx src/__tests__/App.routing.test.tsx && git commit -m "feat: route and navigate from ModeContext, fix launch flash"`

---

### Task 6: `SalesScreen` guard — prompt instead of silent redirect

**Files:**
- Modify: `src/screens/SalesScreen.tsx:92-99` region
- Test: `src/__tests__/SalesScreen.guard.test.tsx`

**Step 1: Write the failing test**

```tsx
// src/__tests__/SalesScreen.guard.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ModeProvider } from '@/context/ModeContext';
import { SalesScreen } from '@/screens/SalesScreen';

describe('SalesScreen guard', () => {
  beforeEach(() => { localStorage.clear(); vi.resetModules(); });

  it('offers to switch to Sell instead of silently redirecting', async () => {
    localStorage.setItem('appMode', 'shop');
    render(<MemoryRouter><ModeProvider><SalesScreen /></ModeProvider></MemoryRouter>);
    expect(await screen.findByText(/switch to sell/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run test — confirm it fails**

Command: `npx vitest run src/__tests__/SalesScreen.guard.test.tsx`
Expected: FAIL — the screen currently redirects to `/` with no message

**Step 3: Implement**

Replace the `if (!settings.cashierMode) { navigate('/') }` block with a rendered prompt containing a one-tap switch that calls `setMode('sell')` from `useMode()`. Do not navigate away.

**Step 4: Run test — confirm it passes**

Command: `npx vitest run src/__tests__/SalesScreen.guard.test.tsx`
Expected: PASS

**Step 5: Commit**

`git add src/screens/SalesScreen.tsx src/__tests__/SalesScreen.guard.test.tsx && git commit -m "fix: sales guard prompts to switch instead of redirecting"`

---

### Task 7: Basket-loss guard and switch feedback

**Files:**
- Modify: `src/components/AppModeSwitcher.tsx`
- Test: `src/__tests__/modeSwitchSafety.test.tsx`

**Step 1: Write the failing test**

```tsx
// src/__tests__/modeSwitchSafety.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModeProvider } from '@/context/ModeContext';
import { ScanCartProvider, useScanCart } from '@/context/ScanCartContext';
import { AppModeSwitcher } from '@/components/AppModeSwitcher';

const SeedCart = () => {
  const { addItem } = useScanCart();
  return (
    <button onClick={() => addItem({
      barcode: '4800361394093', product: null, name: 'Milk', brand: 'Bear Brand',
      price: 24, expiryDate: '2026-01-01', quantity: 1, needsInfo: false, source: 'manual',
    })}>seed</button>
  );
};

describe('switching away from Sell with a non-empty basket', () => {
  beforeEach(() => { localStorage.clear(); localStorage.setItem('appMode', 'sell'); vi.resetModules(); });

  it('warns before discarding basket items', async () => {
    render(
      <ModeProvider><ScanCartProvider>
        <SeedCart /><AppModeSwitcher />
      </ScanCartProvider></ModeProvider>
    );
    screen.getByText('seed').click();
    (await screen.findByRole('radio', { name: /shop/i })).click();
    expect(await screen.findByText(/basket/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run test — confirm it fails**

Command: `npx vitest run src/__tests__/modeSwitchSafety.test.tsx`
Expected: FAIL — the switch currently discards the basket silently

**Step 3: Implement**

In `AppModeSwitcher`, read `totalItems` from `useScanCart()`. When switching to `shop` with `totalItems > 0`, show a `ConfirmDialog` offering **Keep basket** / **Clear and switch**. On a clean switch, fire a toast: `"Sell — sales will be recorded"` / `"Shop — items go to inventory"`.

Note: `ConfirmDialog` is a bottom sheet with a hand-rolled focus trap — reuse it, do not build another.

**Step 4: Run test — confirm it passes**

Command: `npx vitest run src/__tests__/modeSwitchSafety.test.tsx`
Expected: PASS

**Step 5: Commit**

`git add src/components/AppModeSwitcher.tsx src/__tests__/modeSwitchSafety.test.tsx && git commit -m "feat: guard basket loss on mode switch, add switch feedback"`

---

### Task 8: Mode-aware copy and empty states

**Files:**
- Modify: `src/screens/ScannerScreen.tsx`, `src/screens/TillScreen.tsx`, `src/components/EmptyState.tsx` (usage only)
- Test: extend `src/__tests__/App.routing.test.tsx`

**Step 1: Write the failing test**

Add to `App.routing.test.tsx`:

```tsx
it('labels the header per mode', async () => {
  localStorage.setItem('appMode', 'shop');
  const { default: App } = await import('@/App');
  render(<App />);
  expect(await screen.findByText(/scan product/i)).toBeInTheDocument();
});
```

**Step 2: Run — confirm it fails** if the header does not yet read from mode.

**Step 3: Implement** — header title (`"Scan Product"` / `"Till"`), empty-state copy per mode, and the switcher rendered in both app bars.

**Step 4: Run full gate**

`npx tsc --noEmit` (0) and `npx vitest run` (all pass — the 327 pre-existing tests plus the new ones).

**Step 5: Commit**

`git add -A && git commit -m "feat: mode-aware copy and empty states"`

---

## Wave 3 — cleanup and verification

### Task 9: Doc corrections and combined verification

**Files:**
- Modify: `AUDIT_FLOW_NAVIGATION.md`, `docs/plans/2026-10-19-brainstorm-next-phase.md`

**Step 1:** Correct or delete `AUDIT_FLOW_NAVIGATION.md` — it audits a "Seller Mode" that does not exist in the codebase and recommends UI for it.

**Step 2:** Fix the two wrong claims in `2026-10-19-brainstorm-next-phase.md`:
- line 43 — swipe-to-delete **is** implemented (`BatchRow.tsx:18,38,46,87`)
- line 135 — focus-visible **is** largely covered (`index.css:302` + 17 rules)

**Step 3: Full combined gate**

```
npx tsc --noEmit          # expect 0 errors
npx vitest run            # expect 327 + new tests, 0 failures
npx vite build            # expect exit 0, no CSS warnings
```

**Step 4: Commit and push**

`git add -A && git commit -m "docs: correct stale audit claims" && git push origin master`

**Step 5:** Confirm CI is green: `gh run watch --exit-status`. The pipeline runs type-check + test + build, so a red run means a real regression.

---

## Verification checklist (run before declaring done)

- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `npx vitest run` → all pass, including the original 327
- [ ] `npx vite build` → exit 0, no CSS syntax warnings
- [ ] Mode persists across a reload in both Shop and Sell
- [ ] Mode does **not** change on a second device signed into the same account
- [ ] `/sales` in Shop shows the switch prompt, not a redirect
- [ ] Switching Sell → Shop with basket items warns
- [ ] Batch delete shows an Undo that restores the exact row
- [ ] No blank frame on cold launch
- [ ] CI green on push

## Deliberately not in this plan

List virtualization, bulk-select, bundle splitting, E2E suite, error tracking, Settings reorganisation, and any visual restyling of the authenticated screens — the last of these needs screenshots first (see the design doc's "Out of scope").

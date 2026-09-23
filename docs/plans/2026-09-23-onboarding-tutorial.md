# Onboarding Tutorial Implementation Plan

> **For implementer:** Use TDD throughout. Write failing test first. Watch it fail. Then implement.

**Goal:** Build an interactive step-by-step onboarding tutorial that teaches new users the 4 core workflows (Scan → Save → Manage → Alerts) and shows contextual screen hints.

**Architecture:** Full-screen modal overlay with progress dots, driven by a `TutorialContext` that persists step/completion state via existing `settingsService`. Screen-specific hints shown once via `ScreenTooltip`. Replayable from Settings.

**Tech Stack:** React 18 + TypeScript, existing design tokens (CSS custom properties), IndexedDB (via settingsService), lucide-react icons

---

## Task 1: Tutorial Settings + Types

**Files:**
- Modify: `src/types/index.ts`
- Test: `src/__tests__/tutorialService.test.ts`
- Create: `src/services/tutorialService.ts`

### Step 1: Write failing test

Create `src/__tests__/tutorialService.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { getDB } from '../db/database';
import {
  getTutorialStatus,
  setTutorialCompleted,
  setTutorialStep,
  markScreenHintSeen,
  resetTutorial,
} from '../services/tutorialService';

describe('tutorialService', () => {
  beforeEach(async () => {
    const db = await getDB();
    await db.clear('settings');
  });

  it('should return default tutorial status (not completed, step 0)', async () => {
    const status = await getTutorialStatus();
    expect(status.tutorialCompleted).toBe(false);
    expect(status.tutorialStep).toBe(0);
    expect(status.screenHintsSeen).toEqual([]);
  });

  it('should set tutorial completed', async () => {
    await setTutorialCompleted(true);
    const status = await getTutorialStatus();
    expect(status.tutorialCompleted).toBe(true);
  });

  it('should set tutorial step', async () => {
    await setTutorialStep(2);
    const status = await getTutorialStatus();
    expect(status.tutorialStep).toBe(2);
  });

  it('should mark screen hints as seen', async () => {
    await markScreenHintSeen('scanner');
    await markScreenHintSeen('inventory');
    const status = await getTutorialStatus();
    expect(status.screenHintsSeen).toContain('scanner');
    expect(status.screenHintsSeen).toContain('inventory');
  });

  it('should not duplicate seen hints', async () => {
    await markScreenHintSeen('scanner');
    await markScreenHintSeen('scanner');
    const status = await getTutorialStatus();
    expect(status.screenHintsSeen.filter(s => s === 'scanner')).toHaveLength(1);
  });

  it('should reset tutorial to defaults', async () => {
    await setTutorialCompleted(true);
    await setTutorialStep(3);
    await markScreenHintSeen('scanner');
    await resetTutorial();
    const status = await getTutorialStatus();
    expect(status.tutorialCompleted).toBe(false);
    expect(status.tutorialStep).toBe(0);
    expect(status.screenHintsSeen).toEqual([]);
  });
});
```

### Step 2: Run test — expect fail

```bash
cd C:/Users/bryan/Documents/Hermes/Projects/barcode-inventory && npx vitest run src/__tests__/tutorialService.test.ts
```
Expected: FAIL — "Cannot find module '../services/tutorialService'"

### Step 3: Update types

Modify `src/types/index.ts`:

Add the following fields to the `Settings` interface (after `sellerMode`):

```typescript
  tutorialCompleted: boolean;
  tutorialStep: number;
  screenHintsSeen: string[];
```

Add the following to `DEFAULT_SETTINGS`:

```typescript
  tutorialCompleted: false,
  tutorialStep: 0,
  screenHintsSeen: [],
```

### Step 4: Create `src/services/tutorialService.ts`

```typescript
import type { Settings } from '@/types';
import { DEFAULT_SETTINGS, SETTINGS_ID } from '@/types';
import { loadSettings, saveSettings } from './settingsService';

export interface TutorialStatus {
  tutorialCompleted: boolean;
  tutorialStep: number;
  screenHintsSeen: string[];
}

export async function getTutorialStatus(): Promise<TutorialStatus> {
  const settings = await loadSettings();
  return {
    tutorialCompleted: settings.tutorialCompleted ?? DEFAULT_SETTINGS.tutorialCompleted,
    tutorialStep: settings.tutorialStep ?? DEFAULT_SETTINGS.tutorialStep,
    screenHintsSeen: settings.screenHintsSeen ?? DEFAULT_SETTINGS.screenHintsSeen,
  };
}

export async function setTutorialCompleted(completed: boolean): Promise<void> {
  const settings = await loadSettings();
  await saveSettings({ ...settings, tutorialCompleted: completed });
}

export async function setTutorialStep(step: number): Promise<void> {
  const settings = await loadSettings();
  await saveSettings({ ...settings, tutorialStep: step });
}

export async function markScreenHintSeen(screenId: string): Promise<void> {
  const settings = await loadSettings();
  const seen = settings.screenHintsSeen ?? [];
  if (seen.includes(screenId)) return;
  await saveSettings({ ...settings, screenHintsSeen: [...seen, screenId] });
}

export async function resetTutorial(): Promise<void> {
  const settings = await loadSettings();
  await saveSettings({
    ...settings,
    tutorialCompleted: DEFAULT_SETTINGS.tutorialCompleted,
    tutorialStep: DEFAULT_SETTINGS.tutorialStep,
    screenHintsSeen: DEFAULT_SETTINGS.screenHintsSeen,
  });
}
```

### Step 5: Run test — expect pass

```bash
cd C:/Users/bryan/Documents/Hermes/Projects/barcode-inventory && npx vitest run src/__tests__/tutorialService.test.ts
```
Expected: PASS

### Step 6: Commit

```bash
git add src/types/index.ts src/services/tutorialService.ts src/__tests__/tutorialService.test.ts
git commit -m "feat: add tutorial service for onboarding state persistence"
```

---

## Task 2: Tutorial Data + Context

**Files:**
- Create: `src/data/tutorialSteps.ts`
- Create: `src/context/TutorialContext.tsx`
- Test: `src/__tests__/TutorialContext.test.tsx`

### Step 1: Write failing test

Create `src/__tests__/TutorialContext.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, waitFor, act } from '@testing-library/react';
import { TutorialProvider, useTutorial } from '../context/TutorialContext';
import { getDB } from '../db/database';

function TestConsumer() {
  const { isVisible, currentStep, totalSteps, currentStepData, next, prev, skip, finish } = useTutorial();
  return (
    <div>
      <div data-testid="visible">{String(isVisible)}</div>
      <div data-testid="step">{currentStep}</div>
      <div data-testid="total">{totalSteps}</div>
      <div data-testid="title">{currentStepData?.title}</div>
      <button onClick={next}>Next</button>
      <button onClick={prev}>Prev</button>
      <button onClick={skip}>Skip</button>
      <button onClick={finish}>Finish</button>
    </div>
  );
}

describe('TutorialContext', () => {
  beforeEach(async () => {
    const db = await getDB();
    await db.clear('settings');
  });

  afterEach(() => {
    // Cleanup timers
    vi.useRealTimers();
  });

  it('should show tutorial on first visit (not completed)', async () => {
    render(
      <TutorialProvider>
        <TestConsumer />
      </TutorialProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('visible').textContent).toBe('true');
    });
    expect(screen.getByTestId('step').textContent).toBe('0');
    expect(screen.getByTestId('title').textContent).toBe('Scan');
  });

  it('should hide tutorial if already completed', async () => {
    const db = await getDB();
    await db.put('settings', {
      id: 'settings',
      alertWindowDays: 3,
      notificationsEnabled: false,
      theme: 'auto',
      cashierMode: false,
      sellerMode: false,
      tutorialCompleted: true,
      tutorialStep: 0,
      screenHintsSeen: [],
    });

    render(
      <TutorialProvider>
        <TestConsumer />
      </TutorialProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('visible').textContent).toBe('false');
    });
  });

  it('should advance to next step', async () => {
    render(
      <TutorialProvider>
        <TestConsumer />
      </TutorialProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('visible').textContent).toBe('true');
    });
    await act(async () => {
      screen.getByText('Next').click();
    });
    await waitFor(() => {
      expect(screen.getByTestId('step').textContent).toBe('1');
    });
    expect(screen.getByTestId('title').textContent).toBe('Save Product');
  });

  it('should not go past last step', async () => {
    render(
      <TutorialProvider>
        <TestConsumer />
      </TutorialProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('visible').textContent).toBe('true');
    });
    // Click next 4 times (max step is 3)
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        screen.getByText('Next').click();
      });
    }
    await waitFor(() => {
      expect(screen.getByTestId('step').textContent).toBe('3');
    });
  });

  it('should skip tutorial (mark completed, hide)', async () => {
    render(
      <TutorialProvider>
        <TestConsumer />
      </TutorialProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('visible').textContent).toBe('true');
    });
    await act(async () => {
      screen.getByText('Skip').click();
    });
    await waitFor(() => {
      expect(screen.getByTestId('visible').textContent).toBe('false');
    });
  });

  it('should finish tutorial (mark completed, hide)', async () => {
    render(
      <TutorialProvider>
        <TestConsumer />
      </TutorialProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('visible').textContent).toBe('true');
    });
    await act(async () => {
      screen.getByText('Finish').click();
    });
    await waitFor(() => {
      expect(screen.getByTestId('visible').textContent).toBe('false');
    });
  });
});
```

### Step 2: Run test — expect fail

```bash
cd C:/Users/bryan/Documents/Hermes/Projects/barcode-inventory && npx vitest run src/__tests__/TutorialContext.test.tsx
```
Expected: FAIL — "Cannot find module '../context/TutorialContext'"

### Step 3: Create `src/data/tutorialSteps.ts`

```typescript
import { ScanLine, Package, ClipboardList, Bell } from 'lucide-react';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: typeof ScanLine; // lucide icon component type
  ctaLabel: string; // button text for the action
  screenPath?: string; // optional route to navigate to
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'scan',
    title: 'Scan',
    description: 'Point your camera at a barcode, or tap the keyboard icon to enter it manually. The app looks up product info automatically.',
    icon: ScanLine,
    ctaLabel: 'Try Scanning',
    screenPath: '/',
  },
  {
    id: 'save',
    title: 'Save Product',
    description: 'After scanning, review the auto-filled details. Edit name, brand, price, and expiry date. Set your quantity and save to inventory.',
    icon: Package,
    ctaLabel: 'Got It',
    screenPath: '/product/demo',
  },
  {
    id: 'manage',
    title: 'Manage Inventory',
    description: 'All your scanned items are grouped by product with FIFO sorting. Search, filter by expiry status, and tap to edit or remove batches.',
    icon: ClipboardList,
    ctaLabel: 'View Inventory',
    screenPath: '/inventory',
  },
  {
    id: 'alerts',
    title: 'Set Up Alerts',
    description: 'Enable push notifications and set your alert window (days before expiry). Never let items go to waste!',
    icon: Bell,
    ctaLabel: 'Open Settings',
    screenPath: '/settings',
  },
];

export const TOTAL_TUTORIAL_STEPS = TUTORIAL_STEPS.length;
```

### Step 4: Create `src/context/TutorialContext.tsx`

```typescript
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { TUTORIAL_STEPS, TOTAL_TUTORIAL_STEPS, TutorialStep } from '@/data/tutorialSteps';
import {
  getTutorialStatus,
  setTutorialCompleted,
  setTutorialStep,
} from '@/services/tutorialService';

interface TutorialContextValue {
  isVisible: boolean;
  currentStep: number;
  totalSteps: number;
  currentStepData: TutorialStep | null;
  next: () => void;
  prev: () => void;
  skip: () => void;
  finish: () => void;
  reopen: () => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getTutorialStatus().then((status) => {
      if (!status.tutorialCompleted) {
        setCurrentStep(status.tutorialStep);
        setIsVisible(true);
      }
      setLoaded(true);
    });
  }, []);

  const persistStep = useCallback((step: number) => {
    setTutorialStep(step);
  }, []);

  const next = useCallback(() => {
    setCurrentStep((prev) => {
      const nextStep = Math.min(prev + 1, TOTAL_TUTORIAL_STEPS - 1);
      persistStep(nextStep);
      return nextStep;
    });
  }, [persistStep]);

  const prev = useCallback(() => {
    setCurrentStep((prev) => {
      const prevStep = Math.max(prev - 1, 0);
      persistStep(prevStep);
      return prevStep;
    });
  }, [persistStep]);

  const skip = useCallback(() => {
    setTutorialCompleted(true);
    setIsVisible(false);
  }, []);

  const finish = useCallback(() => {
    setTutorialCompleted(true);
    setCurrentStep(0);
    setIsVisible(false);
  }, []);

  const reopen = useCallback(() => {
    setCurrentStep(0);
    setTutorialStep(0);
    setTutorialCompleted(false);
    setIsVisible(true);
  }, []);

  const currentStepData = useMemo(
    () => TUTORIAL_STEPS[currentStep] ?? null,
    [currentStep]
  );

  // Don't render anything until loaded to prevent flash
  if (!loaded) return <>{children}</>;

  return (
    <TutorialContext.Provider
      value={{
        isVisible,
        currentStep,
        totalSteps: TOTAL_TUTORIAL_STEPS,
        currentStepData,
        next,
        prev,
        skip,
        finish,
        reopen,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial(): TutorialContextValue {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error('useTutorial must be used within TutorialProvider');
  return ctx;
}
```

### Step 5: Run test — expect pass

```bash
cd C:/Users/bryan/Documents/Hermes/Projects/barcode-inventory && npx vitest run src/__tests__/TutorialContext.test.tsx
```
Expected: PASS

### Step 6: Commit

```bash
git add src/data/tutorialSteps.ts src/context/TutorialContext.tsx src/__tests__/TutorialContext.test.tsx
git commit -m "feat: add tutorial context with step navigation and persistence"
```

---

## Task 3: Tutorial Overlay Component

**Files:**
- Create: `src/components/TutorialOverlay.tsx`
- Create: `src/components/TutorialOverlay.css`
- Test: `src/__tests__/TutorialOverlay.test.tsx`

### Step 1: Write failing test

Create `src/__tests__/TutorialOverlay.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, act, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TutorialProvider } from '../context/TutorialContext';
import { TutorialOverlay } from '../components/TutorialOverlay';
import { getDB } from '../db/database';

async function setupCompleted() {
  const db = await getDB();
  await db.put('settings', {
    id: 'settings',
    alertWindowDays: 3,
    notificationsEnabled: false,
    theme: 'auto',
    cashierMode: false,
    sellerMode: false,
    tutorialCompleted: true,
    tutorialStep: 0,
    screenHintsSeen: [],
  });
}

describe('TutorialOverlay', () => {
  beforeEach(async () => {
    const db = await getDB();
    await db.clear('settings');
  });

  it('should render first step when not completed', async () => {
    render(
      <BrowserRouter>
        <TutorialProvider>
          <TutorialOverlay />
        </TutorialProvider>
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Scan')).toBeInTheDocument();
    });
    expect(screen.getByText(/Point your camera/)).toBeInTheDocument();
  });

  it('should not render when already completed', async () => {
    await setupCompleted();
    render(
      <BrowserRouter>
        <TutorialProvider>
          <TutorialOverlay />
        </TutorialProvider>
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.queryByText('Scan')).not.toBeInTheDocument();
    });
  });

  it('should show progress dots', async () => {
    render(
      <BrowserRouter>
        <TutorialProvider>
          <TutorialOverlay />
        </TutorialProvider>
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Scan')).toBeInTheDocument();
    });
    // 4 steps = 4 dots
    const dots = document.querySelectorAll('.tutorial-progress-dot');
    expect(dots).toHaveLength(4);
  });

  it('should show step counter text', async () => {
    render(
      <BrowserRouter>
        <TutorialProvider>
          <TutorialOverlay />
        </TutorialProvider>
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    });
  });

  it('should navigate to next step on CTA click', async () => {
    render(
      <BrowserRouter>
        <TutorialProvider>
          <TutorialOverlay />
        </TutorialProvider>
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Scan')).toBeInTheDocument();
    });
    await act(async () => {
      screen.getByText('Try Scanning').click();
    });
    await waitFor(() => {
      expect(screen.getByText('Save Product')).toBeInTheDocument();
    });
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
  });

  it('should show Skip button', async () => {
    render(
      <BrowserRouter>
        <TutorialProvider>
          <TutorialOverlay />
        </TutorialProvider>
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Skip')).toBeInTheDocument();
    });
  });

  it('should hide on Skip click', async () => {
    render(
      <BrowserRouter>
        <TutorialProvider>
          <TutorialOverlay />
        </TutorialProvider>
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Skip')).toBeInTheDocument();
    });
    await act(async () => {
      screen.getByText('Skip').click();
    });
    await waitFor(() => {
      expect(screen.queryByText('Scan')).not.toBeInTheDocument();
    });
  });

  it('should show Finish on last step', async () => {
    render(
      <BrowserRouter>
        <TutorialProvider>
          <TutorialOverlay />
        </TutorialProvider>
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Scan')).toBeInTheDocument();
    });
    // Navigate to last step (4th)
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        screen.getByText('Next').click();
      });
    }
    await waitFor(() => {
      expect(screen.getByText('Set Up Alerts')).toBeInTheDocument();
    });
    expect(screen.getByText('Finish')).toBeInTheDocument();
  });
});
```

### Step 2: Run test — expect fail

```bash
cd C:/Users/bryan/Documents/Hermes/Projects/barcode-inventory && npx vitest run src/__tests__/TutorialOverlay.test.tsx
```
Expected: FAIL — "Cannot find module '../components/TutorialOverlay'"

### Step 3: Create `src/components/TutorialOverlay.css`

```css
/* ==========================================================================
   TUTORIAL OVERLAY
   ========================================================================== */

.tutorial-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  animation: fade-in var(--transition-fast) ease;
  padding: var(--space-md);
}

.tutorial-card {
  background: var(--color-card);
  border-radius: var(--radius-xl);
  padding: var(--space-2xl);
  max-width: 420px;
  width: 100%;
  text-align: center;
  box-shadow: var(--shadow-xl);
  animation: slide-up var(--transition-base) ease;
  position: relative;
  overflow: hidden;
}

.tutorial-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--color-accent), var(--color-primary));
}

.tutorial-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--color-muted);
  margin: 0 auto var(--space-lg);
  color: var(--color-accent);
}

.tutorial-step-title {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-foreground);
  margin: 0 0 var(--space-sm);
}

.tutorial-step-description {
  font-size: var(--text-sm);
  color: var(--color-muted-foreground);
  line-height: 1.6;
  margin: 0 0 var(--space-xl);
  max-width: 320px;
  margin-left: auto;
  margin-right: auto;
}

.tutorial-progress {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
}

.tutorial-progress-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-border);
  transition: background var(--transition-base), transform var(--transition-base);
}

.tutorial-progress-dot.active {
  background: var(--color-accent);
  transform: scale(1.3);
}

.tutorial-progress-dot.completed {
  background: var(--color-accent);
  opacity: 0.5;
}

.tutorial-counter {
  font-size: var(--text-xs);
  color: var(--color-muted-foreground);
  font-weight: 500;
  margin-bottom: var(--space-lg);
}

.tutorial-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: center;
  flex-wrap: wrap;
}

.tutorial-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-lg);
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: var(--text-sm);
  min-height: 44px;
  cursor: pointer;
  transition: opacity var(--transition-base), transform var(--transition-fast);
  border: none;
}

.tutorial-btn:active {
  transform: scale(0.97);
}

.tutorial-btn-primary {
  background: var(--color-accent);
  color: var(--color-on-accent);
  flex: 1;
  min-width: 120px;
}

.tutorial-btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.tutorial-btn-secondary {
  background: transparent;
  color: var(--color-muted-foreground);
  padding: var(--space-md) var(--space-md);
}

.tutorial-btn-secondary:hover {
  color: var(--color-foreground);
}

.tutorial-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Navigation arrows */
.tutorial-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-md);
}

.tutorial-nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-muted-foreground);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
  border: none;
}

.tutorial-nav-btn:hover:not(:disabled) {
  background: var(--color-muted);
  color: var(--color-foreground);
}

.tutorial-nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
```

### Step 4: Create `src/components/TutorialOverlay.tsx`

```typescript
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTutorial } from '@/context/TutorialContext';
import { TUTORIAL_STEPS } from '@/data/tutorialSteps';
import { setTutorialCompleted } from '@/services/tutorialService';
import './TutorialOverlay.css';

export function TutorialOverlay() {
  const navigate = useNavigate();
  const { isVisible, currentStep, totalSteps, next, prev, skip, finish } = useTutorial();

  if (!isVisible) return null;

  const step = TUTORIAL_STEPS[currentStep];
  if (!step) return null;

  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  const handleCta = () => {
    if (step.screenPath) {
      navigate(step.screenPath);
    }
    if (isLastStep) {
      finish();
    } else {
      next();
    }
  };

  const handleSkip = () => {
    skip();
  };

  return (
    <div className="tutorial-overlay" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <div className="tutorial-card">
        {/* Close (X) for skip */}
        <button
          onClick={handleSkip}
          aria-label="Skip tutorial"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            minWidth: '44px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-muted-foreground)',
            cursor: 'pointer',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <X size={20} />
        </button>

        {/* Icon */}
        <div className="tutorial-icon-wrap">
          <step.icon size={32} />
        </div>

        {/* Title */}
        <h2 id="tutorial-title" className="tutorial-step-title">
          {step.title}
        </h2>

        {/* Description */}
        <p className="tutorial-step-description">
          {step.description}
        </p>

        {/* Progress dots */}
        <div className="tutorial-progress" aria-hidden="true">
          {TUTORIAL_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`tutorial-progress-dot${
                idx === currentStep ? ' active' : idx < currentStep ? ' completed' : ''
              }`}
            />
          ))}
        </div>

        {/* Counter */}
        <div className="tutorial-counter" aria-live="polite">
          Step {currentStep + 1} of {totalSteps}
        </div>

        {/* Navigation arrows */}
        <div className="tutorial-nav">
          <button
            className="tutorial-nav-btn"
            onClick={prev}
            disabled={isFirstStep}
            aria-label="Previous step"
          >
            <ChevronLeft size={20} />
          </button>

          {/* Primary CTA */}
          <button
            className="tutorial-btn tutorial-btn-primary"
            onClick={handleCta}
          >
            {isLastStep ? 'Finish' : step.ctaLabel}
            {!isLastStep && <ChevronRight size={16} />}
          </button>

          <button
            className="tutorial-nav-btn"
            onClick={next}
            disabled={isLastStep}
            aria-label="Next step"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Skip link */}
        {!isLastStep && (
          <button
            className="tutorial-btn tutorial-btn-secondary"
            onClick={handleSkip}
            style={{ marginTop: 'var(--space-sm)' }}
          >
            Skip Tutorial
          </button>
        )}
      </div>
    </div>
  );
}
```

### Step 5: Run test — expect pass

```bash
cd C:/Users/bryan/Documents/Hermes/Projects/barcode-inventory && npx vitest run src/__tests__/TutorialOverlay.test.tsx
```
Expected: PASS

### Step 6: Commit

```bash
git add src/components/TutorialOverlay.tsx src/components/TutorialOverlay.css src/__tests__/TutorialOverlay.test.tsx
git commit -m "feat: add TutorialOverlay component with step navigation"
```

---

## Task 4: Screen Tooltip Component

**Files:**
- Create: `src/components/ScreenTooltip.tsx`
- Create: `src/components/ScreenTooltip.css`
- Test: `src/__tests__/ScreenTooltip.test.tsx`

### Step 1: Write failing test

Create `src/__tests__/ScreenTooltip.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, act, waitFor } from '@testing-library/react';
import { TutorialProvider } from '@/context/TutorialContext';
import { ScreenTooltip } from '@/components/ScreenTooltip';
import { getDB } from '@/db/database';

describe('ScreenTooltip', () => {
  beforeEach(async () => {
    const db = await getDB();
    await db.clear('settings');
  });

  it('should render tooltip on first visit to screen', async () => {
    render(
      <TutorialProvider>
        <ScreenTooltip screenId="scanner" message="Tap the barcode to scan" />
      </TutorialProvider>
    );
    await waitFor(() => {
      expect(screen.getByText('Tap the barcode to scan')).toBeInTheDocument();
    });
  });

  it('should hide tooltip after dismiss', async () => {
    render(
      <TutorialProvider>
        <ScreenTooltip screenId="scanner" message="Tap the barcode to scan" />
      </TutorialProvider>
    );
    await waitFor(() => {
      expect(screen.getByText('Tap the barcode to scan')).toBeInTheDocument();
    });
    await act(async () => {
      screen.getByText('Got it').click();
    });
    await waitFor(() => {
      expect(screen.queryByText('Tap the barcode to scan')).not.toBeInTheDocument();
    });
  });

  it('should not show tooltip if already seen', async () => {
    // Mark scanner hint as seen
    const db = await getDB();
    await db.put('settings', {
      id: 'settings',
      alertWindowDays: 3,
      notificationsEnabled: false,
      theme: 'auto',
      cashierMode: false,
      sellerMode: false,
      tutorialCompleted: false,
      tutorialStep: 0,
      screenHintsSeen: ['scanner'],
    });

    render(
      <TutorialProvider>
        <ScreenTooltip screenId="scanner" message="Tap the barcode to scan" />
      </TutorialProvider>
    );
    // Wait for context to load
    await waitFor(() => {
      expect(screen.queryByText('Tap the barcode to scan')).not.toBeInTheDocument();
    });
  });
});
```

### Step 2: Run test — expect fail

```bash
cd C:/Users/bryan/Documents/Hermes/Projects/barcode-inventory && npx vitest run src/__tests__/ScreenTooltip.test.tsx
```
Expected: FAIL — "Cannot find module '@/components/ScreenTooltip'"

### Step 3: Create `src/components/ScreenTooltip.css`

```css
/* ==========================================================================
   SCREEN TOOLTIP
   ========================================================================== */

.screen-tooltip {
  position: fixed;
  bottom: calc(var(--bottom-nav-total) + var(--space-md));
  left: 50%;
  transform: translateX(-50%);
  z-index: 80;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-md) var(--space-lg);
  box-shadow: var(--shadow-lg);
  display: flex;
  align-items: center;
  gap: var(--space-md);
  max-width: 360px;
  width: calc(100% - 2 * var(--space-md));
  animation: slide-up-sheet var(--transition-base) ease;
}

.screen-tooltip-message {
  flex: 1;
  font-size: var(--text-sm);
  color: var(--color-foreground);
  line-height: 1.4;
}

.screen-tooltip-btn {
  background: var(--color-accent);
  color: var(--color-on-accent);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: var(--text-xs);
  min-height: 36px;
  cursor: pointer;
  border: none;
  white-space: nowrap;
  flex-shrink: 0;
  transition: opacity var(--transition-fast);
}

.screen-tooltip-btn:hover {
  opacity: 0.9;
}

.screen-tooltip-btn:active {
  transform: scale(0.97);
}
```

### Step 4: Create `src/components/ScreenTooltip.tsx`

```typescript
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useTutorial } from '@/context/TutorialContext';
import { markScreenHintSeen, getTutorialStatus } from '@/services/tutorialService';
import './ScreenTooltip.css';

interface ScreenTooltipProps {
  screenId: string;
  message: string;
}

export function ScreenTooltip({ screenId, message }: ScreenTooltipProps) {
  const { isVisible: isTutorialVisible } = useTutorial();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Don't show screen hints while the main tutorial overlay is visible
    if (isTutorialVisible) {
      setShow(false);
      return;
    }
    getTutorialStatus().then((status) => {
      if (!status.screenHintsSeen.includes(screenId)) {
        setShow(true);
      }
    });
  }, [screenId, isTutorialVisible]);

  const handleDismiss = () => {
    setShow(false);
    markScreenHintSeen(screenId);
  };

  if (!show) return null;

  return (
    <div
      className="screen-tooltip"
      role="status"
      aria-live="polite"
    >
      <span className="screen-tooltip-message">{message}</span>
      <button
        className="screen-tooltip-btn"
        onClick={handleDismiss}
      >
        Got it
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--color-muted-foreground)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '24px',
          minHeight: '24px',
          flexShrink: 0,
          padding: '4px',
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
```

### Step 5: Run test — expect pass

```bash
cd C:/Users/bryan/Documents/Hermes/Projects/barcode-inventory && npx vitest run src/__tests__/ScreenTooltip.test.tsx
```
Expected: PASS

### Step 6: Commit

```bash
git add src/components/ScreenTooltip.tsx src/components/ScreenTooltip.css src/__tests__/ScreenTooltip.test.tsx
git commit -m "feat: add ScreenTooltip for contextual first-visit hints"
```

---

## Task 5: Integrate into App + Settings

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/screens/SettingsScreen.tsx`
- Modify: `src/screens/ScannerScreen.tsx`
- Modify: `src/screens/InventoryScreen.tsx`

### Step 1: Modify `src/App.tsx`

Add `TutorialProvider` and `TutorialOverlay`:

```typescript
import { useEffect } from 'react';
import { Routes, Route, useLocation, Link } from 'react-router-dom';
import { ScanLine, Package, Settings } from 'lucide-react';
import { ScannerScreen } from '@/screens/ScannerScreen';
import { InventoryScreen } from '@/screens/InventoryScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { ProductDetailScreen } from '@/screens/ProductDetailScreen';
import { CartReviewScreen } from '@/screens/CartReviewScreen';
import { SettingsProvider, useSettingsContext } from '@/context/SettingsContext';
import { TutorialProvider } from '@/context/TutorialContext';
import { TutorialOverlay } from '@/components/TutorialOverlay';
import { ScanCartProvider } from '@/context/ScanCartContext';
import { useTheme } from '@/hooks/useTheme';
import { seedCatalogIfEmpty } from '@/services/seedService';
import { notifyExpiringItems, getPermissionStatus } from '@/services/notificationService';
import { getAllBatches } from '@/services/inventoryService';

export default function App() {
  useTheme();
  useEffect(() => {
    seedCatalogIfEmpty();
  }, []);

  return (
    <SettingsProvider>
      <NotificationChecker />
      <TutorialProvider>
        <ScanCartProvider>
          <div className="app-container">
            <Routes>
              <Route path="/" element={<ScannerScreen />} />
              <Route path="/product/:barcode" element={<ProductDetailScreen />} />
              <Route path="/inventory" element={<InventoryScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route path="/cart" element={<CartReviewScreen />} />
            </Routes>
            <BottomNav />
          </div>
          <TutorialOverlay />
        </ScanCartProvider>
      </TutorialProvider>
    </SettingsProvider>
  );
}

// ... rest unchanged
```

### Step 2: Add "Replay Tutorial" to SettingsScreen

In `src/screens/SettingsScreen.tsx`:

Import needed:
```typescript
import { HelpCircle } from 'lucide-react';
import { resetTutorial } from '@/services/tutorialService';
```

Add a `handleReplayTutorial` callback:
```typescript
  const handleReplayTutorial = useCallback(async () => {
    await resetTutorial();
    window.location.reload();
  }, []);
```

Add the button inside the "About" section (before the closing `</div>` of the About settings-card-stack-sm):

```tsx
        <button
          onClick={handleReplayTutorial}
          className="settings-row"
        >
          <HelpCircle size={20} />
          Replay Tutorial
        </button>
```

### Step 3: Add ScreenTooltip to ScannerScreen

In `src/screens/ScannerScreen.tsx`:

Import:
```typescript
import { ScreenTooltip } from '@/components/ScreenTooltip';
```

Add right before the closing `</div>` of the outermost container (after the scanToast `<style>` block):

```tsx
      <ScreenTooltip
        screenId="scanner"
        message="Tap the barcode or use the keyboard icon for manual entry"
      />
```

### Step 4: Add ScreenTooltip to InventoryScreen

In `src/screens/InventoryScreen.tsx`:

Import:
```typescript
import { ScreenTooltip } from '@/components/ScreenTooltip';
```

Add right before the closing `</div>` of the outermost onTouch div (after the EditBatchSheet):

```tsx
      <ScreenTooltip
        screenId="inventory"
        message="Tap a product to expand batches • Use search or filter by expiry status"
      />
```

### Step 5: Run all tests — expect pass

```bash
cd C:/Users/bryan/Documents/Hermes/Projects/barcode-inventory && npx vitest run
```
Expected: PASS (all existing + new tests)

### Step 6: Build check

```bash
cd C:/Users/bryan/Documents/Hermes/Projects/barcode-inventory && npx tsc --noEmit
```
Expected: no errors

### Step 7: Commit

```bash
git add src/App.tsx src/screens/SettingsScreen.tsx src/screens/ScannerScreen.tsx src/screens/InventoryScreen.tsx
git commit -m "feat: integrate tutorial overlay, settings replay, and screen tooltips"
```

---

## Task 6: Run Full Test Suite + Integration

**Step 1: Run all tests**
```bash
cd C:/Users/bryan/Documents/Hermes/Projects/barcode-inventory && npx vitest run
```
Expected: All tests pass (existing + 3 new test files)

**Step 2: Type-check**
```bash
cd C:/Users/bryan/Documents/Hermes/Projects/barcode-inventory && npx tsc --noEmit
```
Expected: No type errors

**Step 3: Build**
```bash
cd C:/Users/bryan/Documents/Hermes/Projects/barcode-inventory && npx vite build
```
Expected: Build succeeds

**Step 4: Manual verification checklist**
- [ ] First visit: overlay appears with "Scan" step
- [ ] Click Next → step 2 "Save Product"
- [ ] Click Next → step 3 "Manage Inventory"
- [ ] Click Next → step 4 "Set Up Alerts" with Finish button
- [ ] Click Finish → overlay closes
- [ ] Refresh → overlay does NOT reappear
- [ ] Settings → "Replay Tutorial" → overlay shows again after reload
- [ ] Scanner screen shows tooltip (after tutorial dismissed)
- [ ] Inventory screen shows tooltip (after tutorial dismissed)

**Step 5: Commit final**
```bash
git add -A && git commit -m "feat: complete onboarding tutorial integration"
```

# Barcode Inventory Deployment Readiness Implementation Plan

> **For implementer:** Use TDD throughout. Write failing test first. Watch it fail. Then implement.

**Goal:** Prepare the barcode scanner app for production deployment by fixing lint warnings, optimizing build chunk size, eliminating flaky tests, adding error boundary, and ensuring PWA reliability.

**Architecture:** Address each concern with targeted, test-driven changes: lint fixes via removing unused vars; chunk size via rollup manualChunks to split vendor code; flaky test by mocking timers; error boundary via React error boundary component; PWA verification via manual testing and workbox config.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, ESLint, Workbox.

---

### Task 1: Fix lint warnings (unused vars) in test files

**Files:**
- Modify: `src/__tests__/ModeIndicatorChip.test.tsx`
- Modify: `src/__tests__/ScannerScreen.test.tsx`
- Modify: `src/__tests__/ariaProbe.test.tsx`
- Modify: `src/__tests__/productLookupService.test.ts`
- Modify: `src/__tests__/settingsLogout.test.tsx`

**Step 1: Write the failing test**  
No new test needed; lint warnings are already present. We'll treat the lint check as the test.

**Step 2: Run lint — confirm warnings exist**  
Command: `npx eslint src/__tests__/ModeIndicatorChip.test.tsx src/__tests__/ScannerScreen.test.tsx src/__tests__/ariaProbe.test.tsx src/__tests__/productLookupService.test.ts src/__tests__/settingsLogout.test.tsx`  
Expected: Warnings about unused variables (as seen earlier).

**Step 3: Write minimal implementation**  
Remove unused imports or rename to `_` prefix.  
For each file:
- `ModeIndicatorChip.test.tsx`: remove unused `beforeEach`, `afterEach` imports (they are imported but not used).  
- `ScannerScreen.test.tsx`: remove unused `CameraViewfinder`, `onManualEntry`, `props`, `ref`.  
- `ariaProbe.test.tsx`: remove unused `vi`.  
- `productLookupService.test.ts`: remove unused `lookupOpenFoodFacts`, `LookupError`.  
- `settingsLogout.test.tsx`: remove unused `useAuth`.

**Step 4: Run lint — confirm no warnings**  
Command: `npx eslint src/__tests__/ModeIndicatorChip.test.tsx src/__tests__/ScannerScreen.test.tsx src/__tests__/ariaProbe.test.tsx src/__tests__/productLookupService.test.ts src/__tests__/settingsLogout.test.tsx`  
Expected: No warnings.

**Step 5: Commit**  
`git add src/__tests__/ModeIndicatorChip.test.tsx src/__tests__/ScannerScreen.test.tsx src/__tests__/ariaProbe.test.tsx src/__tests__/productLookupService.test.ts src/__tests__/settingsLogout.test.tsx && git commit -m \"lint: remove unused vars in test files\"`

---

### Task 2: Optimize bundle chunk size by adding rollup.manualChunks

**Files:**
- Modify: `vite.config.ts`

**Step 1: Write the failing test**  
Check build output for chunk size warning.

**Step 2: Run build — confirm warning appears**  
Command: `npm run build`  
Expected: Warning: \"Some chunks are larger than 500 kB after minification.\"

**Step 3: Write minimal implementation**  
Add `build.rollupOptions.output.manualChunks` to split vendor code (e.g., react, react-dom) into separate chunk.

Append to `defineConfig`:
```ts
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
```

**Step 4: Run build — confirm warning resolved**  
Command: `npm run build`  
Expected: No chunk size warning (or size under limit).

**Step 5: Commit**  
`git add vite.config.ts && git commit -m \"build: add manualChunks to reduce chunk size\"`

---

### Task 3: Identify and fix flaky test

**Files:**
- Examine test files to locate flaky test (likely uses real timers). We'll add `vi.useFakeTimers()` where needed.

**Step 1: Write the failing test**  
Run tests with `--detect-open-handles` or look for intermittent failures. We'll first run all tests to see if any fail.

**Step 2: Run tests — confirm flaky test fails occasionally**  
Command: `npm test -- --run`  
Expected: All tests pass but we know task 11 had flaky test; we'll simulate by forcing a failure using real timer (e.g., a test that uses `setTimeout` without mocking). For safety, we'll add a test that expects failure if timers not mocked.

Instead, we will directly modify any test that uses `setTimeout` or `Date.now` without mocking timers to use `vi.useFakeTimers()`.

We'll identify candidates from earlier search: many files use `setTimeout`. We'll pick one test file that likely contains a flaky test, e.g., `src/__tests__/TutorialOverlay.test.tsx` (uses `setTimeout` in awaits). Let's examine.

But for plan, we'll state we will add `vi.useFakeTimers()` in `beforeEach` and `vi.restoreAllMocks()` in `afterEach` for any test file that uses real timers.

We'll create a generic approach: update `vitest.config.ts` to set `fakeTimers: true` globally? However Vite config doesn't have that. We'll instead modify each test file.

Let's list test files that contain `setTimeout` or `Date.now` from earlier search (excluding src). We'll filter to __tests__.

We'll do that in implementation step.

**Step 3: Write minimal implementation**  
For each test file that uses `setTimeout` or `Date.now` without mocking timers, add:
```ts
import { vi } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});
```
Replace any `await new Promise(resolve => setTimeout(resolve, ms))` with `await vi.waitFor(...)` or `advanceTimersByTime`.

We'll apply to:
- `src/__tests__/TutorialOverlay.test.tsx`
- `src/__tests__/inventoryService.test.ts`
- `src/__tests__/notificationService.test.ts`
- Possibly others.

We'll implement for each.

**Step 4: Run tests — confirm no flaky failures**  
Command: `npm test -- --run`  
Expected: All tests pass consistently.

**Step 5: Commit**  
`git add <modified test files> && git commit -m \"test: mock timers to eliminate flaky behavior\"`

---

### Task 4: Add global error boundary component

**Files:**
- Create: `src/components/ErrorBoundary.tsx`
- Modify: `src/main.tsx` (wrap app with ErrorBoundary)

**Step 1: Write the failing test**  
We'll create a test that simulates an error in a child component and ensures error boundary catches it and displays fallback UI.

**Step 2: Run test — confirm it fails**  
Command: `npm test src/__tests__/ErrorBoundary.test.ts`  
Expected: FAIL – component not found.

**Step 3: Write minimal implementation**  
Create `src/components/ErrorBoundary.tsx`:
```tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(_error: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
```

Wrap in `main.tsx`:
```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';
// inside render
<ErrorBoundary fallback={<div>Something went wrong.</div>}>
  <App />
</ErrorBoundary>
```

**Step 4: Run test — confirm it passes**  
Command: `npm test src/__tests__/ErrorBoundary.test.ts`  
Expected: PASS.

**Step 5: Commit**  
`git add src/components/ErrorBoundary.tsx src/main.tsx && git commit -m \"feat: add global error boundary\"`

---

### Task 5: Verify PWA install banner and offline caching

**Files:**
- No code changes; verification steps.

**Step 1: Write the failing test**  
Manual verification: check that install banner appears after threshold and offline fallback works.

**Step 2: Run verification — confirm missing**  
- Build app: `npm run build`
- Serve dist with a simple server (e.g., `npx serve dist`)
- Disable network, reload, ensure app loads (offline fallback).
- Enable network, observe if install banner appears after few scans (or manually trigger via `beforeinstallprompt`).

**Step 3: Write minimal implementation**  
If missing, we may need to add a custom install banner. However audit noted reliance on browser-default; we can decide to keep as is. For deployment readiness, we'll confirm that the PWA manifest and service worker are generated correctly.

Check that `dist/manifest.webmanifest` and `dist/sw.js` exist.

**Step 4: Run verification — confirm success**  
- Confirm manifest and sw.js present.
- Confirm offline page loads (should show app shell).
- Confirm no errors in console.

**Step 5: Commit**  
`git add dist/manifest.webmanifest dist/sw.js || true && git commit -m \"chore: verify PWA assets\"` (if no changes, we can skip commit; but we'll still note verification.)

---

### Task 6: Final production build and test run; update status log

**Files:**
- Modify: `implementation-status.log` (append)

**Step 1: Write the failing test**  
Run full test suite and build; expect any failures.

**Step 2: Run tests and build — confirm any issues**  
Commands:
- `npm test -- --run`
- `npm run build`

Expected: All tests pass, build succeeds with no warnings.

**Step 3: Write minimal implementation**  
If any issues arise from previous tasks, fix them; otherwise, just confirm.

**Step 4: Run tests and build — confirm success**  
Same commands as above, expecting green.

**Step 5: Commit and update status log**  
Append line: `[YYYY-MM-DD HH:MM] Task 6: PASS` (using current timestamp).  
Command: `echo \"[$(date '+%Y-%m-%d %H:%M')] Task 6: PASS\" >> implementation-status.log`  
`git add implementation-status.log && git commit -m \"chore: update implementation status\"`

---
# Section 1 Implementation Plan: Overall App Flow and Navigation

**Date:** 2026-10-14  
**App:** Barcode Inventory (barcode-inventory)  
**Section:** 1 - Overall App Flow and Navigation (impeccable audit)  
**Purpose:** Detailed task‑by‑task plan to implement the four UI/UX recommendations from the audit.

---

## Tasks

Each task is sized for 2–5 minutes (write test → watch fail → implement → watch pass → commit).  
We will follow TDD: write a failing test first, then implement until the test passes, then commit.

### Task 1: Setup Test Infrastructure for Section 1
- **Goal:** Ensure we can render ScannerScreen and RecentScans in tests and query for new UI elements.
- **Test:** Write a test that renders ScannerScreen and asserts the mode toggle exists (current implementation).
- **Implement:** No code change; just verify test environment works.
- **Commit:** Record test output.

### Task 2: Create ModeSegmentedControl Component
- **Goal:** Build a reusable segmented control with two segments (Auto | Manual) that highlights the active segment.
- **Test:** Write a test for ModeSegmentedControl: renders two buttons, clicking toggles active state and calls onChange with correct value.
- **Implement:** Create `src/components/ModeSegmentedControl.tsx` with appropriate styles (use existing CSS variables).
- **Commit:** Save component and test file.

### Task 3: Replace Mode Toggle in ScannerScreen with Segmented Control
- **Goal:** Use the new ModeSegmentedControl in ScannerScreen, replacing the existing toggle button.
- **Test:** Test that ScannerScreen renders the segmented control and that changing mode updates state and triggers toast.
- **Implement:** Import ModeSegmentedControl, replace the button, connect to scanMode state and setScanMode. Add toast on change.
- **Commit:** Update ScannerScreen.tsx.

### Task 4: Add Mode Change Toast and Animation
- **Goal:** When mode changes, show a toast (“Mode switched to Automatic” / “Mode switched to Manual”) and apply a brief scale animation to the segmented control.
- **Test:** Test that showScanToast is called with correct message on mode change; test that animation class is added temporarily.
- **Implement:** Modify ModeSegmentedControl to accept an optional onChange callback that wraps the original and adds toast + animation trigger. Or handle in ScannerScreen after setting state.
- **Commit:** Update ScannerScreen and/or ModeSegmentedControl.

### Task 5: Implement Empty State in RecentScans
- **Goal:** When the scans array is empty, RecentScans renders an EmptyState with appropriate text.
- **Test:** Test RecentScans with empty scans array returns EmptyState component; with non‑empty returns list of scans.
- **Implement:** Edit `src/components/RecentScans.tsx` to conditionally render EmptyState.
- **Commit:** Save component and test.

### Task 6: Create Camera Permission Prompt Modal
- **Goal:** Build a modal that explains why camera access is needed and asks for user confirmation before triggering the browser permission request.
- **Test:** Test PermissionPromptModal renders title, description, and two buttons; clicking Allow calls a provided onConfirm callback.
- **Implement:** Create `src/components/PermissionPromptModal.tsx`.
- **Commit:** Save component and test.

### Task 7: Integrate Permission Prompt in ScannerScreen
- **Goal:** Show the permission prompt on first load (or when camera permission not yet granted) before attempting to activate the camera.
- **Test:** Test that ScannerScreen initially renders the prompt; after confirming, the prompt disappears and cameraActive becomes true (or we simulate permission grant).
- **Implement:** Add state `permissionPromptShown`, useEffect to show on mount if not already granted (we'll use a localStorage flag to persist). When user clicks Allow, set flag and set cameraActive true.
- **Commit:** Update ScannerScreen.tsx.

### Task 8: Create Install Promotion Banner Component
- **Goal:** Build a non‑intrusive banner that appears after a scan threshold, prompting the user to install the PWA.
- **Test:** Test InstallPromotionBanner shows when visible prop is true; clicking Install calls onInstall; clicking Close sets visible false.
- **Implement:** Create `src/components/InstallPromotionBanner.tsx`.
- **Commit:** Save component and test.

### Task 9: Implement Install Promotion Logic (beforeinstallprompt handling)
- **Goal:** Capture the beforeinstallprompt event, track scan count, and show the banner after threshold.
- **Test:** Test that after N scans (we'll mock the event) the banner becomes visible; clicking Install triggers the stored promise.
- **Implement:** Create a hook `useInstallPromotion.ts` (or use App.tsx). We'll add logic in App.tsx: listen for beforeinstallprompt, store event, increment scanCount via a context or a custom hook that scans can update. When count >= threshold, show banner.
- **Commit:** Update App.tsx and/or create hook.

### Task 10: Add Styles for New Components and Animations
- **Goal:** Define CSS for mode segmented control active state, toast animations, install banner, and focus outlines.
- **Test:** Visual verification; we can add a test that checks for presence of certain class names after interaction.
- **Implement:** Edit `src/index.css` to add:
  - `.mode-segmented-control .active` styles
  - `@keyframes pulse` for scale animation
  - `.install-banner` styles (position, background, etc.)
  - Optional focus outline styles (we'll add later for accessibility but can start here).
- **Commit:** Update index.css.

### Task 11: End‑to‑End Verification (Manual)
- **Goal:** Manually verify all four recommendations work in the browser.
- **Test:** Not automated; we will run the dev server and check:
  - Mode toggle is now a segmented control under app bar, changes show toast and animate.
  - RecentScans shows empty state when no scans.
  - On first load, permission modal appears before camera request.
  - After 3 scans, install banner appears and can trigger install prompt.
- **Implement:** No code change; just verification.
- **Commit:** Record verification notes.

### Task 12: Update Documentation and Commit Final Changes
- **Goal:** Ensure all new components are exported from index.ts (if we have one) and update any README notes if needed.
- **Test:** Check that imports work and no lint errors.
- **Implement:** Add exports to `src/components/index.ts` if exists; otherwise create it.
- **Commit:** Finalize.

---

## Status Log
We will maintain `implementation-status.log` in the project root with entries:
```
[YYYY-MM-DD HH:MM] Task X: PASS
```
Updated after each task passes.

---

## Approval
This plan follows the writing-plans skill. After saving, we will announce: "I'm using the writing-plans skill to create the implementation plan." Then we will proceed to Phase 3 (subagent‑driven execution) unless you prefer manual execution.

Please approve this plan, or request changes.
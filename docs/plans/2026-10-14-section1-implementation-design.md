# Section 1 Implementation Design: Overall App Flow and Navigation

**Date:** 2026-10-14  
**Related Audit Section:** Section 1: Overall App Flow and Navigation Audit (impeccable)

## Goal
Implement the four recommendations from the audit to improve mode visibility, empty state handling, permission priming, and PWA promotion.

## Recommendations & Implementation Plan

### 1. Prominent Mode Indicator
**Current State:** Mode toggle (Cashier/Seller) is a small button inside the Scanner header, easy to miss.  
**Design:** 
- Replace the existing mode toggle with a segmented control (two‑segment toggle) placed directly under the app bar (above the camera viewfinder) in ScannerScreen.
- Use a custom `ModeSegmentedControl` component that renders two buttons (Auto | Manual) with active styling.
- When the mode changes, show a toast message (“Mode switched to Automatic” or “Mode switched to Manual”) and optionally a subtle scale‑animation on the segmented control.
- Persist the mode selection in `SettingsContext` (already exists via `cashierMode` and `sellerMode` flags). We'll derive a single mode enum: `auto`, `cashier`, `seller`? Actually the app has two independent toggles: cashierMode and sellerMode. The audit refers to mode‑change UI inside Scanner header; currently there is only one toggle for Scan Mode (auto/manual) plus two toggles in Settings. The Scanner header shows a toggle for Scan Mode (auto/manual). The Cashier and Seller modes are Settings toggles that affect behavior but are not visible in the Scanner header. The audit likely refers to the Scan Mode toggle (auto/manual) being modestly visible. We'll enhance that toggle.
- Implementation: 
  - Create `src/components/ModeSegmentedControl.tsx`.
  - In `ScannerScreen.tsx`, replace the existing mode toggle button with `<ModeSegmentedControl mode={scanMode} onChange={setScanMode} />`.
  - Add toast notification on mode change using existing `showScanToast` or a new toast function.
  - Add a CSS animation class for scale effect (e.g., `animate-pulse` from tailwind? but we don't have tailwind; we'll use CSS keyframes).
  - Update `index.css` with animation and focus styles.

### 2. Scanner Empty State
**Current State:** When `RecentScans` list is empty, nothing is rendered beneath the manual entry button, leaving a blank area.  
**Design:**
- Modify `RecentScans` component (or its usage in `ScannerScreen`) to show an `EmptyState` when the scans array is empty.
- Provide a friendly illustration or icon (maybe use `Package` from lucide) and text: “No recent scans yet”.
- Keep the manual entry button above; the empty state appears below it.
- Implementation:
  - In `src/components/RecentScans.tsx`, add a conditional: if `scans.length === 0` return `<EmptyState title="No recent scans yet" subtitle="Scan a product to see it appear here" />` (or similar).
  - Ensure the EmptyState component accepts optional props for icon or illustration; we can extend it later if needed, but for now use text only.
  - No changes needed to `ScannerScreen` if we modify `RecentScans` internally.

### 3. Permission Primer
**Current State:** Camera permission is requested implicitly by the browser when `CameraViewfinder` attempts to access the camera; notification permission is requested only when the user enables the toggle in Settings (good). No pre‑permission explanation UI.  
**Design:**
- Before first camera access, show a modal explaining why camera access is needed (to scan barcodes) and ask for user confirmation. If they agree, we then trigger the camera request (which will trigger the browser permission prompt). This increases trust and may reduce denial rates.
- Similarly, before enabling notification toggle in Settings, we could show a primer, but the audit focuses on camera permission.
- Implementation:
  - Create a new modal component `PermissionPromptModal.tsx` with title, description, and two buttons (Cancel, Allow).
  - In `ScannerScreen`, add a state `cameraPermissionPromptShown`. On mount, if we haven't shown the prompt and we don't yet have camera permission (we can't know until we try), we show the modal. When user clicks Allow, we attempt to start the camera (by setting `cameraActive` true) which will trigger the browser prompt. If they deny, we respect that and maybe show a fallback.
  - Alternatively, we can use the `CameraViewfinder` component's `onError` to detect denial and then show a settings‑guidance modal.
  - Simpler: Add a tooltip or info button next to the camera viewfinder that explains the permission, and rely on the browser's prompt. But the audit asks for a modal that states why the permission is needed before requesting. We'll implement a pre‑permission modal.
  - We'll also need to check if we already have permission; we can use `navigator.permissions.query({name: 'camera'})` but that's not universally supported. We'll skip and always show the modal on first load, then store a flag in localStorage to not show again.
  - Create a hook `useCameraPermissionPrompt` that handles the modal state and permission logic.
  - In `ScannerScreen`, use the hook to conditionally render the modal.

### 4. Install Promotion
**Current State:** No custom install prompt; relies on browser‑default install banner.  
**Design:**
- Implement a custom “Add to Home Screen” banner that appears after a user has scanned at least 3 distinct barcodes (or after 3 scans total). The banner is a non‑intrusive bar at the bottom (above the FAB) with an “Install” button and a close icon.
- When the user clicks Install, we call `beforeinstallprompt` (if available) to show the native install prompt, or we fallback to instructions.
- We'll need to capture the `beforeinstallprompt` event and store it for later use.
- Implementation:
  - In `src/App.tsx` or a custom hook `useInstallPromotion`, listen for `beforeinstallprompt`, prevent default, store the event, and increment a scan counter.
  - After the scan counter reaches threshold, show a banner component `<InstallPromotionBanner>`.
  - The banner will have an Install button that, when clicked, shows the native prompt (by calling the stored event's `prompt()` method) and hides the banner.
  - Also listen for `appinstalled` event to reset the counter or hide banner permanently.
  - Create `src/components/InstallPromotionBanner.tsx`.
  - Add styles in `index.css` for the banner (positioned fixed at bottom, background, etc.).

## Files to Modify / Create

### New Components
- `src/components/ModeSegmentedControl.tsx`
- `src/components/PermissionPromptModal.tsx` (or integrate into ScannerScreen)
- `src/components/InstallPromotionBanner.tsx`

### Modified Existing Components
- `src/screens/ScannerScreen.tsx` (replace mode toggle, add permission prompt hook, integrate install banner?)
- `src/components/RecentScans.tsx` (add empty state fallback)
- `src/App.tsx` (add install promotion listener) or create a separate hook file.
- `src/hooks/useInstallPromotion.ts` (new hook)
- `src/hooks/useCameraPermissionPrompt.ts` (new hook)

### Styles
- `src/index.css` (add animations for mode toggle toast/scale, install banner styles, focus styles for new components)

### Utilities / Hooks
- `src/hooks/useCameraPermissionPrompt.ts`
- `src/hooks/useInstallPromotion.ts`

## Verification Steps (TDD)
For each recommendation, we will:
1. Write a failing test (vitest + React Testing Library) that checks the new behavior.
2. Implement the change until the test passes.
3. Manually verify in the browser that the UI works as expected.
4. Commit after each green test.

## Commit Strategy
- Each recommendation gets its own commit (or group of related changes).
- Commit messages follow conventional style: `feat(scanner): add mode segmented control`, etc.

## Dependencies
- No new dependencies required; we will use existing lucide icons and React.

## Risks & Mitigations
- **Risk:** Changing the mode toggle layout may affect muscle memory.  
  **Mitigation:** Keep the same toggles (auto/manual) but make them more prominent; add toast to reinforce change.
- **Risk:** Permission prompt may annoy users if shown too frequently.  
  **Mitigation:** Show only once per device (store flag in localStorage) and only if we haven't yet attempted camera access.
- **Risk:** Custom install banner may conflict with browser banner.  
  **Mitigation:** Only show after threshold and hide if browser banner appears (we can't detect that easily; we'll accept slight overlap).

## Approval
Please review this design. If approved, we will move to the Phase 2: Writing Plans for Section 1.

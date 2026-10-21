# Audit Fixes Implementation Plan

**Created:** 2026-10-21  
**Source:** Comprehensive UI/UX Audit (Visual, Accessibility, UX, Technical)  
**App:** Barcode Inventory PWA  
**Execution Mode:** Subagent-driven TDD (OpenClaw)

---

## Task Breakdown

Each task = 2-5 min: write test → watch fail → implement → watch pass → commit

### Wave 1: Critical Accessibility (Day 1)

| Task | Description | Files | Test First |
|------|-------------|-------|------------|
| A1 | Remove `maximum-scale=1.0, user-scalable=no` from viewport meta | `index.html` | Assert viewport allows zoom |
| A2 | Fix status badge contrast — light mode warning/expired, dark mode warning | `src/index.css` (status tokens), `src/utils/statusConfig.ts` | Canvas contrast ≥4.5:1 for all status badges |
| A3 | Add `:focus-visible` to `.scan-fab`, `.mode-segment`, `.app-mode-segment` | `src/index.css` | Tab through live app; verify 2px ring on each |
| A4 | Replace `statusConfig.ts` hardcoded hex with token-driven values | `src/utils/statusConfig.ts`, `src/components/InventoryGroup.tsx` | Dark mode updates badge colors without TS change |
| A5 | Add `<h1>` to ScannerScreen, InventoryScreen, ProductDetailScreen, SettingsScreen, TillScreen, SalesScreen | `src/screens/*.tsx` | Screen reader reads page heading first |

### Wave 2: Focus Management & ARIA (Day 1-2)

| Task | Description | Files | Test First |
|------|-------------|-------|------------|
| A6 | Focus return in QuickEntryModal, PermissionPromptModal, CameraViewfinder error overlay | `src/components/QuickEntryModal.tsx`, `PermissionPromptModal.tsx`, `CameraViewfinder.tsx` | Open modal → Esc → focus returns to trigger |
| A7 | Add `aria-label` to ModeSegmentedControl segments and AppModeSwitcher segments | `src/components/ModeSegmentedControl.tsx`, `AppModeSwitcher.tsx` | Screen reader announces each segment |
| A8 | Increase bottom-nav touch spacing to 8px gap + 8px padding | `src/index.css` (`.bottom-nav-item`) | Measure rendered targets ≥44×44pt with 8px gap |

### Wave 3: CSS Debt & Token Consistency (Day 2)

| Task | Description | Files | Test First |
|------|-------------|-------|------------|
| T1 | Deduplicate `@keyframes spin` (3→1) and `.toast` blocks (2→1) | `src/index.css` | Grep finds single definition each |
| T2 | Migrate ScannerScreen inline styles to token CSS classes | `src/screens/ScannerScreen.tsx`, `src/index.css` | No `style={{` in ScannerScreen |
| T3 | Guard `camera-scan-line` and `scan-fab` hover with `prefers-reduced-motion` | `src/index.css` | Reduced motion enabled → animations disabled |

### Wave 4: UX Polish (Day 2-3)

| Task | Description | Files | Test First |
|------|-------------|-------|------------|
| U1 | Add list virtualization to InventoryScreen | `src/screens/InventoryScreen.tsx` | 200+ products → 60fps scroll |
| U2 | Make tutorial contextual (per-screen, not global) | `src/components/TutorialOverlay.tsx`, `src/context/TutorialContext.tsx` | First visit per screen only |
| U3 | Defer camera permission until scan tap; notification until first expiry check | `src/screens/ScannerScreen.tsx`, `src/screens/SettingsScreen.tsx` | Prompt timing verified |

### Wave 5: Testing Infrastructure (Day 3)

| Task | Description | Files | Test First |
|------|-------------|-------|------------|
| T4 | Add Playwright e2e for scan→save→inventory and till→paid flows | `tests/e2e/*.spec.ts` | CI passes on real browser |

---

## Execution Rules

1. **TDD mandatory** — write failing test first, delete any code written before tests
2. **Verify premise before test** — check code matches plan assumption
3. **Assert on defect shape** — test what would fail on old code
4. **Subagent loop**: implementer → spec reviewer → code quality reviewer → fix → re-review → commit
5. **Commit after each green test** — frequent commits
6. **Status log** — `implementation-status.log` with per-task PASS/FAIL
7. **Loop until all PASS** — re-dispatch implementer for failures

---

## File Paths Reference

```
C:/Users/bryan/Documents/Hermes/Projects/barcode-inventory/
├── index.html
├── src/
│   ├── index.css
│   ├── screens/
│   │   ├── ScannerScreen.tsx
│   │   ├── InventoryScreen.tsx
│   │   ├── ProductDetailScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   ├── TillScreen.tsx
│   │   └── SalesScreen.tsx
│   ├── components/
│   │   ├── QuickEntryModal.tsx
│   │   ├── PermissionPromptModal.tsx
│   │   ├── CameraViewfinder.tsx
│   │   ├── ModeSegmentedControl.tsx
│   │   ├── AppModeSwitcher.tsx
│   │   ├── InventoryGroup.tsx
│   │   └── TutorialOverlay.tsx
│   ├── context/
│   │   └── TutorialContext.tsx
│   └── utils/
│       └── statusConfig.ts
└── docs/plans/2026-10-21-audit-fixes.md
```
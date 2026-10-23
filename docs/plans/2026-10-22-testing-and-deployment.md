# Testing, Bug Fix, and Deployment Readiness Plan

> **Context:** The user's barcode inventory app (PWA, Dexie Cloud sync) is being prepared for
> Vercel deployment. The user runs it as a first-time client. Two goals:
> 1. Test every feature and button thoroughly.
> 2. Fix the reported bug: after a client logs in with a **separate email**, scans a product,
>    adds it to inventory, the Inventory screen stays "loading" and does not show the scanned
>    item. Requirement: **one account → multiple phones share the same data; separate accounts →
>    separate data**.
>
> **Accepted scope:** only what was asked. No drive-by refactors, renames, or reformatting.
> Deployment target: Vercel (do NOT touch the live deployed app on Vercel directly; changes go
> to GitHub, the user's workflow deploys from there).

## Current state (verified by me)
- `npx tsc --noEmit` → 0 errors.
- `npx vitest run` → 431 tests / 66 files all pass.
- `npx eslint --max-warnings 0` → 1 remaining error in a *test* file (spurious
  `no-constant-condition` false positive at `src/__tests__/cssContract.test.ts:181`), not app code.
- All app-level lint warnings are `no-explicit-any` (cosmetic).

## Task list (one per subagent)

| # | Task | Files to test/edit |
|---|------|--------------------|
| 1 | QA: ScannerScreen — start camera, scan barcode (auto/manual), mode toggle, manual entry, quick entry modal, recent scans, permission prompt, retry camera | `src/screens/ScannerScreen.tsx`, `src/components/CameraViewfinder.tsx` |
| 2 | QA: TillScreen — scan, quantity +/- , remove, Paid, Undo sale | `src/screens/TillScreen.tsx` |
| 3 | QA: InventoryScreen — search, filter, add/edit/delete batch, set stock, pull-to-refresh | `src/screens/InventoryScreen.tsx`, `src/services/inventoryService.ts`, `src/services/stockService.ts` |
| 4 | QA: ProductDetailScreen — lookup, add new, edit details, delete (with undo) | `src/screens/ProductDetailScreen.tsx`, `src/services/catalogService.ts` |
| 5 | QA: SalesScreen, SettingsScreen, LoginScreen, CartReviewScreen, Tutorial | `src/screens/SalesScreen.tsx`, `src/screens/SettingsScreen.tsx`, `src/screens/LoginScreen.tsx`, `src/screens/CartReviewScreen.tsx`, `src/context/TutorialContext.tsx` |
| 6 | Root-cause debug: trace "stuck with loading inventory" on separate-email login through `useCloudSession` → `AuthGate` → `seedCatalogIfEmpty` → `useInventory` → `getInventoryGroups` | `src/hooks/useCloudSession.ts`, `src/App.tsx`, `src/context/SettingsContext.tsx`, `src/hooks/useInventory.ts`, `src/services/inventoryService.ts`, `src/db/dexie.ts` |
| 7 | Implement the root-cause fix for the stuck-loading bug; add/adjust tests that would fail on the old code | affected file(s) + any new test |
| 8 | Verify: `tsc`, `vitest`, `eslint` all green; build for production; check `.vercelignore`, sync URL env, DB name | run `build`/`type-check`/`test`/`lint` |
| 9 | Commit only the 4 fixed app files to GitHub (task files only); do NOT commit the untracked docs/ or prior scratch-deletes; prepare deploy checklist | `git add`/`git commit` (all task files, no untracked) |

## Rules for subagents
- Implementer commits only its task files and reports the commit SHA.
- Reviewers inspect history read-only via `git show` / `git diff` (never `git stash` or
  `git checkout`, which corrupts the working tree).
- All subagent context carries the absolute project path:
  `C:\Users\bryan\Documents\Hermes\Projects\barcode-inventory`.
- Verify every write at its absolute intended path (confirm `os.path.exists` on the full path).
- Purely TDD loops are encouraged for task 1–5 and 7: write the failing test first, then
  implement, then watch it pass.
- No scope creep: only the files listed. Task 6–7 may touch supporting files only to the
  minimum extent required to fix the root cause.

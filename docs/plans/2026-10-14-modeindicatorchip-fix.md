# Fix ModeIndicatorChip Import Error

## Problem
The ModeIndicatorChip component has an incorrect import statement. It imports `useSettings` from '@/context/SettingsContext' but that module only exports `SettingsProvider` and `useSettingsContext`. The actual `useSettings` hook is located in '@/hooks/useSettings'.

This causes a runtime error in tests: `TypeError: (0 , __vite_ssr_import_1__.useSettings) is not a function`

## Solution
Change the import statement in ModeIndicatorChip.tsx from:
```typescript
import { useSettings } from '@/context/SettingsContext'
```
to:
```typescript
import { useSettings } from '@/hooks/useSettings'
```

## Files to Modify
- `src/components/ModeIndicatorChip.tsx`

## TDD Approach
1. Write a failing test that reproduces the issue (if not already covered)
2. Implement the fix
3. Verify tests pass

## Verification
- Run `npm test` to ensure all tests pass
- Specifically verify the ModeIndicatorChip test passes
- Ensure no regression in related components
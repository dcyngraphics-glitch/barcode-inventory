# Settings Audit Plan

## Goal
Audit the settings functionality in the barcode inventory app to identify why "settings is not working" and perform a broader audit of flow, code base, and UI/UX using specified skills.

## Audit Scope
1. **Flow Audit**: Trace the settings data flow from UI components -> hooks -> context -> service -> IndexedDB persistence and back to UI. Verify how settings changes affect app behavior (theme, notifications, cashier/seller modes).
2. **Code Base Audit**: Examine the code for potential bugs, anti-patterns, missing error handling, race conditions, and adherence to best practices in the settings-related files.
3. **UI/UX Audit**: Evaluate the user interface and user experience of the settings screen using the ui-ux-pro-max, impeccable, and taste skills.

## Deliverables
- Flow audit report documenting the data flow and any discrepancies.
- Code base audit report listing issues found and recommendations.
- UI/UX audit report from each of the three skills with pooled findings.
- Combined audit summary with prioritized action items.

## Methodology
- Use subagents to conduct each audit in parallel.
- Each subagent will receive the relevant context and files.
- Subagents will report back findings.
- Human (agent) will consolidate reports and present to user.

## Subagent Tasks
1. **Flow Subagent**: 
   - Goal: Trace settings flow and verify persistence and effect on app behavior.
   - Context: This audit focuses on the data flow of settings from UI to storage and back, and how settings changes propagate to affect app behavior (theme, notifications, modes).
   - Files: 
     - src/screens/SettingsScreen.tsx
     - src/hooks/useSettings.ts
     - src/context/SettingsContext.tsx
     - src/services/settingsService.ts
     - src/types/index.ts
     - src/db/database.ts
     - src/App.tsx (for usage of settings in theme and notifications)
   - Constraints: Do not modify any code; only read and analyze.
   - Verify: Confirm that the flow is correct by tracing the code and noting any potential break points.

2. **Code Base Subagent**:
   - Goal: Audit the settings-related code for bugs, anti-patterns, and best practices.
   - Context: This audit examines the code quality of the settings implementation.
   - Files: Same as flow subagent plus any related test files.
   - Constraints: Do not modify any code; only read and analyze.
   - Verify: Look for issues such as missing error handling, potential race conditions, improper use of React hooks, etc.

3. **UI/UX Subagent** (three parallel subagents, one for each skill):
   - Goal: Evaluate the UI/UX of the settings screen using the specified skills.
   - Context: This audit focuses on the user interface and user experience of the SettingsScreen.
   - Files: 
     - src/screens/SettingsScreen.tsx
     - src/components/SettingsToggle.tsx
     - src/components/SettingsStepper.tsx
     - src/components/ConfirmDialog.tsx
     - src/components/Toast.tsx
     - Any relevant CSS or design tokens.
   - Constraints: Do not modify any code; only read and analyze.
   - Verify: Each subagent will use their respective skill to evaluate the UI/UX and report findings.

## Execution
After user approval of this plan, spawn subagents for each task.

## Approval
Please approve this plan before proceeding.
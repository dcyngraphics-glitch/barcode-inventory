# Barcode Scanner App UI/UX Audit Implementation Plan

**Date:** 2026-10-14  
**App:** Barcode Inventory (barcode-inventory)  
**Purpose:** Execute deep UI/UX audit using impeccable, taste, and ui-ux-promax skills via subagent-driven development.

## Tasks

Each task is designed to be completed in 2–5 minutes (write test → watch fail → implement → watch pass → commit) following TDD. For audit tasks, the "test" is the verification that the subagent has produced a satisfactory report.

### Task 1: Setup Subagent Infrastructure
- **Goal:** Ensure subagent dispatch mechanism is ready and verify we can spawn subagents with appropriate context.
- **Test:** Write a simple verification script that checks `sessions_spawn` is available and returns a session ID.
- **Implement:** No code change; just confirm the tool works.
- **Commit:** Record verification output.

### Task 2: Run Impeccable Subagent (Overall Flow & Navigation)
- **Goal:** Spin up a subagent with the impeccable skill to audit overall app flow and navigation.
- **Test:** Subagent returns a report file at `audit-reports/impeccable-flow.md`.
- **Implement:** Dispatch subagent with goal and context (see below).
- **Commit:** Save the report and note the commit SHA.

### Task 3: Run Taste Subagent (Visual Design & Branding)
- **Goal:** Spin up a subagent with the taste skill to audit visual design and branding.
- **Test:** Subagent returns a report file at `audit-reports/taste-visual.md`.
- **Implement:** Dispatch subagent with goal and context.
- **Commit:** Save the report.

### Task 4: Run UI/UX ProMax Subagent (Interaction Design & Micro-interactions)
- **Goal:** Spin up a subagent with the ui-ux-promax skill to audit interaction design.
- **Test:** Subagent returns a report file at `audit-reports/ui-ux-promax-interaction.md`.
- **Implement:** Dispatch subagent with goal and context.
- **Commit:** Save the report.

### Task 5: Run Combined Accessibility & Performance Audit
- **Goal:** Spin up a subagent (or use the main agent) to perform accessibility and performance checks using insights from the other skills.
- **Test:** Subagent returns a report file at `audit-reports/a11y-performance.md`.
- **Implement:** Dispatch subagent with goal and context.
- **Commit:** Save the report.

### Task 6: Synthesize Audit Reports
- **Goal:** Combine the four section reports into a unified audit document with prioritized recommendations.
- **Test:** Verify the synthesized report contains sections for each skill and a summary.
- **Implement:** Write a script or manually merge the reports into `audit-reports/full-ui-ux-audit.md`.
- **Commit:** Save the final audit report.

### Task 7: Present Audit Results
- **Goal:** Output the final audit report to the user and request feedback on any needed clarifications.
- **Test:** User acknowledges receipt and indicates whether the audit meets the "deep audit" expectation.
- **Implement:** Display the report in chat and await confirmation.
- **Commit:** No code change; just record the presentation.

## Subagent Dispatch Details (per task)

For each skill-specific task, use the following dispatch pattern:

```
Goal: [One-sentence description of the audit section]
Context: [Why this matters, reference to the approved design doc, absolute project path]
Files: [List of key files to examine: src/App.tsx, src/screens/, src/components/, src/context/, index.html, etc.]
Constraints: [Do not modify source code; only read files and produce reports. Stay within the scope of the section.]
Verify: [How to confirm success — subagent has produced a readable report file in audit-reports/]
Task text: [Full task description from this plan]
```

The subagent should be instructed to use the respective skill (impeccable, taste, ui-ux-promax) to analyze the UI/UX and produce a markdown report.

## Status Log
Maintain `implementation-status.log` in the project root with entries:
```
[YYYY-MM-DD HH:MM] Task X: PASS
```
Update after each task passes.

## Approval
This plan follows the writing-plans skill; after saving, we will offer two execution modes: subagent-driven (current session) or manual execution.

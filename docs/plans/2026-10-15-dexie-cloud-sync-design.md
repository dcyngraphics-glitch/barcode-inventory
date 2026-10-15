# Dexie Cloud Sync Design

## Architecture Overview

The existing Barcode Inventory app uses IndexedDB (via the `idb` library) for offline-first data storage. To enable multi-device synchronization while preserving the offline-first nature, we will integrate Dexie Cloud, which adds real-time sync, user authentication, and conflict resolution to Dexie.js applications with minimal code changes.

Key architectural decisions:
- Keep IndexedDB as the local source of truth; UI continues to read/write directly to the local Dexie instance.
- Dexie Cloud add-on intercepts local changes and syncs them to the cloud server via WebSocket when online.
- All devices log into the same shared Dexie Cloud account (email/password) to share a single dataset.
- Conflict resolution uses "last write wins" by default (configurable if needed).
- The app remains fully functional offline; changes queue locally and sync automatically when connectivity returns.

## Components and Their Responsibilities

### 1. Data Layer (`src/db/`)
- **Current**: `database.ts` defines the IndexedDB schema using `idb`.
- **Change**: Replace `idb` with `dexie` and `dexie-cloud-addon`. The schema (catalog, inventory, settings, sales) remains identical.
- **New file**: `dexieCloud.ts` initializes the Dexie instance with the Cloud add-on and handles login/logout.

### 2. Authentication UI
- **New component**: `src/components/LoginForm.tsx` (simple email/password form).
- **Integration**: Wrap the app with an auth gate; show LoginForm until authenticated, then render the main app.

### 3. Existing UI Components (unchanged)
- `ScannerScreen.tsx`, `TillScreen.tsx`, `SalesScreen.tsx`, etc. continue to use the same data access hooks/services.
- No modifications needed because the data layer abstraction (hooks/services) will still return data from the local Dexie instance, which is kept in sync by the Cloud add-on.

### 4. Sync Status Indicator (optional)
- Consider adding a small badge/icon showing sync status (online/offline/syncing) for user awareness.

## Data Flow

1. **Local Write** (e.g., scanning a barcode, adding a sale):
   - UI calls a service/function that writes to the local Dexie instance (same as before).
   - Dexie Cloud add-on detects the change and queues it for sync.

2. **Sync Trigger** (when online):
   - Dexie Cloud establishes a WebSocket connection to the cloud server.
   - Local changes are pushed to the server incrementally.
   - Remote changes from other devices are pulled and applied to the local Dexie instance.
   - UI updates reactively via existing subscriptions (if using liveQuery or similar) or on next render.

3. **Conflict Resolution**:
   - If the same record is modified on two devices before sync, Dexie Cloud applies "last write wins" based on timestamp.
   - The losing change is discarded; no UI intervention required.

4. **Offline Handling**:
   - When offline, writes accumulate in the local IndexedDB transaction queue.
   - Dexie Cloud automatically retries sync when the device goes online.

## Error Handling Approach

- **Authentication errors**: Show login error message; allow retry.
- **Sync errors** (network, server): Dexie Cloud automatically retries with exponential backoff. We will log errors to console for dev visibility but not interrupt the user.
- **Permission errors**: If the shared account lacks permissions, show an error and prompt to re-login (unlikely with shared account).
- **Data corruption**: Dexie Cloud includes validation; we rely on its built-in mechanisms.
- **User-facing**: The app remains usable offline; sync errors do not block UI. Optional: show a non-intrusive toast for persistent sync failures.

## Testing Strategy

### Unit Tests
- Test the new `dexieCloud.ts` module: initialization, login/logout, sync event handling.
- Mock `dexie` and `dexie-cloud-addon` where necessary.
- Existing tests for data services should continue to pass (they test against the local DB interface, which remains unchanged).

### Integration Tests
- Use Vitest with a fake IndexedDB environment (already configured via `fake-indexeddb`).
- Simulate two clients sharing the same Dexie Cloud account? This requires a real cloud instance for true integration testing, which may be heavy for unit tests.
- Instead, we will:
  - Unit test the data layer with mocked Dexie Cloud add-on to verify sync triggers.
  - Rely on end-to-end smoke tests (manual or via CI with a test Dexie Cloud account) to verify sync works.

### End-to-End (E2E) Smoke Test Plan
- Create a temporary Dexie Cloud account for testing.
- On two emulated devices (or browser instances):
  1. Log in with shared credentials on both.
  2. Add a product on Device A; verify it appears on Device B after sync.
  3. Add a sale on Device B; verify it appears on Device A.
  4. Go offline on Device A, add a sale, go online; verify sale syncs to Device B.
- This test can be run manually before releases or in a CI step that uses a test Dexie Cloud account (credentials stored as secrets).

## Open Issues & Decisions
- **Login persistence**: Should we remember the login session (store token in localStorage) to avoid re-login on every app open? Yes, Dexie Cloud add-on handles this by default.
- **Sync status UI**: Defer to a future improvement; not required for MVP.
- **Error reporting**: For now, rely on console logs; consider adding a silent error tracker (e.g., send to Sentry) if needed later.

---
*This design follows the Superpowers workflow: spec-first, TDD, subagent-driven. Implementation will proceed via the writing-plans phase after design approval.*
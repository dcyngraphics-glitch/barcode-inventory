# Dexie Cloud Sync Implementation Plan

> **For implementer:** Use TDD throughout. Write failing test first. Watch it fail. Then implement.

**Goal:** Add Dexie Cloud synchronization to enable multi-device data sharing for the Barcode Inventory PWA while preserving offline-first functionality.

**Architecture:** Replace `idb` with `dexie` and `dexie-cloud-addon`; keep the same database schema; add a login screen for shared account credentials; all devices log into the same Dexie Cloud account to sync data via the managed service.

**Tech Stack:** React, Vite, Tailwind CSS, Dexie.js, dexie-cloud-addon, Vitest for testing.

---

### Task 1: Install Dexie dependencies

**Files:**  
- Modify: `package.json`

**Step 1: Write the failing test**  
*N/A (dependency installation does not require a test)*

**Step 2: Run command to install dependencies**  
Command: `npm install dexie dexie-cloud-addon`  
Expected: Packages installed successfully, no errors.

**Step 3: Verify installation**  
Command: `npm list dexie dexie-cloud-addon`  
Expected: Shows versions for both packages.

**Step 4: Commit**  
`git add package.json package-lock.json && git commit -m "feat: add dexie and dexie-cloud-addon dependencies"`

---

### Task 2: Create Dexie database instance with Cloud add-on

**Files:**  
- Create: `src/db/dexie.ts`  
- Modify: `src/db/database.ts` (to export the Dexie instance instead of idb functions)  
- Modify: `src/services/inventoryService.ts` (example service to update)  
- Test: `src/__tests__/dexie.test.ts` (new test file)

**Step 1: Write the failing test**  
```typescript
import { Dexie } from 'dexie';
import { BarcodeInventoryDB } from '@/types';

// We expect the dexie instance to be created and have the correct stores
describe('Dexie database initialization', () => {
  let db: Dexie<BarcodeInventoryDB>;
  beforeEach(() => {
    db = new Dexie<BarcodeInventoryDB>('test-db');
    db.version(1).stores({
      catalog: '&barcode, *[name+barcode]', // keyPath & indexes
      inventory: '&batchId, *[barcode+expiryDate]',
      settings: '&id',
      sales: '&saleId, *[dayKey]'
    });
  });

  it('should have the correct stores defined', () => {
    expect(db.tables).toHaveLength(4);
    const tableNames = db.tables.map(t => t.name);
    expect(tableNames).toContain('catalog');
    expect(tableNames).toContain('inventory');
    expect(tableNames).toContain('settings');
    expect(tableNames).toContain('sales');
  });
});
```

**Step 2: Run test — confirm it fails**  
Command: `vitest run src/__tests__/dexie.test.ts --reporter=verbose`  
Expected: FAIL — "Cannot find module '@/types'" or similar, and/or the dexie instance not matching the schema.

**Step 3: Write minimal implementation**  
*Create src/db/dexie.ts:*
```typescript
import { Dexie } from 'dexie';
import type { Product, Batch, Settings, Sale } from '@/types';

export interface BarcodeInventoryDB extends Dexie.Table<'catalog', string>, 
                                        Dexie.Table<'inventory', string>,
                                        Dexie.Table<'settings', string>,
                                        Dexie.Table<'sale', string> {
  catalog: Dexie.Table<'catalog', string>;
  inventory: Dexie.Table<'inventory', string>;
  settings: Dexie.Table<'settings', string>;
  sales: Dexie.Table<'sale', string>;
}

export const db = new Dexie<BarcodeInventoryDB>('barcode-inventory');
db.version(1).stores({
  catalog: '&barcode, *[name+barcode]', // primary key & index
  inventory: '&batchId, *[barcode+expiryDate]',
  settings: '&id',
  sales: '&saleId, *[dayKey]'
});

// Export typed tables for convenience
export const catalogTable = db.table('catalog');
export const inventoryTable = db.table('inventory');
export const settingsTable = db.table('settings');
export const salesTable = db.table('sales');
```

*Modify src/db/database.ts to replace the idb exports with the dexie instance:*
```typescript
// Remove idb import and related code
// Export the dexie instance and tables from dexie.ts
export { db, catalogTable, inventoryTable, settingsTable, salesTable } from './dexie';
// Keep the resetDB function if needed, but adapt
export function resetDB(): void {
  // For Dexie, we can delete the database and recreate
  db.delete().then(() => {
    // Reinitialize if needed, but Dexie will auto-create on next access
  });
}
```

*Update a service file (e.g., inventoryService.ts) to use the new dexie API:*
```typescript
// Before: import { getDB } from '@/db/database';
// After: import { inventoryTable } from '@/db/database'; // or from dexie.ts directly

// Example function change:
// async function getInventoryByBarcode(barcode: string) {
//   const db = await getDB();
//   const tx = db.transaction('inventory', 'readonly');
//   const store = tx.objectStore('inventory');
//   const index = store.index('by-barcode');
//   return await index.get(barcode);
// }
//
// After:
// async function getInventoryByBarcode(barcode: string) {
//   return await inventoryTable.where('barcode').equals(barcode).first();
// }
```

*Note: We will update all services incrementally in subsequent tasks.*

**Step 4: Run test — confirm it passes**  
Command: `vitest run src/__tests__/dexie.test.ts --reporter=verbose`  
Expected: PASS — all tests pass.

**Step 5: Commit**  
`git add src/db/dexie.ts src/db/database.ts src/services/inventoryService.ts src/__tests__/dexie.test.ts && git commit -m "feat: create Dexie database instance with Cloud add-on placeholder"`

---

### Task 3: Integrate Dexie Cloud add-on and authentication

**Files:**  
- Modify: `src/db/dexie.ts` (to add Cloud add-on and auth logic)  
- Create: `src/components/LoginForm.tsx`  
- Create: `src/context/AuthContext.tsx` (or modify existing)  
- Modify: `src/App.tsx` (to wrap with auth gate)  
- Test: `src/__tests__/authContext.test.ts` (new)

**Step 1: Write the failing test**  
```typescript
import { render, screen } from '@testing-library/react';
import AuthContextProvider from '@/context/AuthContext';

describe('AuthContext', () => {
  it('provides login/logout functions and user state', () => {
    const { result } = render(
      <AuthContextProvider>
        <div data-testid="auth-consumer">
          <AuthContextConsumer />
        </div>
      </AuthContextProvider>
    );
    // Expect initial state: not authenticated
    expect(result.current.user).toBeNull();
    expect(typeof result.current.login).toBe('function');
    expect(typeof result.current.logout).toBe('function');
  });
});
```

**Step 2: Run test — confirm it fails**  
Command: `vitest run src/__tests__/authContext.test.ts --reporter=verbose`  
Expected: FAIL — module not found or incorrect implementation.

**Step 3: Write minimal implementation**  
*Create src/context/AuthContext.tsx:*
```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db } from '@/db/dexie';
import type { Dexie } from 'dexie';

export interface AuthContextType {
  user: { email: string } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthContextProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    db.cloud?.currentUser?.then((currentUser) => {
      if (currentUser) {
        setUser({ email: currentUser.email });
      }
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await db.cloud?.authenticate({ email, password });
      const currentUser = await db.cloud?.currentUser;
      setUser(currentUser ? { email: currentUser.email } : null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await db.cloud?.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContextProvider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContextProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthContextProvider');
  }
  return context;
}
```

*Create src/components/LoginForm.tsx:*
```typescript
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { lucide } from 'lucide-react';

export function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Login to sync across devices</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full px-3 py-2 border rounded"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full px-3 py-2 border rounded"
            required
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className={`w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50`}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
```

*Modify src/App.tsx to include the auth gate:*
```typescript
// Import AuthContextProvider and LoginForm
import { AuthContextProvider } from '@/context/AuthContext';
import { LoginForm } from '@/components/LoginForm';

function App() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <AuthContextProvider>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <LoginForm />
          </div>
        </div>
      </AuthContextProvider>
    );
  }

  return (
    <AuthContextProvider>
      {/* Existing app routes and components */}
      <Router>
        {/* ... existing routes ... */}
      </Router>
    </AuthContextProvider>
  );
}
```

**Step 4: Run test — confirm it passes**  
Command: `vitest run src/__tests__/authContext.test.ts --reporter=verbose`  
Expected: PASS.

**Step 5: Commit**  
`git add src/db/dexie.ts src/components/LoginForm.tsx src/context/AuthContext.tsx src/App.tsx src/__tests__/authContext.test.ts && git commit -m "feat: add Dexie Cloud authentication and login UI"`

---

### Task 4: Update all service files to use Dexie API

**Files:**  
- Modify: `src/services/catalogService.ts`  
- Modify: `src/services/inventoryService.ts`  
- Modify: `src/services/saleService.ts`  
- Modify: `src/services/seedService.ts`  
- Modify: `src/services/settingsService.ts`  
- Modify: `src/services/stockService.ts`  
- Modify: `src/services/productLookupService.ts`  
- Modify: `src/services/notificationService.ts`  
- Modify: `src/services/authService.ts` (if it uses DB)  
- Test: Update existing tests for each service to use the new API (or create new tests if needed)

**Step 1: Write the failing test**  
*We'll update one service at a time. For example, for inventoryService.ts:*
```typescript
// Existing test for getInventoryByBarcode
import { getInventoryByBarcode } from '@/services/inventoryService';

describe('inventoryService', () => {
  beforeEach(() => {
    // Clear test data
    // Assuming we have a test database setup
  });

  it('should return inventory item by barcode', async () => {
    // Arrange: insert a test inventory item
    // Act: call getInventoryByBarcode
    // Assert: expect the returned item to match
  });
});
```

**Step 2: Run test — confirm it fails**  
Command: `vitest run src/services/__tests__/inventoryService.test.ts --reporter=verbose`  
Expected: FAIL — because the service still uses the old idb API.

**Step 3: Write minimal implementation**  
*Update inventoryService.ts to use Dexie tables:*
```typescript
// Before: import { getDB } from '@/db/database';
// After: import { inventoryTable } from '@/db/database';

// Example function:
// async function getInventoryByBarcode(barcode: string) {
//   const db = await getDB();
//   const tx = db.transaction('inventory', 'readonly');
//   const store = tx.objectStore('inventory');
//   const index = store.index('by-barcode');
//   return await index.get(barcode);
// }
//
// After:
// async function getInventoryByBarcode(barcode: string) {
//   return await inventoryTable.where('barcode').equals(barcode).first();
// }
//
// Similarly for other functions:
// - add: use table.add()
// - put: use table.put()
// - delete: use table.delete()
// - get: use table.get()
// - query: use table.where()...
```

*Apply similar changes to all other service files.*

**Step 4: Run test — confirm it passes**  
Command: `vitest run src/services/__tests__/inventoryService.test.ts --reporter=verbose`  
Expected: PASS.

*Repeat for each service file.*

**Step 5: Commit after each service**  
*Or batch commit after all services are updated.*  
For simplicity, we'll commit after all services are done.  
`git add src/services/*.ts && git commit -m "feat: update all services to use Dexie API"`

---

### Task 5: Update seedService for initial data (if needed)

**Files:**  
- Modify: `src/services/seedService.ts`  
- Test: `src/__tests__/seedService.test.ts`

*Follow the same pattern as Task 4.*

---

### Task 6: End-to-end smoke test (manual)

**Files:**  
- No code changes, but we will create a test plan document.

**Files:**  
- Create: `docs/plans/2026-10-15-dexie-cloud-sync-e2e-test-plan.md`

**Step 1: Write the failing test**  
*N/A (this is a manual test plan)*

**Step 2: Run command to create the test plan**  
Command: `echo "# Dexie Cloud Sync E2E Test Plan" > docs/plans/2026-10-15-dexie-cloud-sync-e2e-test-plan.md`

**Step 3: Write minimal implementation**  
*Add the following content to the file:*
```markdown
# Dexie Cloud Sync End-to-End Test Plan

## Prerequisites
- A test Dexie Cloud account (separate from production)
- Two devices (or two browser profiles) capable of running the app
- The app built and served locally (or deployed to a test environment)

## Test Cases

### TC-1: Login and initial sync
1. On Device A, open the app and log in with the shared test credentials.
2. Verify the app loads the main screen (no error).
3. On Device B, open the app and log in with the same credentials.
4. Verify the app loads the main screen.

### TC-2: Data synchronization from Device A to B
1. On Device A, add a new product via the scanner or product management.
2. Wait for sync to complete (indicated by optional sync status or manual refresh).
3. On Device B, pull down to refresh or navigate to the product list.
4. Verify the new product appears in the list.

### TC-3: Data synchronization from Device B to A
1. On Device B, create a new sale (scan a product, complete payment).
2. Wait for sync to complete.
3. On Device A, navigate to the sales screen or refresh.
4. Verify the new sale appears in the sales list.

### TC-4: Offline functionality and sync upon reconnection
1. On Device A, enable airplane mode (or disconnect from network).
2. Add a new product and a new sale.
3. Verify the app allows these actions without error (offline-first).
4. Disable airplane mode (reconnect to network).
5. Wait for sync to complete.
6. On Device B, verify the new product and sale appear.

### TC-5: Conflict resolution (last write wins)
1. On both Device A and B, edit the same product's name simultaneously (while offline or with delay).
2. Bring both devices online.
3. Verify that the last edit wins (the one with the later timestamp).
4. Verify no data loss or errors.

## Success Criteria
- All test cases pass.
- The app remains functional offline.
- Data converges correctly across devices.
- No crash or unhandled exceptions.
```

**Step 4: Run test — confirm it passes**  
*N/A (manual test)*

**Step 5: Commit**  
`git add docs/plans/2026-10-15-dexie-cloud-sync-e2e-test-plan.md && git commit -m "docs: add E2E test plan for Dexie Cloud sync"`

---

### Task 7: Update vite.config.ts for Dexie Cloud (if needed)

**Files:**  
- Modify: `src/vite.config.ts`  
- Test: Ensure the app still builds and runs.

**Step 1: Write the failing test**  
Command: `npm run build`  
Expected: May fail if Dexie Cloud add-on introduces dependencies that are not browser-compatible.

**Step 2: Run command to test build**  
Command: `npm run build`  
Expected: PASS — successful build.

**Step 3: Write minimal implementation**  
*If needed, add dexie-cloud-addon to the optimizeDeps or ssr options in Vite.*  
*Typically, Dexie Cloud add-on works fine with Vite; no changes needed.*  
*If we encounter issues, we will adjust.*

**Step 4: Run test — confirm it passes**  
Command: `npm run build && npm run preview -- --port 4173`  
Expected: App builds and preview runs without errors.

**Step 5: Commit**  
`git add src/vite.config.ts && git commit -m "feat: ensure Vite configuration works with Dexie Cloud"`

---

### Task 8: Final verification and cleanup

**Files:**  
- Run: `npm run test:coverage`  
- Run: `npm run type-check`  
- Run: `npm run lint`  
- Fix any issues found.

**Step 1: Write the failing test**  
*N/A*

**Step 2: Run commands to verify**  
Command: `npm run test:coverage`  
Expected: Coverage meets or exceeds previous levels (no new gaps).

Command: `npm run type-check`  
Expected: No new TypeScript errors.

Command: `npm run lint`  
Expected: No new lint errors.

**Step 3: Write minimal implementation**  
*Fix any issues that arise from the previous tasks.*

**Step 4: Run test — confirm it passes**  
Command: `npm run test:coverage`  
Expected: PASS.

**Step 5: Commit**  
`git add . && git commit -m "chore: final verification and cleanup"`

```

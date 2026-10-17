# Account-Based Login — Implementation Plan

> **For implementer:** Use TDD throughout. Write the failing test first. Watch it fail. Then implement. Then watch it pass. Commit after each green test.

**Goal:** Gate the app behind a Dexie Cloud email-OTP account login, isolate each account's data with private primary keys, and remove the Sync section from Settings.

**Architecture:** Dexie Cloud already provides per-user private realms, persistent sessions and multi-device sync. This plan stops fighting that model: the React gate reads the addon's session state, the app renders the addon's own login prompts (`customLoginGui: true`) in its existing visual style, and the two primary keys that are invalid for Dexie Cloud (`settings`, `catalog`) become `#`-prefixed private IDs.

**Tech Stack:** React 18 + TypeScript, Vite 6, Dexie 4 + dexie-cloud-addon 4.4.15, Vitest 5, GitHub Pages.

**Design doc:** `docs/plans/2026-10-16-account-login-design.md`

---

## Standing rules for every task

- **TDD.** Test first, watch it fail, implement, watch it pass, commit.
- **Commit only the task's files**, and report the commit SHA.
- Run tests with the node binary directly — `npx` is unreliable in this shell:
  `C:/nvm4w/nodejs/node.exe node_modules/vitest/vitest.mjs run <path>`
- Type-check: `C:/nvm4w/nodejs/node.exe node_modules/typescript/bin/tsc --noEmit`
  Baseline is **65 errors**. Do not add any. Do not chase the existing 65.
- Never let Dexie Cloud run under Vitest — the `env.VITEST` guard in `src/db/dexie.ts` is load-bearing.
- Update `docs/plans/implementation-status.log` with PASS/FAIL per task.

## Existing tests this plan must update (not just add)

`AppAuthGate.test.tsx`, `AuthContext.test.tsx`, `LoginScreen.test.tsx`,
`settingsLogout.test.tsx`, `SettingsScreen.test.tsx`, `catalogService.test.ts`,
`database.test.ts`, `dexie.test.ts`.

These currently assert master-password behaviour or the old catalog primary key.
Rewriting them **is** part of the tasks below — a failing old assertion is expected,
not a regression.

---

## Task A: Private IDs and schema version 11

**Files:**
- Create: `src/utils/privateId.ts`
- Create: `src/__tests__/privateId.test.ts`
- Modify: `src/types/index.ts`
- Modify: `src/db/dexie.ts`
- Modify: `src/__tests__/database.test.ts`

**Step 1: Write the failing test** — `src/__tests__/privateId.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { privateId, productIdFor } from '@/utils/privateId';

describe('privateId', () => {
  it('prefixes a bare value', () => {
    expect(privateId('settings')).toBe('#settings');
  });

  it('is idempotent', () => {
    expect(privateId('#settings')).toBe('#settings');
  });

  it('keeps the barcode intact behind the prefix', () => {
    expect(productIdFor('4801234567890')).toBe('#4801234567890');
  });

  it('is deterministic, so seeding converges across a user\'s devices', () => {
    expect(productIdFor('4801')).toBe(productIdFor('4801'));
  });
});
```

**Step 2: Run — confirm it fails**
`C:/nvm4w/nodejs/node.exe node_modules/vitest/vitest.mjs run src/__tests__/privateId.test.ts`
Expected: FAIL — cannot resolve `@/utils/privateId`.

**Step 3: Implement** — `src/utils/privateId.ts`

```ts
/**
 * Dexie Cloud gives every user a private realm, but it does NOT namespace primary
 * keys for you. Its best-practices doc: "primary keys has to be globally unique
 * strings in Dexie Cloud". The escape hatch is a '#'-prefixed *private ID*, which
 * the server keeps in a per-user namespace and which "cannot collide with other
 * user's".
 *
 * Anything this app keys by a real-world shared identifier (a barcode) or by a
 * fixed singleton name (settings) must go through here, or two accounts on the
 * same database will collide on the same key.
 */
export function privateId(value: string): string {
  return value.startsWith('#') ? value : `#${value}`;
}

/** Catalog rows are keyed per account, never by the globally-shared barcode itself. */
export function productIdFor(barcode: string): string {
  return privateId(barcode);
}
```

**Step 4: Run — confirm PASS**

**Step 5: Update types** — `src/types/index.ts`

```ts
export const SETTINGS_ID = '#settings';
```

and add `productId` to `Product` (optional — writes derive it in `catalogService`,
so callers are not all forced to change):

```ts
export interface Product {
  /**
   * Primary key: '#' + barcode. A Dexie Cloud private ID, so two accounts can hold
   * the same barcode without colliding. Derived automatically on write — do not
   * set it by hand outside seedService.
   */
  productId?: string;
  barcode: string;
  // ...unchanged
}
```

**Step 6: Schema version 11** — `src/db/dexie.ts`

Replace the `db.version(10).stores({...})` block with:

```ts
db.version(11).stores({
  // catalog is keyed by productId ('#' + barcode), NOT by the barcode itself:
  // barcodes are shared real-world identifiers, so two accounts scanning the same
  // product would otherwise produce the same primary key. See utils/privateId.ts.
  catalog: '&productId, barcode, name',
  inventory: '&batchId, barcode, expiryDate',
  settings: '&id', // id is '#settings' — a private singleton, per account
  sales: '&saleId, dayKey'
}).upgrade((tx) => {
  // Approved one-time wipe (2026-10-16 design). catalog and settings changed the
  // SHAPE of their primary keys, so existing rows cannot be re-keyed reliably — and
  // sync has never worked, so the cloud holds nothing to restore. Dexie also drops
  // and recreates a store whose primary key changed; this clear is belt-and-braces.
  return Promise.all([
    tx.table('catalog').clear(),
    tx.table('inventory').clear(),
    tx.table('settings').clear(),
    tx.table('sales').clear(),
  ]);
});
```

**Step 7: Update `src/__tests__/database.test.ts`**
`db.catalog.schema.primKey.keyPath` is now `'productId'` (was `'barcode'`).
Add an assertion that the settings singleton uses the private ID:

```ts
it('should key settings by a per-account private ID', () => {
  expect(SETTINGS_ID).toBe('#settings');
});
```

**Step 8: Run the suite — expect the old catalog/settings assertions to fail, fix them**
`C:/nvm4w/nodejs/node.exe node_modules/vitest/vitest.mjs run`

**Step 9: Verify the wipe actually happens** (this is the point of the task)
Build and load the app, then in the browser console check that no `catalog` row
survives from the previous version. If Dexie recreated the store instead, the clear
is a harmless no-op — either way the assertion is "old rows are gone".

**Step 10: Commit**
`git add src/utils/privateId.ts src/__tests__/privateId.test.ts src/types/index.ts src/db/dexie.ts src/__tests__/database.test.ts && git commit -m "feat: key catalog and settings by Dexie Cloud private IDs (schema v11)"`

---

## Task B: Route every catalog write through the private ID

**Files:**
- Modify: `src/services/catalogService.ts`
- Modify: `src/services/seedService.ts`
- Modify: `src/__tests__/catalogService.test.ts`

**Step 1: Write the failing test** — append to `src/__tests__/catalogService.test.ts`

```ts
it('stores products under the private productId, not the bare barcode', async () => {
  await saveProduct({ ...product('4801'), barcode: '4801' });
  const rows = await db.catalog.toArray();
  expect(rows[0]!.productId).toBe('#4801');
  expect(rows[0]!.barcode).toBe('4801');
});

it('still finds a product by its plain barcode', async () => {
  await saveProduct({ ...product('4802'), barcode: '4802' });
  expect((await getProduct('4802'))?.barcode).toBe('4802');
});
```

**Step 2: Run — confirm FAIL**

**Step 3: Implement** — `src/services/catalogService.ts`

```ts
import { productIdFor } from '@/utils/privateId';

export async function getProduct(barcode: string): Promise<Product | undefined> {
  // The primary key is the per-account private ID, so look up via the barcode index.
  return db.catalog.where('barcode').equals(barcode).first();
}

export async function saveProduct(product: Product): Promise<Product> {
  const withId: Product = { ...product, productId: productIdFor(product.barcode) };
  await db.catalog.put(withId);
  return withId;
}

export async function deleteProduct(barcode: string): Promise<void> {
  await db.catalog.delete(productIdFor(barcode));
}

export async function updateProduct(product: Product): Promise<void> {
  const existing = await getProduct(product.barcode);
  const merged: Product = existing
    ? { ...existing, ...product, createdAt: existing.createdAt, updatedAt: new Date().toISOString() }
    : { ...product, createdAt: product.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
  await db.catalog.put({ ...merged, productId: productIdFor(merged.barcode) });
}
```

**Step 4: `src/services/seedService.ts`** — add `productId` to the mapped seed rows:

```ts
const products: Product[] = PH_GROCERY_SEED.map((seed) => ({
  productId: productIdFor(seed.barcode),
  barcode: seed.barcode,
  // ...unchanged
}));
```

**Step 5: Run the full suite.** `tsc --noEmit` enumerates any other `Product`
literal that now needs `productId` (the orphan placeholder in
`inventoryService.ts` is one). Fix every site it reports.

**Step 6: Commit**

---

## Task C: Cloud session hook and the three-state gate

**Files:**
- Create: `src/hooks/useCloudSession.ts`
- Create: `src/__tests__/useCloudSession.test.tsx`
- Modify: `src/App.tsx`

**Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCloudSession } from '@/hooks/useCloudSession';

// db.cloud is absent under Vitest (the addon is not registered), which is itself a
// case the hook must survive: settle as "signed out", never hang on isLoading.
describe('useCloudSession', () => {
  it('settles as signed out when the cloud addon is unavailable', async () => {
    const { result } = renderHook(() => useCloudSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.email).toBeNull();
  });
});
```

**Step 2: Run — confirm FAIL**

**Step 3: Implement** — `src/hooks/useCloudSession.ts`

```ts
import { useEffect, useState } from 'react';
import db from '@/db/dexie';

export interface CloudSession {
  /**
   * True while Dexie Cloud is restoring a persisted session from IndexedDB.
   * currentUser starts as UNAUTHORIZED_USER with isLoading:true, so gating on this
   * is what stops the login screen flashing on every cold start.
   */
  isLoading: boolean;
  isLoggedIn: boolean;
  email: string | null;
}

export function useCloudSession(): CloudSession {
  const cloud = (db as any).cloud;
  const [session, setSession] = useState<CloudSession>({
    isLoading: true,
    isLoggedIn: false,
    email: null,
  });

  useEffect(() => {
    if (!cloud?.currentUser?.subscribe) {
      // No addon (tests, or a build without cloud configured): settle as signed out
      // rather than hanging on isLoading forever.
      setSession({ isLoading: false, isLoggedIn: false, email: null });
      return;
    }
    const sub = cloud.currentUser.subscribe((user: any) => {
      setSession({
        isLoading: Boolean(user?.isLoading),
        isLoggedIn: Boolean(user?.isLoggedIn),
        email: user?.email ?? null,
      });
    });
    return () => sub?.unsubscribe?.();
  }, [cloud]);

  return session;
}
```

**Step 4: Rewrite `AuthGate` in `src/App.tsx`**

```tsx
function AuthGate() {
  const { isLoading, isLoggedIn } = useCloudSession();

  return (
    <>
      {isLoading ? (
        <div className="screen-center">
          <div className="loading-spinner" role="status" aria-label="Loading">
            <div className="spinner" />
            <p>Loading your inventory...</p>
          </div>
        </div>
      ) : isLoggedIn ? (
        <MainApp />
      ) : (
        <LoginScreen />
      )}
      {/* Mounted at the root so db.cloud.userInteraction is always observed —
          the logout confirmation can fire from any screen. */}
      <UserInteractionPrompt />
    </>
  );
}
```

`LoginScreen` no longer takes an `onLogin` prop.

**Step 5: Rewrite `src/__tests__/AppAuthGate.test.tsx`** to assert the three states
with the hook mocked: `isLoading:true` → splash; `isLoggedIn:false` → login; `isLoggedIn:true` → main app.

**Step 6: Run, then commit**

---

## Task D: Render Dexie Cloud's prompts in the app's own style

**Files:**
- Create: `src/utils/formatAlert.ts`
- Create: `src/__tests__/formatAlert.test.ts`
- Create: `src/components/UserInteractionPrompt.tsx`
- Create: `src/__tests__/UserInteractionPrompt.test.tsx`

**Step 1: Failing test for the alert formatter** — messages contain `{email}` placeholders:

```ts
import { describe, it, expect } from 'vitest';
import { formatAlertMessage } from '@/utils/formatAlert';

describe('formatAlertMessage', () => {
  it('substitutes messageParams into the message', () => {
    expect(
      formatAlertMessage({
        message: 'A One-Time password has been sent to {email}',
        messageParams: { email: 'me@example.com' },
      })
    ).toBe('A One-Time password has been sent to me@example.com');
  });

  it('leaves unknown placeholders visible rather than printing undefined', () => {
    expect(formatAlertMessage({ message: 'Sent to {email}', messageParams: {} })).toBe('Sent to {email}');
  });

  it('tolerates a missing message', () => {
    expect(formatAlertMessage({})).toBe('');
  });
});
```

**Step 2: Implement**

```ts
export function formatAlertMessage(alert: any): string {
  const message = alert?.message ?? '';
  const params = alert?.messageParams ?? {};
  return message.replace(/\{(\w+)\}/g, (_match, key) =>
    params[key] === undefined ? `{${key}}` : String(params[key])
  );
}
```

**Step 3: Failing test for the prompt renderer**

Cover each `DXCUserInteraction` variant, asserting the app's own markup is used and
that the right callback fires:

```tsx
it('renders an email prompt and submits the typed address', () => { /* onSubmit({email}) */ });
it('renders an OTP prompt, shows the "sent to" alert, and submits the code', () => { /* onSubmit({otp}) */ });
it('surfaces an INVALID_OTP alert inline', () => { /* error text visible */ });
it('renders a message-alert and dismisses with OK', () => { /* onSubmit({}) */ });
it('renders the logout confirmation and can cancel', () => { /* onCancel() */ });
it('renders nothing when there is no interaction', () => { /* container empty */ });
```

**Step 4: Implement `src/components/UserInteractionPrompt.tsx`**

A root-level component that reads `db.cloud.userInteraction` and renders by
`interaction.type`, reusing the existing `login-card` / `settings-warning` CSS so it
looks native to the app. Map:

| `type` | Render |
|---|---|
| `email` | email field from `fields.email`, submit → `onSubmit({ email })` |
| `otp` | code field from `fields.otp`, alerts above it, submit → `onSubmit({ otp })` |
| `message-alert` | alerts + OK → `onSubmit({})` |
| `logout-confirmation` | confirm → `onSubmit({})`, cancel → `onCancel()` |
| `generic` / anything else | render `fields` generically, submit → `onSubmit(values)` |

Subscribe via a small hook (`db.cloud.userInteraction` is a BehaviorSubject); answer
exactly once per interaction, since `onSubmit`/`onCancel` also clear the subject.

**Step 5: Run, then commit**

---

## Task E: Sign in / sign out, and strip the master password

**Files:**
- Modify: `src/db/dexie.ts` (add `customLoginGui: true`)
- Modify: `src/context/AuthContext.tsx`
- Modify: `src/screens/LoginScreen.tsx`
- Modify: `src/__tests__/AuthContext.test.tsx`
- Modify: `src/__tests__/LoginScreen.test.tsx`

**Step 1: `src/db/dexie.ts`** — inside `configure()`:

```ts
db.cloud.configure({
  databaseUrl: syncUrl,
  requireAuth: false,
  // The app renders the prompts itself from db.cloud.userInteraction, so it can
  // style them; without this the addon injects its own generic dialog.
  customLoginGui: true,
});
```

**Step 2: Rewrite `src/context/AuthContext.tsx`.** Delete `login`, `logout`,
`getMasterPassword`, `setMasterPassword`, `masterPasswordOverride`, `syncEnabled`,
`enableSync`, `disableSync`, `DEFAULT_MASTER_PASSWORD` and every
`barcode_inventory_master_password` / `AUTH_STORAGE_KEY` reference. Keep the cloud
login/logout and the session subscription. Shape:

```ts
interface AuthContextValue {
  cloudUser: string | null;
  cloudError: string;
  /** Starts the email-OTP flow. Not awaited: the addon keeps the promise pending
   *  while it prompts through db.cloud.userInteraction. */
  cloudLogin: () => void;
  cloudLogout: () => Promise<void>;
}
```

`cloudLogin` calls `cloud.login({ grant_type: 'otp' })` **once** — no `intent`
(it makes Dexie Cloud refuse unregistered emails with USER_NOT_REGISTERED), and never
a second call with an `otp` (the addon requires an `otp_id` it does not expose, so a
follow-up call just requests a fresh code).

**Step 3: Rewrite `src/screens/LoginScreen.tsx`** as the signed-out shell: the app's
`login-card`, a short explanation, and one "Sign in with email" button calling
`cloudLogin()`. Delete the password input, the show/hide toggle and the
`onLogin` prop. Surface `cloudError` when present. The email/OTP fields come from
`UserInteractionPrompt`, not from here.

**Step 4: Rewrite `AuthContext.test.tsx` and `LoginScreen.test.tsx`** to the new API.
Remove `VITE_MASTER_PASSWORD` from `.env`, `.env.example` and `.env.test`.

**Step 5: Run, then commit**

---

## Task F: Remove the Sync section from Settings

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`
- Delete: `src/components/SyncSettings.tsx`
- Delete: `src/components/DexieCloudLoginForm.tsx`
- Delete: `src/components/SyncStatus.tsx`
- Modify: `src/__tests__/SettingsScreen.test.tsx`
- Modify: `src/__tests__/settingsLogout.test.tsx`

**Step 1: Failing test** in `SettingsScreen.test.tsx`:

```ts
it('no longer offers a Sync section', () => {
  renderSettings();
  expect(screen.queryByText(/sync/i)).not.toBeInTheDocument();
});

it('still offers Log Out', () => {
  renderSettings();
  expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
});
```

**Step 2: Run — confirm FAIL**

**Step 3: Implement** — drop the `<SyncSettings />` block and the Security section's
master-password field/button from `SettingsScreen.tsx`; point Log Out at
`cloudLogout()`. Delete the three component files (verified dead: nothing imports
`DexieCloudLoginForm` or `SyncStatus`).

**Step 4: Run the suite.** `settingsLogout.test.tsx` asserts the removed master-password
behaviour — rewrite it to the cloud logout, keeping its existing
"does not navigate to a non-existent /login route" assertion intact.

**Step 5: Commit**

---

## Task G: Prove account isolation end-to-end (the requirement-4 test)

This one is **not** a Vitest test, and that is deliberate: realm isolation is enforced
by Dexie Cloud's server, so a unit test would only be asserting a mock. It is verified
against the real service, with recorded evidence.

**Step 1: Create two demo users** (no email needed — `@demo.local` addresses need no inbox):

```
cd /c/Users/bryan   # where dexie-cloud.json / dexie-cloud.key live
npx --yes dexie-cloud import demo-users.json
```

with `demo-users.json` containing two `@demo.local` users.

**Step 2: Drive the browser through both accounts** and record, for each step, the
visible text:

1. Sign in as demo user A → scan/add a distinctive product (e.g. barcode `TESTA-001`).
2. Confirm it appears in Inventory.
3. Sign out (accept the unsynced-changes confirmation if shown).
4. Sign in as demo user B → assert Inventory is **empty** and `TESTA-001` is absent.
5. Add `TESTB-001` as B, sign out, sign back in as A → assert `TESTB-001` is absent
   and `TESTA-001` is present.

**Step 3: Also verify the local wipe.** After step 4, before B adds anything, assert
via the browser console that `db.catalog.count()` and `db.inventory.count()` are 0 —
proving the previous account's rows were cleared from the device, not merely hidden.

**Step 4: Record the evidence** in `docs/plans/2026-10-16-account-login-verification.md`
(what was done, what was observed, verbatim). Do not claim isolation works from code
reading alone.

---

## Task H: Seeding correctness under accounts

**Files:**
- Modify: `src/services/seedService.ts` (if needed)
- Modify: `src/__tests__/seedService.test.ts` (create if absent)

**Step 1: Failing test** — seeding twice must not duplicate:

```ts
it('is idempotent — seeding twice leaves one row per barcode', async () => {
  await seedCatalogIfEmpty();
  const first = await getAllProducts();
  await seedCatalogIfEmpty();
  expect(await getAllProducts()).toHaveLength(first.length);
});
```

**Step 2: Implement** whatever the test reveals (the `catalogSeeded` flag already
guards this; the test pins it). Confirm `seedCatalogIfEmpty()` runs **after** login —
it is called from `MainApp`, which is behind the gate.

**Step 3: Commit**

---

## Task I: Build, deploy, verify live

**Step 1:** Full suite green + type-check no worse than the 65-error baseline.

**Step 2:** CI-simulated build (`.env` moved aside, exactly as CI sees it):

```
mv .env .env.__bak__ && NODE_ENV=production C:/nvm4w/nodejs/node.exe node_modules/vite/bin/vite.js build; EX=$?; mv .env.__bak__ .env
```

**Step 3:** Grep the built bundle to prove the config survived:
`configure({databaseUrl:`, `customLoginGui:!0`, and the cloud URL — each ≥1.

**Step 4:** Commit, push, watch the Pages workflow to green, then re-fetch the live
bundle and confirm it is byte-identical to the local build.

**Step 5:** Manual confirmation on the phone: cold start shows the login gate (not the
password screen), one OTP login, then inventory present and syncing.

**Step 6: Vercel (later, not now).** When the time comes, the one extra step is
`npx dexie-cloud whitelist https://<app>.vercel.app` — the same CORS wall hit on
2026-10-16. Add the origin **before** the first Vercel deploy.

---

## Definition of done

- [ ] Cold start shows the login gate; the master password screen is gone.
- [ ] One email-OTP login per phone; the session survives restarts and offline use.
- [ ] Settings has no Sync section; Log Out performs a real cloud logout.
- [ ] Two accounts on one device cannot see each other's data (Task G evidence).
- [ ] Catalog and settings use `#`-private primary keys.
- [ ] Suite green, type-check no worse than baseline, live bundle verified.

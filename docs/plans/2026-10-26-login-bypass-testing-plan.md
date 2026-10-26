# Login bypass for testing (plan only — no code changes)

## Findings

- The app boots through a single gate: `AuthGate()` in `src/App.tsx` reads `useCloudSession()`
  (`src/hooks/useCloudSession.ts`) and renders `<LoginScreen />` when not `isLoggedIn`.
- `useCloudSession` is deliberately the **single source of truth** for "is anyone signed in";
  `AuthContext` only carries the sign-in *actions*. The gate must be opened by that hook, not
  by duplicating a `currentUser` subscription.
- `db.cloud.configure()` in `src/db/dexie.ts` enforces `requireAuth: true` + `customLoginGui: true`.
  That is what makes a signed-out user see the login screen/page and have the local DB reject
  reads/writes until authenticated. Production needs this.
- No existing code reads a "skip login" flag anywhere (`grep skipAuth|testMode|bypass` returns
  only unrelated mentions). The app has no test/dev bypass path today.

## Design

One build/test-only env flag, `VITE_BYPASS_LOGIN`. When set (dev/test only), the app boots as if
signed in and does not enforce Dexie Cloud auth. Everything else stays untouched, so the real
login path is completely unaffected unless the flag is present.

The bypass must reach the gate in exactly two places — nowhere else, to avoid duplicating the
"a signed in" fact (which is what caused the two-source-of-truth bug):

1. `useCloudSession` → reports `isLoggedIn: true` when the flag is set (no `currentUser`
   subscription, so the `UNAUTHORIZED_USER` emission cannot flip it back to signed-out).
2. `db.cloud.configure()` → skip `requireAuth: true` when the flag is set, so the local DB stays
   usable and no extra login overlay is injected.

`App.tsx`'s `AuthGate` needs **no change**: setting `isLoggedIn` via the hook naturally makes
it render `<MainApp />`.

## Proposed change set (implementation, not applied here)

### 1. `src/hooks/useCloudSession.ts`
- Read the flag at module scope: `(importMeta as any).env.VITE_BYPASS_LOGIN` (Vite only exposes
  `VITE_`-prefixed names).
- When truthy: skip opening the subscription and return
  `{ isLoading: false, isLoggedIn: true, email: null, error: null }` immediately.
- The initial `Promise.resolve((db as any).open?.())` stays, so catalog seeding still runs and
  the rest of `MainApp` boots normally; only the auth sentinel is skipped.
- Keep the signed-out, storage-failure, and normal-session paths (production and tests) exactly
  as they are.

### 2. `src/db/dexie.ts`
- Inside the existing `db.cloud.configure({…})` block (which is already skipped under `VITEST`),
  read the same flag and, when set, skip the whole configure call (or set `requireAuth:false`,
  `customLoginGui:false`). This keeps the flag in one file and avoids a second read.
- Production builds never set the flag, so `requireAuth: true` and `customLoginGui: true` remain.

### 3. `.env.example` (document)
- Add a commented-out line:
  `# VITE_BYPASS_LOGIN=1   # dev/test only — boot as if signed in; never commit a set value.`

No change to `src/screens/LoginScreen.tsx`; no change to `AuthContext.tsx` (its `cloudLogin`
action stays as the production sign-in path).

## Triggering for testing

- **Dev mode:** `VITE_BYPASS_LOGIN=1 npm run dev` (or a `.env` / `.env.local` entry).
- Verify the scan/inventory/settings tabs render without the login screen or any Dexie Cloud
  prompt; verify the real login still works when the flag is absent.
- Unit tests must stay green with the flag unset:
  `npm test` / `npm run test:coverage` (Vitest never defines the flag by default, so existing
  `AppAuthGate`/`LoginScreen`/settings tests keep asserting the login gate).

## Verification to run after implementation

- `npm run type-check` and `npm run lint` (no new errors; the flag read is a single optional
  cast and needs no new @types declarations).
- `npm test` — gate tests still pass with the flag unset.
- Dev boot with the flag: login screen absent, Scanner/Inventory/Settings reachable.
- Dev boot without the flag: login screen returns, normal sign-in flow intact.

## Risks / what's left

- The flag is read through `import.meta.env`, which Vite inlines at build time. A `VITE_`
  variable not present in a production build is `undefined`, so there is no risk of a
  production deployment ever shipping the bypass — but the `.env`/CI definition must not be
  committed or run in production.
- Bypass is a **dev/test convenience only**; it does not authenticate anyone and intentionally
  disables the DB-level auth guard, so it must never be enabled in production.
- Requires an implementation commit and a follow-up verification pass (above) — left for the
  next step.

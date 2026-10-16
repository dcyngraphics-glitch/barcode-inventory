# Account-Based Login — Design

**Date:** 2026-10-16
**Status:** Approved (design gate passed)
**Supersedes:** the "Sync" section of `2026-10-15-dexie-cloud-sync-design.md`

## Goal

Make the app account-scoped: one login before you can use it, one account shared
across several phones, and data that can never bleed between accounts.

## Requirements (from the user)

1. Login gate **before** the app is usable, not a Sync button buried in Settings.
2. New users sign up / log in, confirm via email OTP.
3. The same account on multiple phones shares the same data.
4. Data is isolated per account — it must not leak into another account.
5. Remove the Sync section from Settings.
6. The phone remembers the account; no re-login on every use.
7. GitHub Pages first, Vercel after development is done.

## Non-goals

- Sharing data *between* accounts (no realms/invites). One account = one private dataset.
- OAuth / social login. Email OTP only.
- A backend server. Hosting stays static.
- Preserving existing on-phone test data (user approved a wipe).

## Investigation findings

Verified against the addon source in `node_modules/dexie-cloud-addon/dist/modern/`
and the official docs.

| Question | Finding |
|---|---|
| Per-account isolation | **Built in.** Every user gets a private realm named after their user ID. Docs: *"All data that one user creates will be private… not visible for any other user."* |
| Session persistence | **Built in.** Non-exportable CryptoKey + refresh token in IndexedDB. Docs: *"persistently logged in for as long as the local database lives."* |
| Multi-device | **Built in.** Same account → same realm → data syncs down. |
| Does logout leak? | **No.** `logout()` in the addon source clears *every* local table (except `$jobs`/`$syncState`), then re-syncs. Docs: *"A logout from a local first app is similar to erasing the local database."* |
| Logout with unsynced work | Prompts via `db.cloud.userInteraction`; throws if the user cancels. |
| Existing gate | `App.tsx` already has `AuthGate` + `LoginScreen`, wired to the **local master password** — it needs re-pointing, not creating. |

### Two primary keys are invalid for Dexie Cloud

Docs (best-practices): *"primary keys has to be globally unique strings in Dexie
Cloud"*, and private singletons *"lives within a private namespace and cannot
collide with other user's"* (`id: '#favourites'`).

Current schema vs. that rule:

| Table | Current PK | Problem |
|---|---|---|
| `settings` | `'settings'` | **Identical for every user.** Guaranteed collision. |
| `catalog` | `barcode` | A real-world shared identifier — two accounts scanning the same product produce the **same** PK. |
| `inventory` | `batchId` (`crypto.randomUUID()`) | Fine — globally unique. |
| `sales` | `saleId` (`crypto.randomUUID()`) | Fine — globally unique. |

**This is the exact "leak into other accounts" hazard in requirement 4.**

Fix: use **private IDs** (`#`-prefixed values, which Dexie Cloud namespaces per user).

Crucially, `'#' + barcode` is *deterministic*, so seeding the catalog on phone 1
and phone 2 yields identical keys and converges by upsert — no duplicates. We get
per-account isolation **and** idempotent seeding.

Timing matters: Dexie's docs say *"Never change the primary keys of a table"* —
after data has synced, this becomes an export/migrate/import job. Sync has never
once worked, so the cloud database is still empty. **This is the one free moment.**

## Architecture

```
App start
  └─ AuthGate
       ├─ session unknown  → splash (never flash the login screen on cold start)
       ├─ signed out       → LoginScreen (the gate)
       └─ signed in        → MainApp (scanner / inventory / sales / settings)
                                └─ local IndexedDB ⇄ Dexie Cloud
                                     realm = user ID (private, automatic)
```

Login happens **once per phone**. The session survives restarts and offline use.

## Schema (version 11)

```js
db.version(11).stores({
  catalog:   '&productId, barcode, name',     // productId = '#' + barcode
  inventory: '&batchId, barcode, expiryDate',
  settings:  '&id',                            // id = '#settings'
  sales:     '&saleId, dayKey',
});
```

- New `Product.productId` field; `barcode` becomes a plain indexed field.
- `SETTINGS_ID` changes from `'settings'` to `'#settings'`.
- Because the wipe was approved, the upgrade clears the four tables — no migration code.

## Login flow

`db.cloud.configure({ ..., customLoginGui: true })` and the app renders the
prompts itself from the `db.cloud.userInteraction` BehaviorSubject, reusing the
existing `login-card` styling so it looks like this app rather than a generic overlay.

| `interaction.type` | UI |
|---|---|
| `email` | styled email field |
| `otp` | code field; shows "code sent to …" and INVALID_OTP inline |
| `message-alert` | message + OK (policy rejections) |
| `logout-confirmation` | "unsynced changes — log out anyway?" |
| `generic` | fallback rendering of `fields` |

The renderer is mounted at the **root** so the observable is always listened to —
the logout confirmation can fire from any screen.

`db.cloud.login()` is called **once** with `{ grant_type: 'otp' }`. It stays
pending until the code is verified; the UI is driven by `userInteraction`, never by
a second `login()` call (an OTP cannot be verified by a follow-up call — see
`docs/plans/2026-10-16-account-login-plan.md` for the mechanism).

## Components and responsibilities

| Component | Responsibility |
|---|---|
| `AuthGate` (App.tsx) | Three-state gate: unknown → splash, signed out → LoginScreen, signed in → MainApp |
| `LoginScreen` | Signed-out shell; renders whatever `userInteraction` asks for |
| `UserInteractionPrompt` | Maps each `DXCUserInteraction` variant to app-styled UI; answers via `onSubmit`/`onCancel` |
| `AuthContext` | Slims down to cloud session state: `cloudUser`, `cloudLoggingIn`, `signIn()`, `signOut()` |
| `SettingsScreen` | Sync section **removed**; Security keeps Log Out (now cloud logout) |

## Deleted

- Master password entirely: `login` / `getMasterPassword` / `setMasterPassword`,
  `VITE_MASTER_PASSWORD`, the Master Password field, the password form.
- The whole Sync section from Settings.
- Dead code: `DexieCloudLoginForm.tsx`, `SyncStatus.tsx` (neither is imported).

## Data flow

1. Cold start → Dexie Cloud restores the session from IndexedDB (no network needed).
2. Signed out → user taps Sign in → `login({grant_type:'otp'})` → email prompt → OTP prompt → verified.
3. First login on a new device → initial pull sync brings the account's data down.
4. Local writes → tracked → pushed on next sync. Works offline.
5. Sign out → local tables cleared → fresh pull. No residue for the next person.

## Error handling

| Situation | User sees |
|---|---|
| Policy blocks sign-up | server's reason, plain language |
| Wrong/expired code | inline on the code field; retry without re-entering email |
| No internet on the *first* login | "connect once to set up your account" |
| Logout with unsynced scans | confirmation, per Dexie Cloud |
| Session restore fails | falls back to the login screen — never a dead screen |
| Cloud not configured | explicit message, not an opaque TypeError |

## Testing strategy

- **Unit:** the gate's three states; `UserInteractionPrompt` per interaction type;
  the `#`-prefixing helpers.
- **Integration (the important one):** log in as A, add a product + scan, log out,
  log in as B, assert B sees none of A's data. This is the proof of requirement 4.
- **Suite isolation:** Dexie Cloud stays out of vitest (existing `VITEST` guard).
- **End-to-end:** a Dexie Cloud **demo user** (`@demo.local`, imported via CLI) lets
  the whole login + sync + isolation flow be driven in a browser without the user's
  email inbox.

## Deployment

GitHub Pages first, unchanged pipeline. On the move to Vercel the extra step is
`npx dexie-cloud whitelist https://<app>.vercel.app` — the same CORS wall hit on
2026-10-16. Recorded in the plan so it is not a surprise.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Login UI | **Custom renderer** over the addon's built-in dialog | The app has its own styling; a generic overlay would look foreign. User approved. |
| Master password | **Removed** | The account login is the gate. User approved. |
| Existing test data | **Wiped** | Only test scans; cloud is empty, so no migration needed. User approved. |
| `requireAuth` | Stays **false**, gate in React | `requireAuth: true` makes DB calls *hang* rather than fail; an explicit gate has a better failure mode. |
| Account count | One account, several phones | Fits the free tier (3 users) with room spare. |

## Risks

- **OTP flow cannot be fully verified by the agent** without an inbox. Mitigated by
  the demo-user path for automated E2E, plus manual confirmation on the phone.
- **Free tier: 3 users / 100 MB.** Fine for one account; a fourth account would not fit.
- **Seeding now syncs per account.** The catalog is pushed to each user's realm.
  With `#`-private IDs this is idempotent across a user's devices.
- **Dexie Cloud stays a hard dependency.** If it were ever swapped out, the `#`-ID
  convention would need revisiting.

## Verified during investigation

- App runs; the master password gate is what greets a cold start (confirmed in a browser).
- Whitelist was empty; `https://dcyngraphics-glitch.github.io` is now whitelisted and CORS passes.
- Local data currently carries `owner: 'unauthorized'` / `realmId: 'unauthorized'` — i.e. created pre-login, ready to be adopted into the account realm on first login.

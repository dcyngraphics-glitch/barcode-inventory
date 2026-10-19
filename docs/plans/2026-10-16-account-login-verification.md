# Account isolation — end-to-end verification (Task G)

**Why this is a manual procedure:** Dexie Cloud's OTP codes are delivered to an email
inbox, and the agent must never enter an authentication code — with the browser tool or
in chat. So the two sign-ins are performed by the account owner; everything before and
after (setup, server-side inspection, evidence) is automated.

**What this proves:** requirement 4 — data is isolated per account and cannot leak
between accounts. Realm isolation is enforced by Dexie Cloud's *server*, so a unit test
would only assert a mock; this is verified against the real service.

## Accounts

| | Role | Email |
|---|---|---|
| A | The account already in use | (the owner's primary address) |
| B | The second account | **confirm the exact address — see the note below** |

> **Note on the second address.** `git config user.email` in this repo reports
> `dcyngraphics.@gmail.com`. The local part of an email address may not end with a dot
> (RFC 5321), so that string is very likely a typo in the git config rather than a real
> deliverable address, and Dexie Cloud will probably reject it at the email prompt.
> Confirm the real address before starting.

## Baseline (already recorded)

`npx dexie-cloud export` on 2026-10-19 returned **3 objects**, one of which is the
built-in `rlm-public` realm. There is **no application data on the server** — consistent
with sync never having worked. Any object seen later is therefore created by this test.

## Procedure

Perform these on one device, in order. Record the actual observation for each step.

### 1. Account A — sign in and add a distinctive item

1. Open the deployed app: https://dcyngraphics-glitch.github.io/barcode-inventory/
2. Settings → sign in if not already signed in (email → one-time code → verify).
3. Add a product with a barcode that exists nowhere else: **`TESTA-001`**.
4. Confirm it appears in Inventory.

**Expected:** signed in; `TESTA-001` visible in Inventory.

Observation: ______________________________________________

### 2. Confirm the data reached the server under A's realm

Run (from the directory holding `dexie-cloud.json` / `dexie-cloud.key`):

```
npx dexie-cloud export "$LOCALAPPDATA/Temp/dxc-after-a.json"
```

**Expected:** the export now contains a `catalog` object for `TESTA-001` whose
`realmId` and `owner` are **A's user id (the email)**, and NOT `unauthorized`.

Observation: ______________________________________________

### 3. Sign out

Settings → Security → Log Out.

**Expected:** returns to the sign-in screen. If unsynced changes exist, Dexie Cloud
first asks for confirmation — accept it.

Observation: ______________________________________________

### 4. Confirm the local wipe (this is the "no leak on a shared phone" guarantee)

Before signing in as B, with the app on the sign-in screen, open the browser console
and run:

```js
const r = indexedDB.open('barcode-inventory-v2');
r.onsuccess = () => {
  const db = r.result;
  const names = [...db.objectStoreNames].filter(n => !n.startsWith('$'));
  const tx = db.transaction(names);
  Promise.all(names.map(n => new Promise(res => {
    const req = tx.objectStore(n).count();
    req.onsuccess = () => res(n + '=' + req.result);
  }))).then(rows => console.log('LOCAL ROWS:', rows.join(', ')));
};
```

**Expected:** `catalog=0, inventory=0` (and `settings=0`). The previous account's rows
are **gone from the device**, not merely hidden.

Observation: ______________________________________________

### 5. Account B — sign in and look

1. Sign in as **B** (email → one-time code → verify).
2. Open Inventory.

**Expected:** Inventory is **empty**. `TESTA-001` is **absent** — B cannot see A's data.

Observation: ______________________________________________

### 6. Add B's own item, then switch back

1. As B, add **`TESTB-001`**.
2. Sign out, sign back in as **A**.
3. Open Inventory.

**Expected:** `TESTA-001` is present and `TESTB-001` is **absent**. Neither account can
see the other's data, in either direction.

Observation: ______________________________________________

### 7. Confirm both realms exist server-side

```
npx dexie-cloud export "$LOCALAPPDATA/Temp/dxc-after-both.json"
```

**Expected:** two distinct `realmId` values (A's and B's user ids), each holding only
its own catalog row.

Observation: ______________________________________________

## Verdict

Isolation confirmed: **YES / NO**

Anything that failed, verbatim: ______________________________________________

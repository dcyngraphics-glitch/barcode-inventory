# Implementation Plan: Login Page & Camera Auto-Start

**Date:** 2026-10-14
**Design:** [2026-10-14-login-and-camera-autostart.md](./2026-10-14-login-and-camera-autostart.md)

---

## Task 1: AuthContext — login/logout with localStorage persistence

**Files:** `src/context/AuthContext.tsx`

**Steps:**
1. Write test: `src/tests/authContext.test.tsx` — test that `login(password)` returns true for correct password, false for wrong password, and that `logout()` clears state
2. Watch test fail
3. Implement `AuthContext`:
   - `isAuthenticated` state (initialized from `localStorage.getItem('barcode_inventory_auth')`)
   - `login(password: string): boolean` — checks against `VITE_MASTER_PASSWORD` env var or settings override, sets localStorage on success
   - `logout()` — clears localStorage and sets `isAuthenticated = false`
   - `getMasterPassword(): string` — returns env var or settings value
   - `setMasterPassword(password: string)` — stores in settings/IndexedDB
4. Watch test pass
5. Commit: `feat(auth): add login/logout with localStorage persistence`

---

## Task 2: LoginScreen component

**Files:** `src/screens/LoginScreen.tsx` (new)

**Steps:**
1. Write test: `src/tests/loginScreen.test.tsx` — test that login form renders, wrong password shows error, correct password calls `onLogin`
2. Watch test fail
3. Implement `LoginScreen`:
   - Centered card with password input
   - "Unlock" button
   - Error message on wrong password
   - Uses `useAuth().login()`
   - On success, calls `onLogin()` prop to navigate to app
4. Watch test pass
5. Commit: `feat(auth): add login screen component`

---

## Task 3: Auth gate in App.tsx

**Files:** `src/App.tsx`

**Steps:**
1. Write test: `src/tests/appAuthGate.test.tsx` — test that unauthenticated users see LoginScreen, authenticated users see the app
2. Watch test fail
3. Implement auth gate:
   - Wrap app with `AuthProvider`
   - Check `useAuth().isAuthenticated`
   - If not authenticated, render `<LoginScreen onLogin={() => navigate('/')} />`
   - If authenticated, render the existing app routes
4. Watch test pass
5. Commit: `feat(auth): add auth gate to App.tsx`

---

## Task 4: Logout button + master password override in Settings

**Files:** `src/screens/SettingsScreen.tsx`

**Steps:**
1. Write test: `src/tests/settingsLogout.test.tsx` — test that logout button calls `logout()` and that master password field updates settings
2. Watch test fail
3. Implement:
   - Add "Log Out" button in Settings (in a new "Security" section)
   - Add "Master Password" field that allows changing the password without rebuilding
   - Both use `useAuth()` hook
4. Watch test pass
5. Commit: `feat(auth): add logout and master password override to settings`

---

## Task 5: Camera auto-start on mount

**Files:** `src/components/CameraViewfinder.tsx`

**Steps:**
1. Write test: `src/tests/cameraAutoStart.test.tsx` — test that camera auto-starts when permission is granted, shows button when not granted
2. Watch test fail
3. Implement auto-start:
   - On mount, call `navigator.permissions.query({ name: 'camera' })`
   - If state is `'granted'`, set `cameraActive = true` immediately
   - If state is `'prompt'`, show start button (current behavior)
   - If state is `'denied'`, show error state (current behavior)
4. Watch test pass
5. Commit: `feat(camera): auto-start camera when permission previously granted`

---

## Task 6: Environment variable

**Files:** `.env.example`

**Steps:**
1. Add `VITE_MASTER_PASSWORD=your_master_password_here` to `.env.example`
2. Commit: `chore: add VITE_MASTER_PASSWORD to .env.example`

---

## Execution Mode

Subagent-driven (current session) — each task dispatched to an implementer subagent, followed by spec-reviewer and code-quality reviewer.

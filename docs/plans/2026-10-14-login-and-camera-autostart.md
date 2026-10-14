# Design: Login Page & Camera Auto-Start

**Date:** 2026-10-14
**Status:** Draft

---

## Overview

Two features:

1. **Login page** — password-gated access instead of SaaS dashboard approval
2. **Camera auto-start** — skip the "Start Camera" button if permission was previously granted

---

## Feature 1: Login Page

### Flow

```
User opens app → Login page shown → Enter master password → App unlocked → Persists until logout
```

### Password Storage

- **Primary:** `VITE_MASTER_PASSWORD` environment variable (set in Vercel, not in source code)
- **Override:** Settings page allows changing the password without rebuilding (stored in IndexedDB)
- App checks env var first, falls back to settings value

### Login Persistence

- Correct password → stored in `localStorage` with a timestamp
- On app load, check `localStorage` for valid session → skip login if found
- "Logout" button in Settings clears `localStorage` → login required on next visit
- Session does not expire (user stays logged in until they explicitly log out)

### UI

- **Login screen:** centered card with password input, "Unlock" button, error message on wrong password
- **Logout:** button in Settings page to log out and return to login

### Security Note

This is client-side only. The password is checked in the browser, so a determined user could bypass it. This is **not** a security feature — it's a gate for casual access. The env var keeps it out of source code.

---

## Feature 2: Camera Auto-Start

### Current Behavior

Camera starts as inactive. User must click "Start Camera" button every time they open the app.

### Desired Behavior

- On page load, check if camera permission was previously granted
- If granted → auto-start camera immediately (no button needed)
- If not granted → show "Start Camera" button as before

### Implementation

- On component mount, call `navigator.permissions.query({ name: 'camera' })`
- If state is `'granted'` → set `cameraActive = true` immediately
- If state is `'prompt'` → show the start button (current behavior)
- If state is `'denied'` → show error state (current behavior)

---

## Files to Modify

| File | Change |
|------|--------|
| `src/screens/LoginScreen.tsx` | New — login page UI |
| `src/App.tsx` | Add auth gate — show LoginScreen if not authenticated |
| `src/components/CameraViewfinder.tsx` | Auto-start camera on mount if permission granted |
| `src/screens/SettingsScreen.tsx` | Add logout button, master password override |
| `src/context/AuthContext.tsx` | New — auth state management |
| `.env.example` | Add `VITE_MASTER_PASSWORD` |

---

## Open Questions

None — design approved.

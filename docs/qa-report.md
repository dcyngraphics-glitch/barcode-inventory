# Barcode Inventory PWA - QA Bug Report

**Test Date:** 2026-10-16  
**Target URL:** https://dcyngraphics-glitch.github.io/barcode-inventory/  
**Tester:** Automated QA (Playwright)  
**Test Duration:** ~15 minutes  

---

## Executive Summary

Comprehensive exploratory QA testing of the Barcode Inventory PWA revealed **9 issues** across multiple severity levels. The most critical findings include a **broken sync functionality** (runtime error when entering valid email) and **missing seeded products** (inventory shows empty on first login). The app's core navigation and login flow work correctly, but several key features are non-functional.

### Key Findings

| Severity | Count | Key Issues |
|----------|-------|------------|
| Critical | 2 | Sync broken, Seeded products missing |
| High | 2 | Cashier mode toggle broken, Logout broken |
| Medium | 2 | Theme switching limited, React rendering error |
| Low | 3 | Canvas warning, Small touch targets, Small fonts |
| **Total** | **9** | |

---

## Issues Found

### Issue 1: Sync Functionality Broken — Runtime Error

- **Severity:** Critical
- **Category:** Sync
- **Description:** When entering a valid email address in the Sync section and clicking "Send Login Code", the app throws a runtime error: `Cannot read properties of null (reading 'databaseUrl')`. This completely prevents users from syncing their inventory across devices.
- **Steps to Reproduce:**
  1. Login with master password
  2. Navigate to Settings
  3. Scroll to SYNC section
  4. Enter a valid email address (e.g., test@example.com)
  5. Click "Send Login Code"
  6. Observe error in console and on page
- **Expected:** Login code should be sent to the email address, or a proper error message should be displayed
- **Actual:** Runtime error `Cannot read properties of null (reading 'databaseUrl')` is thrown; sync feature is completely non-functional
- **Screenshot:** `screenshots/t5-sync-flow.png`
- **Console Error:** `TypeError: Cannot read properties of null (reading 'databaseUrl')`

---

### Issue 2: Inventory Shows Empty Instead of Seeded Products

- **Severity:** Critical
- **Category:** Inventory
- **Description:** On first login, the Inventory screen displays "Your inventory is empty" with a "Scan your first product to get started" message. The app should show seeded/demo products to help users understand the interface and functionality.
- **Steps to Reproduce:**
  1. Login with master password (first time)
  2. Navigate to Inventory screen
  3. Observe empty state message
- **Expected:** Inventory should display seeded products with names, quantities, expiry dates, and other details
- **Actual:** Empty state message shown; no products are pre-loaded
- **Screenshot:** `screenshots/t3-inventory.png`
- **Impact:** First-time users cannot explore the app's features without manually adding products

---

### Issue 3: Cashier Mode Toggle Non-Functional

- **Severity:** High
- **Category:** Settings
- **Description:** The Cashier Mode toggle in Settings does not change state when clicked. Both Push Notifications and Cashier Mode toggles remain in the 'false' state after clicking, indicating the toggle mechanism is broken.
- **Steps to Reproduce:**
  1. Navigate to Settings
  2. Locate "Cashier Mode" toggle under SCANNER section
  3. Click the toggle
  4. Observe that the toggle state does not change
- **Expected:** Toggle should switch between on/off states, enabling/disabling cashier mode
- **Actual:** Toggle state remains unchanged after click; no visual feedback
- **Screenshot:** `screenshots/t7-cashier-mode.png`

---

### Issue 4: Logout Button Non-Functional

- **Severity:** High
- **Category:** Authentication
- **Description:** The "Log Out" button in Settings does not return the user to the login page. After clicking, the user remains on the Settings screen, making it impossible to log out and log back in with a different account.
- **Steps to Reproduce:**
  1. Navigate to Settings
  2. Scroll to SECURITY section
  3. Click "Log Out"
  4. Observe that the user remains on Settings screen
- **Expected:** User should be returned to the login screen, requiring re-authentication
- **Actual:** No navigation occurs; user stays on current screen
- **Screenshot:** `screenshots/t9-logout-login.png`

---

### Issue 5: Theme Switching Limited — No Light/Dark Options

- **Severity:** Medium
- **Category:** Settings
- **Description:** The Theme setting only shows "Theme: Auto" as a single button/label. There are no visible options to switch between Light, Dark, or Auto modes. Users cannot manually select their preferred theme.
- **Steps to Reproduce:**
  1. Navigate to Settings
  2. Locate APPEARANCE section
  3. Observe only "Theme: Auto" is displayed
- **Expected:** Theme selector should offer Light, Dark, and Auto options
- **Actual:** Only "Auto" is shown; no theme switching capability
- **Screenshot:** `screenshots/t6-theme.png`

---

### Issue 6: React Rendering Error — removeChild NotFoundError

- **Severity:** Medium
- **Category:** Console/Runtime
- **Description:** A React rendering error occurs: `NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.` This indicates a DOM manipulation issue in the React component lifecycle, likely related to overlay/modal cleanup.
- **Steps to Reproduce:**
  1. Complete login flow
  2. Navigate between screens
  3. Observe console for errors
- **Expected:** No runtime errors during normal navigation
- **Actual:** NotFoundError thrown during component unmounting
- **Console Error:** `NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.`

---

### Issue 7: Canvas2D Performance Warning

- **Severity:** Low
- **Category:** Performance
- **Description:** The browser logs a Canvas2D performance warning: "Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true." This affects barcode scanning performance.
- **Steps to Reproduce:**
  1. Navigate to Scanner screen
  2. Observe console warnings
- **Expected:** Canvas should be created with `willReadFrequently: true` for better performance
- **Actual:** Warning logged; potential performance degradation during barcode scanning
- **Console Warning:** `Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true.`

---

### Issue 8: Small Touch Targets on Mobile Viewport

- **Severity:** Low
- **Category:** Mobile/Accessibility
- **Description:** On mobile viewport (390x844), 3 touch targets were found to be smaller than the WCAG recommended 44x44px minimum. This affects usability on touch devices.
- **Steps to Reproduce:**
  1. Set viewport to 390x844 (iPhone 12 Pro)
  2. Complete login flow
  3. Check touch target sizes
- **Expected:** All interactive elements should be at least 44x44px
- **Actual:** 3 elements found below minimum size (smallest: 24px height)
- **Details:**
  - "Got it" button: 36px height
  - Icon element: 24px width
  - Icon element: 24px height
- **Screenshot:** `screenshots/10-mobile-viewport.png`

---

### Issue 9: Small Font Sizes on Mobile Viewport

- **Severity:** Low
- **Category:** Mobile/Accessibility
- **Description:** On mobile viewport, 7 text elements were found with font sizes smaller than 12px, which may cause readability issues.
- **Steps to Reproduce:**
  1. Set viewport to 390x844 (iPhone 12 Pro)
  2. Complete login flow
  3. Check font sizes of all text elements
- **Expected:** All text should be at least 12px for readability
- **Actual:** 7 elements found with font sizes 10-11px
- **Details:**
  - "Mode" text: 11px
  - "Auto" text: 10px
  - "Manual" text: 10px
  - "Got it" text: 11px
  - "Scan" text: 11px
- **Screenshot:** `screenshots/10-mobile-viewport.png`

---

## Console Errors Summary

| # | Type | Message |
|---|------|---------|
| 1 | Warning | Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true |
| 2 | Error | NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node |
| 3 | Page Error | Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node |

---

## Test Coverage

| Feature | Status | Notes |
|---------|--------|-------|
| Login Screen | ✅ Pass | Password input works, error message shown for wrong password |
| Tutorial Overlay | ✅ Pass | Appears on first login, can be skipped |
| Main Navigation | ✅ Pass | Bottom nav with Scan, Inventory, Settings works |
| Inventory Screen | ❌ Fail | Shows empty instead of seeded products |
| Settings Screen | ⚠️ Partial | Most settings present, but toggles non-functional |
| Sync Section | ❌ Fail | Runtime error prevents sync |
| Scanner Screen | ✅ Pass | Camera elements present, permission handling works |
| Cashier Mode | ❌ Fail | Toggle does not change state |
| Theme Switching | ⚠️ Partial | Only "Auto" option visible |
| Export/Delete | ✅ Pass | Buttons present and functional |
| Logout | ❌ Fail | Does not return to login page |
| Console Errors | ❌ Fail | 2 errors detected |
| Mobile Viewport | ⚠️ Partial | No horizontal overflow, but small touch targets and fonts |
| Edge Cases | ✅ Pass | Rapid navigation works |

---

## Screenshots

| # | Name | Path |
|---|------|------|
| 1 | Login Screen | `screenshots/01-login-screen.png` |
| 2 | After Permission Dismiss | `screenshots/01b-after-permission.png` |
| 3 | Tutorial | `screenshots/02-tutorial.png` |
| 4 | Main Navigation | `screenshots/03-main-navigation.png` |
| 5 | Inventory Screen | `screenshots/04-inventory-screen.png` |
| 6 | Settings Screen | `screenshots/05-settings-screen.png` |
| 7 | Scanner Screen | `screenshots/07-scanner-screen.png` |
| 8 | Cashier Mode | `screenshots/08-cashier-mode.png` |
| 9 | Mobile Viewport | `screenshots/10-mobile-viewport.png` |
| 10 | Invalid Password | `screenshots/t1-invalid-password.png` |
| 11 | After Login | `screenshots/t2-after-login.png` |
| 12 | Inventory (Empty) | `screenshots/t3-inventory.png` |
| 13 | Settings (Full) | `screenshots/t4-settings.png` |
| 14 | Sync Flow | `screenshots/t5-sync-flow.png` |
| 15 | Theme | `screenshots/t6-theme.png` |
| 16 | Cashier Mode Toggle | `screenshots/t7-cashier-mode.png` |
| 17 | Export/Delete | `screenshots/t8-export-delete.png` |
| 18 | Logout/Login | `screenshots/t9-logout-login.png` |

---

## Recommendations

### Immediate (Critical)
1. **Fix Sync Functionality:** Investigate the `databaseUrl` null reference error. The sync service configuration appears to be missing or improperly initialized.
2. **Add Seeded Products:** Implement product seeding on first login to demonstrate app functionality and help users learn the interface.

### High Priority
3. **Fix Cashier Mode Toggle:** Debug the toggle state management. The click handler may not be properly updating the component state.
4. **Fix Logout Functionality:** Ensure the logout action properly clears authentication state and navigates to the login screen.

### Medium Priority
5. **Implement Theme Switching:** Add Light and Dark theme options to the theme selector.
6. **Fix React Rendering Error:** Investigate the `removeChild` NotFoundError, likely related to overlay/modal cleanup in React.

### Low Priority
7. **Optimize Canvas Performance:** Add `willReadFrequently: true` to Canvas2D context creation.
8. **Improve Mobile Touch Targets:** Increase touch target sizes to meet WCAG 44x44px minimum.
9. **Increase Mobile Font Sizes:** Ensure all text is at least 12px for readability.

---

## Technical Details

- **Browser:** Chromium (Headless)
- **Viewport:** 1280x720 (Desktop), 390x844 (Mobile)
- **Test Framework:** Playwright Python
- **Test Duration:** ~15 minutes
- **Total Screenshots:** 18
- **Total Console Errors:** 3 (1 warning, 2 errors)

---

*Report generated by automated QA testing on 2026-10-16*

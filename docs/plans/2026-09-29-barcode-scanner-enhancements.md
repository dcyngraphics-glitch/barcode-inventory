# Barcode Scanner App Enhancements Plan

**Date:** 2026-09-29  
**Feature:** Auto‑scan toggle, graceful manual‑entry on lookup failure, UI flow changes, and product detail improvements.

## Tasks

Each task is sized for 2‑5 minutes (write test → red → implement → green → commit).

### 1. Auto‑start scanner on Scan screen focus
- [ ] Write test: ScanScreen should start scanner on `useEffect` when tab becomes active.
- [ ] See test fail (red).
- [ ] Implement: Add `useEffect` that calls `startScanning()` on focus and `stopScanning()` on blur, with a flag to stop after first successful scan.
- [ ] See test pass (green).
- [ ] Commit: `feat: scanner auto‑starts on Scan screen focus and stops after first scan`.

### 2. Add Auto/Manual scan toggle
- [ ] Write test: ScanScreen header renders a toggle; toggling changes mode state.
- [ ] See test fail.
- [ ] Implement: Add state `scanMode` ('auto' | 'manual'); UI toggle (e.g., Switch). In auto mode, scanner runs as in task 1; in manual mode, scanner starts but only processes a scan when user presses the "Scan" button.
- [ ] See test pass.
- [ ] Commit: `feat: Add Auto/Manual scan toggle to Scan screen header`.

|### 3. Modify product lookup service to handle 404 gracefully
|- [x] Write test: `lookupProduct` returns `{ success: false, reason: 'not-found' }` on HTTP 404 instead of throwing.
|- [x] See test fail.
|- [x] Implement: In `productService.ts`, catch 404 and return a special object; adjust callers to check for this.
|- [x] See test pass.
|- [x] Commit: `feat: product lookup service returns lookup‑failed result on 404`.

### 4. Show manual entry modal on lookup failure
- [ ] Write test: When lookup fails, ProductDetailsScreen renders a modal with pre‑filled barcode, brand, name, price, quantity fields.
- [ ] See test fail.
- [ ] Implement: In the screen that receives lookup result, if result indicates not‑found, show a modal/form with fields pre‑filled (brand, name, price, quantity editable; barcode read‑only). Include Save button.
- [ ] See test pass.
- [ ] Commit: `feat: Show manual entry modal when product lookup fails`.

### 5. Save manually entered product
- [ ] Write test: Submitting the manual entry form calls inventory add endpoint with barcode, brand, name, price, quantity.
- [ ] See test fail.
- [ ] Implement: On form submit, call `/api/inventory/add` (or equivalent) with the payload; on success, close modal and navigate to product details; on error, show alert.
- [ ] See test pass.
- [ ] Commit: `feat: Allow saving product from manual entry form`.

### 6. Remove Category field from Edit product form
- [ ] Write test: EditProductScreen no longer renders a Category input.
- [ ] See test fail.
- [ ] Implement: Remove Category field from the form and any related state/validation.
- [ ] See test pass.
- [ ] Commit: `feat: Remove Category field from Edit product form`.

### 7. Show saved product details for easy update
- [ ] Write test: After saving a product (lookup success or manual entry), the ProductDetailsScreen displays the saved values (brand, name, price, quantity, expiry if any).
- [ ] See test fail.
- [ ] Implement: Ensure the screen reads the saved product from state or props (passed from the save flow) and renders them in read‑only or edit mode as appropriate.
- [ ] See test pass.
- [ ] Commit: `feat: Product details screen shows saved product data for quick update`.

### 8. Change navigation: Inventory tab product click → edit details; Scan tab shows recent scans
- [ ] Write test: Clicking a product row in Inventory tab navigates to ProductDetailsScreen in edit mode; Scan tab renders a list of recent scans (timestamp, barcode) with a button to view details.
- [ ] See test fail.
- [ ] Implement: Modify Inventory tab to use `navigate('ProductDetails', { productId, edit: true })` on item press. Modify Scan tab to maintain a list of recent scans (limited to e.g., 20) and render each as a pressable item that navigates to ProductDetailsScreen (view‑only or edit as desired).
- [ ] See test pass.
- [ ] Commit: `feat: Inventory tab clicking product opens edit details; Scan tab shows recent scans`.

### 9. Auto‑fill name, brand, suggested price, expiry from lookup when available
- [ ] Write test: When lookup succeeds, the scanner UI (or product details) auto‑populates name, brand, suggested retail price, and expiry date if present in the response.
- [ ] See test fail.
- [ ] Implement: In scan flow, after successful barcode read and lookup, store the returned fields; pre‑fill the relevant inputs; if any field missing, leave blank for user to enter.
- [ ] See test pass.
- [ ] Commit: `feat: Auto‑fill product fields from lookup response when available`.

### 10. Write unit tests for new behavior
- [ ] Write tests for scanner auto‑start/stop, toggle persistence, lookup‑failed handling, manual entry save, navigation changes, and field auto‑fill.
- [ ] See tests fail initially.
- [ ] Implement code to satisfy tests.
- [ ] See all tests pass.
- [ ] Commit: `test: Add unit tests for barcode scanner enhancements`.

### 11. Ensure existing tests still pass
- [ ] Run full test suite.
- [ ] See any failures and fix if needed (should be none if TDD followed).
- [ ] Commit: `chore: Verify existing tests pass after enhancements`.

### 12. Final commit and push
- [ ] Commit all changes with a descriptive message.
- [ ] Push to repository.

## Verification

- Manual QA: Launch app, verify scanner auto‑starts on Scan tab, toggle works, manual entry flow saves product, category removed, navigation works as specified, product details show saved data.
- Automated: All unit and integration tests pass.

---
*Plan written using the writing‑plans skill.*
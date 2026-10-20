# Barcode Scanner App — App Flow & Navigation Audit

> **SUPERSEDED 2026-10-20.** Replaced by `docs/plans/2026-10-19-shop-sell-modes-design.md`.
>
> The original audit is in git history (the revision before this commit). It is not
> reproduced here because two of its central premises were wrong, and keeping them —
> even clearly marked as historical — risks a later reader acting on them.

## Why it was superseded

**1. It audited a "Seller Mode" that never existed.** The Core Flows section lists a
third mode — "Seller Mode — Edit product details before adding to inventory" — and
two of its headline recommendations propose UI for it. There is no Seller Mode
anywhere in the codebase: no screen, no route, no setting. It was never built.

**2. Its mode model has been replaced.** The audit assumes `settings.cashierMode` — an
account-wide boolean synced by Dexie Cloud — drove routing, navigation and scanner
behaviour. That is no longer how the app works:

| Audit's model | Current model |
|---|---|
| `settings.cashierMode`, synced to every device on the account | `ModeContext`, device-local in `localStorage`, seeded once from the old field |
| Toggled only from Settings | Always-visible Shop / Sell switcher in the app bar |
| No on-screen mode indicator | Current mode always visible; one tap to switch |
| `/sales` silently redirected the user away in Shop | Offers a one-tap "Switch to Sell" instead |
| Switching out of cashier destroyed the basket silently | Warns first: Keep basket / Clear and switch |
| Bottom nav: 3 tabs, plus Sales in cashier | 3 tabs in Shop, 4 in Sell |

**3. The danger is that it still reads as accurate.** Its Strengths section is largely
still true, so a reader skimming it gets no signal that the mode analysis underneath
is fiction.

## What remains valid

The positive findings still hold: bottom navigation persists across authenticated
screens with the active route highlighted; error states and empty states are handled;
the camera permission flow explains itself; and the PWA install promotion is
contextually triggered rather than shown on arrival.

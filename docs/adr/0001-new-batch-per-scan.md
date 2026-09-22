# ADR 0001: New Batch Per Scan

## Status
Accepted

## Context
When a user scans the same product multiple times (e.g., Pringles bought in separate grocery runs), the system needs to decide whether to merge them into one inventory entry or keep them separate.

## Decision
Every scan creates a new **batch** — a separate inventory entry with its own expiry date and quantity. Scanning the same product twice results in two independent batches.

## Consequences
- **Positive**: Enables FIFO tracking — older batches (earlier expiry) are surfaced first, so the user knows which items to consume before newer ones.
- **Positive**: Accurate expiry alerts per batch; a new purchase doesn't reset the clock on old stock.
- **Negative**: More inventory entries to manage; the same product appears multiple times in the list (grouped by product, sorted by expiry within each group).
- **Mitigation**: Inventory view groups by product and sorts batches by expiry date, so the user sees "Pringles — 3 batches, 1 expiring soon" at a glance.

## Alternatives Considered
- **Merge into existing batch**: Simpler inventory, but loses per-batch expiry tracking — old and new stock would share one expiry date, defeating the purpose of expiry notifications.

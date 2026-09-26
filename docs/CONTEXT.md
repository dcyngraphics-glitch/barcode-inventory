# CONTEXT.md — Barcode Inventory

## Project
A cellphone PWA that scans product barcodes (like a supermarket scanner),
looks up product info, and tracks scanned items in an inventory with expiry
notifications.

## Technology
- **Stack**: PWA with React
- **Storage**: Local (IndexedDB / localStorage) for product catalog and inventory
- **Barcode**: Camera-based scanning (Barcode Detection API / @zxing/library)
- **Data source**: Hybrid — local catalog first, free barcode API fallback when online

## Domain Terms

| Term | Definition |
|------|-----------|
| **Product** | An item identified by a barcode; has name, brand, price, category |
| **Barcode** | Unique identifier (EAN/UPC) assigned to a product |
| **Catalog** | The local product database; stores known products |
| **Inventory** | The user's scanned collection; tracks what was scanned, when, and quantity |
| **Expiry Alert** | A notification triggered when an item is near or past its expiry date |
| **API Lookup** | Querying an external barcode service to auto-fill product info |
| **Offline Mode** | App functions without internet using only local catalog data |
| **Store Price** | The user-set price for a product; overrides any API/default price; persists per product |
| **Batch** | A single scan event; one unit of a product with its own expiry date and quantity |
| **FIFO** | First In, First Out — older batches (earlier expiry) shown/consumed before newer ones |
| **Alert Window** | Configurable number of days before expiry when notifications fire (default: 3) |
| **Scan Quantity** | Number of units added per scan; defaults to 1, user can override before saving |
| **New Batch Per Scan** | Every scan creates a separate inventory entry; same product scanned twice = two batches with independent expiry dates and quantities |

## Relationships

- A **Product** has one **Barcode** (1:1)
- The **Catalog** stores many **Products**
- The **Inventory** contains **Batches** referencing **Products**
- Each **Batch** has a quantity, scan date, and expiry date
- **API Lookup** populates the **Catalog** when a barcode isn't found locally
- **Batches** are sorted by **FIFO** (earliest expiry first) within each **Product** group
- **Expiry Alerts** fire per **Batch** when within the **Alert Window** or past expiry

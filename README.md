# Barcode Inventory

A Progressive Web App (PWA) for scanning barcodes and managing personal inventory with expiry tracking.

## Features

- Scan barcodes using device camera (Barcode Detection API) with fallback to ZXing library
- Look up products via Open Food Facts API (no API key required)
- Store product catalog and inventory locally using IndexedDB
- Track multiple batches of the same product with FIFO sorting
- Configure expiry notifications (default: 3 days before expiry)
- Works offline (PWA)
- Installable on Android/iOS/home screen

## Tech Stack

- React + Vite
- TypeScript
- IndexedDB (via idb library)
- Vite PWA plugin (Workbox)
- Open Food Facts API

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Build for production: `npm run build`

## Environment

This application does not require any API keys or secrets. All product data is fetched from the public Open Food Facts API.

## License

MIT
import Dexie from 'dexie';
import dexieCloud from 'dexie-cloud-addon';
import type { Batch, Settings, Sale } from '@/types';

// Read environment variables for Dexie Cloud configuration
const syncUrl = import.meta.env.VITE_DEXIE_CLOUD_SYNC_URL;
const databaseName = (globalThis as any).__DB_NAME__ || import.meta.env.VITE_DEXIE_CLOUD_DATABASE_NAME || 'barcode-inventory';
console.log(`[dexie] Using database name: ${databaseName}`);

// Define the database interface
interface BarcodeInventoryDB {
  catalog: Dexie.Table<'catalog', string>;
  inventory: Dexie.Table<'inventory', Batch>;
  settings: Dexie.Table<'settings', Settings>;
  sales: Dexie.Table<'sale', Sale>;
}

// Create a Dexie instance with Dexie Cloud addon (Dexie 4.x API)
const db = new Dexie<BarcodeInventoryDB>(databaseName, { addons: [dexieCloud] });
console.log(`[dexie] Dexie instance created for ${databaseName}`);

// Define the database schema (Dexie 4.x syntax: & = primary key, field = index)
db.version(10).stores({
  catalog: '&barcode, name',
  inventory: '&batchId, barcode, expiryDate',
  settings: '&id',
  sales: '&saleId, dayKey'
});
console.log(`[dexie] Schema defined with version 10`);

// Configure Dexie Cloud if sync URL is provided (skip in test environment)
if (syncUrl && !import.meta.env.VITEST) {
  db.cloud.configure({
    databaseUrl: syncUrl,
    requireAuth: true,
  });
  console.log(`[dexie] Dexie Cloud configured with syncUrl: ${syncUrl}`);
}

export default db;

import Dexie from 'dexie';
import { DexieCloudProvider } from 'dexie-cloud-addon';

// Read environment variables for Dexie Cloud configuration
const syncUrl = import.meta.env.VITE_DEXIE_CLOUD_SYNC_URL;
const databaseName = import.meta.env.VITE_DEXIE_CLOUD_DATABASE_NAME || 'barcode-inventory';

// Create a Dexie instance
const db = new Dexie(databaseName);

// Define the database schema
db.version(2).stores({
  catalog: '&barcode, name',
  inventory: '&batchId, barcode, expiryDate',
  settings: '&id',
  sales: '&saleId, dayKey'
});

// Add the Dexie Cloud addon if syncUrl is provided
if (syncUrl) {
  db.addons.add(DexieCloudProvider, {
    syncUrl,
    databaseName
  });
}

export default db;

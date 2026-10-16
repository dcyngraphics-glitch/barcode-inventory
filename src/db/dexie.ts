import Dexie from 'dexie';
import dexieCloud from 'dexie-cloud-addon';
import type { Batch, Settings, Sale } from '@/types';

// --- Build-time sync config -------------------------------------------------
// Vite inlines import.meta.env at BUILD time, so these values must exist when the
// bundle is compiled — not when it runs. .env is gitignored and the GitHub Pages
// workflow never had these vars, so on CI `syncUrl` was undefined, the bundler folded
// `if (syncUrl)` to false and deleted the entire configure() block below. db.cloud.options
// then stayed null and login crashed with the opaque
//   "Cannot read properties of null (reading 'databaseUrl')"
// (thrown from the addon's authenticate(): `db.cloud.options.databaseUrl`).
//
// The sync URL is public by design — it is embedded in the client bundle of a public
// site either way — so keeping it as a fallback is safe, and a missing env var can no
// longer silently disable sync. The env var still wins when present.
const DEFAULT_SYNC_URL = 'https://zo7vbabeq.dexie.cloud';
const DEFAULT_DATABASE_NAME = 'barcode-inventory';

const env = import.meta.env;
const syncUrl = (env.VITE_DEXIE_CLOUD_SYNC_URL as string | undefined)?.trim() || DEFAULT_SYNC_URL;

// Local IndexedDB name. Must stay stable: changing it points at a brand-new database
// and orphans everything already stored on the device.
const databaseName =
  (globalThis as any).__DB_NAME__ ||
  (env.VITE_DEXIE_CLOUD_DATABASE_NAME as string | undefined)?.trim() ||
  DEFAULT_DATABASE_NAME;

console.log(`[dexie] Using database name: ${databaseName}`);

// Define the database interface
interface BarcodeInventoryDB {
  catalog: Dexie.Table<'catalog', string>;
  inventory: Dexie.Table<'inventory', Batch>;
  settings: Dexie.Table<'settings', Settings>;
  sales: Dexie.Table<'sale', Sale>;
}

// Create a Dexie instance with the Dexie Cloud addon (Dexie 4.x API).
// The addon is not registered under Vitest: it stamps every written row with
// `owner`/`realmId` cloud metadata and injects a `_hasBlobRefs` index into every
// table. That is infrastructure noise which leaks into unit tests asserting on stored
// shapes, so tests get a plain Dexie database instead.
const addons = env.VITEST ? [] : [dexieCloud];
const db = new Dexie<BarcodeInventoryDB>(databaseName, { addons });
console.log(`[dexie] Dexie instance created for ${databaseName}`);

// Define the database schema (Dexie 4.x syntax: & = primary key, field = index)
db.version(10).stores({
  catalog: '&barcode, name',
  inventory: '&batchId, barcode, expiryDate',
  settings: '&id',
  sales: '&saleId, dayKey'
});
console.log(`[dexie] Schema defined with version 10`);

// Configure Dexie Cloud. Skipped under Vitest so the addon never touches
// fake-indexeddb (the fallback URL above would otherwise make this always truthy).
if (!env.VITEST) {
  try {
    if (db.cloud) {
      db.cloud.configure({
        databaseUrl: syncUrl,
        // Deliberately false. requireAuth:true blocks every db call until the user
        // authenticates on first launch, which would lock the whole app behind a login
        // prompt. Login stays opt-in via Settings → Sync and the app keeps working
        // offline for users who never sign in — db.cloud.login() is the documented
        // opt-in path for requireAuth:false.
        requireAuth: false,
      });
      console.log(`[dexie] Dexie Cloud configured with syncUrl: ${syncUrl}`);
    } else {
      console.warn('[dexie] Dexie Cloud addon not initialized — sync disabled');
    }
  } catch (err) {
    console.error('[dexie] Failed to configure Dexie Cloud:', err);
  }
}

/**
 * True when the cloud addon is present AND configure() has run. Callers use this to
 * report "sync unavailable" instead of surfacing an addon-internal TypeError.
 */
export function isSyncConfigured(): boolean {
  return Boolean((db as any).cloud?.options);
}

export default db;

import Dexie from 'dexie';
import dexieCloud from 'dexie-cloud-addon';
import type { Batch, Product, Settings, Sale } from '@/types';

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

/**
 * Local IndexedDB name, carrying a schema-generation suffix.
 *
 * v11 changed the SHAPE of two primary keys (catalog: barcode -> productId, settings:
 * 'settings' -> '#settings'). IndexedDB cannot change a primary key in place, and
 * Dexie refuses rather than silently dropping data: opening an existing v10 database
 * at v11 throws UpgradeError("Not yet support for changing primary key"), which would
 * have hard-failed the app on every device that already had data.
 *
 * A new name sidesteps the upgrade completely — the v10 database is left behind on
 * disk and never opened again, which IS the approved wipe. The CLOUD database is
 * identified by its URL, not by this name, so sync is unaffected.
 *
 * Never revert this to 'barcode-inventory': that name holds a v10 database.
 */
export const DEFAULT_DATABASE_NAME = 'barcode-inventory-v2';

const env = import.meta.env;
const syncUrl = (env.VITE_DEXIE_CLOUD_SYNC_URL as string | undefined)?.trim() || DEFAULT_SYNC_URL;

// Local IndexedDB name. Must stay stable: changing it points at a brand-new database
// and orphans everything already stored on the device.
const databaseName =
  (globalThis as any).__DB_NAME__ ||
  (env.VITE_DEXIE_CLOUD_DATABASE_NAME as string | undefined)?.trim() ||
  DEFAULT_DATABASE_NAME;

console.log(`[dexie] Using database name: ${databaseName}`);

// Define the database interface.
// Row type comes first, key type second: Dexie.Table<Entity, Key>. Passing the table
// NAME as the row type (as this did) type-checks the constructor but makes every
// query resolve to a string, so `db.products.toArray()` yielded 'products'[].
interface BarcodeInventoryDB {
  products: Dexie.Table<Product, string>;
  inventory: Dexie.Table<Batch, string>;
  settings: Dexie.Table<Settings, string>;
  sales: Dexie.Table<Sale, string>;
}

// Create a Dexie instance with the Dexie Cloud addon (Dexie 4.x API).
// The addon is not registered under Vitest: it stamps every written row with
// `owner`/`realmId` cloud metadata and injects a `_hasBlobRefs` index into every
// table. That is infrastructure noise which leaks into unit tests asserting on stored
// shapes, so tests get a plain Dexie database instead.
const addons = env.VITEST ? [] : [dexieCloud];
// Dexie 4's constructor takes no type argument (TS2558), so the table interface is
// asserted onto the instance instead. Without this every `db.products` / `db.inventory`
// access was a TS2339 "Property does not exist on type 'Dexie'" — 51 of the project's
// 56 type errors. The `& Dexie` half keeps the addon's `db.cloud` augmentation.
const db = new Dexie(databaseName, { addons }) as Dexie & BarcodeInventoryDB;
console.log(`[dexie] Dexie instance created for ${databaseName}`);

// Define the database schema (Dexie 4.x syntax: & = primary key, field = index)
db.version(12).stores({
  // Keyed by productId ('#' + barcode), NOT by the barcode itself: barcodes are shared
  // real-world identifiers, so two accounts scanning the same product would otherwise
  // produce the same primary key. See utils/privateId.ts.
  //
  // The table is named `products`, not `catalog`, and that name is load-bearing.
  // Dexie Cloud records a table's primary key at first sync and then refuses to change
  // it — 422 "Illegal to change primary key" — and it keeps that key even after the
  // table is deleted, so re-registering or re-importing cannot fix it either. The cloud
  // database registered `catalog` as keyed by `barcode` back when that was true, which
  // silently rejected every sync once the key became productId. A name the server has no
  // memory of registers cleanly. NEVER rename this back to `catalog`.
  products: '&productId, barcode, name',
  catalog: null, // dropped: the cloud's `catalog` is permanently keyed by `barcode`
  inventory: '&batchId, barcode, expiryDate',
  settings: '&id', // id is '#settings' — a private singleton, one per account
  sales: '&saleId, dayKey'
});
// No .upgrade() here, and there never can be one for a primary-key change: IndexedDB
// cannot alter a key path in place. The fresh database name above is the wipe. Swapping
// `catalog` for `products` needs no rename — a different table name is an ordinary
// schema change, so the local database (and the signed-in session inside it) survives.
console.log(`[dexie] Schema defined with version 12`);

// Configure Dexie Cloud. Skipped under Vitest so the addon never touches
// fake-indexeddb (the fallback URL above would otherwise make this always truthy).
if (!env.VITEST) {
  try {
    if (db.cloud) {
      db.cloud.configure({
        databaseUrl: syncUrl,
        // Deliberately false. requireAuth:true blocks every db call until the user
        // authenticates on first launch; the gate lives in React instead (AuthGate in
        // App.tsx), so a signed-out user gets a sign-in screen rather than a database
        // that silently hangs.
        requireAuth: false,
        // The app renders the login prompts itself from db.cloud.userInteraction
        // (see components/UserInteractionPrompt.tsx), so they carry this app's styling.
        // Without this the addon injects its own generic dialog on top of the UI.
        customLoginGui: true,
      });
      console.log(`[dexie] Dexie Cloud configured with syncUrl: ${syncUrl}`);
    } else {
      console.warn('[dexie] Dexie Cloud addon not initialized — sync disabled');
    }
  } catch (err) {
    console.error('[dexie] Failed to configure Dexie Cloud:', err);
  }
}

export default db;

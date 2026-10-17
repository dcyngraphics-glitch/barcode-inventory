import type { Product } from '@/types';
import { PH_GROCERY_SEED } from '@/data/phGrocerySeed';
import { productIdFor } from '@/utils/privateId';
import { getAllProducts } from '@/services/catalogService';
import { loadSettings, saveSettings } from '@/services/settingsService';
import { db } from '@/db/database';

const SEED_FLAG_KEY = 'catalogSeeded';

export async function seedCatalogIfEmpty(): Promise<void> {
  const settings = await loadSettings();

  // Check if already seeded using a dedicated flag in settings
  if (settings[SEED_FLAG_KEY]) {
    return;
  }

  // Check if catalog already has products
  const existing = await getAllProducts();
  if (existing.length > 0) {
    // Catalog has data, mark as seeded to skip future checks
    await saveSettings({ ...settings, [SEED_FLAG_KEY]: true });
    return;
  }

  // Seed all products using bulkPut for atomic, idempotent insertion
  const now = new Date().toISOString();
  const products: Product[] = PH_GROCERY_SEED.map((seed) => ({
    // Deterministic per-account key: seeding on a second device produces identical
    // keys, so bulkPut converges instead of duplicating rows.
    productId: productIdFor(seed.barcode),
    barcode: seed.barcode,
    name: seed.name,
    brand: seed.brand,
    category: seed.category,
    storePrice: seed.storePrice,
    defaultExpiry: seed.defaultExpiry,
    source: 'local',
    createdAt: now,
    updatedAt: now,
  }));

  // bulkPut on an object store with keyPath 'barcode' automatically upserts
  await db.catalog.bulkPut(products);

  // Mark as seeded — wrap in try/catch so a settings failure doesn't
  // leave the catalog unmarked (catalog is already seeded at this point)
  try {
    await saveSettings({ ...settings, [SEED_FLAG_KEY]: true });
  } catch (err) {
    console.warn('Failed to persist seed flag (catalog is already seeded):', err);
  }
}

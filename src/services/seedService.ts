import type { Product } from '@/types';
import { PH_GROCERY_SEED, type SeedProduct } from '@/data/phGrocerySeed';
import { saveProduct, getAllProducts } from '@/services/catalogService';
import { loadSettings, saveSettings } from '@/services/settingsService';

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
  
  // Seed all products
  const now = new Date().toISOString();
  const seedProducts: Product[] = PH_GROCERY_SEED.map((seed: SeedProduct) => ({
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
  
  for (const product of seedProducts) {
    await saveProduct(product);
  }
  
  // Mark as seeded
  await saveSettings({ ...settings, [SEED_FLAG_KEY]: true });
}

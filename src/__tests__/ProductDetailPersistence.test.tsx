import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { resetDB } from '@/db/database';
import { saveProduct, getProduct, updateProduct } from '@/services/catalogService';

describe('product name/brand persistence', () => {
  beforeEach(async () => { resetDB(); });

  it('persists an edited name and brand', async () => {
    const now = new Date().toISOString();
    await saveProduct({
      barcode: 'P1', name: 'Original', brand: 'OrigBrand', category: '',
      storePrice: 10, defaultExpiry: '', source: 'manual', createdAt: now, updatedAt: now,
    });

    const existing = await getProduct('P1');
    await updateProduct({ ...existing!, name: 'Renamed', brand: 'NewBrand', updatedAt: now });

    const after = await getProduct('P1');
    expect(after!.name).toBe('Renamed');
    expect(after!.brand).toBe('NewBrand');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { getProduct, getAllProducts, saveProduct, deleteProduct, updateProduct, searchProducts } from '../services/catalogService';
import { db } from '../db/database';
import type { Product } from '../types';

const mockProduct: Product = {
  barcode: '1234567890123',
  name: 'Test Product',
  brand: 'Test Brand',
  category: 'Test Category',
  storePrice: 9.99,
  defaultExpiry: '2026-12-31',
  source: 'local',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('catalogService', () => {
  beforeEach(async () => {
    await db.table('catalog').clear();
    await db.table('inventory').clear();
    await db.table('settings').clear();
  });

  it('should save and retrieve a product', async () => {
    await saveProduct(mockProduct);
    const retrieved = await getProduct(mockProduct.barcode);
    expect(retrieved).toMatchObject(mockProduct);
    // The row is keyed by the per-account private ID, not the bare barcode.
    expect(retrieved!.productId).toBe('#1234567890123');
  });

  it('should return undefined for non-existent product', async () => {
    const retrieved = await getProduct('nonexistent');
    expect(retrieved).toBeUndefined();
  });

  it('should get all products', async () => {
    await saveProduct(mockProduct);
    const all = await getAllProducts();
    expect(all.length).toBeGreaterThan(0);
    expect(all.find(p => p.barcode === mockProduct.barcode)).toBeDefined();
  });

  it('should delete a product', async () => {
    await saveProduct(mockProduct);
    await deleteProduct(mockProduct.barcode);
    const retrieved = await getProduct(mockProduct.barcode);
    expect(retrieved).toBeUndefined();
  });

  it('should update an existing product and refresh updatedAt', async () => {
    await saveProduct(mockProduct);
    const updated = { ...mockProduct, name: 'Updated Name', storePrice: 12.5 };
    await updateProduct(updated);
    const retrieved = await getProduct(mockProduct.barcode);
    expect(retrieved!.name).toBe('Updated Name');
    expect(retrieved!.storePrice).toBe(12.5);
    expect(retrieved!.updatedAt).not.toBe(mockProduct.updatedAt);
  });

  it('should upsert when updating a non-existent product', async () => {
    const nonExistent: Product = { ...mockProduct, barcode: 'truly-nonexistent-999' };
    await updateProduct(nonExistent);
    const retrieved = await getProduct('truly-nonexistent-999');
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe(nonExistent.name);
    expect(retrieved!.barcode).toBe('truly-nonexistent-999');
  });

  it('should search products by name (case-insensitive, partial)', async () => {
    await saveProduct(mockProduct);
    await saveProduct({ ...mockProduct, barcode: '999', name: 'Another Item', brand: 'Other' });
    const results = await searchProducts('test');
    expect(results.length).toBe(1);
    expect(results[0]!.barcode).toBe(mockProduct.barcode);
  });

  it('should search products by brand (case-insensitive, partial)', async () => {
    await saveProduct(mockProduct);
    const results = await searchProducts('test brand');
    expect(results.length).toBe(1);
    expect(results[0]!.barcode).toBe(mockProduct.barcode);
  });

  it('should return empty array when no products match', async () => {
    await saveProduct(mockProduct);
    const results = await searchProducts('zzz-no-match');
    expect(results.length).toBe(0);
  });

  it('stores products under the private productId, not the bare barcode', async () => {
    await saveProduct({ ...mockProduct, barcode: '4801' });
    const rows = await db.catalog.toArray();
    expect(rows[0]!.productId).toBe('#4801');
    expect(rows[0]!.barcode).toBe('4801');
  });

  it('still finds a product by its plain barcode', async () => {
    await saveProduct({ ...mockProduct, barcode: '4802' });
    expect((await getProduct('4802'))?.barcode).toBe('4802');
  });

  it('deletes by plain barcode even though the key is private', async () => {
    await saveProduct({ ...mockProduct, barcode: '4803' });
    await deleteProduct('4803');
    expect(await getProduct('4803')).toBeUndefined();
  });
});

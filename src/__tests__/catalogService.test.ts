import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { getProduct, getAllProducts, saveProduct, deleteProduct, updateProduct, searchProducts } from '../services/catalogService';
import { getDB } from '../db/database';
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
    const db = await getDB();
    await db.clear('catalog');
    await db.clear('inventory');
    await db.clear('settings');
  });

  it('should save and retrieve a product', async () => {
    await saveProduct(mockProduct);
    const retrieved = await getProduct(mockProduct.barcode);
    expect(retrieved).toEqual(mockProduct);
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

  it('should throw when updating a non-existent product', async () => {
    const nonExistent: Product = { ...mockProduct, barcode: 'truly-nonexistent-999' };
    await expect(updateProduct(nonExistent)).rejects.toThrow();
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
});

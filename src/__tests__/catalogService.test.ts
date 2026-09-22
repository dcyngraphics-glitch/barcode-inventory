import { describe, it, expect } from 'vitest';
import { getProduct, getAllProducts, saveProduct, deleteProduct } from '../services/catalogService';
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
});

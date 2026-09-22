import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lookupProduct } from '../services/productLookupService';

describe('productLookupService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return product from Open Food Facts on success', async () => {
    const mockResponse = {
      status: 1,
      product: {
        product_name: 'Test Product',
        brands: 'Test Brand',
        categories: 'Test Category',
        image_front_url: 'https://example.com/image.jpg',
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await lookupProduct('1234567890123');
    expect(result.product.name).toBe('Test Product');
    expect(result.product.brand).toBe('Test Brand');
    expect(result.product.category).toBe('Test Category');
    expect(result.product.imageUrl).toBe('https://example.com/image.jpg');
    expect(result.product.source).toBe('openfoodfacts');
    expect(result.source).toBe('openfoodfacts');
  });

  it('should return manual placeholder when OFF returns not found', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 0 }),
    });

    const result = await lookupProduct('nonexistent');
    expect(result.product.source).toBe('manual');
    expect(result.product.barcode).toBe('nonexistent');
    expect(result.source).toBe('manual');
  });

  it('should return manual placeholder on HTTP error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const result = await lookupProduct('1234567890123');
    expect(result.product.source).toBe('manual');
  });

  it('should return manual placeholder on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const result = await lookupProduct('1234567890123');
    expect(result.product.source).toBe('manual');
  });

  it('should handle OFF response with missing fields', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 1, product: {} }),
    });

    const result = await lookupProduct('1234567890123');
    expect(result.product.name).toBe('');
    expect(result.product.brand).toBe('');
    expect(result.product.source).toBe('openfoodfacts');
  });
});

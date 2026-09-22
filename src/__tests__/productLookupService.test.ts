import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';

const { mockGetProduct } = vi.hoisted(() => ({
  mockGetProduct: vi.fn(),
}));

vi.mock('@/services/catalogService', () => ({
  getProduct: mockGetProduct,
}));

import { lookupOpenFoodFacts, lookupProduct } from '../services/productLookupService';

describe('productLookupService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('lookupOpenFoodFacts', () => {
    it('should return product data on successful lookup', async () => {
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

      const result = await lookupOpenFoodFacts('1234567890123');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Test Product');
      expect(result!.brand).toBe('Test Brand');
      expect(result!.category).toBe('Test Category');
      expect(result!.imageUrl).toBe('https://example.com/image.jpg');
      expect(result!.source).toBe('openfoodfacts');
      expect(result!.barcode).toBe('1234567890123');
    });

    it('should call the correct API endpoint', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 0 }),
      });

      await lookupOpenFoodFacts('9998887776665');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://world.openfoodfacts.org/api/v0/product/9998887776665.json'
      );
    });

    it('should return null on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await lookupOpenFoodFacts('1234567890123');
      expect(result).toBeNull();
    });

    it('should return null on HTTP error (non-ok response)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await lookupOpenFoodFacts('nonexistent');
      expect(result).toBeNull();
    });

    it('should return null when API returns status 0 (product not found)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 0 }),
      });

      const result = await lookupOpenFoodFacts('nonexistent');
      expect(result).toBeNull();
    });

    it('should return null when product field is missing', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 1 }),
      });

      const result = await lookupOpenFoodFacts('1234567890123');
      expect(result).toBeNull();
    });

    it('should handle response with missing optional fields', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 1, product: {} }),
      });

      const result = await lookupOpenFoodFacts('1234567890123');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('');
      expect(result!.brand).toBe('');
      expect(result!.category).toBe('');
      expect(result!.imageUrl).toBeUndefined();
      expect(result!.source).toBe('openfoodfacts');
    });

    it('should handle partial fields (name only)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 1,
          product: { product_name: 'Partial Product' },
        }),
      });

      const result = await lookupOpenFoodFacts('1234567890123');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Partial Product');
      expect(result!.brand).toBe('');
      expect(result!.category).toBe('');
      expect(result!.imageUrl).toBeUndefined();
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 1,
          product: { product_name: 'Test' },
        }),
      });

      const before = Date.now();
      const result = await lookupOpenFoodFacts('1234567890123');
      const after = Date.now();

      const createdTime = new Date(result!.createdAt).getTime();
      expect(createdTime).toBeGreaterThanOrEqual(before);
      expect(createdTime).toBeLessThanOrEqual(after);
      expect(result!.updatedAt).toBe(result!.createdAt);
    });
  });

  describe('lookupProduct', () => {
    it('should return local product when found in catalog', async () => {
      const localProduct = {
        barcode: '1234567890123',
        name: 'Local Product',
        brand: 'Local Brand',
        category: 'Local Category',
        storePrice: 5.99,
        defaultExpiry: '2025-12-31',
        source: 'local' as const,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      mockGetProduct.mockResolvedValue(localProduct);

      const result = await lookupProduct('1234567890123');
      expect(result.source).toBe('local');
      expect(result.product).toEqual(localProduct);
    });

    it('should fall back to API when local catalog misses', async () => {
      mockGetProduct.mockResolvedValue(undefined);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 1,
          product: {
            product_name: 'API Product',
            brands: 'API Brand',
            categories: 'API Category',
            image_front_url: 'https://example.com/img.jpg',
          },
        }),
      });

      const result = await lookupProduct('1234567890123');
      expect(result.source).toBe('openfoodfacts');
      expect(result.product.name).toBe('API Product');
      expect(result.product.source).toBe('openfoodfacts');
    });

    it('should return manual placeholder when both local and API miss', async () => {
      mockGetProduct.mockResolvedValue(undefined);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 0 }),
      });

      const result = await lookupProduct('nonexistent');
      expect(result.source).toBe('manual');
      expect(result.product.name).toBe('');
      expect(result.product.barcode).toBe('nonexistent');
      expect(result.product.source).toBe('manual');
    });
  });
});

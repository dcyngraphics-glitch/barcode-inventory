import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';

const { mockGetProduct } = vi.hoisted(() => ({
  mockGetProduct: vi.fn(),
}));

vi.mock('@/services/catalogService', () => ({
  getProduct: mockGetProduct,
}));

import { lookupOpenFoodFacts, lookupProduct, LookupError } from '../services/productLookupService';

describe('productLookupService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ... existing tests ...

  describe('lookupProduct', () => {
    // ... existing tests ...

    it('should return { success: false, reason: "not-found", source: "manual" } on HTTP 404 from API', async () => {
          mockGetProduct.mockResolvedValue(undefined);

          global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
          });

          const result = await lookupProduct('1234567890123');
          expect(result).toEqual({ success: false, reason: 'not-found', source: 'manual' });
        });
  });
});
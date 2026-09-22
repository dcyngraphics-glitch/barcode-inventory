import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import 'fake-indexeddb/auto';

const { mockLookupProduct } = vi.hoisted(() => ({
  mockLookupProduct: vi.fn(),
}));

vi.mock('@/services/productLookupService', () => ({
  lookupProduct: mockLookupProduct,
  LookupError: class LookupError extends Error {
    constructor(message: string, public readonly kind: string) {
      super(message);
    }
  },
}));

// Import after mocks are set up
import { useProductLookup } from '../hooks/useProductLookup';

describe('useProductLookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
    mockLookupProduct.mockResolvedValue({ product: localProduct, source: 'local' });

    const { result } = renderHook(() => useProductLookup());

    await act(async () => {
      await result.current.lookup('1234567890123');
    });

    expect(result.current.product).toEqual(localProduct);
    expect(result.current.source).toBe('local');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockLookupProduct).toHaveBeenCalledWith('1234567890123');
  });

  it('should fall back to API when local catalog misses', async () => {
    const apiProduct = {
      barcode: '1234567890123',
      name: 'API Product',
      brand: 'API Brand',
      category: 'API Category',
      storePrice: 0,
      defaultExpiry: '',
      imageUrl: 'https://example.com/img.jpg',
      source: 'openfoodfacts' as const,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    mockLookupProduct.mockResolvedValue({ product: apiProduct, source: 'openfoodfacts' });

    const { result } = renderHook(() => useProductLookup());

    await act(async () => {
      await result.current.lookup('1234567890123');
    });

    expect(result.current.product).toEqual(apiProduct);
    expect(result.current.source).toBe('openfoodfacts');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockLookupProduct).toHaveBeenCalledWith('1234567890123');
  });

  it('should return null product with manual source when both local and API miss', async () => {
    const manualPlaceholder = {
      barcode: 'nonexistent',
      name: '',
      brand: '',
      category: '',
      storePrice: 0,
      defaultExpiry: '',
      source: 'manual' as const,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    mockLookupProduct.mockResolvedValue({ product: manualPlaceholder, source: 'manual' });

    const { result } = renderHook(() => useProductLookup());

    await act(async () => {
      await result.current.lookup('nonexistent');
    });

    expect(result.current.product).toBeNull();
    expect(result.current.source).toBe('manual');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should set loading state during lookup', async () => {
    mockLookupProduct.mockResolvedValue({ product: null, source: 'manual' });

    const { result } = renderHook(() => useProductLookup());

    expect(result.current.loading).toBe(false);

    let lookupPromise: Promise<void>;
    act(() => {
      lookupPromise = result.current.lookup('1234567890123');
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await lookupPromise!;
    });

    expect(result.current.loading).toBe(false);
  });

  it('should handle errors gracefully', async () => {
    mockLookupProduct.mockRejectedValue(new Error('DB error'));

    const { result } = renderHook(() => useProductLookup());

    await act(async () => {
      await result.current.lookup('1234567890123');
    });

    expect(result.current.product).toBeNull();
    expect(result.current.source).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('DB error');
  });

  it('should reset state on new lookup', async () => {
    const localProduct = {
      barcode: '111',
      name: 'Product 1',
      brand: '',
      category: '',
      storePrice: 0,
      defaultExpiry: '',
      source: 'local' as const,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    mockLookupProduct.mockResolvedValue({ product: localProduct, source: 'local' });

    const { result } = renderHook(() => useProductLookup());

    await act(async () => {
      await result.current.lookup('111');
    });

    expect(result.current.product).toEqual(localProduct);
    expect(result.current.source).toBe('local');

    mockLookupProduct.mockResolvedValue({ product: null, source: 'manual' });

    await act(async () => {
      await result.current.lookup('999');
    });

    expect(result.current.product).toBeNull();
    expect(result.current.source).toBe('manual');
  });
});

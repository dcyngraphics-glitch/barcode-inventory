import type { Product, ProductSource } from '@/types';
import { getProduct } from '@/services/catalogService';

const OFF_API_BASE = 'https://world.openfoodfacts.org/api/v0/product';

export interface OpenFoodFactsResponse {
  status: number;
  product?: {
    product_name?: string;
    brands?: string;
    categories?: string;
    image_front_url?: string;
  };
}

export interface ProductLookupResult {
  product: Product;
  source: ProductSource;
}

export type LookupErrorKind = 'network' | 'http' | 'parse' | 'unknown';

export class LookupError extends Error {
  constructor(message: string, public readonly kind: LookupErrorKind) {
    super(message);
  }
}

/**
 * Look up a barcode in the Open Food Facts API.
 * Throws LookupError on network errors, HTTP errors, or malformed JSON.
 * Returns null when the product is not found (status 0 or no product data).
 */
export async function lookupOpenFoodFacts(
  barcode: string
): Promise<Product | null> {
  const url = `${OFF_API_BASE}/${encodeURIComponent(barcode)}.json`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new LookupError(
      err instanceof Error ? err.message : 'Network error',
      'network'
    );
  }

  if (!res.ok) {
    throw new LookupError(`HTTP error ${res.status}`, 'http');
  }

  let data: OpenFoodFactsResponse;
  try {
    data = await res.json();
  } catch (err) {
    throw new LookupError(
      err instanceof Error ? err.message : 'Failed to parse response',
      'parse'
    );
  }

  if (data.status !== 1 || !data.product) return null;

  const p = data.product;
  const now = new Date().toISOString();
  return {
    barcode,
    name: p.product_name ?? '',
    brand: p.brands ?? '',
    category: p.categories ?? '',
    storePrice: 0,
    defaultExpiry: '',
    imageUrl: p.image_front_url || undefined,
    source: 'openfoodfacts',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Look up a product by barcode.
 * Checks local catalog first, then Open Food Facts API.
 * Returns a manual placeholder if neither source has the product.
 * Throws LookupError on network/HTTP/parse errors.
 */
export async function lookupProduct(
  barcode: string
): Promise<ProductLookupResult> {
  // Step 1: Check local catalog
  const local = await getProduct(barcode);
  if (local) {
    return { product: local, source: 'local' };
  }

  // Step 2: Try Open Food Facts API
  const offResult = await lookupOpenFoodFacts(barcode);
  if (offResult) {
    return { product: offResult, source: 'openfoodfacts' };
  }

  // Step 3: Manual entry placeholder
  const now = new Date().toISOString();
  const placeholder: Product = {
    barcode,
    name: '',
    brand: '',
    category: '',
    storePrice: 0,
    defaultExpiry: '',
    source: 'manual',
    createdAt: now,
    updatedAt: now,
  };
  return { product: placeholder, source: 'manual' };
}

import type { Product } from '@/types';
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
  source: 'local' | 'openfoodfacts' | 'manual';
}

/**
 * Look up a barcode in the Open Food Facts API.
 * Returns null on network errors, HTTP errors, or when the product is not found.
 */
export async function lookupOpenFoodFacts(
  barcode: string
): Promise<Product | null> {
  try {
    const res = await fetch(`${OFF_API_BASE}/${barcode}.json`);
    if (!res.ok) return null;

    const data: OpenFoodFactsResponse = await res.json();
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
  } catch (err) {
    console.error(`lookupOpenFoodFacts: failed for barcode ${barcode}:`, err);
    return null;
  }
}

/**
 * Look up a product by barcode.
 * Checks local catalog first, then Open Food Facts API.
 * Returns a manual placeholder if neither source has the product.
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

import type { Product } from '@/types';

const OFF_API_BASE = 'https://world.openfoodfacts.org/api/v0/product';

interface OFFResponse {
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

export async function lookupProduct(barcode: string): Promise<ProductLookupResult> {
  const offResult = await lookupOpenFoodFacts(barcode);
  if (offResult) {
    return { product: offResult, source: 'openfoodfacts' };
  }

  const placeholder: Product = {
    barcode,
    name: '',
    brand: '',
    category: '',
    storePrice: 0,
    defaultExpiry: '',
    source: 'manual',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return { product: placeholder, source: 'manual' };
}

async function lookupOpenFoodFacts(barcode: string): Promise<Product | null> {
  try {
    const res = await fetch(`${OFF_API_BASE}/${barcode}.json`);
    if (!res.ok) return null;
    const data: OFFResponse = await res.json();
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
      imageUrl: p.image_front_url,
      source: 'openfoodfacts',
      createdAt: now,
      updatedAt: now,
    };
  } catch (err) {
    console.error(`lookupOpenFoodFacts: failed for barcode ${barcode}:`, err);
    return null;
  }
}

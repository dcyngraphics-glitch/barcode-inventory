import type { Product } from '@/types';
import { getProduct, saveProduct } from './catalogService';

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
  const local = await getProduct(barcode);
  if (local) {
    return { product: local, source: 'local' };
  }

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
  } catch {
    return null;
  }
}

export async function saveProductFromLookup(
  barcode: string,
  fields: Partial<Product>
): Promise<Product> {
  const result = await getProduct(barcode);
  const now = new Date().toISOString();
  const product: Product = {
    barcode:     fields.barcode     ?? barcode,
    name:        fields.name        ?? result?.name        ?? '',
    brand:       fields.brand       ?? result?.brand       ?? '',
    category:    fields.category    ?? result?.category    ?? '',
    storePrice:  fields.storePrice  ?? result?.storePrice  ?? 0,
    defaultExpiry: fields.defaultExpiry ?? result?.defaultExpiry ?? '',
    imageUrl:    fields.imageUrl    ?? result?.imageUrl,
    source:      result?.source     ?? fields.source      ?? 'local',
    createdAt:   result?.createdAt  ?? now,
    updatedAt:   now,
  };
  await saveProduct(product);
  return product;
}

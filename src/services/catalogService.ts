import type { Product, ProductDraft } from '@/types';
import { db } from '@/db/database';
import { productIdFor } from '@/utils/privateId';

export async function getProduct(barcode: string): Promise<Product | undefined> {
  // The primary key is the per-account private ID ('#' + barcode), so the barcode is
  // reached through its index rather than as a key.
  return db.products.where('barcode').equals(barcode).first();
}

export async function getAllProducts(): Promise<Product[]> {
  return db.products.orderBy('name').toArray();
}

export async function saveProduct(product: ProductDraft): Promise<Product> {
  // Derive the key here so no caller has to know about the private-ID convention.
  const withId: Product = { ...product, productId: productIdFor(product.barcode) };
  await db.products.put(withId);
  return withId;
}

export async function deleteProduct(barcode: string): Promise<void> {
  await db.products.delete(productIdFor(barcode));
}

export async function updateProduct(product: ProductDraft): Promise<void> {
  const existing = await getProduct(product.barcode);
  const merged: ProductDraft = existing
    ? {
        ...existing,
        ...product,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      }
    : {
        ...product,
        createdAt: product.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
  await db.products.put({ ...merged, productId: productIdFor(merged.barcode) });
}

export async function searchProducts(query: string): Promise<Product[]> {
  const all = await db.products.toArray();
  const lowerQuery = query.toLowerCase();
  return all.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.brand.toLowerCase().includes(lowerQuery)
  );
}

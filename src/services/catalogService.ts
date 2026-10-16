import type { Product } from '@/types';
import { db } from '@/db/database';

export async function getProduct(barcode: string): Promise<Product | undefined> {
  return db.catalog.get(barcode);
}

export async function getAllProducts(): Promise<Product[]> {
  return db.catalog.orderBy('name').toArray();
}

export async function saveProduct(product: Product): Promise<Product> {
  await db.catalog.put(product);
  return product;
}

export async function deleteProduct(barcode: string): Promise<void> {
  await db.catalog.delete(barcode);
}

export async function updateProduct(product: Product): Promise<void> {
  const existing = await db.catalog.get(product.barcode);
  const merged: Product = existing
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
  await db.catalog.put(merged);
}

export async function searchProducts(query: string): Promise<Product[]> {
  const all = await db.catalog.toArray();
  const lowerQuery = query.toLowerCase();
  return all.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.brand.toLowerCase().includes(lowerQuery)
  );
}

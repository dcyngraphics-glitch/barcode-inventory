import type { Product } from '@/types';
import { getDB } from '@/db/database';

export async function getProduct(barcode: string): Promise<Product | undefined> {
  const db = await getDB();
  return db.get('catalog', barcode);
}

export async function getAllProducts(): Promise<Product[]> {
  const db = await getDB();
  return db.getAllFromIndex('catalog', 'by-name');
}

export async function saveProduct(product: Product): Promise<Product> {
  const db = await getDB();
  await db.put('catalog', product);
  return product;
}

export async function deleteProduct(barcode: string): Promise<void> {
  const db = await getDB();
  await db.delete('catalog', barcode);
}

export async function updateProduct(product: Product): Promise<void> {
  const db = await getDB();
  const existing = await db.get('catalog', product.barcode);
  if (!existing) {
    throw new Error(`Product with barcode ${product.barcode} not found`);
  }
  const updated: Product = { ...product, updatedAt: new Date().toISOString() };
  await db.put('catalog', updated);
}

export async function searchProducts(query: string): Promise<Product[]> {
  const db = await getDB();
  const all = await db.getAll('catalog');
  const lowerQuery = query.toLowerCase();
  return all.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.brand.toLowerCase().includes(lowerQuery)
  );
}

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

export async function searchProducts(query: string): Promise<Product[]> {
  const all = await getAllProducts();
  const q = query.toLowerCase();
  return all.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.barcode.includes(q)
  );
}

export async function saveProduct(product: Product): Promise<Product> {
  const db = await getDB();
  await db.put('catalog', product);
  return product;
}

export async function updateProduct(product: Product): Promise<Product> {
  const db = await getDB();
  await db.put('catalog', product);
  return product;
}

export async function deleteProduct(barcode: string): Promise<void> {
  const db = await getDB();
  await db.delete('catalog', barcode);
}

export async function deleteAllProducts(): Promise<void> {
  const db = await getDB();
  await db.clear('catalog');
}

export async function getProductCount(): Promise<number> {
  const db = await getDB();
  return db.count('catalog');
}

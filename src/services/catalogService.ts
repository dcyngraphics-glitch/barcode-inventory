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

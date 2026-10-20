import type { Product, ProductDraft, Batch } from '@/types';
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

export interface ProductDeleteSnapshot {
  product: Product;
  batches: Batch[];
}

/**
 * Delete a product and every batch that belongs to it, returning everything that
 * was removed so the caller can offer an undo.
 *
 * Without the snapshot there is nothing to restore, so the delete would be
 * irreversible — which is how product deletion shipped: batch delete and sales
 * both had undo, and deleting a product silently destroyed its whole stock
 * history with no way back.
 */
export async function deleteProductWithSnapshot(
  barcode: string,
): Promise<ProductDeleteSnapshot | undefined> {
  const product = await db.products.get(productIdFor(barcode));
  if (!product) return undefined;

  const batches = await db.inventory.where('barcode').equals(barcode).toArray();

  // One transaction: a crash between the two deletes must not leave a product
  // with no stock, or stock pointing at a product that no longer exists.
  await db.transaction('rw', [db.products, db.inventory], async () => {
    await db.inventory.where('barcode').equals(barcode).delete();
    await db.products.delete(productIdFor(barcode));
  });

  return { product, batches };
}

/**
 * Put a deleted product and its batches back. A put is naturally idempotent, so
 * restoring twice cannot duplicate the rows.
 */
export async function restoreProduct(snapshot: ProductDeleteSnapshot): Promise<void> {
  await db.transaction('rw', [db.products, db.inventory], async () => {
    await db.inventory.bulkPut(snapshot.batches);
    await db.products.put(snapshot.product);
  });
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

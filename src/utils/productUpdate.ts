import type { Product } from '@/types';

export interface ProductFormInput {
  name: string;
  brand: string;
  price: number;
  expiryDate: string;
}

/**
 * Decide what to persist when an existing product is saved from the product form.
 *
 * Returns `null` when nothing changed, otherwise the fully merged product.
 *
 * Name and brand are ALWAYS carried through when they differ. This is the fix for
 * the bug where editing a product's name or brand silently did nothing: persistence
 * used to be gated behind a removed "seller mode" flag, so with that flag off only
 * the price was written — and if ONLY the name changed, nothing was written at all.
 * Keeping this decision in a pure function means a test can guard it directly,
 * instead of testing the data layer and hoping the screen calls it correctly.
 */
export function buildProductUpdate(
  product: Product,
  form: ProductFormInput,
  now: string,
): Product | null {
  const name = form.name.trim();
  const brand = form.brand.trim();

  const changed =
    product.name !== name ||
    product.brand !== brand ||
    product.storePrice !== form.price ||
    product.defaultExpiry !== form.expiryDate;

  if (!changed) return null;

  return {
    ...product,
    name,
    brand,
    storePrice: form.price,
    defaultExpiry: form.expiryDate,
    updatedAt: now,
  };
}

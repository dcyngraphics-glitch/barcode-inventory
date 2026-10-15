import { describe, it, expect } from 'vitest';
import { buildProductUpdate } from '@/utils/productUpdate';
import type { Product } from '@/types';

const base: Product = {
  barcode: 'P1',
  name: 'Original',
  brand: 'OrigBrand',
  category: 'uncategorized',
  storePrice: 10,
  defaultExpiry: '2026-06-01',
  source: 'manual',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

type Form = { name: string; brand: string; price: number; expiryDate: string };

const form = (over: Partial<Form> = {}): Form => ({
  name: base.name,
  brand: base.brand,
  price: base.storePrice,
  expiryDate: base.defaultExpiry,
  ...over,
});

const NOW = '2026-10-15T00:00:00.000Z';

/**
 * These tests guard the decision of WHICH fields to persist when the product form
 * is submitted — the exact place the reported bug lived. The previous version of
 * this file called catalogService.updateProduct directly with every field already
 * populated, so it passed no matter what the screen did and could not have caught
 * the regression it was named after.
 */
describe('buildProductUpdate — the product-form persistence decision', () => {
  it('returns the new name when ONLY the name changed', () => {
    // The user-reported bug: changing only the name used to write nothing at all,
    // because persistence was gated behind a removed "seller mode" flag.
    const result = buildProductUpdate(base, form({ name: 'Renamed' }), NOW);

    expect(result).not.toBeNull();
    expect(result!.name).toBe('Renamed');
    expect(result!.brand).toBe('OrigBrand');
    expect(result!.storePrice).toBe(10);
    expect(result!.updatedAt).toBe(NOW);
  });

  it('returns the new brand when ONLY the brand changed', () => {
    const result = buildProductUpdate(base, form({ brand: 'NewBrand' }), NOW);

    expect(result).not.toBeNull();
    expect(result!.brand).toBe('NewBrand');
    expect(result!.name).toBe('Original');
  });

  it('trims whitespace around name and brand', () => {
    const result = buildProductUpdate(base, form({ name: '  Spaced  ', brand: '  B  ' }), NOW);

    expect(result!.name).toBe('Spaced');
    expect(result!.brand).toBe('B');
  });

  it('returns null when nothing changed', () => {
    expect(buildProductUpdate(base, form(), NOW)).toBeNull();
  });

  it('returns an update for a price-only change', () => {
    const result = buildProductUpdate(base, form({ price: 25 }), NOW);

    expect(result).not.toBeNull();
    expect(result!.storePrice).toBe(25);
  });

  it('returns an update for an expiry-only change', () => {
    const result = buildProductUpdate(base, form({ expiryDate: '2027-01-01' }), NOW);

    expect(result).not.toBeNull();
    expect(result!.defaultExpiry).toBe('2027-01-01');
  });

  it('preserves the fields the form does not own', () => {
    const result = buildProductUpdate(base, form({ name: 'Renamed' }), NOW);

    expect(result!.barcode).toBe('P1');
    expect(result!.category).toBe('uncategorized');
    expect(result!.source).toBe('manual');
    expect(result!.createdAt).toBe(base.createdAt);
  });

  it('returns null when the change is only surrounding whitespace', () => {
    // '  Original  ' trims to 'Original', so nothing actually changed.
    expect(buildProductUpdate(base, form({ name: '  Original  ' }), NOW)).toBeNull();
  });
});

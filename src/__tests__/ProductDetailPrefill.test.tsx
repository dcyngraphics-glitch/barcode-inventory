import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProductDetailScreen } from '@/screens/ProductDetailScreen';

const PRODUCT = {
  barcode: '4800361394093',
  name: 'Bear Brand Sterilized Milk',
  brand: 'Bear Brand',
  category: 'dairy',
  storePrice: 24,
  defaultExpiry: '2027-01-01',
  source: 'local' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({ barcode: PRODUCT.barcode }),
    useNavigate: () => vi.fn(),
  };
});

// Simulate the real lookup: the form mounts while the product is still null and
// the product arrives a tick later. This is the race that used to leave an
// existing product's fields blank.
vi.mock('@/hooks/useProductLookup', async () => {
  const { useState, useEffect } = await import('react');
  return {
    useProductLookup: () => {
      const [product, setProduct] = useState<typeof PRODUCT | null>(null);
      useEffect(() => {
        const t = setTimeout(() => setProduct(PRODUCT), 0);
        return () => clearTimeout(t);
      }, []);
      return {
        product,
        source: product ? 'local' : 'manual',
        loading: false,
        error: null,
        lookup: vi.fn(),
      };
    },
  };
});

vi.mock('@/services/catalogService', () => ({
  saveProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  getProduct: vi.fn(),
}));

vi.mock('@/services/inventoryService', () => ({
  addBatch: vi.fn(),
  getBatchesByBarcode: vi.fn(async () => []),
  deleteBatch: vi.fn(),
}));

vi.mock('@/components/ProductManagementSheet', () => ({
  ProductManagementSheet: () => null,
}));

const val = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value;

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[`/product/${PRODUCT.barcode}`]}>
      <ProductDetailScreen />
    </MemoryRouter>,
  );
}

describe('ProductDetailScreen form prefill', () => {
  it("prefills an existing product's name, brand and price", async () => {
    renderScreen();

    await waitFor(() => expect(val('product-name')).toBe('Bear Brand Sterilized Milk'));
    expect(val('product-brand')).toBe('Bear Brand');
    expect(val('product-price')).toBe('24');
    expect(val('product-expiry')).toBe('2027-01-01');
  });

  it('prefills the values that let stock be added without retyping', async () => {
    renderScreen();

    // The bug: these were blank, so "Update Inventory" failed validation with
    // "Product name is required" / "Price must be greater than 0".
    await waitFor(() => expect(val('product-name')).toBeTruthy());
    expect(val('product-price')).toBeTruthy();
    expect(screen.queryByText(/product name is required/i)).not.toBeInTheDocument();
  });
});

import { useCallback, useState } from 'react';
import type { Product, ProductSource } from '@/types';
import { lookupProduct, LookupError } from '@/services/productLookupService';

export interface UseProductLookupResult {
  product: Product | null;
  source: ProductSource | null;
  loading: boolean;
  error: string | null;
  lookup: (barcode: string) => Promise<void>;
}

export function useProductLookup(): UseProductLookupResult {
  const [product, setProduct] = useState<Product | null>(null);
  const [source, setSource] = useState<ProductSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (barcode: string) => {
    setLoading(true);
    setError(null);
    setProduct(null);
    setSource(null);

    try {
      const result = await lookupProduct(barcode);
      if (result.source === 'manual') {
        // Manual entry: discard the placeholder, prompt the user
        setProduct(null);
        setSource('manual');
      } else {
        setProduct(result.product);
        setSource(result.source);
      }
    } catch (err) {
      if (err instanceof LookupError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Lookup failed');
      }
      setProduct(null);
      setSource(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { product, source, loading, error, lookup };
}

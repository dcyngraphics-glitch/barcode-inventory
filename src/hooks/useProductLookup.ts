import { useCallback, useState } from 'react';
import type { Product } from '@/types';
import {
  lookupProduct as lookupProductService,
} from '@/services/productLookupService';

export function useProductLookup() {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (barcode: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await lookupProductService(barcode);
      setProduct(result.product);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setProduct(null);
    setError(null);
  }, []);

  return { product, loading, error, lookup, reset };
}

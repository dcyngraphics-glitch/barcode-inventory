import { useCallback, useState } from 'react';
import type { Product } from '@/types';
import {
  lookupProduct as lookupProductService,
} from '@/services/apiService';

export function useProductLookup() {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'local' | 'openfoodfacts' | 'manual' | null>(null);

  const lookup = useCallback(async (barcode: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await lookupProductService(barcode);
      setProduct(result.product);
      setSource(result.source);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setProduct(null);
    setError(null);
    setSource(null);
  }, []);

  return { product, loading, error, source, lookup, reset };
}

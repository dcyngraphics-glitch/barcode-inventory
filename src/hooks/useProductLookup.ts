import { useCallback, useState } from 'react';
import type { Product } from '@/types';
import { getProduct } from '@/services/catalogService';
import { lookupOpenFoodFacts } from '@/services/productLookupService';

export interface UseProductLookupResult {
  product: Product | null;
  source: 'local' | 'openfoodfacts' | 'manual' | null;
  loading: boolean;
  error: string | null;
  lookup: (barcode: string) => Promise<void>;
}

export function useProductLookup(): UseProductLookupResult {
  const [product, setProduct] = useState<Product | null>(null);
  const [source, setSource] = useState<'local' | 'openfoodfacts' | 'manual' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (barcode: string) => {
    setLoading(true);
    setError(null);
    setProduct(null);
    setSource(null);

    try {
      // Step 1: Check local catalog
      const local = await getProduct(barcode);
      if (local) {
        setProduct(local);
        setSource('local');
        return;
      }

      // Step 2: Try Open Food Facts API
      const offResult = await lookupOpenFoodFacts(barcode);
      if (offResult) {
        setProduct(offResult);
        setSource('openfoodfacts');
        return;
      }

      // Step 3: Manual entry — return null product
      setProduct(null);
      setSource('manual');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
      setProduct(null);
      setSource('manual');
    } finally {
      setLoading(false);
    }
  }, []);

  return { product, source, loading, error, lookup };
}

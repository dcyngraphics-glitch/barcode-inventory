import { useCallback, useEffect, useState } from 'react';
import type { Batch } from '@/types';
import {
  getAllBatches,
  addBatch as addBatchService,
  deleteBatch as deleteBatchService,
} from '@/services/inventoryService';
import { sortBatchesByFIFO } from '@/services/expiryService';

export function useInventory() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAllBatches();
      setBatches(sortBatchesByFIFO(all));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addBatch = useCallback(async (batch: Batch) => {
    await addBatchService(batch);
    await refresh();
  }, [refresh]);

  const deleteBatch = useCallback(async (batchId: string) => {
    await deleteBatchService(batchId);
    await refresh();
  }, [refresh]);

  return { batches, loading, addBatch, deleteBatch, refresh };
}

import { useCallback, useEffect, useState } from 'react';
import type { Batch, InventoryGroup } from '@/types';
import {
  getInventoryGroups,
  addBatch as addBatchService,
  deleteBatch as deleteBatchService,
} from '@/services/inventoryService';

export function useInventory() {
  const [groups, setGroups] = useState<InventoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInventoryGroups();
      setGroups(data);
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

  return { groups, loading, addBatch, deleteBatch, refresh };
}

import { useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { InventoryGroup as InventoryGroupType, Batch } from '@/types';
import { calculateExpiryStatus } from '@/services/notificationService';
import { updateBatch, deleteBatchWithSnapshot, restoreBatch } from '@/services/inventoryService';
import { Toast, useToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { SearchBar } from '@/components/SearchBar';
import { FilterChips, FilterType } from '@/components/FilterChips';
import { InventoryGroup } from '@/components/InventoryGroup';
import { useInventory } from '@/hooks/useInventory';
import { useSettingsContext } from '@/context/SettingsContext';
import { EditBatchSheet } from '@/components/EditBatchSheet';
import { SetStockSheet } from '@/components/SetStockSheet';
import { setStock } from '@/services/stockService';
import { ScreenTooltip } from '@/components/ScreenTooltip';
import { ScreenSkeleton } from '@/components/ScreenSkeleton';

export function InventoryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [deleteTarget, setDeleteTarget] = useState<Batch | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [editBatchOpen, setEditBatchOpen] = useState(false);
    const [editBatch, setEditBatch] = useState<Batch | null>(null);
    const [stockTarget, setStockTarget] = useState<
      { barcode: string; name: string; current: number; expiry: string } | null
    >(null);

    const { toasts, showToast, dismissToast } = useToast();
  const navigate = useNavigate();
  const pullStartY = useRef(0);
  const pullDistance = useRef(0);

  const { groups, loading, refresh } = useInventory();
  const { settings } = useSettingsContext();
  const alertWindowDays = settings?.alertWindowDays ?? 3;

  // Filter groups by search query and expiry status
  const filteredGroups: InventoryGroupType[] = useMemo(() => {
    return groups
      .filter((group) => {
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesName = group.product.name.toLowerCase().includes(query);
          const matchesBrand = group.product.brand.toLowerCase().includes(query);
          if (!matchesName && !matchesBrand) return false;
        }
        return true;
      })
      .map((group) => {
        // Filter batches within groups when an expiry filter is active
        const filteredBatches =
          filter === 'all'
            ? group.batches
            : group.batches.filter((batch: Batch) => {
                const status = calculateExpiryStatus(batch.expiryDate, alertWindowDays);
                return status === filter;
              });
        // Recompute totals from filtered batches to avoid stale data
        const totalQuantity = filteredBatches.reduce((s, b) => s + b.quantity, 0);
        const earliestExpiry = filteredBatches[0]?.expiryDate ?? '';
        return { ...group, batches: filteredBatches, totalQuantity, earliestExpiry };
      })
      .filter((group) => group.batches.length > 0);
  }, [groups, searchQuery, filter, alertWindowDays]);

  // Delete batch handler — deletes with a snapshot so the user can undo
  const handleDeleteBatch = useCallback(async (): Promise<void> => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // Snapshot-based, unlike the hook's deleteBatch, so the row can be put back.
      const snapshot = await deleteBatchWithSnapshot(deleteTarget.batchId);
      await refresh();
      if (snapshot) {
        // The longer lifetime keeps Undo reachable after the user registers what
        // they just removed. Without a snapshot there is nothing to restore, so
        // no action is offered rather than a button that silently does nothing.
        showToast('success', 'Batch removed', {
          action: {
            label: 'Undo',
            onClick: () => {
              void (async () => {
                await restoreBatch(snapshot);
                await refresh();
              })();
            },
          },
          durationMs: 6000,
        });
      } else {
        showToast('success', 'Batch removed');
      }
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete batch:', err);
      showToast('error', 'Failed to delete batch');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, showToast, refresh]);

  // Set stock to a counted total
  const handleSetStock = useCallback(
    (barcode: string) => {
      const group = groups.find((g) => g.product.barcode === barcode);
      if (!group) return;
      setStockTarget({
        barcode,
        name: group.product.name || barcode,
        current: group.totalQuantity,
        expiry: group.product.defaultExpiry || '',
      });
    },
    [groups],
  );

  const handleSaveStock = useCallback(
    async (target: number, expiryDate: string) => {
      if (!stockTarget) return;
      try {
        await setStock(stockTarget.barcode, target, expiryDate);
        showToast('success', `Stock set to ${target}`);
        await refresh();
      } catch (err) {
        console.error('Failed to set stock:', err);
        showToast('error', 'Failed to set stock');
      } finally {
        setStockTarget(null);
      }
    },
    [stockTarget, showToast, refresh],
  );

  // Pull-to-refresh handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      pullStartY.current = e.touches[0]!.clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0 && pullStartY.current > 0) {
      const deltaY = e.touches[0]!.clientY - pullStartY.current;
      if (deltaY > 0) {
        pullDistance.current = deltaY;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance.current > 80) {
      void refresh();
    }
    pullStartY.current = 0;
    pullDistance.current = 0;
  }, [refresh]);

  // Loading skeleton — shared component, so every screen loads with the same
  // rhythm. This replaced an inline duplicate that carried its own
  // `@keyframes shimmer`, which is why the shimmer keyframes are gone from here.
  if (loading) {
    return <ScreenSkeleton rows={3} label="Loading inventory" />;
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        padding: 'var(--space-md)',
        paddingBottom: 'calc(16px + 64px + env(safe-area-inset-bottom))',
        overscrollBehavior: 'contain',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
            <h1 className="text-2xl font-semibold text-foreground mb-3">
              My Inventory
            </h1>

      {/* Search bar */}
      <div style={{ marginBottom: 'var(--space-sm)' }}>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search products"
          debounceMs={200}
        />
      </div>

      {/* Filter chips */}
      <FilterChips active={filter} onChange={setFilter} />

      {/* Content */}
      <div style={{ marginTop: 'var(--space-md)' }}>
        {filteredGroups.length === 0 && searchQuery ? (
          <EmptyState
            title="No products found"
            subtitle="Try a different search term"
          />
        ) : filteredGroups.length === 0 && filter !== 'all' ? (
          <EmptyState
            title="No items match filter"
            subtitle="Try a different filter"
          />
        ) : filteredGroups.length === 0 ? (
          <EmptyState
            title="Your inventory is empty"
            subtitle="Scan your first product to get started"
            ctaLabel="Scan Now"
            onCta={() => navigate('/')}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {filteredGroups.map((group: InventoryGroupType) => (
                          <InventoryGroup
                            key={group.product.barcode}
                            group={group}
                            alertWindowDays={alertWindowDays}
                            onDeleteBatch={(batch) => setDeleteTarget(batch)}
                            onEditBatch={(batch) => { setEditBatch(batch); setEditBatchOpen(true); }}
                            onSetStock={handleSetStock}
                          />
                        ))}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Remove this batch?"
        body="This cannot be undone."
        confirmLabel={deleting ? 'Removing…' : 'Remove'}
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleDeleteBatch}
        onCancel={() => setDeleteTarget(null)}
        confirmDisabled={deleting}
      />

      {/* Toast notifications */}
            <Toast toasts={toasts} onDismiss={dismissToast} />
            {/* Edit batch sheet */}
                        {editBatch && (
                          <EditBatchSheet
                            open={editBatchOpen}
                            batch={editBatch}
                            onCancel={() => setEditBatchOpen(false)}
                            onSave={async (batch) => {
                              try {
                                await updateBatch(batch);
                                showToast('success', 'Batch updated');
                              } catch (err) {
                                console.error('Failed to update batch:', err);
                                showToast('error', 'Failed to update batch');
                              } finally {
                                setEditBatchOpen(false);
                                setEditBatch(null);
                              }
                            }}
                          />
                        )}

      <ScreenTooltip
        screenId="inventory"
        message="Tap a product to expand batches • Use search or filter by expiry status"
      />

      {/* Set stock sheet */}
      {stockTarget && (
        <SetStockSheet
          open
          productName={stockTarget.name}
          currentStock={stockTarget.current}
          defaultExpiry={stockTarget.expiry}
          onCancel={() => setStockTarget(null)}
          onSave={handleSaveStock}
        />
      )}
    </div>
  );
}

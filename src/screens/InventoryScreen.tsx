import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { InventoryGroup as InventoryGroupType, Batch } from '@/types';
import { loadSettings } from '@/services/settingsService';
import { calculateExpiryStatus } from '@/services/notificationService';
import { Toast, useToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { SearchBar } from '@/components/SearchBar';
import { FilterChips, FilterType } from '@/components/FilterChips';
import { InventoryGroup } from '@/components/InventoryGroup';
import { useInventory } from '@/hooks/useInventory';

export function InventoryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [alertWindowDays, setAlertWindowDays] = useState(3);
  const [deleteTarget, setDeleteTarget] = useState<Batch | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { toasts, showToast, dismissToast } = useToast();
  const navigate = useNavigate();
  const pullStartY = useRef(0);
  const pullDistance = useRef(0);

  const { groups, loading, refresh, deleteBatch } = useInventory();

  // Load settings
  useEffect(() => {
    loadSettings()
      .then((settings) => {
        setAlertWindowDays(settings.alertWindowDays);
      })
      .catch((err) => {
        console.error('Failed to load settings:', err);
        showToast('error', 'Failed to load settings. Using default values.');
      });
  }, [showToast]);

  // Filter groups by search query and expiry status
  const filteredGroups: InventoryGroupType[] = groups
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

  // Delete batch handler
  const handleDeleteBatch = useCallback(async (): Promise<void> => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // deleteBatch already refreshes internally — no explicit refresh needed
      await deleteBatch(deleteTarget.batchId);
      showToast('success', 'Batch removed');
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete batch:', err);
      showToast('error', 'Failed to delete batch');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, showToast, deleteBatch]);

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

  // Loading skeleton
  if (loading) {
    return (
      <div style={{ padding: '16px' }}>
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              height: '44px',
              background: '#f2f3f4',
              borderRadius: '8px',
              animation: 'shimmer 1.5s infinite',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                height: '36px',
                width: i === 1 ? '100px' : '80px',
                background: '#f2f3f4',
                borderRadius: '999px',
                animation: 'shimmer 1.5s infinite',
              }}
            />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: '100px',
              background: '#f2f3f4',
              borderRadius: '12px',
              marginBottom: '12px',
              animation: 'shimmer 1.5s infinite',
            }}
          />
        ))}
        <style>{`
          @keyframes shimmer {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        padding: '16px',
        paddingBottom: 'calc(16px + 64px + env(safe-area-inset-bottom))',
        overscrollBehavior: 'contain',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: '24px',
          fontWeight: 600,
          color: '#0f172a',
          marginBottom: '16px',
        }}
      >
        My Inventory
      </div>

      {/* Search bar */}
      <div style={{ marginBottom: '12px' }}>
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
      <div style={{ marginTop: '16px' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredGroups.map((group: InventoryGroupType) => (
              <InventoryGroup
                key={group.product.barcode}
                group={group}
                alertWindowDays={alertWindowDays}
                onDeleteBatch={(batch) => setDeleteTarget(batch)}
                onEditBatch={() => showToast('info', 'Edit batch functionality coming soon')}
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
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { InventoryGroup as InventoryGroupType, Batch } from '@/types';
import { getInventoryGroups, deleteBatch as deleteBatchService } from '@/services/inventoryService';
import { loadSettings } from '@/services/settingsService';
import { calculateExpiryStatus } from '@/services/notificationService';
import { Toast, useToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { SearchBar } from '@/components/SearchBar';
import { FilterChips, FilterType } from '@/components/FilterChips';
import { InventoryGroup as InventoryGroupComponent } from '@/components/InventoryGroup';

export function InventoryScreen() {
  const [groups, setGroups] = useState<InventoryGroupType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [alertWindowDays, setAlertWindowDays] = useState(3);
  const [deleteTarget, setDeleteTarget] = useState<Batch | null>(null);

  const { toasts, showToast, dismissToast } = useToast();
  const navigate = useNavigate();
  const pullStartY = useRef(0);
  const pullDistance = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load settings
  useEffect(() => {
    loadSettings().then((settings) => {
      setAlertWindowDays(settings.alertWindowDays);
    });
  }, []);

  // Load inventory groups
  const loadGroups = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }
    try {
      const data = await getInventoryGroups();
      setGroups(data);
    } catch (err) {
      console.error('Failed to load inventory:', err);
      showToast('error', 'Failed to load inventory');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Filter groups by search query and expiry status
  const filteredGroups: InventoryGroupType[] = groups
    .filter((group) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = group.product.name.toLowerCase().includes(query);
        const matchesBrand = group.product.brand.toLowerCase().includes(query);
        if (!matchesName && !matchesBrand) return false;
      }

      // Expiry status filter
      if (filter === 'all') return true;

      return group.batches.some((batch: Batch) => {
        const status = calculateExpiryStatus(batch.expiryDate, alertWindowDays);
        return status === filter;
      });
    })
    .sort((a: InventoryGroupType, b: InventoryGroupType) => a.product.name.localeCompare(b.product.name));

  // Delete batch handler
  const handleDeleteBatch = useCallback(async (): Promise<void> => {
    if (!deleteTarget) return;

    try {
      await deleteBatchService(deleteTarget.batchId);
      showToast('success', 'Batch removed');
      setDeleteTarget(null);
      await loadGroups();
    } catch (err) {
      console.error('Failed to delete batch:', err);
      showToast('error', 'Failed to delete batch');
      setDeleteTarget(null);
    }
  }, [deleteTarget, showToast, loadGroups]);

  // Edit batch handler (placeholder - would open edit sheet)
  const handleEditBatch = useCallback((batch: Batch) => {
    showToast('info', 'Edit batch: ' + batch.batchId);
  }, [showToast]);

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
      loadGroups(true);
    }
    pullStartY.current = 0;
    pullDistance.current = 0;
  }, [loadGroups]);

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
      ref={containerRef}
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
        {filteredGroups.length === 0 ? (
          searchQuery ? (
            <EmptyState
              title="No products found"
              subtitle="Try a different search term"
            />
          ) : (
            <EmptyState
              title="Your inventory is empty"
              subtitle="Scan your first product to get started"
              ctaLabel="Scan Now"
              onCta={() => navigate('/')}
            />
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredGroups.map((group: InventoryGroupType) => (
              <InventoryGroupComponent
                key={group.product.barcode}
                group={group}
                alertWindowDays={alertWindowDays}
                onDeleteBatch={(batch) => setDeleteTarget(batch)}
                onEditBatch={handleEditBatch}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pull-to-refresh indicator */}
      {refreshing && (
        <div
          style={{
            position: 'fixed',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0f172a',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: '999px',
            fontSize: '14px',
            fontWeight: 500,
            zIndex: 50,
          }}
        >
          Refreshing...
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Remove this batch?"
        body="This cannot be undone."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleDeleteBatch}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Toast notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

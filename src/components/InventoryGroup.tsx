import { useNavigate } from 'react-router-dom';
import { ChevronRight, Package } from 'lucide-react';
import type { InventoryGroup, Batch, ExpiryStatus } from '@/types';
import { calculateExpiryStatus } from '@/services/notificationService';
import { formatDate } from '@/utils/helpers';
import { getStatusConfig } from '@/utils/statusConfig';
import { BatchRow } from './BatchRow';

interface InventoryGroupProps {
  group: InventoryGroup;
  alertWindowDays: number;
  onDeleteBatch: (batch: Batch) => void;
  onEditBatch: (batch: Batch) => void;
  onSetStock: (barcode: string) => void;
}

export function InventoryGroup({ group, alertWindowDays, onDeleteBatch, onEditBatch, onSetStock }: InventoryGroupProps) {
  const navigate = useNavigate();

  // Navigate to product detail when header is clicked
  const handleHeaderClick = () => {
    navigate(`/product/${encodeURIComponent(group.product.barcode)}`);
  };

  // Calculate unique statuses across all batches
  const statuses = new Set<ExpiryStatus>();
  for (const batch of group.batches) {
    statuses.add(calculateExpiryStatus(batch.expiryDate, alertWindowDays));
  }

  const earliestExpiryFormatted = formatDate(group.earliestExpiry);

  return (
    <div
      style={{
        background: 'var(--color-card)',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
        transition: 'box-shadow 200ms ease',
      }}
    >
      {/* Product header — tap to view details */}
      <button
        onClick={handleHeaderClick}
        aria-label={`View details for ${group.product.name}`}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          padding: '16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          textAlign: 'left',
          minHeight: '60px',
        }}
      >
        {/* Product icon */}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: 'var(--color-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {group.product.imageUrl ? (
            <img
              src={group.product.imageUrl}
              alt={group.product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Package size={20} color="var(--color-muted-foreground)" />
          )}
        </div>

        {/* Product info */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--color-foreground)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {group.product.name}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--color-secondary)',
              marginTop: '2px',
            }}
          >
            {group.totalQuantity} item{group.totalQuantity !== 1 ? 's' : ''} · Earliest Exp: {earliestExpiryFormatted}
          </div>

          {/* Status badges */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              marginTop: '6px',
              flexWrap: 'wrap',
            }}
          >
            {Array.from(statuses).map((status) => {
              const config = getStatusConfig(status);
              return (
                <span
                  key={status}
                  role="status"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 500,
                    background: config.bg,
                    color: config.color,
                  }}
                >
                  {config.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Arrow indicator */}
        <div
          style={{
            flexShrink: 0,
            color: 'var(--color-muted-foreground)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ChevronRight size={20} />
        </div>
      </button>

      {/* Expandable batch list */}
      <div
        style={{
          borderTop: '1px solid var(--color-border)',
          padding: '0 16px 12px',
        }}
      >
        {group.batches.map((batch) => (
          <BatchRow
            key={batch.batchId}
            batch={batch}
            alertWindowDays={alertWindowDays}
            onDelete={onDeleteBatch}
            onEdit={onEditBatch}
          />
        ))}

        {/* Set stock to a counted total — the app works out add vs remove */}
        <button
          onClick={() => onSetStock(group.product.barcode)}
          aria-label={`Set stock for ${group.product.name}`}
          style={{
            width: '100%',
            marginTop: '8px',
            padding: '10px 12px',
            background: 'transparent',
            border: '1px dashed var(--color-border)',
            borderRadius: '8px',
            color: 'var(--color-secondary)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: '44px',
          }}
        >
          Set stock
        </button>
      </div>
    </div>
  );
}

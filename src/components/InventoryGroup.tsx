import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Package } from 'lucide-react';
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
}

export function InventoryGroup({ group, alertWindowDays, onDeleteBatch, onEditBatch }: InventoryGroupProps) {
  const [expanded, setExpanded] = useState(false);
  const [height, setHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const recalculate = () => {
      if (contentRef.current) {
        setHeight(contentRef.current.scrollHeight);
      }
    };
    recalculate();
    window.addEventListener('resize', recalculate);
    return () => window.removeEventListener('resize', recalculate);
  }, [group.batches]);

  // Calculate unique statuses across all batches
  const statuses = new Set<ExpiryStatus>();
  for (const batch of group.batches) {
    statuses.add(calculateExpiryStatus(batch.expiryDate, alertWindowDays));
  }

  const earliestExpiryFormatted = formatDate(group.earliestExpiry);

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e6e8ea',
        overflow: 'hidden',
        transition: 'box-shadow 200ms ease',
      }}
    >
      {/* Product header */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
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
            background: '#f2f3f4',
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
            <Package size={20} color="#94a3b8" />
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
              color: '#0f172a',
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
              color: '#475569',
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

        {/* Chevron */}
        <div
          style={{
            flexShrink: 0,
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {/* Expandable batch list */}
      <div
        style={{
          maxHeight: expanded ? `${height}px` : '0px',
          overflow: 'hidden',
          transition: 'max-height 200ms ease',
        }}
      >
        <div
          ref={contentRef}
          style={{
            padding: '0 16px 12px',
            borderTop: '1px solid #e6e8ea',
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
        </div>
      </div>
    </div>
  );
}

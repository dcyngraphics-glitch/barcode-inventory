import { useState, useRef, useCallback } from 'react';
import { Trash2, Pencil, Package } from 'lucide-react';
import type { Batch, ExpiryStatus } from '@/types';
import { calculateExpiryStatus } from '@/services/notificationService';
import { formatDate } from '@/utils/helpers';
import { getStatusConfig } from '@/utils/statusConfig';

interface BatchRowProps {
  batch: Batch;
  alertWindowDays: number;
  onDelete: (batch: Batch) => void;
  onEdit: (batch: Batch) => void;
}

const SWIPE_THRESHOLD = 80;

export function BatchRow({ batch, alertWindowDays, onDelete, onEdit }: BatchRowProps) {
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const status: ExpiryStatus = calculateExpiryStatus(batch.expiryDate, alertWindowDays);
  const statusStyle = getStatusConfig(status);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]!.clientX;
    touchStartY.current = e.touches[0]!.clientY;
    setIsSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return;
    const deltaX = e.touches[0]!.clientX - touchStartX.current;
    const deltaY = e.touches[0]!.clientY - touchStartY.current;

    // Only handle horizontal swipes
    if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < 0) {
      setSwipeX(Math.max(deltaX, -120));
    }
  }, [isSwiping]);

  const handleTouchEnd = useCallback(() => {
    setIsSwiping(false);
    if (swipeX < -SWIPE_THRESHOLD) {
      setSwipeX(-120);
      setShowActions(true);
    } else {
      setSwipeX(0);
      setShowActions(false);
    }
  }, [swipeX]);

  const handleLongPress = useCallback(() => {
    setShowActions((prev) => !prev);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setShowActions((prev) => !prev);
    }
  }, []);

  const formattedDate = formatDate(batch.expiryDate);

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '8px',
        marginBottom: '4px',
      }}
    >
      {/* Swipe reveal background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: '16px',
          opacity: swipeX < -SWIPE_THRESHOLD ? 1 : 0,
          transition: 'opacity 200ms ease',
        }}
      >
        <Trash2 size={24} color="#ffffff" />
      </div>

      {/* Main content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onKeyDown={handleKeyDown}
        onContextMenu={(e) => {
          e.preventDefault();
          handleLongPress();
        }}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: '#ffffff',
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 200ms ease',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: '14px',
              color: '#0f172a',
              fontWeight: 500,
            }}
          >
            {formattedDate}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: '#475569',
              fontSize: '14px',
            }}
          >
            <Package size={14} />
            <span>× {batch.quantity}</span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            role="status"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 500,
              background: statusStyle.bg,
              color: statusStyle.color,
              whiteSpace: 'nowrap',
            }}
          >
            {statusStyle.label}
          </span>

          {/* Action buttons (visible after swipe, long-press, or keyboard toggle) */}
          {showActions && (
            <div
              style={{
                display: 'flex',
                gap: '4px',
                animation: 'fade-in 150ms ease',
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(batch);
                }}
                aria-label="Edit batch"
                style={{
                  background: 'transparent',
                  color: '#334155',
                  padding: '8px',
                  cursor: 'pointer',
                  border: 'none',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '44px',
                  minHeight: '44px',
                }}
              >
                <Pencil size={18} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(batch);
                }}
                aria-label="Delete batch"
                style={{
                  background: 'transparent',
                  color: '#dc2626',
                  padding: '8px',
                  cursor: 'pointer',
                  border: 'none',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '44px',
                  minHeight: '44px',
                }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

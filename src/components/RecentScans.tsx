import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ChevronRight } from 'lucide-react';
import type { Product, Batch } from '@/types';
import { getAllBatches } from '@/services/inventoryService';
import { getProduct } from '@/services/catalogService';

interface RecentScanItem {
  product: Product;
  batch: Batch;
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

export function RecentScans() {
  const [scans, setScans] = useState<RecentScanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadRecentScans() {
      try {
        const allBatches = await getAllBatches();
        // Sort by scannedAt descending and take last 5
        const sorted = [...allBatches].sort(
          (a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
        );
        const recent = sorted.slice(0, 5);

        const items: RecentScanItem[] = [];
        for (const batch of recent) {
          const product = await getProduct(batch.barcode);
          if (product) {
            items.push({ product, batch });
          }
        }
        setScans(items);
      } catch (err) {
        console.error('Failed to load recent scans:', err);
        setError('Failed to load recent scans');
      } finally {
        setLoading(false);
      }
    }

    loadRecentScans();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '16px 0' }}>
        <div
          style={{
            height: '20px',
            width: '120px',
            background: '#334155',
            borderRadius: '4px',
            marginBottom: '12px',
            animation: 'shimmer 1.5s infinite',
          }}
        />
        <div style={{ display: 'flex', gap: '12px', overflow: 'hidden' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: '120px',
                height: '140px',
                background: '#1e293b',
                borderRadius: '12px',
                flexShrink: 0,
                animation: 'shimmer 1.5s infinite',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '16px 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            background: '#1e293b',
            borderRadius: '8px',
            color: '#f87171',
            fontSize: '14px',
          }}
        >
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (scans.length === 0) {
    return null;
  }

  return (
    <div style={{ padding: '16px 0' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <h3
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#94a3b8',
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Recent Scans
        </h3>
        <button
          onClick={() => navigate('/inventory')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#059669',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            minHeight: '44px',
          }}
        >
          View all
          <ChevronRight size={16} />
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          paddingBottom: '8px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {scans.map(({ product, batch }) => (
          <button
            key={batch.batchId}
            onClick={() => navigate(`/product/${product.barcode}`)}
            style={{
              width: '120px',
              flexShrink: 0,
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              scrollSnapAlign: 'start',
              transition: 'all 200ms ease',
              textAlign: 'center',
            }}
          >
            {/* Product image or placeholder */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '8px',
                background: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <Package size={32} color="#94a3b8" />
              )}
            </div>

            {/* Product name */}
            <div
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: '#f8fafc',
                width: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {product.name}
            </div>

            {/* Time ago */}
            <div
              style={{
                fontSize: '11px',
                color: '#94a3b8',
              }}
            >
              {timeAgo(batch.scannedAt)}
            </div>
          </button>
        ))}
      </div>

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

import { useEffect, useRef, useState } from 'react';
import { X, Package } from 'lucide-react';

interface SetStockSheetProps {
  open: boolean;
  productName: string;
  currentStock: number;
  defaultExpiry: string;
  onCancel: () => void;
  onSave: (target: number, expiryDate: string) => void;
}

/**
 * Set stock to a target count. The user types the number they actually counted;
 * the app works out whether that means adding or removing, and how much.
 */
export function SetStockSheet({
  open,
  productName,
  currentStock,
  defaultExpiry,
  onCancel,
  onSave,
}: SetStockSheetProps) {
  const [target, setTarget] = useState(String(currentStock));
  const [expiry, setExpiry] = useState(defaultExpiry);
  const inputRef = useRef<HTMLInputElement>(null);

  // Re-seed whenever the sheet opens, so it never shows a stale count.
  useEffect(() => {
    if (!open) return;
    setTarget(String(currentStock));
    setExpiry(defaultExpiry);
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, [open, currentStock, defaultExpiry]);

  if (!open) return null;

  const parsed = parseInt(target, 10);
  const isValid = !Number.isNaN(parsed) && parsed >= 0;
  const delta = isValid ? parsed - currentStock : 0;

  const handleSave = () => {
    if (!isValid) return;
    onSave(parsed, expiry);
  };

  return (
    <>
      <div
        onClick={onCancel}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="set-stock-title"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#ffffff',
          borderRadius: '16px 16px 0 0',
          padding: '24px',
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
          boxShadow: '0 -10px 15px rgba(0,0,0,0.1)',
          maxWidth: '500px',
          margin: '0 auto',
          zIndex: 50,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <h2 id="set-stock-title" style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
            Set Stock
          </h2>
          <button
            onClick={onCancel}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              minHeight: '44px',
            }}
          >
            <X size={24} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Package size={18} color="#475569" aria-hidden="true" />
          <span style={{ fontSize: '14px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {productName}
          </span>
        </div>

        <label
          htmlFor="set-stock-input"
          style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '4px' }}
        >
          Quantity in stock
        </label>
        <input
          id="set-stock-input"
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={target}
          onChange={(e) => setTarget(e.target.value.replace(/[^0-9]/g, ''))}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: isValid ? '1px solid #e6e8ea' : '2px solid #DC2626',
            borderRadius: '8px',
            fontSize: '16px',
            color: '#0f172a',
            boxSizing: 'border-box',
          }}
          aria-invalid={!isValid}
        />

        <p style={{ fontSize: '12px', color: '#64748b', margin: '8px 0 16px' }}>
          Currently {currentStock}.
          {isValid && delta !== 0 && (
            <>
              {' '}
              Saving will {delta > 0 ? 'add' : 'remove'}{' '}
              <strong>
                {Math.abs(delta)} item{Math.abs(delta) === 1 ? '' : 's'}
              </strong>
              {delta < 0 ? ' (oldest expiry first)' : ''}.
            </>
          )}
          {isValid && delta === 0 && ' No change.'}
        </p>

        {isValid && delta > 0 && (
          <>
            <label
              htmlFor="set-stock-expiry"
              style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '4px' }}
            >
              Expiry date for the added stock
            </label>
            <input
              id="set-stock-expiry"
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #e6e8ea',
                borderRadius: '8px',
                fontSize: '16px',
                color: '#0f172a',
                boxSizing: 'border-box',
                marginBottom: '16px',
              }}
            />
          </>
        )}

        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px',
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#475569',
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            style={{
              flex: 1,
              padding: '12px',
              background: isValid ? '#059669' : '#e6e8ea',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              color: isValid ? '#ffffff' : '#94a3b8',
              cursor: isValid ? 'pointer' : 'not-allowed',
              minHeight: '44px',
            }}
          >
            Save
          </button>
        </div>
      </div>
    </>
  );
}

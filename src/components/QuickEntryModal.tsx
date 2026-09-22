import { useState } from 'react';
import { X, DollarSign, Calendar } from 'lucide-react';

interface QuickEntryModalProps {
  barcode: string;
  onSave: (price: number, expiryDate: string) => void;
  onCancel: () => void;
}

export function QuickEntryModal({ barcode, onSave, onCancel }: QuickEntryModalProps) {
  const [price, setPrice] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [priceError, setPriceError] = useState('');

  const handleSave = () => {
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setPriceError('Price must be greater than 0');
      return;
    }
    if (!expiryDate) {
      // Default to 30 days from now
      const d = new Date();
      d.setDate(d.getDate() + 30);
      onSave(priceNum, d.toISOString().split('T')[0]!);
      return;
    }
    onSave(priceNum, expiryDate);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 80,
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '24px',
          width: '100%',
          maxWidth: '360px',
          boxShadow: '0 20px 25px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
            Quick Entry
          </h3>
          <button
            onClick={onCancel}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px', fontFamily: 'monospace' }}>
          {barcode}
        </p>

        <div style={{ marginBottom: '12px' }}>
          <label
            style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '4px' }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <DollarSign size={14} /> Price (₱)
            </span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={price}
            onChange={(e) => {
              const sanitized = e.target.value.replace(/[^0-9.]/g, '');
              const parts = sanitized.split('.');
              const cleaned = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : sanitized;
              setPrice(cleaned);
              setPriceError('');
            }}
            placeholder="0.00"
            autoFocus
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1.5px solid ${priceError ? '#dc2626' : '#e2e8f0'}`,
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {priceError && (
            <span style={{ fontSize: '12px', color: '#dc2626', marginTop: '2px', display: 'block' }}>
              {priceError}
            </span>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label
            style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '4px' }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={14} /> Expiry Date
            </span>
          </label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1.5px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
            Leave empty for 30 days from today
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
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
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '12px',
              background: '#0f172a',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

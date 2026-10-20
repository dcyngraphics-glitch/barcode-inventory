import { useEffect, useRef, useState } from 'react';
import { X, DollarSign, Calendar } from 'lucide-react';

export interface QuickEntryData {
  name: string;
  brand: string;
  price: number;
  expiryDate: string;
}

interface QuickEntryModalProps {
  barcode: string;
  onSave: (data: QuickEntryData) => void;
  onCancel: () => void;
}

export function QuickEntryModal({ barcode, onSave, onCancel }: QuickEntryModalProps) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [nameError, setNameError] = useState('');
  const [priceError, setPriceError] = useState('');
  const dialogRef = useRef<HTMLDivElement | null>(null);

  /**
   * Modal behaviour, matching ConfirmDialog: Escape closes, Tab cycles inside
   * the dialog rather than escaping to the page behind, and body scroll is
   * locked while it is open. QuickEntryModal was the only modal in the app
   * missing all three.
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onCancel]);

  const handleSave = () => {
    let invalid = false;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Product name is required');
      invalid = true;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setPriceError('Price must be greater than 0');
      invalid = true;
    }

    if (invalid) return;

    // Default to 30 days from now when no expiry is given
    let resolvedExpiry = expiryDate;
    if (!resolvedExpiry) {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      resolvedExpiry = d.toISOString().split('T')[0]!;
    }

    onSave({
      name: trimmedName,
      brand: brand.trim(),
      price: priceNum,
      expiryDate: resolvedExpiry,
    });
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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-entry-title"
        style={{
          background: 'var(--color-card)',
          borderRadius: '16px',
          padding: '24px',
          width: '100%',
          maxWidth: '360px',
          boxShadow: '0 20px 25px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 id="quick-entry-title" style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-foreground)' }}>
            Quick Entry
          </h3>
          <button
            onClick={onCancel}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-muted-foreground)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '12px',  color: 'var(--color-muted-foreground)', marginBottom: '16px', fontFamily: 'monospace' }}>
          {barcode}
        </p>

        {/* Product name — without this the item saves as "Unknown (barcode)" */}
        <div style={{ marginBottom: '12px' }}>
          <label
            htmlFor="quick-entry-name"
            style={{ display: 'block', fontSize: '13px', fontWeight: 500,  color: 'var(--color-secondary)', marginBottom: '4px' }}
          >
            Product name
          </label>
          <input
            id="quick-entry-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError('');
            }}
            placeholder="e.g. Bear Brand Milk"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1.5px solid ${nameError ? 'var(--color-destructive)' : 'var(--color-border)'}`,
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {nameError && (
            <span style={{ fontSize: '12px',  color: 'var(--color-destructive)', marginTop: '2px', display: 'block' }}>
              {nameError}
            </span>
          )}
        </div>

        {/* Brand */}
        <div style={{ marginBottom: '12px' }}>
          <label
            htmlFor="quick-entry-brand"
            style={{ display: 'block', fontSize: '13px', fontWeight: 500,  color: 'var(--color-secondary)', marginBottom: '4px' }}
          >
            Brand (optional)
          </label>
          <input
            id="quick-entry-brand"
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="e.g. Bear Brand"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1.5px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label
            style={{ display: 'block', fontSize: '13px', fontWeight: 500,  color: 'var(--color-secondary)', marginBottom: '4px' }}
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
              border: `1.5px solid ${priceError ? 'var(--color-destructive)' : 'var(--color-border)'}`,
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {priceError && (
            <span style={{ fontSize: '12px',  color: 'var(--color-destructive)', marginTop: '2px', display: 'block' }}>
              {priceError}
            </span>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label
            style={{ display: 'block', fontSize: '13px', fontWeight: 500,  color: 'var(--color-secondary)', marginBottom: '4px' }}
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
              border: '1.5px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <span style={{ fontSize: '12px', color: 'var(--color-muted-foreground)', marginTop: '2px', display: 'block' }}>
            Leave empty for 30 days from today
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px',
              background: 'var(--color-muted)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--color-secondary)',
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
              background: 'var(--color-primary)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-on-primary)',
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

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QuickEntryModal } from '@/components/QuickEntryModal';

describe('QuickEntryModal inventory integration', () => {
  it('passes custom product data through onSave when lookup fails (manual source)', () => {
    const onSave = vi.fn();
    render(<QuickEntryModal barcode="9999999999999" onSave={onSave} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/product name/i), { target: { value: 'Unknown Product' } });
    fireEvent.change(screen.getByLabelText(/brand/i), { target: { value: 'Custom Brand' } });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '99.99' } });
    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Unknown Product',
        brand: 'Custom Brand',
        price: 99.99,
        expiryDate: expect.any(String),
      }),
    );
  });

  it('opens modal with manual barcode when lookup returns manual source', () => {
    // The below asserts the modal can receive any barcode (manual/manual lookup failure)
    const onSave = vi.fn();
    const { rerender } = render(<QuickEntryModal barcode="MANUAL001" onSave={onSave} onCancel={vi.fn()} />);
    expect(screen.getByText('MANUAL001')).toBeInTheDocument();
  });
});

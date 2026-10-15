import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickEntryModal } from '@/components/QuickEntryModal';

const priceField = () => screen.getByPlaceholderText('0.00');
const saveButton = () => screen.getByRole('button', { name: /add to cart/i });

describe('QuickEntryModal', () => {
  it('passes name and brand through on save', () => {
    const onSave = vi.fn();
    render(<QuickEntryModal barcode="B1" onSave={onSave} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/product name/i), {
      target: { value: 'Bear Brand Milk' },
    });
    fireEvent.change(screen.getByLabelText(/brand/i), { target: { value: 'Bear Brand' } });
    fireEvent.change(priceField(), { target: { value: '12.50' } });
    fireEvent.click(saveButton());

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Bear Brand Milk',
        brand: 'Bear Brand',
        price: 12.5,
      }),
    );
  });

  it('trims whitespace from name and brand', () => {
    const onSave = vi.fn();
    render(<QuickEntryModal barcode="B1" onSave={onSave} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/product name/i), { target: { value: '  Milk  ' } });
    fireEvent.change(screen.getByLabelText(/brand/i), { target: { value: '  B  ' } });
    fireEvent.change(priceField(), { target: { value: '5' } });
    fireEvent.click(saveButton());

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Milk', brand: 'B' }),
    );
  });

  it('requires a name, so the item is never saved as "Unknown"', () => {
    const onSave = vi.fn();
    render(<QuickEntryModal barcode="B1" onSave={onSave} onCancel={vi.fn()} />);

    fireEvent.change(priceField(), { target: { value: '5' } });
    fireEvent.click(saveButton());

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/product name is required/i)).toBeInTheDocument();
  });

  it('requires a price above zero', () => {
    const onSave = vi.fn();
    render(<QuickEntryModal barcode="B1" onSave={onSave} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/product name/i), { target: { value: 'Milk' } });
    fireEvent.change(priceField(), { target: { value: '0' } });
    fireEvent.click(saveButton());

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/price must be greater than 0/i)).toBeInTheDocument();
  });

  it('defaults the expiry to 30 days out when none is given', () => {
    const onSave = vi.fn();
    render(<QuickEntryModal barcode="B1" onSave={onSave} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/product name/i), { target: { value: 'Milk' } });
    fireEvent.change(priceField(), { target: { value: '5' } });
    fireEvent.click(saveButton());

    const expected = new Date();
    expected.setDate(expected.getDate() + 30);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ expiryDate: expected.toISOString().split('T')[0] }),
    );
  });
});

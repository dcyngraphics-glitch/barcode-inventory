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

/**
 * The pooled audit found QuickEntryModal was the ONLY modal in the app with no
 * `role="dialog"`, no `aria-modal`, no Escape handler and no focus trap.
 * These mirror the ConfirmDialog pattern the rest of the app already follows.
 */
describe('QuickEntryModal — modal accessibility', () => {
  it('exposes itself as a modal dialog', () => {
    render(<QuickEntryModal barcode="B1" onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('moves focus into the dialog on open', () => {
    render(<QuickEntryModal barcode="B1" onSave={vi.fn()} onCancel={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('closes on Escape', () => {
    const onCancel = vi.fn();
    render(<QuickEntryModal barcode="B1" onSave={vi.fn()} onCancel={onCancel} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('traps Tab focus inside the dialog', () => {
    render(<QuickEntryModal barcode="B1" onSave={vi.fn()} onCancel={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    );
    expect(focusable.length).toBeGreaterThan(2);

    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('locks body scroll while open and restores it on unmount', () => {
    const { unmount } = render(
      <QuickEntryModal barcode="B1" onSave={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});

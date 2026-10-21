import { render, screen, act } from '@testing-library/react';
import { PermissionPromptModal } from '@/components/PermissionPromptModal';
import { vi } from 'vitest';
import { fireEvent } from '@testing-library/react';

describe('PermissionPromptModal', () => {
  it('renders title, description, and two buttons', () => {
    render(<PermissionPromptModal />);

    // Expect to see the title
    expect(screen.getByText(/camera access/i)).toBeInTheDocument();
    // Expect to see the description
    expect(screen.getByText(/to scan barcodes and add products to your inventory/i)).toBeInTheDocument();
    // Expect to see the Allow button
    expect(screen.getByRole('button', { name: /allow/i })).toBeInTheDocument();
    // Expect to see the Deny button
    expect(screen.getByRole('button', { name: /deny/i })).toBeInTheDocument();
  });

  it('calls onConfirm when Allow button is clicked', async () => {
    const onConfirm = vi.fn();
    render(<PermissionPromptModal onConfirm={onConfirm} />);

    const allowButton = screen.getByRole('button', { name: /allow/i });
    await act(() => {
      allowButton.click();
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onDeny when Deny button is clicked', async () => {
    const onDeny = vi.fn();
    render(<PermissionPromptModal onDeny={onDeny} />);

    const denyButton = screen.getByRole('button', { name: /deny/i });
    await act(() => {
      denyButton.click();
    });

    expect(onDeny).toHaveBeenCalledTimes(1);
  });

  it('exposes itself as a modal dialog', () => {
    render(<PermissionPromptModal onConfirm={vi.fn()} onDeny={vi.fn()} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('moves focus into the dialog on open', () => {
    render(<PermissionPromptModal onConfirm={vi.fn()} onDeny={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('closes on Escape', () => {
    const onDeny = vi.fn();
    render(<PermissionPromptModal onConfirm={vi.fn()} onDeny={onDeny} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onDeny).toHaveBeenCalledTimes(1);
  });

  it('traps Tab focus inside the dialog', () => {
    render(<PermissionPromptModal onConfirm={vi.fn()} onDeny={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    );
    expect(focusable.length).toBeGreaterThan(1);

    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('returns focus to trigger element on close', () => {
    const onDeny = vi.fn();
    const trigger = document.createElement('button');
    trigger.textContent = 'Open Modal';
    document.body.appendChild(trigger);
    trigger.focus();

    render(<PermissionPromptModal onConfirm={vi.fn()} onDeny={onDeny} />);

    // Modal is open, focus should be inside
    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);

    // Close the modal
    fireEvent.keyDown(document, { key: 'Escape' });

    // Focus should return to trigger
    expect(document.activeElement).toBe(trigger);

    document.body.removeChild(trigger);
  });
});
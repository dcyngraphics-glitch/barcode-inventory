import { render, screen, act } from '@testing-library/react';
import { PermissionPromptModal } from '@/components/PermissionPromptModal';
import { vi } from 'vitest';

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
});
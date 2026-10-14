import { render, screen, act } from '@testing-library/react';
import { InstallPromotionBanner } from '@/components/InstallPromotionBanner';
import { vi } from 'vitest';

describe('InstallPromotionBanner', () => {
  it('does not render when visible is false', () => {
    render(<InstallPromotionBanner visible={false} onInstall={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });

  it('renders when visible is true', () => {
    const onInstall = vi.fn();
    const onClose = vi.fn();
    render(<InstallPromotionBanner visible={true} onInstall={onInstall} onClose={onClose} />);

    // Expect banner role
    expect(screen.getByRole('banner')).toBeInTheDocument();
    // Expect title and description
    expect(screen.getByText(/install the app/i)).toBeInTheDocument();
    expect(screen.getByText(/get faster access/i)).toBeInTheDocument();
    // Expect buttons
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /install/i })).toBeInTheDocument();
  });

  it('calls onInstall when Install button clicked', async () => {
    const onInstall = vi.fn();
    const onClose = vi.fn();
    render(<InstallPromotionBanner visible={true} onInstall={onInstall} onClose={onClose} />);

    const installBtn = screen.getByRole('button', { name: /install/i });
    await act(() => {
      installBtn.click();
    });
    expect(onInstall).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Close button clicked', async () => {
    const onInstall = vi.fn();
    const onClose = vi.fn();
    render(<InstallPromotionBanner visible={true} onInstall={onInstall} onClose={onClose} />);

    const closeBtn = screen.getByRole('button', { name: /close/i });
    await act(() => {
      closeBtn.click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
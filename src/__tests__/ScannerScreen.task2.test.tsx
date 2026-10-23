import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ScannerScreen } from '@/screens/ScannerScreen';
import { ModeProvider } from '@/context/ModeContext';
import { ScanCartProvider } from '@/context/ScanCartContext';

describe('ScannerScreen task 2', () => {
  const wrap = (ui: React.ReactElement) =>
    render(ui, { wrapper: ({ children }) => (
      <MemoryRouter><ModeProvider><ScanCartProvider>{children}</ScanCartProvider></ModeProvider></MemoryRouter>
    )});

  it('cart badge aria-label is descriptive', () => {
    wrap(<ScannerScreen />);
    const btn = screen.getByRole('button', { name: /cart/i });
    expect(btn).toHaveAttribute('aria-label', expect.stringContaining('items'));
    expect(btn.getAttribute('aria-label')).toMatch(/Cart with \d+ items, ₱[\d.]+ total/);
  });

  it('AppModeSwitcher present in app bar', async () => {
    wrap(<ScannerScreen />);
    const radiogroup = await screen.findByRole('radiogroup', { name: /app section/i });
    expect(radiogroup).toBeInTheDocument();
  });
});

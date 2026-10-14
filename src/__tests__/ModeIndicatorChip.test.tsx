import { render, screen } from '@testing-library/react';
import { ModeIndicatorChip } from '@/components/ModeIndicatorChip';
import { SettingsProvider } from '@/context/SettingsContext';

describe('ModeIndicatorChip', () => {
  it('renders cashier mode indicator when active', () => {
    render(
      <SettingsProvider>
        <ModeIndicatorChip mode="cashier" />
      </SettingsProvider>
    );
    expect(screen.getByText(/cashier/i)).toHaveClass('bg-green-100 text-green-800');
  });

  it('renders seller mode indicator when active', () => {
    render(
      <SettingsProvider>
        <ModeIndicatorChip mode="seller" />
      </SettingsProvider>
    );
    expect(screen.getByText(/seller/i)).toHaveClass('bg-blue-100 text-blue-800');
  });

  it('shows default state when no mode active', () => {
    render(
      <SettingsProvider>
        <ModeIndicatorChip mode="default" />
      </SettingsProvider>
    );
    expect(screen.getByText(/standard/i)).toHaveClass('bg-gray-100 text-gray-800');
  });
});
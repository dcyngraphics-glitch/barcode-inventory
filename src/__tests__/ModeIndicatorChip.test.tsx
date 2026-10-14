import { render, screen } from '@testing-library/react';
import { ModeIndicatorChip } from '@/components/ModeIndicatorChip';

describe('ModeIndicatorChip', () => {
  it('renders cashier mode indicator when active', () => {
    render(<ModeIndicatorChip mode="cashier" />);
    expect(screen.getByText(/cashier/i)).toHaveClass('bg-green-100 text-green-800');
  });

  it('renders seller mode indicator when active', () => {
    render(<ModeIndicatorChip mode="seller" />);
    expect(screen.getByText(/seller/i)).toHaveClass('bg-blue-100 text-blue-800');
  });

  it('shows default state when no mode active', () => {
    render(<ModeIndicatorChip mode="default" />);
    expect(screen.getByText(/standard/i)).toHaveClass('bg-gray-100 text-gray-800');
  });
});
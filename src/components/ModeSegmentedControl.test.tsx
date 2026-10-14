import { render, screen, fireEvent } from '@testing-library/react';
import { ModeSegmentedControl } from '@/components/ModeSegmentedControl';
import { vi } from 'vitest';

describe('ModeSegmentedControl', () => {
  test('renders two segments', () => {
    render(<ModeSegmentedControl mode="auto" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /auto/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /manual/i })).toBeInTheDocument();
  });

  test('calls onChange when a button is clicked', () => {
    const onChange = vi.fn();
    render(<ModeSegmentedControl mode="auto" onChange={onChange} />);
    const manualBtn = screen.getByRole('button', { name: /manual/i });
    fireEvent.click(manualBtn);
    expect(onChange).toHaveBeenCalledWith('manual');
  });

  test('highlights active segment', () => {
    const { container } = render(<ModeSegmentedControl mode="manual" onChange={() => {}} />);
    const autoBtn = screen.getByRole('button', { name: /auto/i });
    const manualBtn = screen.getByRole('button', { name: /manual/i });
    expect(autoBtn).not.toHaveClass('active');
    expect(manualBtn).toHaveClass('active');
  });
});
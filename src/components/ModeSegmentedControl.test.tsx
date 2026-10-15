import { render, screen, fireEvent } from '@testing-library/react';
import { ModeSegmentedControl } from '@/components/ModeSegmentedControl';
import { vi } from 'vitest';

describe('ModeSegmentedControl', () => {
  test('renders as a switch with correct initial state', () => {
    render(<ModeSegmentedControl mode="auto" onChange={() => {}} />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  test('shows manual mode as checked', () => {
    render(<ModeSegmentedControl mode="manual" onChange={() => {}} />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  test('toggles from auto to manual on click', () => {
    const onChange = vi.fn();
    render(<ModeSegmentedControl mode="auto" onChange={onChange} />);
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith('manual');
  });

  test('toggles from manual to auto on click', () => {
    const onChange = vi.fn();
    render(<ModeSegmentedControl mode="manual" onChange={onChange} />);
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith('auto');
  });

  test('has accessible label', () => {
    render(<ModeSegmentedControl mode="auto" onChange={() => {}} />);
    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-label')).toMatch(/scan mode/i);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SalesScreen } from '@/screens/SalesScreen';

// SalesScreen reads the device-local mode, not the synced cashierMode setting.
const h = vi.hoisted(() => ({ isSell: true, hasLoaded: false }));

vi.mock('@/context/ModeContext', () => ({
  useMode: () => ({
    mode: h.isSell ? 'sell' : 'shop',
    isSell: h.isSell,
    setMode: vi.fn(),
    hasLoaded: h.hasLoaded,
  }),
}));

describe('SalesScreen loading state', () => {
  beforeEach(() => {
    h.isSell = true;
    h.hasLoaded = false;
  });

  it('renders a skeleton instead of a blank frame while settings load', () => {
    render(<MemoryRouter><SalesScreen /></MemoryRouter>);

    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('renders something rather than nothing on first paint', () => {
    const { container } = render(<MemoryRouter><SalesScreen /></MemoryRouter>);

    // The exact shape of the defect this guards: the screen returned null while
    // settings loaded, so React mounted nothing at all and a reload of /sales
    // painted an empty frame with no sign that anything was happening.
    // Asserting on textContent would not work — the skeleton is deliberately
    // text-free — so assert on the mounted tree instead.
    expect(container.firstChild).not.toBeNull();
  });

  it('announces the loading state to assistive tech', () => {
    render(<MemoryRouter><SalesScreen /></MemoryRouter>);

    const skeleton = screen.getByTestId('loading-skeleton');
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
    expect(skeleton).toHaveAttribute('role', 'status');
    expect(skeleton).toHaveAccessibleName('Loading sales');
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FilterChips } from '@/components/FilterChips';

/**
 * The container class is the contract: the spacing itself lives in index.css
 * (.filter-chips--spacious), so the DOM test can only prove the class is
 * applied. The declaration is asserted by cssContract.test.ts.
 */
describe('FilterChips', () => {
  it('marks its container as spacious so the chips get breathing room', () => {
    render(<FilterChips active="all" onChange={vi.fn()} />);

    const list = screen.getByRole('tablist', { name: /filter by expiry status/i });
    expect(list).toHaveClass('filter-chips');
    expect(list).toHaveClass('filter-chips--spacious');
  });

  it('selects the active filter and reports the change', () => {
    const onChange = vi.fn();
    render(<FilterChips active="expiring" onChange={onChange} />);

    expect(screen.getByRole('tab', { name: 'Expiring Soon' })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    screen.getByRole('tab', { name: 'Expired' }).click();
    expect(onChange).toHaveBeenCalledWith('expired');
  });
});

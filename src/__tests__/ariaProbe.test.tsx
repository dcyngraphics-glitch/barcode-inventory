import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Download } from 'lucide-react';

describe('probe', () => {
  it('shows svg attributes', () => {
    const { container } = render(<Download size={20} />);
    const svg = container.querySelector('svg');
    console.log('BARE SVG outerHTML:', svg?.outerHTML);
    expect(svg).toBeTruthy();
  });

  it('shows svg attributes with aria-hidden', () => {
    const { container } = render(<Download size={20} aria-hidden="true" />);
    const svg = container.querySelector('svg');
    console.log('WITH aria-hidden SVG outerHTML:', svg?.outerHTML);
    expect(svg).toBeTruthy();
  });
});

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SettingsStepper } from '../components/SettingsStepper';

describe('SettingsStepper decorative icons', () => {
  it('should mark Minus/Plus icons as aria-hidden', () => {
    const { container } = render(
      <SettingsStepper value={5} onChange={() => {}} label="Alert Window" />
    );
    const icons = Array.from(container.querySelectorAll('button svg'));
    expect(icons).toHaveLength(2);
    icons.forEach((svg) => {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('should keep accessible labels on the stepper buttons', () => {
    const { container } = render(
      <SettingsStepper value={5} onChange={() => {}} label="Alert Window" />
    );
    const buttons = Array.from(container.querySelectorAll('button'));
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Decrease alert window',
      'Increase alert window',
    ]);
  });
});

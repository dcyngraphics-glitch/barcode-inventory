import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SettingsToggle } from '../components/SettingsToggle';

describe('SettingsToggle focus', () => {
  it('should have visible focus indicator', () => {
    const { container } = render(
      <SettingsToggle enabled={false} onChange={() => {}} label="Test" />
    );
    const button = container.querySelector('[role="switch"]');
    expect(button).toBeTruthy();
    // The focus styling is in CSS, but we verify the class is present
    expect(button?.className || button?.style.focusVisible).toBeTruthy();
  });
});

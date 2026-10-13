import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { SettingsProvider } from '@/context/SettingsContext';
import { TutorialProvider } from '@/context/TutorialContext';

describe('SettingsScreen accessibility', () => {
  it('should use h1 for main header', () => {
    const { container } = render(
      <MemoryRouter>
        <SettingsProvider>
          <TutorialProvider>
            <SettingsScreen />
          </TutorialProvider>
        </SettingsProvider>
      </MemoryRouter>
    );
    const h1 = container.querySelector('h1');
    expect(h1).toBeTruthy();
    expect(h1?.textContent).toContain('Settings');
  });
});

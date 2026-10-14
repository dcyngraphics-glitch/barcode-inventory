import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { SettingsProvider } from '@/context/SettingsContext';
import { TutorialProvider } from '@/context/TutorialContext';
import { AuthProvider } from '@/context/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import { DEFAULT_SETTINGS } from '@/types';
import { getPermissionStatus } from '@/services/notificationService';

// Mock the notification service so getPermissionStatus calls can be counted.
// requestPermission is unused in this test but must exist since SettingsScreen imports it.
vi.mock('@/services/notificationService', () => ({
  getPermissionStatus: vi.fn(() => 'granted' as NotificationPermission),
  requestPermission: vi.fn(),
}));

// Mock useSettings with notifications enabled — the render-cycle call being
// guarded against only runs when notifications are on, so the spy must
// actually be exercised for the regression signal to be meaningful.
vi.mock('@/hooks/useSettings');

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSettings).mockReturnValue({
    settings: { ...DEFAULT_SETTINGS, notificationsEnabled: true },
    updateSettings: vi.fn(),
  });
});

const renderSettings = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <SettingsProvider>
          <TutorialProvider>
            <SettingsScreen />
          </TutorialProvider>
        </SettingsProvider>
      </AuthProvider>
    </MemoryRouter>
  );

describe('SettingsScreen permission status', () => {
  it('should not call getPermissionStatus on every render', () => {
    const { getByText } = renderSettings();

    // Sanity check: the component renders with the Settings header
    expect(getByText('Settings')).toBeTruthy();

    // The lazy state initializer reads permission status exactly once on mount
    expect(getPermissionStatus).toHaveBeenCalledTimes(1);

    // Force a re-render through a local state change (opens the clear-data dialog)
    fireEvent.click(getByText('Delete Everything'));

    // Re-render must NOT trigger another getPermissionStatus call
    expect(getPermissionStatus).toHaveBeenCalledTimes(1);
  });
});

describe('SettingsScreen accessibility', () => {
  it('should use h1 for main header', () => {
    const { container } = render(
      <MemoryRouter>
        <AuthProvider>
          <SettingsProvider>
            <TutorialProvider>
              <SettingsScreen />
            </TutorialProvider>
          </SettingsProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    const h1 = container.querySelector('h1');
    expect(h1).toBeTruthy();
    expect(h1?.textContent).toContain('Settings');
  });
});

describe('SettingsScreen About links', () => {
  const ABOUT_LINKS = [
    { label: 'View on GitHub', href: 'https://github.com/dcyngraphics-glitch/barcode-inventory' },
    { label: 'Licenses', href: 'https://github.com/dcyngraphics-glitch/barcode-inventory#license' },
  ];

  const renderSettings = () =>
    render(
      <MemoryRouter>
        <AuthProvider>
          <SettingsProvider>
            <TutorialProvider>
              <SettingsScreen />
            </TutorialProvider>
          </SettingsProvider>
        </AuthProvider>
      </MemoryRouter>
    );

  it.each(ABOUT_LINKS)('should point $label at $href', ({ label, href }) => {
    const { container } = renderSettings();
    const link = Array.from(container.querySelectorAll('a')).find(
      (a) => a.textContent?.trim() === label
    );
    expect(link).toBeTruthy();
    expect(link?.getAttribute('href')).toBe(href);
  });

  it('should not link to the malformed github.com/blob path', () => {
    const { container } = renderSettings();
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');
    expect(hrefs.some((h) => h.includes('github.com/blob'))).toBe(false);
  });

  it('should not link to the generic github.com homepage', () => {
    const { container } = renderSettings();
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');
    expect(hrefs).not.toContain('https://github.com');
  });
});

describe('SettingsScreen decorative icons', () => {
  const renderSettings = () =>
    render(
      <MemoryRouter>
        <AuthProvider>
          <SettingsProvider>
            <TutorialProvider>
              <SettingsScreen />
            </TutorialProvider>
          </SettingsProvider>
        </AuthProvider>
      </MemoryRouter>
    );

  it('should mark icons inside buttons as aria-hidden', () => {
    const { container } = renderSettings();
    const icons = Array.from(container.querySelectorAll('button svg'));
    expect(icons.length).toBeGreaterThan(0);
    icons.forEach((svg) => {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('should mark icons inside About links as aria-hidden', () => {
    const { container } = renderSettings();
    const icons = Array.from(container.querySelectorAll('a svg'));
    expect(icons.length).toBeGreaterThan(0);
    icons.forEach((svg) => {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    });
  });
});

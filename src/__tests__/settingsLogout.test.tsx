import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsScreen } from '@/screens/SettingsScreen';

import { DEFAULT_SETTINGS } from '@/types';

// ---- Module-scope mocks ----

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockCloudLogout = vi.fn().mockResolvedValue(undefined);

vi.mock('@/context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/context/AuthContext')>();
  return {
    ...actual,
    useAuth: () => ({
      cloudUser: 'me@example.com',
      cloudError: '',
      cloudLogin: vi.fn(),
      cloudLogout: mockCloudLogout,
    }),
  };
});

const mockUpdateSettings = vi.fn();
vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    settings: { ...DEFAULT_SETTINGS },
    updateSettings: mockUpdateSettings,
  }),
}));

vi.mock('@/context/TutorialContext', () => ({
  useTutorial: () => ({ reopen: vi.fn() }),
}));

vi.mock('@/services/notificationService', () => ({
  requestPermission: vi.fn().mockResolvedValue('granted'),
  getPermissionStatus: vi.fn().mockReturnValue('default'),
}));

vi.mock('@/services/catalogService', () => ({
  getAllProducts: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/services/inventoryService', () => ({
  getAllBatches: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/db/database', () => ({
  getDB: vi.fn().mockResolvedValue({
    clear: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/components/SettingsToggle', () => ({
  SettingsToggle: ({ label }: { label: string }) => <div>{label}</div>,
}));

vi.mock('@/components/SettingsStepper', () => ({
  SettingsStepper: ({ label }: { label: string }) => <div>{label}</div>,
}));

vi.mock('@/components/ConfirmDialog', () => ({
  ConfirmDialog: () => null,
}));

vi.mock('@/components/Toast', () => ({
  Toast: () => null,
  useToast: () => ({ toasts: [], showToast: vi.fn(), dismissToast: vi.fn() }),
}));

// ---- Helpers ----

function renderSettings() {
  return render(
    <MemoryRouter>
      <SettingsScreen />
    </MemoryRouter>,
  );
}

// ---- Tests ----

describe('SettingsScreen – Security section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render a Security section heading', () => {
    renderSettings();
    expect(screen.getByText('Security')).toBeInTheDocument();
  });

  it('should render a Log Out button', () => {
    renderSettings();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });

  it('should sign out through Dexie Cloud when Log Out is clicked', () => {
    renderSettings();
    const btn = screen.getByRole('button', { name: /log out/i });
    act(() => {
      btn.click();
    });
    expect(mockCloudLogout).toHaveBeenCalledTimes(1);
  });

  // d2042c8 removed the navigate('/login') call: there is no /login route, so it
  // bounced users to a dead path. Logout only clears auth; the route guard redirects.
  it('should not navigate to a non-existent /login route after logout', () => {
    renderSettings();
    const btn = screen.getByRole('button', { name: /log out/i });
    act(() => {
      btn.click();
    });
    expect(mockCloudLogout).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalledWith('/login');
  });
});

describe('SettingsScreen – removed sections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Signing in now happens at the gate before the app is usable, so a Sync section
  // buried in Settings is both redundant and misleading.
  it('no longer renders a Sync section', () => {
    renderSettings();
    expect(screen.queryByText(/^sync$/i)).not.toBeInTheDocument();
  });

  // The account login replaced the master password entirely.
  it('no longer renders a Master Password field', () => {
    renderSettings();
    expect(screen.queryByLabelText(/master password/i)).not.toBeInTheDocument();
  });

  it('no longer renders a Save Master Password button', () => {
    renderSettings();
    expect(screen.queryByRole('button', { name: /save master password/i })).not.toBeInTheDocument();
  });
});

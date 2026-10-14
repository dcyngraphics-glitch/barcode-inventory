import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { useAuth } from '@/context/AuthContext';
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

const mockLogout = vi.fn();
const mockSetMasterPassword = vi.fn();
const mockGetMasterPassword = vi.fn().mockReturnValue('current-password');
const mockLogin = vi.fn().mockReturnValue(true);

vi.mock('@/context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/context/AuthContext')>();
  return {
    ...actual,
    useAuth: () => ({
      isAuthenticated: true,
      login: mockLogin,
      logout: mockLogout,
      getMasterPassword: mockGetMasterPassword,
      setMasterPassword: mockSetMasterPassword,
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
    </MemoryRouter>
  );
}

// ---- Tests ----

describe('SettingsScreen – Security section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMasterPassword.mockReturnValue('current-password');
  });

  it('should render a Security section heading', () => {
    renderSettings();
    expect(screen.getByText('Security')).toBeInTheDocument();
  });

  it('should render a Log Out button', () => {
    renderSettings();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });

  it('should call logout() when Log Out is clicked', () => {
    renderSettings();
    const btn = screen.getByRole('button', { name: /log out/i });
    act(() => {
      btn.click();
    });
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('should navigate to /login after logout', () => {
    renderSettings();
    const btn = screen.getByRole('button', { name: /log out/i });
    act(() => {
      btn.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should render a Master Password field', () => {
    renderSettings();
    expect(screen.getByLabelText(/master password/i)).toBeInTheDocument();
  });

  it('should render a Save Master Password button', () => {
    renderSettings();
    expect(screen.getByRole('button', { name: /save master password/i })).toBeInTheDocument();
  });

  it('should call setMasterPassword with the new password when save is clicked', () => {
    renderSettings();
    const input = screen.getByLabelText(/master password/i);
    fireEvent.change(input, { target: { value: 'new-secret' } });
    const btn = screen.getByRole('button', { name: /save master password/i });
    act(() => {
      btn.click();
    });
    expect(mockSetMasterPassword).toHaveBeenCalledWith('new-secret');
  });
});

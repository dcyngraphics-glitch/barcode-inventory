import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InventoryScreen } from '@/screens/InventoryScreen';
import { SettingsProvider } from '@/context/SettingsContext';
import { ModeProvider } from '@/context/ModeContext';
import { TutorialProvider } from '@/context/TutorialContext';
import { AuthProvider } from '@/context/AuthContext';
import { useInventory } from '@/hooks/useInventory';

vi.mock('@/hooks/useInventory', () => ({
  useInventory: vi.fn(),
}));

vi.mock('@/context/SettingsContext', async () => {
  const actual = await vi.importActual('@/context/SettingsContext');
  return {
    ...actual,
    useSettingsContext: vi.fn(() => ({
      settings: { cashierMode: false },
      updateSettings: vi.fn(),
      hasLoaded: true,
    })),
  };
});

const mockUseInventory = vi.mocked(useInventory);

beforeEach(() => {
  vi.clearAllMocks();
  mockUseInventory.mockReturnValue({
    groups: [],
    loading: false,
    addBatch: vi.fn(),
    deleteBatch: vi.fn(),
    refresh: vi.fn(),
  });
});

describe('InventoryScreen - Empty state on first run', () => {
  it('shows empty state when no inventory exists', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <SettingsProvider>
            <ModeProvider>
              <TutorialProvider>
                <InventoryScreen />
              </TutorialProvider>
            </ModeProvider>
          </SettingsProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    // EmptyState should be present
    expect(screen.getByText(/Your inventory is empty/i)).toBeInTheDocument();
  });

  it('shows search bar even with empty inventory', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <SettingsProvider>
            <ModeProvider>
              <TutorialProvider>
                <InventoryScreen />
              </TutorialProvider>
            </ModeProvider>
          </SettingsProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    // Search bar should be present
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('shows loading skeleton while inventory loads', () => {
    mockUseInventory.mockReturnValue({
      groups: [],
      loading: true,
      addBatch: vi.fn(),
      deleteBatch: vi.fn(),
      refresh: vi.fn(),
    });
    render(
      <MemoryRouter>
        <AuthProvider>
          <SettingsProvider>
            <ModeProvider>
              <TutorialProvider>
                <InventoryScreen />
              </TutorialProvider>
            </ModeProvider>
          </SettingsProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
  });
});
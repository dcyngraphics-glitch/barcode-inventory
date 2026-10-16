import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { SettingsProvider, useSettingsContext } from '../context/SettingsContext';
import { DEFAULT_SETTINGS } from '../types';
import { loadSettings, saveSettings } from '../services/settingsService';

vi.mock('../services/settingsService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/settingsService')>();
  return {
    ...actual,
    loadSettings: vi.fn(),
    saveSettings: vi.fn().mockResolvedValue(undefined),
  };
});

function TestConsumer() {
  const { settings, updateSettings } = useSettingsContext();
  return (
    <div>
      <div data-testid="theme">{settings.theme}</div>
      <div data-testid="alert-window">{settings.alertWindowDays}</div>
      <button onClick={() => updateSettings({ theme: 'dark' })}>Set Dark</button>
      <button onClick={() => updateSettings({ alertWindowDays: 7 })}>Set Alert</button>
    </div>
  );
}

describe('SettingsContext', () => {
  beforeEach(() => {
    vi.mocked(loadSettings).mockResolvedValue({ ...DEFAULT_SETTINGS });
    vi.mocked(saveSettings).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should initialize with default settings immediately', () => {
    const { getByTestId } = render(
      <SettingsProvider>
        <TestConsumer />
      </SettingsProvider>
    );
    expect(getByTestId('theme')).toHaveTextContent('auto');
  });

  it('should apply updates to settings immediately', async () => {
    const { getByTestId, getByText } = render(
      <SettingsProvider>
        <TestConsumer />
      </SettingsProvider>
    );

    await act(async () => {});

    await act(async () => {
      getByText('Set Dark').click();
    });

    expect(getByTestId('theme')).toHaveTextContent('dark');
  });

  it('should load stored settings asynchronously', async () => {
    vi.mocked(loadSettings).mockResolvedValue({
      ...DEFAULT_SETTINGS,
      theme: 'dark',
      alertWindowDays: 14,
    });

    const { getByTestId } = render(
      <SettingsProvider>
        <TestConsumer />
      </SettingsProvider>
    );

    await act(async () => {});

    expect(getByTestId('theme')).toHaveTextContent('dark');
    expect(getByTestId('alert-window')).toHaveTextContent('14');
  });

  it('should not clobber updates made before the load settles', async () => {
    let resolveLoad: (s: typeof DEFAULT_SETTINGS) => void = () => {};
    vi.mocked(loadSettings).mockImplementation(
      () => new Promise((resolve) => { resolveLoad = resolve; })
    );

    const { getByTestId, getByText } = render(
      <SettingsProvider>
        <TestConsumer />
      </SettingsProvider>
    );

    // User toggles before load resolves
    await act(async () => {
      getByText('Set Dark').click();
    });
    await act(async () => {
      getByText('Set Alert').click();
    });

    // Load resolves afterwards
    await act(async () => {
      resolveLoad({ ...DEFAULT_SETTINGS });
    });

    expect(getByTestId('theme')).toHaveTextContent('dark');
    expect(getByTestId('alert-window')).toHaveTextContent('7');
  });

  // Saves are deliberately immediate, not debounced: d2042c8 removed the 500ms
  // debounce because it prevented Cashier Mode from persisting when the user
  // navigated away before the timer fired.
  it('should save immediately after an update, without waiting for a timer', async () => {
    const { getByText } = render(
      <SettingsProvider>
        <TestConsumer />
      </SettingsProvider>
    );

    await act(async () => {});

    await act(async () => {
      getByText('Set Dark').click();
    });

    expect(saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'dark' })
    );
  });

  it('should persist the latest merged settings after rapid updates', async () => {
    const { getByText } = render(
      <SettingsProvider>
        <TestConsumer />
      </SettingsProvider>
    );

    await act(async () => {});

    await act(async () => {
      getByText('Set Dark').click();
    });
    await act(async () => {
      getByText('Set Alert').click();
    });

    expect(saveSettings).toHaveBeenLastCalledWith(
      expect.objectContaining({ theme: 'dark', alertWindowDays: 7 })
    );
  });

  it('should save the loaded settings once load settles', async () => {
    render(
      <SettingsProvider>
        <TestConsumer />
      </SettingsProvider>
    );

    await act(async () => {});

    expect(saveSettings).toHaveBeenCalledTimes(1);
    expect(saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'auto' })
    );
  });

  it('should keep defaults when loadSettings fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(loadSettings).mockRejectedValue(new Error('DB down'));

    const { getByTestId } = render(
      <SettingsProvider>
        <TestConsumer />
      </SettingsProvider>
    );

    await act(async () => {});

    expect(getByTestId('theme')).toHaveTextContent('auto');
    expect(getByTestId('alert-window')).toHaveTextContent(String(DEFAULT_SETTINGS.alertWindowDays));
    consoleError.mockRestore();
  });
});

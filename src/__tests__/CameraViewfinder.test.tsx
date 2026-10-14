import { render, screen, act } from '@testing-library/react';
import { CameraViewfinder } from '@/components/CameraViewfinder';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock useBarcodeScanner
const mockStart = vi.fn().mockResolvedValue(undefined);
const mockStop = vi.fn();
const mockCaptureFrame = vi.fn().mockResolvedValue(null);

vi.mock('@/hooks/useBarcodeScanner', () => ({
  useBarcodeScanner: () => ({
    scanning: false,
    error: null,
    errorType: 'unknown',
    processing: false,
    hasBarcodeDetector: false,
    start: mockStart,
    stop: mockStop,
    captureFrame: mockCaptureFrame,
  }),
}));

// Default: permission granted
const mockPermissionsQuery = vi.fn().mockResolvedValue({ state: 'granted' });

// Mock navigator.permissions
Object.defineProperty(globalThis.navigator, 'permissions', {
  value: { query: mockPermissionsQuery },
  writable: true,
  configurable: true,
});

describe('CameraViewfinder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPermissionsQuery.mockResolvedValue({ state: 'granted' });
  });

  it('auto-starts camera when permission is previously granted', async () => {
    mockPermissionsQuery.mockResolvedValue({ state: 'granted' });

    await act(async () => {
      render(<CameraViewfinder onScan={() => {}} />);
    });

    // Should NOT show start button — camera should be active immediately
    expect(screen.queryByText('Start Camera')).not.toBeInTheDocument();

    // Should show the video element (camera active)
    const video = document.querySelector('video');
    expect(video).not.toBeNull();
  });

  it('shows start button when permission state is prompt', async () => {
    mockPermissionsQuery.mockResolvedValue({ state: 'prompt' });

    await act(async () => {
      render(<CameraViewfinder onScan={() => {}} />);
    });

    // Should show start button
    expect(screen.getByText('Start Camera')).toBeInTheDocument();

    // Should NOT show video element
    const video = document.querySelector('video');
    expect(video).toBeNull();
  });

  it('shows error state when permission is denied', async () => {
    mockPermissionsQuery.mockResolvedValue({ state: 'denied' });

    await act(async () => {
      render(<CameraViewfinder onScan={() => {}} />);
    });

    // Should show permission denied error
    expect(screen.getByText('Camera permission required')).toBeInTheDocument();

    // Should NOT show start button
    expect(screen.queryByText('Start Camera')).not.toBeInTheDocument();
  });
});

import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
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

    // start() should have been called to activate the camera stream
    expect(mockStart).toHaveBeenCalled();
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

  it('falls back to prompt when navigator.permissions is unavailable', async () => {
    mockPermissionsQuery.mockRejectedValue(new Error('Permissions API not supported'));

    await act(async () => {
      render(<CameraViewfinder onScan={() => {}} />);
    });

    // Should show start button (permission defaults to 'prompt' on catch)
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

  it('clears the permission overlay on Retry once access has been granted in the browser', async () => {
    // Regression: permissionState was read once on mount and never again, so a 'denied'
    // reading stuck forever — granting access in the browser's site settings and tapping
    // "Retry camera access" did nothing, because the overlay keyed off a value that
    // nothing ever re-read.
    mockPermissionsQuery.mockResolvedValue({ state: 'denied' });

    await act(async () => {
      render(<CameraViewfinder onScan={() => {}} />);
    });
    expect(screen.getByText('Camera permission required')).toBeInTheDocument();

    // The user grants access in the browser's site settings, then taps Retry.
    mockPermissionsQuery.mockResolvedValue({ state: 'granted' });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /retry camera access/i }));
    });

    await waitFor(() => {
      expect(screen.queryByText('Camera permission required')).not.toBeInTheDocument();
    });
  });

  it('re-reads the permission when the window regains focus', async () => {
      // Coming back from the browser's settings should clear the overlay without the user
      // having to find the Retry button.
      mockPermissionsQuery.mockResolvedValue({ state: 'denied' });

      await act(async () => {
        render(<CameraViewfinder onScan={() => {}} />);
      });
      expect(screen.getByText('Camera permission required')).toBeInTheDocument();

      mockPermissionsQuery.mockResolvedValue({ state: 'granted' });

      await act(async () => {
        window.dispatchEvent(new Event('focus'));
      });

      await waitFor(() => {
        expect(screen.queryByText('Camera permission required')).not.toBeInTheDocument();
      });
    });
  });

  describe('CameraViewfinder — token classes', () => {
      beforeEach(() => {
        vi.clearAllMocks();
        mockPermissionsQuery.mockResolvedValue({ state: 'prompt' });
      });

      it('start overlay uses token classes, not hardcoded colors', () => {
        render(<CameraViewfinder onScan={vi.fn()} cameraActive={false} />);

        const overlay = screen.getByTestId('camera-start-overlay');
        expect(overlay).toBeInTheDocument();

        const title = screen.getByText('Camera Scanner');
        expect(title).not.toHaveStyle({ color: '#f8fafc' });

        const desc = screen.getByText(/activate your camera/i).closest('p');
        expect(desc).not.toHaveStyle({ color: '#94a3b8' });

        const btn = screen.getByRole('button', { name: /start camera/i });
        expect(btn).toHaveClass('camera-start-btn');
        expect(btn).not.toHaveStyle({ background: '#047857' });
        expect(btn).not.toHaveStyle({ color: 'white' });
      });

      it('start overlay hint uses token color, not hardcoded #6b7f96', () => {
        render(<CameraViewfinder onScan={vi.fn()} cameraActive={false} />);

        const hint = screen.getByText(/prompted to allow camera/i).closest('p');
        expect(hint).not.toHaveStyle({ color: '#6b7f96' });
      });

      it('start overlay background uses token, not hardcoded rgba', () => {
        render(<CameraViewfinder onScan={vi.fn()} cameraActive={false} />);

        const overlay = screen.getByTestId('camera-start-overlay');
        expect(overlay).not.toHaveStyle({ background: 'rgba(0, 0, 0, 0.8)' });
      });

      it('error overlay uses token classes, not hardcoded colors', async () => {
        // Mock permission denied
        mockPermissionsQuery.mockResolvedValue({ state: 'denied' });

        await act(async () => {
          render(<CameraViewfinder onScan={vi.fn()} cameraActive={false} />);
        });

        await waitFor(() => {
          const errorOverlay = screen.queryByText('Camera permission required');
          expect(errorOverlay).toBeInTheDocument();
        });

        const errorTitle = screen.getByText('Camera permission required').closest('p');
        expect(errorTitle).not.toHaveStyle({ color: '#f8fafc' });

        const retryBtn = screen.getByRole('button', { name: /retry camera access/i });
        expect(retryBtn).toHaveClass('camera-retry-btn');
      });

      it('camera-retry-btn uses token colors', async () => {
        mockPermissionsQuery.mockResolvedValue({ state: 'denied' });

        await act(async () => {
          render(<CameraViewfinder onScan={vi.fn()} cameraActive={false} />);
        });

        const retryBtn = screen.getByRole('button', { name: /retry camera access/i });
        expect(retryBtn).not.toHaveStyle({ background: '#1e293b' });
        expect(retryBtn).not.toHaveStyle({ color: '#f8fafc' });
      });
    });

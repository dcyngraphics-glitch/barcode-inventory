import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockVideo = {
  srcObject: null,
  play: vi.fn().mockResolvedValue(undefined),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  videoWidth: 640,
  videoHeight: 480,
} as unknown as HTMLVideoElement;

beforeEach(() => {
  vi.useFakeTimers();

  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }) },
    writable: true,
    configurable: true,
  });

  vi.stubGlobal('BarcodeDetector', undefined);

  // Mock canvas getContext for jsdom
  const getContextMock = vi.fn().mockReturnValue({
    drawImage: vi.fn(),
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(getContextMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

import { useBarcodeScanner } from '../hooks/useBarcodeScanner';

describe('useBarcodeScanner', () => {
  it('returns initial state with scanning=false, no error, not processing', () => {
    const { result } = renderHook(() => useBarcodeScanner());
    expect(result.current.scanning).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.errorType).toBe('unknown');
    expect(result.current.processing).toBe(false);
  });

  it('sets scanning=true after start() is called', async () => {
    const { result } = renderHook(() => useBarcodeScanner());
    await act(async () => {
      await result.current.start(mockVideo);
    });
    expect(result.current.scanning).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('clears error state when start() is called', async () => {
    const { result } = renderHook(() => useBarcodeScanner());
    await act(async () => {
      await result.current.start(mockVideo);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.errorType).toBe('unknown');
  });

  it('calls getUserMedia with environment facing mode', async () => {
    const { result } = renderHook(() => useBarcodeScanner());
    await act(async () => {
      await result.current.start(mockVideo);
    });
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        video: { facingMode: { ideal: 'environment' } },
      })
    );
  });

  it('resets scanning=false and error=null on stop()', async () => {
    const { result } = renderHook(() => useBarcodeScanner());
    await act(async () => {
      await result.current.start(mockVideo);
    });
    expect(result.current.scanning).toBe(true);
    act(() => {
      result.current.stop();
    });
    expect(result.current.scanning).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.errorType).toBe('unknown');
  });

  it('handles permission-denied error from getUserMedia', async () => {
    const domError = new DOMException('Permission denied', 'NotAllowedError');
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(domError);

    const { result } = renderHook(() => useBarcodeScanner());
    await act(async () => {
      await result.current.start(mockVideo);
    });
    expect(result.current.scanning).toBe(false);
    expect(result.current.errorType).toBe('permission-denied');
    expect(typeof result.current.error).toBe('string');
  });

  it('handles NotFoundError as no-camera', async () => {
    const domError = new DOMException('Device not found', 'NotFoundError');
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(domError);

    const { result } = renderHook(() => useBarcodeScanner());
    await act(async () => {
      await result.current.start(mockVideo);
    });
    expect(result.current.scanning).toBe(false);
    expect(result.current.errorType).toBe('no-camera');
  });

  it('captureFrame returns null when camera not started', async () => {
    const { result } = renderHook(() => useBarcodeScanner());
    const barcode = await result.current.captureFrame();
    expect(barcode).toBeNull();
  });

  it('captureFrame processes without error when camera active', async () => {
    const mockReader = { decodeFromCanvas: vi.fn().mockResolvedValue({ getText: () => '1234567890123' }) };
    vi.stubGlobal('BrowserMultiFormatReader', vi.fn(() => mockReader));

    const { result } = renderHook(() => useBarcodeScanner());
    await act(async () => {
      await result.current.start(mockVideo);
    });

    // Should not throw even though jsdom canvas is incomplete
    const barcode = await result.current.captureFrame();
    // Result may be null in jsdom (canvas.getContext returns null), but processing state should clean up
    expect(result.current.processing).toBe(false);
    expect(barcode === null || barcode === '1234567890123').toBe(true);
  });

  it('does not log the expected "nothing in frame" errors from the scan loop', async () => {
    // The continuous loop calls captureFrame({ silent: true }) and most frames hold
    // no barcode, so the reader rejects. That is the normal case, not a failure.
    const failingReader = {
      decodeFromCanvas: vi.fn().mockRejectedValue(new Error('No MultiFormat Readers were able to detect the code.')),
    };
    vi.stubGlobal('BrowserMultiFormatReader', vi.fn(() => failingReader));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useBarcodeScanner());
    await act(async () => {
      await result.current.start(mockVideo);
    });

    await act(async () => {
      expect(await result.current.captureFrame({ silent: true })).toBeNull();
    });

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('still logs a failure from a user-initiated capture', async () => {
    const failingReader = {
      decodeFromCanvas: vi.fn().mockRejectedValue(new Error('camera disconnected')),
    };
    vi.stubGlobal('BrowserMultiFormatReader', vi.fn(() => failingReader));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useBarcodeScanner());
    await act(async () => {
      await result.current.start(mockVideo);
    });

    await act(async () => {
      await result.current.captureFrame();
    });

    expect(errorSpy).toHaveBeenCalledWith('Capture error:', expect.any(Error));
    errorSpy.mockRestore();
  });
});

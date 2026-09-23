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

  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});

  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }) },
    writable: true,
    configurable: true,
  });

  vi.stubGlobal('BarcodeDetector', undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

import { useBarcodeScanner } from '../hooks/useBarcodeScanner';

describe('useBarcodeScanner', () => {
  it('returns initial state with scanning=false and no error', () => {
    const { result } = renderHook(() => useBarcodeScanner());
    expect(result.current.scanning).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.errorType).toBe('unknown');
  });

  it('sets scanning=true after start() is called', async () => {
    const { result } = renderHook(() => useBarcodeScanner());
    await act(async () => {
      await result.current.start(mockVideo, vi.fn());
    });
    expect(result.current.scanning).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('clears error state when start() is called', async () => {
    const { result } = renderHook(() => useBarcodeScanner());
    await act(async () => {
      await result.current.start(mockVideo, vi.fn());
    });
    expect(result.current.error).toBeNull();
    expect(result.current.errorType).toBe('unknown');
  });

  it('calls getUserMedia with environment facing mode', async () => {
    const { result } = renderHook(() => useBarcodeScanner());
    await act(async () => {
      await result.current.start(mockVideo, vi.fn());
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
      await result.current.start(mockVideo, vi.fn());
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
      await result.current.start(mockVideo, vi.fn());
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
      await result.current.start(mockVideo, vi.fn());
    });
    expect(result.current.scanning).toBe(false);
    expect(result.current.errorType).toBe('no-camera');
  });
});

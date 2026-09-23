import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

interface BarcodeDetectorSupported {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorSupported;
  }
}

type CameraErrorType = 'permission-denied' | 'no-camera' | 'unknown';

interface ScannerState {
  scanning: boolean;
  error: string | null;
  errorType: CameraErrorType;
  processing: boolean;
}

export function useBarcodeScanner() {
  const [state, setState] = useState<ScannerState>({
    scanning: false,
    error: null,
    errorType: 'unknown',
    processing: false,
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<BarcodeDetectorSupported | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const mountedRef = useRef(true);

  const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (canvasRef.current) {
      canvasRef.current.remove();
      canvasRef.current = null;
    }
    const reader = readerRef.current;
    if (reader && 'reset' in reader && typeof (reader as any).reset === 'function') {
      (reader as any).reset();
    }
    readerRef.current = null;
    setState({ scanning: false, error: null, errorType: 'unknown', processing: false });
  }, []);

  const start = useCallback(
    async (video: HTMLVideoElement) => {
      if (state.scanning) return;
      videoRef.current = video;
      setState({ scanning: true, error: null, errorType: 'unknown', processing: false });

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();

        if (hasBarcodeDetector && window.BarcodeDetector) {
          detectorRef.current = new window.BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
          });
        } else {
          const reader = new BrowserMultiFormatReader();
          readerRef.current = reader;
        }
      } catch (err) {
        const errorType: CameraErrorType =
          err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
            ? 'permission-denied'
            : err instanceof DOMException &&
                (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError' || err.name === 'OverconstrainedError')
              ? 'no-camera'
              : 'unknown';
        setState({
          scanning: false,
          error: err instanceof Error ? err.message : 'Failed to access camera',
          errorType,
          processing: false,
        });
      }
    },
    [hasBarcodeDetector, state.scanning]
  );

  const captureFrame = useCallback(async (): Promise<string | null> => {
    const video = videoRef.current;
    if (!video) return null;

    setState((prev) => ({ ...prev, processing: true }));

    try {
      if (hasBarcodeDetector && detectorRef.current) {
        const barcodes = await detectorRef.current.detect(video);
        if (barcodes.length > 0) {
          return barcodes[0]!.rawValue;
        }
      } else if (readerRef.current) {
        if (!canvasRef.current) {
          canvasRef.current = document.createElement('canvas');
        }
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(video, 0, 0);
        const result = await readerRef.current.decodeFromCanvas(canvas);
        if (result) {
          return result.getText();
        }
      }
      return null;
    } catch (err) {
      console.error('Capture error:', err);
      return null;
    } finally {
      if (mountedRef.current) {
        setState((prev) => ({ ...prev, processing: false }));
      }
    }
  }, [hasBarcodeDetector]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      stop();
    };
  }, [stop]);

  return {
    scanning: state.scanning,
    error: state.error,
    errorType: state.errorType,
    processing: state.processing,
    hasBarcodeDetector,
    start,
    stop,
    captureFrame,
  };
}

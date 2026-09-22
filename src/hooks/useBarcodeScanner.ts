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
}

export function useBarcodeScanner() {
  const [state, setState] = useState<ScannerState>({ scanning: false, error: null, errorType: 'unknown' });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<BarcodeDetectorSupported | null>(null);
  const onScanRef = useRef<((barcode: string) => void) | null>(null);

  const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
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
    setState({ scanning: false, error: null, errorType: 'unknown' });
  }, []);

  const start = useCallback(
    async (video: HTMLVideoElement, onScan: (barcode: string) => void) => {
      videoRef.current = video;
      onScanRef.current = onScan;
      setState({ scanning: true, error: null, errorType: 'unknown' });

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();

        if (hasBarcodeDetector && window.BarcodeDetector) {
          detectorRef.current = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'] });
          const tick = async () => {
            if (!detectorRef.current || !videoRef.current) return;
            try {
              const barcodes = await detectorRef.current.detect(videoRef.current);
              if (barcodes.length > 0 && onScanRef.current) {
                onScanRef.current(barcodes[0]!.rawValue);
                return;
              }
            } catch (err) {
              // Detection errors are non-fatal, keep scanning
              console.error('Barcode detection error:', err);
            }
            rafRef.current = requestAnimationFrame(tick);
          };
          rafRef.current = requestAnimationFrame(tick);
        } else {
          // Fallback: @zxing/browser MultiFormatReader
          const reader = new BrowserMultiFormatReader();
          const tick = async () => {
            if (!videoRef.current) return;
            try {
              if (!canvasRef.current) {
                canvasRef.current = document.createElement('canvas');
              }
              const canvas = canvasRef.current;
              canvas.width = videoRef.current.videoWidth;
              canvas.height = videoRef.current.videoHeight;
              const ctx = canvas.getContext('2d');
              if (!ctx) return;
              ctx.drawImage(videoRef.current, 0, 0);
              const result = await reader.decodeFromCanvas(canvas);
              if (result && onScanRef.current) {
                onScanRef.current(result.getText());
                return;
              }
            } catch (err) {
              // No barcode found or decode error, keep scanning
              console.error('Barcode decode error:', err);
            }
            rafRef.current = requestAnimationFrame(tick);
          };
          rafRef.current = requestAnimationFrame(tick);
        }
      } catch (err) {
        const errorType: CameraErrorType =
          err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
            ? 'permission-denied'
            : err instanceof DOMException && (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError' || err.name === 'OverconstrainedError')
              ? 'no-camera'
              : 'unknown';
        setState({
          scanning: false,
          error: err instanceof Error ? err.message : 'Failed to access camera',
          errorType,
        });
      }
    },
    [hasBarcodeDetector]
  );

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    scanning: state.scanning,
    error: state.error,
    errorType: state.errorType,
    hasBarcodeDetector,
    start,
    stop,
  };
}

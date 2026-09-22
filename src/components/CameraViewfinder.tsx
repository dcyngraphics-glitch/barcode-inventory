import { useEffect, useRef, useState } from 'react';
import { Zap, ZapOff, Camera, CameraOff, RefreshCw } from 'lucide-react';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';

interface CameraViewfinderProps {
  onScan: (barcode: string) => void;
}

export function CameraViewfinder({ onScan }: CameraViewfinderProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onScanRef = useRef(onScan);
  const [flashOn, setFlashOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'permission-denied' | 'no-camera' | 'unknown'>('unknown');
  const { scanning, start, stop } = useBarcodeScanner();

  // Keep ref in sync with latest onScan prop
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Reset error state when trying to start
    setError(null);
    setErrorType('unknown');

    start(video, (barcode: string) => {
      onScanRef.current(barcode);
    }).then(() => {
      // Start succeeded, now wait for video to play
      const handlePlaying = () => setInitializing(false);
      video.addEventListener('playing', handlePlaying);
      return () => {
        video.removeEventListener('playing', handlePlaying);
      };
    }).catch((err) => {
      // Start failed
      const errorType: 'permission-denied' | 'no-camera' | 'unknown' =
        err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
          ? 'permission-denied'
          : err instanceof DOMException && (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError' || err.name === 'OverconstrainedError')
            ? 'no-camera'
            : 'unknown';
      setError(err instanceof Error ? err.message : 'Failed to access camera');
      setErrorType(errorType);
    });

    // Check if torch is supported (after stream is available)
    const checkTorchSupport = () => {
      const stream = video.srcObject as MediaStream | null;
      if (stream) {
        const track = stream.getVideoTracks()[0];
        if (track) {
          const capabilities = track.getCapabilities() as MediaTrackCapabilities & {
            torch?: boolean;
          };
          setTorchSupported(!!capabilities.torch);
        }
      }
    };

    // Check torch support once we have a stream
    const interval = setInterval(checkTorchSupport, 100);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      checkTorchSupport(); // Final check
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      stop();
    };
  }, [start, stop]);

  const toggleFlash = async () => {
    const video = videoRef.current;
    if (!video) return;

    const stream = video.srcObject as MediaStream | null;
    if (!stream) return;

    const track = stream.getVideoTracks()[0];
    if (!track) return;

    try {
      const newFlash = !flashOn;
      await track.applyConstraints({
        advanced: [{ torch: newFlash } as MediaTrackConstraintSet & { torch: boolean }],
      });
      setFlashOn(newFlash);
    } catch (err) {
      console.error('Failed to toggle torch:', err);
    }
  };

  if (error) {
    const isNoCamera = errorType === 'no-camera';
    const isPermissionDenied = errorType === 'permission-denied';

    return (
      <div className="camera-error-overlay">
        <div className="camera-error-content">
          {isNoCamera ? (
            <CameraOff size={48} className="camera-error-icon" />
          ) : (
            <Camera size={48} className="camera-error-icon" />
          )}
          <div className="camera-error-text">
            <p className="camera-error-title">
              {isNoCamera ? 'No camera available' : 'Camera permission required'}
            </p>
            <p className="camera-error-desc">
              {isNoCamera
                ? 'No camera hardware detected. You can still enter barcodes manually.'
                : 'To scan barcodes, please allow camera access for this site.'}
              {isPermissionDenied && (
                <>
                  <p className="camera-error-instructions">
                    How to enable camera access:
                  </p>
                  <ol className="camera-error-steps">
                    <li>
                      Click the lock/icon next to the website address in the browser's address bar.
                    </li>
                    <li>
                      Set Camera permission to "Allow".
                    </li>
                    <li>
                      Reload the page.
                    </li>
                  </ol>
                </>
              )}
            </p>
            {!isNoCamera && (
              <button
                onClick={() => {
                  if (videoRef.current) {
                    start(videoRef.current, (barcode: string) => onScanRef.current(barcode));
                  }
                }}
                className="camera-retry-btn"
              >
                <RefreshCw size={18} />
                Retry after granting access
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="camera-viewfinder">
      {initializing ? (
        <div className="camera-init">
          <div className="camera-init-box" />
          <p className="camera-init-text">Initializing camera...</p>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
        />
      )}

      {/* Overlay with scan frame cutout */}
      <div className="scan-overlay">
        {/* Scan frame */}
        <div className="camera-scan-frame">
          {/* Corner brackets */}
          <div className="camera-scan-corner camera-scan-corner--tl" />
          <div className="camera-scan-corner camera-scan-corner--tr" />
          <div className="camera-scan-corner camera-scan-corner--bl" />
          <div className="camera-scan-corner camera-scan-corner--br" />
        </div>
      </div>

      {/* Flash toggle button */}
      {torchSupported && (
        <button
          onClick={toggleFlash}
          aria-label={flashOn ? 'Turn flash off' : 'Turn flash on'}
          className={`camera-flash-btn${flashOn ? ' active' : ''}`}
        >
          {flashOn ? <Zap size={24} /> : <ZapOff size={24} />}
        </button>
      )}

      {/* Helper text */}
      <p className="camera-helper-text">
        Point camera at barcode
      </p>

      {/* Scanning indicator */}
      {scanning && (
        <div className="camera-scanning">
          <div className="camera-scanning-dot" />
          Scanning...
        </div>
      )}
    </div>
  );
}
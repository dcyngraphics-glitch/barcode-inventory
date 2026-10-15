import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Zap, ZapOff, Camera, CameraOff, RefreshCw, Play, Keyboard } from 'lucide-react';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';

interface CameraViewfinderProps {
  onScan: (barcode: string) => void,
  onManualEntry?: () => void;
  cameraActive?: boolean;
}

export interface CameraViewfinderHandle {
  triggerScan: () => void;
}

export const CameraViewfinder = forwardRef<CameraViewfinderHandle, CameraViewfinderProps>(
  function CameraViewfinder({ onScan, onManualEntry, cameraActive: cameraActiveProp }, ref) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const onScanRef = useRef(onScan);
    const [flashOn, setFlashOn] = useState(false);
    const [torchSupported, setTorchSupported] = useState(false);
    const [initializing, setInitializing] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const [permissionState, setPermissionState] = useState<PermissionState | null>(null);
    const { error, errorType, start, stop, captureFrame } = useBarcodeScanner();

    // Keep ref in sync with latest onScan prop
    useEffect(() => {
      onScanRef.current = onScan;
    }, [onScan]);

    // Respond to cameraActive prop changes from parent
    useEffect(() => {
      if (cameraActiveProp && !cameraActive) {
        setCameraActive(true);
        setInitializing(true);
      } else if (!cameraActiveProp && cameraActive) {
        setCameraActive(false);
      }
    }, [cameraActiveProp]);

    // On mount, query camera permission and auto-start if previously granted
    useEffect(() => {
      navigator.permissions.query({ name: 'camera' }).then((status) => {
        setPermissionState(status.state);
        if (status.state === 'granted') {
          setCameraActive(true);
          setInitializing(true);
        }
      }).catch(() => {
        // Permissions API not available — fall through to manual start
        setPermissionState('prompt');
      });
    }, []);

    // Expose scan trigger for external button (positioned above bottom nav)
    useImperativeHandle(ref, () => ({
      triggerScan: async () => {
        const barcode = await captureFrame();
        if (barcode && onScanRef.current) {
          onScanRef.current(barcode);
        }
      },
    }), [captureFrame]);

    const handleStartCamera = useCallback(() => {
      setCameraActive(true);
      setInitializing(true);
    }, []);

  useEffect(() => {
    if (!cameraActive) return;

    const video = videoRef.current;
    if (!video) return;

    // Add playing listener BEFORE starting stream so we don't miss the event
    const handlePlaying = () => setInitializing(false);
    video.addEventListener('playing', handlePlaying);

    // Fallback: if video is already ready (playing fired before listener attached), clear immediately
    if (video.readyState >= 2) {
      setInitializing(false);
    }

    const beginStream = async () => {
      try {
        await start(video);
      } catch {
        // start() handles its own errors via state
      }
    };

    beginStream();

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
      video.removeEventListener('playing', handlePlaying);
      clearInterval(interval);
      clearTimeout(timeout);
      stop();
      setInitializing(false);
      setCameraActive(false);
    };
  }, [cameraActive, start, stop]);

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

  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup retry timer on unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  // Continuous auto-scan loop
  const isScanningRef = useRef(false);
  const lastScanTimeRef = useRef(0);
  const SCAN_INTERVAL = 500; // ms between scan attempts
  const SCAN_COOLDOWN = 2000; // ms pause after a successful scan

  useEffect(() => {
    if (!cameraActive || initializing) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const scanLoop = async () => {
      if (isScanningRef.current) return; // Skip if already scanning

      const now = Date.now();
      const elapsed = now - lastScanTimeRef.current;
      if (elapsed < SCAN_INTERVAL) {
        timeoutId = setTimeout(scanLoop, SCAN_INTERVAL - elapsed);
        return;
      }

      isScanningRef.current = true;
      lastScanTimeRef.current = now;

      try {
        const barcode = await captureFrame({ silent: true });
        if (barcode && onScanRef.current) {
          onScanRef.current(barcode);
          // Cooldown after successful scan to let user move to next item
          timeoutId = setTimeout(scanLoop, SCAN_COOLDOWN);
        } else {
          timeoutId = setTimeout(scanLoop, SCAN_INTERVAL);
        }
      } catch {
        timeoutId = setTimeout(scanLoop, SCAN_INTERVAL);
      } finally {
        isScanningRef.current = false;
      }
    };

    scanLoop();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      isScanningRef.current = false;
    };
  }, [cameraActive, initializing, captureFrame]);

  const handleRetry = useCallback(() => {
    stop();
    setCameraActive(false);
    // Small delay to let state settle
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(() => setCameraActive(true), 150);
  }, [stop]);

  // Error state (from scanner errors or denied permission)
  const isPermissionDenied = errorType === 'permission-denied' || permissionState === 'denied';
  if (error || isPermissionDenied) {
    const isNoCamera = errorType === 'no-camera';

    return (
      <div className="camera-viewfinder">
        <div className="camera-error-overlay">
          <div className="camera-error-content">
            {isNoCamera ? (
              <CameraOff size={48} className="camera-error-icon" />
            ) : (
              <Camera size={48} className="camera-error-icon" />
            )}
            <div className="camera-error-text">
              <p className="camera-error-title">
                {isNoCamera ? 'No camera found' : 'Camera permission required'}
              </p>
              <p className="camera-error-desc">
                {isNoCamera
                  ? 'No camera detected. Make sure a camera is connected.'
                  : 'To scan barcodes, please allow camera access.'}
                {isPermissionDenied && (
                  <>
                    <p className="camera-error-instructions">
                      <strong>How to fix in Edge:</strong>
                    </p>
                    <ol className="camera-error-steps">
                      <li>Click the <strong>lock icon</strong> in the address bar</li>
                      <li>Set <strong>Camera → Allow</strong></li>
                      <li>Or go to <code>edge://settings/content/camera</code> and add this site</li>
                      <li><strong>Reload</strong> the page after granting access</li>
                    </ol>
                    <p className="camera-error-instructions">
                      Also check Windows: <strong>Settings → Privacy & Security → Camera</strong>
                    </p>
                    <ol className="camera-error-steps">
                      <li>Make sure <strong>"Camera access"</strong> is turned on</li>
                      <li>Ensure <strong>"Let apps access your camera"</strong> is enabled</li>
                      <li>Check that your browser is in the allowed list</li>
                    </ol>
                  </>
                )}
              </p>
              <button onClick={handleRetry} className="camera-retry-btn">
                <RefreshCw size={18} />
                Retry camera access
              </button>
              {onManualEntry && (
                <button onClick={onManualEntry} className="camera-retry-btn" style={{ marginTop: '8px' }}>
                  <Keyboard size={18} />
                  Enter barcode manually
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="camera-viewfinder">
      {/* Only render video when camera is active to avoid residual box artifact */}
      {cameraActive && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="camera-video"
        />
      )}

      {/* Start overlay — shown before camera is activated */}
      {!cameraActive && (
        <div className="camera-start-overlay">
          <div className="camera-start-content">
            <Camera size={48} className="camera-start-icon" />
            <p className="camera-start-title">Camera Scanner</p>
            <p className="camera-start-desc">Tap the button below to activate your camera. Then tap the scan button to read barcodes.</p>
            <button onClick={handleStartCamera} className="camera-start-btn">
              <Play size={18} />
              Start Camera
            </button>
            <p className="camera-start-hint">You'll be prompted to allow camera access for this site.</p>
          </div>
        </div>
      )}

      {/* Initializing spinner */}
      {cameraActive && initializing && (
        <div className="camera-init">
          <div className="camera-init-box" />
          <p className="camera-init-text">Initializing camera...</p>
        </div>
      )}

      {/* Overlay with scan frame cutout */}
      {cameraActive && !initializing && (
        <div className="scan-overlay">
          <div className="camera-scan-frame">
            <div className="camera-scan-corner camera-scan-corner--tl" />
            <div className="camera-scan-corner camera-scan-corner--tr" />
            <div className="camera-scan-corner camera-scan-corner--bl" />
            <div className="camera-scan-corner camera-scan-corner--br" />
          </div>
          {/* Animated scan line */}
          <div className="camera-scan-line" />
        </div>
      )}

      {/* Flash toggle button */}
      {torchSupported && cameraActive && !initializing && (
        <button
          onClick={toggleFlash}
          aria-label={flashOn ? 'Turn flash off' : 'Turn flash on'}
          className={`camera-flash-btn${flashOn ? ' active' : ''}`}
        >
          {flashOn ? <Zap size={24} /> : <ZapOff size={24} />}
        </button>
      )}

      {/* Helper text */}
      {cameraActive && !initializing && (
        <p className="camera-helper-text">Point camera at barcode to scan automatically</p>
      )}
    </div>
  );
}
);

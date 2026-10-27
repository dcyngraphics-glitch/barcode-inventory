import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Zap, ZapOff, Camera, CameraOff, RefreshCw, Play } from 'lucide-react';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';

interface CameraViewfinderProps {
  onScan: (barcode: string) => void,
  /**
   * Called when an attempt finds nothing in frame. Consumers need this to tell
   * "the same code is still in frame" (ignore) from "the same code was put back
   * and scanned again" (count it). Timing alone can't distinguish the two,
   * because the gap between reads varies with how long detection takes.
   */
  onNoDetection?: () => void,
  cameraActive?: boolean,
}

export interface CameraViewfinderHandle {
  triggerScan: () => void,
}

export const CameraViewfinder = forwardRef<CameraViewfinderHandle, CameraViewfinderProps>(
  function CameraViewfinder({ onScan, onNoDetection, cameraActive: cameraActiveProp }, ref) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const onScanRef = useRef(onScan);
    const onNoDetectionRef = useRef(onNoDetection);
    const [flashOn, setFlashOn] = useState(false);
    const [torchSupported, setTorchSupported] = useState(false);
    const [initializing, setInitializing] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const [permissionState, setPermissionState] = useState<PermissionState | null>(null);
    const { error, errorType, start, stop, captureFrame } = useBarcodeScanner();

    // Keep refs in sync with the latest props
    useEffect(() => {
      onScanRef.current = onScan;
      onNoDetectionRef.current = onNoDetection;
    }, [onScan, onNoDetection]);

    // Respond to cameraActive prop changes from parent.
    //
    // NOTE: we key on strict equality (`=== true` / `=== false`) rather than on
    // truthiness, because the props default to `undefined` when the parent does
    // not pass them. If we keyed on truthiness, the `else if` branch would fire
    // whenever the permission read set `cameraActive` to `true` and `cameraActiveProp`
    // was `undefined` — silently turning the camera off after an auto-start.
    useEffect(() => {
      if (cameraActiveProp === true && !cameraActive) {
        setCameraActive(true);
        setInitializing(true);
      } else if (cameraActiveProp === false && cameraActive) {
        setCameraActive(false);
      }
    }, [cameraActive, cameraActiveProp]);

    /**
     * Re-read the camera permission from the browser.
     *
     * This has to be callable rather than a one-shot on mount. It used to be read exactly
     * once, so once it came back 'denied' the error overlay below could never clear —
     * granting access in the browser's site settings and pressing "Retry camera access"
     * did nothing, because the overlay keyed off a value nothing ever re-read.
     */
    const refreshPermissionState = useCallback(async (): Promise<PermissionState> => {
      try {
        const status = await navigator.permissions.query({ name: 'camera' });
        setPermissionState(status.state);
        return status.state;
      } catch {
        // Permissions API not available (e.g. Safari) — fall through to manual start
        setPermissionState('prompt');
        return 'prompt';
      }
    }, []);

    // On mount, read the permission once and auto-start if it is already granted
    useEffect(() => {
      refreshPermissionState().then((state) => {
        if (state === 'granted') {
          setCameraActive(true);
          setInitializing(true);
        }
      });
    }, [refreshPermissionState]);

    // Returning from the browser's site settings should clear the overlay on its own,
    // rather than making the user find the Retry button.
    useEffect(() => {
      const handleFocus = () => {
        void refreshPermissionState();
      };
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }, [refreshPermissionState]);

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
            // Nothing in frame — lets consumers re-arm repeat detection.
            onNoDetectionRef.current?.();
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

    const handleRetry = useCallback(async () => {
      stop();
      setCameraActive(false);

      // Re-read the permission BEFORE restarting. permissionState was previously only read
      // on mount, so a 'denied' reading stuck forever and the overlay could never clear
      // even after the user granted access in the browser's site settings.
      await refreshPermissionState();

      // Small delay to let state settle
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => setCameraActive(true), 150);
    }, [stop, refreshPermissionState]);

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
                        <strong>To unblock the camera:</strong>
                      </p>
                      <ol className="camera-error-steps">
                        <li>
                          Open this site&apos;s settings in your browser (the{' '}
                          <strong>lock or ⓘ icon</strong> in the address bar) and set{' '}
                          <strong>Camera → Allow</strong>
                        </li>
                        <li>
                          Then tap <strong>Retry</strong> below, or reload the page
                        </li>
                        <li>
                          On Android: <strong>Settings → Apps → [your browser] → Permissions
                          → Camera</strong>
                        </li>
                        <li>
                          On iPhone: <strong>Settings → [your browser] → Camera</strong>, and
                          check <strong>Settings → Privacy → Camera</strong>
                        </li>
                      </ol>
                    </>
                  )}
                </p>
                <button onClick={handleRetry} className="camera-retry-btn">
                  <RefreshCw size={18} />
                  Retry camera access
                </button>
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
          <div className="camera-start-overlay" data-testid="camera-start-overlay">
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

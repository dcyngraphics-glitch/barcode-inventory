import { useEffect, useRef, useState, useCallback } from 'react';
import { Zap, ZapOff, Camera, CameraOff, RefreshCw, Play } from 'lucide-react';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';

interface CameraViewfinderProps {
  onScan: (barcode: string) => void;
}

export function CameraViewfinder({ onScan }: CameraViewfinderProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onScanRef = useRef(onScan);
  const [flashOn, setFlashOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const { scanning, error, errorType, start, stop } = useBarcodeScanner();

  // Keep ref in sync with latest onScan prop
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const handleStartCamera = useCallback(() => {
    setCameraActive(true);
    setInitializing(true);
  }, []);

  useEffect(() => {
    if (!cameraActive) return;

    const video = videoRef.current;
    if (!video) return;

    let mounted = true;

    const beginScan = async () => {
      try {
        await start(video, (barcode: string) => {
          if (mounted) onScanRef.current(barcode);
        });
      } catch {
        // start() handles its own errors via state
      }
    };

    beginScan();

    // Once the video actually plays, hide the initializing placeholder
    const handlePlaying = () => setInitializing(false);
    video.addEventListener('playing', handlePlaying);

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
      mounted = false;
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

  const handleRetry = useCallback(() => {
    stop();
    setCameraActive(false);
    // Small delay to let state settle
    setTimeout(() => setCameraActive(true), 150);
  }, [stop]);

  // Error state
  if (error) {
    const isNoCamera = errorType === 'no-camera';
    const isPermissionDenied = errorType === 'permission-denied';

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
          style={initializing ? { display: 'none' } : undefined}
        />
      )}

      {/* Start overlay — shown before camera is activated */}
      {!cameraActive && (
        <div className="camera-start-overlay">
          <div className="camera-start-content">
            <Camera size={48} className="camera-start-icon" />
            <p className="camera-start-title">Camera Scanner</p>
            <p className="camera-start-desc">
              Tap the button below to activate your camera and start scanning barcodes.
            </p>
            <button onClick={handleStartCamera} className="camera-start-btn">
              <Play size={18} />
              Start Camera
            </button>
            <p className="camera-start-hint">
              You'll be prompted to allow camera access for this site.
            </p>
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
      <div className="scan-overlay">
        <div className="camera-scan-frame">
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
      <p className="camera-helper-text">Point camera at barcode</p>

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

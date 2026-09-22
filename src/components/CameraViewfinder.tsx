import { useEffect, useRef, useState } from 'react';
import { Zap, ZapOff, Camera, CameraOff, RefreshCw } from 'lucide-react';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';

interface CameraViewfinderProps {
  onScan: (barcode: string) => void,
}

export function CameraViewfinder({ onScan }: CameraViewfinderProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onScanRef = useRef(onScan);
  const [flashOn, setFlashOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const { scanning, error, errorType, start, stop } = useBarcodeScanner();

  // Keep ref in sync with latest onScan prop
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    start(video, (barcode: string) => onScanRef.current(barcode));

    // Check if torch is supported
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

    // Small delay to allow camera stream to attach
    const initTimer = setTimeout(() => setInitializing(false), 500);

    return () => {
      clearTimeout(initTimer);
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
    return (
      <div className="camera-error" style={{ color: '#f8fafc', minHeight: '300px' }}>
        {isNoCamera ? (
          <CameraOff size={48} className="camera-error-icon" style={{ color: '#f8fafc' }} />
        ) : (
          <Camera size={48} className="camera-error-icon" style={{ color: '#f8fafc' }} />
        )}
        <div className="camera-error-text">
          <p className="camera-error-title" style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
            {isNoCamera ? 'No camera available' : 'Camera permission required'}
          </p>
          <p className="camera-error-desc" style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px' }}>
            {isNoCamera
              ? 'No camera hardware detected. Use manual entry instead.'
              : 'Allow camera access to scan barcodes'}
          </p>
        </div>
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
            Retry
          </button>
        )}
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

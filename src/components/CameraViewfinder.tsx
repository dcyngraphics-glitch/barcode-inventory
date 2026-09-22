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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: '#1e293b',
          borderRadius: '12px',
          minHeight: '300px',
          gap: '1rem',
        }}
      >
        {isNoCamera ? (
          <CameraOff size={48} color="#94a3b8" />
        ) : (
          <Camera size={48} color="#94a3b8" />
        )}
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#f8fafc', fontWeight: 500, marginBottom: '0.5rem' }}>
            {isNoCamera ? 'No camera available' : 'Camera permission required'}
          </p>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>
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
            style={{
              background: '#334155',
              color: '#f8fafc',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '16px',
              minHeight: '44px',
              cursor: 'pointer',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <RefreshCw size={18} />
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '4 / 3',
        background: '#0f172a',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      {initializing ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '240px',
              height: '240px',
              borderRadius: '12px',
              border: '3px solid #334155',
              animation: 'shimmer 1.5s infinite',
            }}
          />
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
            Initializing camera...
          </p>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      )}

      {/* Overlay with scan frame cutout */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Scan frame */}
        <div
          style={{
            width: '240px',
            height: '240px',
            position: 'relative',
            border: '3px solid #059669',
            borderRadius: '12px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)',
          }}
        >
          {/* Corner brackets */}
          <div
            style={{
              position: 'absolute',
              top: '-3px',
              left: '-3px',
              width: '24px',
              height: '24px',
              borderTop: '4px solid #059669',
              borderLeft: '4px solid #059669',
              borderTopLeftRadius: '8px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              width: '24px',
              height: '24px',
              borderTop: '4px solid #059669',
              borderRight: '4px solid #059669',
              borderTopRightRadius: '8px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-3px',
              left: '-3px',
              width: '24px',
              height: '24px',
              borderBottom: '4px solid #059669',
              borderLeft: '4px solid #059669',
              borderBottomLeftRadius: '8px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-3px',
              right: '-3px',
              width: '24px',
              height: '24px',
              borderBottom: '4px solid #059669',
              borderRight: '4px solid #059669',
              borderBottomRightRadius: '8px',
            }}
          />
        </div>
      </div>

      {/* Flash toggle button */}
      {torchSupported && (
        <button
          onClick={toggleFlash}
          aria-label={flashOn ? 'Turn flash off' : 'Turn flash on'}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.5)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: flashOn ? '#fbbf24' : '#f8fafc',
            transition: 'all 200ms ease',
          }}
        >
          {flashOn ? <Zap size={24} /> : <ZapOff size={24} />}
        </button>
      )}

      {/* Helper text */}
      <p
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#94a3b8',
          fontSize: '13px',
          margin: 0,
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        Point camera at barcode
      </p>

      {/* Scanning indicator */}
      {scanning && (
        <div
          style={{
            position: 'absolute',
            bottom: '36px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.6)',
            color: '#f8fafc',
            padding: '6px 16px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#059669',
              animation: 'pulse 1.5s infinite',
            }}
          />
          Scanning...
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes shimmer {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

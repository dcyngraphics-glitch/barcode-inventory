import { Barcode, Package } from 'lucide-react';

interface ProductImageProps {
  imageUrl?: string;
  name: string;
}

/**
 * ProductImage — Apple-inspired shelf-tag / barcode preview system.
 *
 * Replaces the flat grey Package icon with a recognised shelf-tag barcode preview,
 * so product cards look like a real grocer's shelf, not a stock photo.
 */
export function ProductImage({ imageUrl, name }: ProductImageProps) {
  // Shelf-tag barcode glyphs (Apple-inspired: clean, minimal, barcode-focused)
  const shelfTagGlyphs = [
    { x: 0.20, w: 0.08 }, { x: 0.32, w: 0.05 }, { x: 0.42, w: 0.12 }, { x: 0.60, w: 0.04 },
    { x: 0.68, w: 0.08 }, { x: 0.80, w: 0.05 }, { x: 0.88, w: 0.08 },
  ];

  if (imageUrl) {
    return (
      <div
        style={{
          width: '120px',
          height: '120px',
          borderRadius: '12px',
          overflow: 'hidden',
          margin: '0 auto',
          border: '1px solid var(--color-border)',
          background: 'var(--color-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <img
          src={imageUrl}
          alt={name}
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        {/* Barcode overlay on the product image — shelf-tag preview */}
        <div className="shelf-tag-overlay" aria-hidden="true">
          <Barcode size={24} color="#1d1d1f" />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '120px',
        height: '120px',
        borderRadius: '12px',
        margin: '0 auto',
        border: '1px solid var(--color-border)',
        background: 'var(--color-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-muted-foreground)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Shelf-tag barcode preview — replaces flat grey Package icon */}
      <div className="shelf-tag-preview" aria-hidden="true">
        {shelfTagGlyphs.map((bar, i) => (
          <div
            key={i}
            style={{
              width: `${bar.w * 100}%`,
              height: '24px',
              backgroundColor: '#1d1d1f',
              borderRadius: i % 2 === 0 ? '2px' : '0',
              position: 'absolute',
              bottom: 0,
              left: `${bar.x * 100}%`,
            }}
          />
        ))}
        <Package size={28} color="#8e8e93" />
      </div>
    </div>
  );
}

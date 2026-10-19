import { Package } from 'lucide-react';

interface ProductImageProps {
  imageUrl?: string;
  name: string;
}

export function ProductImage({ imageUrl, name }: ProductImageProps) {
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
          background: 'var(--color-background)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
        background: 'var(--color-background)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-muted-foreground)',
      }}
    >
      <Package size={48} />
    </div>
  );
}

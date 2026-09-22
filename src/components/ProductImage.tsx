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
          border: '1px solid #E6E8EA',
          background: '#F8FAFC',
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
        border: '1px solid #E6E8EA',
        background: '#F8FAFC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8',
      }}
    >
      <Package size={48} />
    </div>
  );
}

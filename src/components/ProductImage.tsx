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
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).parentElement!.innerHTML = `
              <div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:#94a3b8;">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              </div>
            `;
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

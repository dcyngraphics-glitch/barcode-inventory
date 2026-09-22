import React from 'react';

export function Placeholder({ label }: { label: string }) {
  return (
    <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>
      {label}
    </div>
  );
}

export function NavBar() {
  return React.createElement(
    'nav',
    {
      style: {
        display: 'flex',
        justifyContent: 'space-around',
        padding: '0.5rem',
        background: '#1e293b',
        position: 'sticky',
        bottom: 0,
      },
    },
    React.createElement('a', { href: '/', style: { color: '#e2e8f0', textDecoration: 'none' } }, 'Scan'),
    React.createElement('a', { href: '/inventory', style: { color: '#e2e8f0', textDecoration: 'none' } }, 'Inventory'),
    React.createElement('a', { href: '/products', style: { color: '#e2e8f0', textDecoration: 'none' } }, 'Products'),
    React.createElement('a', { href: '/settings', style: { color: '#e2e8f0', textDecoration: 'none' } }, 'Settings')
  );
}
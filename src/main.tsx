import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { resolveBasename } from '@/utils/basename';
import './index.css';

// The deployment target, inlined by vite.config's define(). It MUST come from there:
// `import.meta.env` only carries VITE_-prefixed names, so the previous
// `import.meta.env.VERCEL` check was always undefined in the browser and every
// production build took the GitHub Pages branch. On Vercel that made the router's
// basename '/barcode-inventory/', which matches no URL — the router then rendered
// nothing at all and the app showed a blank page.
const isVercel = __IS_VERCEL__;
const basename = resolveBasename({ isProd: import.meta.env.PROD, isVercel });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
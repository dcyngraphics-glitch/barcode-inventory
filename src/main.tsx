import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

const isProduction = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) === 'production';
// Vercel injects VERCEL=1 and VERCEL_ENV at build time; VERCEL_URL at runtime
const isVercel = !!(import.meta.env.VERCEL || import.meta.env.VERCEL_ENV || import.meta.env.VERCEL_URL);
const basename = (isProduction && !isVercel) ? '/barcode-inventory/' : '/';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
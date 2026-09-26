import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

const isProduction = process.env.NODE_ENV === 'production';
const isVercel = !!process.env.VERCEL;
const basename = (isProduction && !isVercel) ? '/barcode-inventory/' : '/';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
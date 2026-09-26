import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/app';
import './ui/global.css';

const container = document.getElementById('app');
if (!container) {
  throw new Error('No se encontró el elemento #app');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

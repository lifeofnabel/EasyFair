import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './styles/app.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { DEFAULT_FAIRS } from './constants/fairs';
import { db } from './db/db';
import { watchAuth } from './services/auth';
import { startSync } from './services/sync';

async function boot() {
  if ((await db.fairs.count()) === 0) await db.fairs.bulkPut(DEFAULT_FAIRS);
  // Ask the browser to keep our IndexedDB (photos!) even under storage pressure.
  void navigator.storage?.persist?.();
  void watchAuth();
  startSync();
}

registerSW({ immediate: true });
void boot();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

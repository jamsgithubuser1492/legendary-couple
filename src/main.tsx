import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import * as store from './state/store';
import * as town from './state/town';
import { startNotify } from './lib/notify';
import { refreshSubscription } from './lib/push';

// Test hook, only active with ?debug in the address
if (new URLSearchParams(location.search).has('debug')) {
  (window as unknown as { __olw: typeof store }).__olw = store;
  (window as unknown as { __town: typeof town }).__town = town;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Reminders: watch for things we leave for each other, and keep this phone's push address current
startNotify();
void refreshSubscription();

// The service worker (reminders and a safe offline copy) only runs in the real build. The address is relative to the
// page, so it works on a GitHub Pages subpath too. A new version takes over quietly on the next visit.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('sw.js', document.baseURI).href).catch(() => undefined);
  });
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import * as store from './state/store';

// Test hook, only active with ?debug in the address
if (new URLSearchParams(location.search).has('debug')) (window as unknown as { __olw: typeof store }).__olw = store;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

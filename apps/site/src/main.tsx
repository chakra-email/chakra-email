import './styles.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';

const element = document.querySelector<HTMLElement>('#app');

if (!element) {
  throw new Error('Missing #app root element.');
}

createRoot(element).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

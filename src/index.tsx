import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './renderer/App';

console.log('React app starting...');

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

console.log('Root element found, creating React root...');

const root = createRoot(container);
root.render(<App />);

console.log('React app rendered');
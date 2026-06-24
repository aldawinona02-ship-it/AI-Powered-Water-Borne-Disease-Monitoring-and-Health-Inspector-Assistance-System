import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safely intercept alerts to avoid iframe sandbox security violations (Script error)
if (typeof window !== 'undefined') {
  window.alert = (message: string) => {
    console.warn("Intercepted blocked alert dialog:", message);
    const event = new CustomEvent('custom-toast', { detail: { message } });
    window.dispatchEvent(event);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);


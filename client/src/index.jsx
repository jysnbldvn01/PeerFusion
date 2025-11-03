// client/src/index.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// 1. Import the provider from the library
import { GoogleOAuthProvider } from '@react-oauth/google';

// Global: PeerFusion toast dispatcher and alert override
// This routes window.alert() calls to a branded in-app banner handled by ToastHost.
(() => {
  const dispatchToast = (message, type = 'info') => {
    try {
      window.dispatchEvent(new CustomEvent('peerfusion-toast', { detail: { message, type } }));
    } catch {
      // fall back to native alert if CustomEvent not available
      // eslint-disable-next-line no-alert
      alert(message);
    }
  };

  // Expose helpers for explicit toast types
  window.pfToast = {
    info: (msg) => dispatchToast(msg, 'info'),
    success: (msg) => dispatchToast(msg, 'success'),
    error: (msg) => dispatchToast(msg, 'error'),
  };

  // Expose a branded confirm that shows a global modal through ConfirmHost
  window.pfConfirm = (message) => {
    return new Promise((resolve) => {
      try {
        window.dispatchEvent(
          new CustomEvent('peerfusion-confirm', { detail: { message, resolve } })
        );
      } catch {
        // Fallback to native confirm if CustomEvent fails
        // eslint-disable-next-line no-alert
        const res = window.confirm(message);
        resolve(!!res);
      }
    });
  };

  // Override native alert last so code below uses our version
  const nativeAlert = window.alert;
  window.alert = function (msg) {
    try {
      dispatchToast(msg, 'info');
    } catch {
      nativeAlert(msg);
    }
  };
})();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* 2. Wrap your entire <App> component with the provider */}
    <GoogleOAuthProvider
      clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID} // 3. Use the environment variable
    >
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);

reportWebVitals();
import React, { useEffect, useState, useCallback } from 'react';

const AUTO_DISMISS_MS = 3500;

const ToastHost = () => {
  const [toast, setToast] = useState(null);
  const [timer, setTimer] = useState(null);

  const clear = useCallback(() => {
    setToast(null);
    if (timer) {
      clearTimeout(timer);
    }
  }, [timer]);

  useEffect(() => {
    const handler = (e) => {
      const { message, type = 'info' } = e.detail || {};
      setToast({ message: String(message ?? ''), type });
      if (timer) clearTimeout(timer);
      const t = setTimeout(() => setToast(null), AUTO_DISMISS_MS);
      setTimer(t);
    };

    window.addEventListener('peerfusion-toast', handler);
    return () => {
      window.removeEventListener('peerfusion-toast', handler);
      if (timer) clearTimeout(timer);
    };
  }, [timer]);

  if (!toast) return null;

  const icon = toast.type === 'success' ? '✅' : toast.type === 'error' ? '⚠️' : 'ℹ️';

  return (
    <div className="notification-alert-banner" role="status" aria-live="polite">
      <div className="alert-content">
        <span className="alert-icon" aria-hidden="true">{icon}</span>
        <strong>PeerFusion</strong>
        <span>{toast.message}</span>
        <button className="alert-close" onClick={clear} aria-label="Close">
          ×
        </button>
      </div>
    </div>
  );
};

export default ToastHost;
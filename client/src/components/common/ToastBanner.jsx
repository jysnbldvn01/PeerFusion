import React, { useEffect, useState, useRef } from 'react';

export default function ToastBanner() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const timerRef = useRef(null);

  useEffect(() => {
    const onToast = (e) => {
      const detail = e.detail || {};
      const msg = typeof detail === 'string' ? detail : detail.message;
      const t = (typeof detail === 'object' && detail.type) || 'info';
      if (!msg) return;

      setMessage(msg);
      setType(t);
      setOpen(true);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setOpen(false), detail.duration || 3000);
    };

    const onToastClear = () => {
      setOpen(false);
      setMessage('');
    };

    window.addEventListener('peerfusion-toast', onToast);
    window.addEventListener('peerfusion-toast-clear', onToastClear);

    return () => {
      window.removeEventListener('peerfusion-toast', onToast);
      window.removeEventListener('peerfusion-toast-clear', onToastClear);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const bgMap = {
    success: '#16a34a',
    error: '#dc2626',
    warning: '#d97706',
    info: '#2563eb',
    added: '#16a34a',
    updated: '#0ea5e9',
    deleted: '#dc2626',
  };
  const bg = bgMap[type] || bgMap.info;

  return (
    <div
      style={{
        position: 'fixed',
        top: open ? 16 : -80,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        transition: 'top 200ms ease',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        style={{
          background: bg,
          color: 'white',
          padding: '10px 16px',
          borderRadius: 8,
          boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
          maxWidth: 600,
          width: 'calc(100% - 32px)',
          pointerEvents: 'auto',
          display: open ? 'block' : 'none',
          textAlign: 'center',
          fontWeight: 600,
        }}
        role="status"
      >
        {message}
      </div>
    </div>
  );
}
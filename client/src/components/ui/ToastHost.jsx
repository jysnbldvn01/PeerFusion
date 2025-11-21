import React, { useEffect, useState, useCallback } from 'react';
import '../../css/toasthost.css';

const AUTO_DISMISS_MS = 3500;

// Professional SVG Icons
const SuccessIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>
);

const ErrorIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
  </svg>
);

const WarningIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
  </svg>
);

const InfoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
);

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

  const getToastConfig = (type) => {
    const configs = {
      success: {
        icon: <SuccessIcon />,
        bgColor: '#f0f9f0',
        borderColor: '#4caf50',
        textColor: '#ffffffff',
        iconColor: '#4caf50'
      },
      error: {
        icon: <ErrorIcon />,
        bgColor: '#fdf2f2',
        borderColor: '#f44336',
        textColor: '#ffffffff',
        iconColor: '#f44336'
      },
      warning: {
        icon: <WarningIcon />,
        bgColor: '#fffbf0',
        borderColor: '#ff9800',
        textColor: '#ffffffff',
        iconColor: '#ff9800'
      },
      info: {
        icon: <InfoIcon />,
        bgColor: '#f0f7ff',
        borderColor: '#2196f3',
        textColor: '#fcfcfcff',
        iconColor: '#2196f3'
      }
    };
    return configs[type] || configs.info;
  };

  const config = getToastConfig(toast.type);

  return (
    <div 
      className="notification-alert-banner" 
      role="status" 
      aria-live="polite"
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 10000,
        backgroundColor: config.bgColor,
        border: `1px solid ${config.borderColor}`,
        borderRadius: '8px',
        padding: '16px',
        minWidth: '300px',
        maxWidth: '400px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        animation: 'slideInRight 0.3s ease-out'
      }}
    >
      <style>
        {`
          @keyframes slideInRight {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
      <div 
        className="alert-content" 
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px'
        }}
      >
        <div 
          className="alert-icon" 
          style={{
            color: config.iconColor,
            flexShrink: 0,
            marginTop: '2px'
          }}
        >
          {config.icon}
        </div>
        <div 
          className="alert-message" 
          style={{
            flex: 1,
            color: config.textColor,
            fontSize: '14px',
            lineHeight: '1.4'
          }}
        >
          <strong style={{ display: 'block', marginBottom: '4px', fontSize: '15px' }}>
            PeerFusion
          </strong>
          <span>{toast.message}</span>
        </div>
        <button 
          className="alert-close" 
          onClick={clear} 
          aria-label="Close"
          style={{
            background: 'none',
            border: 'none',
            color: config.textColor,
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            flexShrink: 0,
            opacity: 0.7,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.opacity = '1'}
          onMouseLeave={(e) => e.target.style.opacity = '0.7'}
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
};

export default ToastHost;
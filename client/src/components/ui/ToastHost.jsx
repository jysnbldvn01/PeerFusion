import React, { useEffect, useState, useCallback } from 'react';
import '../../css/toasthost.css';

const AUTO_DISMISS_MS = 4000;

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
  const [toasts, setToasts] = useState([]);
  const [timers, setTimers] = useState({});

  const clearToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
    if (timers[id]) {
      clearTimeout(timers[id]);
      const newTimers = { ...timers };
      delete newTimers[id];
      setTimers(newTimers);
    }
  }, [timers]);

  useEffect(() => {
    const handler = (e) => {
      const { message, type = 'info', duration = AUTO_DISMISS_MS } = e.detail || {};
      const id = Date.now().toString();
      
      const newToast = {
        id,
        message: String(message ?? ''),
        type,
        timestamp: Date.now()
      };

      setToasts(prev => [newToast, ...prev.slice(0, 4)]); // Max 5 toasts

      // Auto dismiss
      const timer = setTimeout(() => {
        clearToast(id);
      }, duration);

      setTimers(prev => ({ ...prev, [id]: timer }));
    };

    window.addEventListener('peerfusion-toast', handler);
    return () => {
      window.removeEventListener('peerfusion-toast', handler);
      // Clear all timers on unmount
      Object.values(timers).forEach(timer => clearTimeout(timer));
    };
  }, [clearToast, timers]);

  const getToastConfig = (type) => {
    const configs = {
      success: {
        icon: <SuccessIcon />,
        bgColor: '#f0f9f0',
        borderColor: '#4caf50',
        accentColor: '#4caf50',
        textColor: '#2d5a27',
        iconColor: '#4caf50'
      },
      error: {
        icon: <ErrorIcon />,
        bgColor: '#fdf2f2',
        borderColor: '#f44336',
        accentColor: '#f44336',
        textColor: '#7c2d2d',
        iconColor: '#f44336'
      },
      warning: {
        icon: <WarningIcon />,
        bgColor: '#fffbf0',
        borderColor: '#ff9800',
        accentColor: '#ff9800',
        textColor: '#7c5a2d',
        iconColor: '#ff9800'
      },
      info: {
        icon: <InfoIcon />,
        bgColor: '#f0f7ff',
        borderColor: '#2196f3',
        accentColor: '#2196f3',
        textColor: '#2d5a7c',
        iconColor: '#2196f3'
      }
    };
    return configs[type] || configs.info;
  };

  if (toasts.length === 0) return null;

  return (
    <div className="peerfusion-toast-container">
      {toasts.map((toast, index) => {
        const config = getToastConfig(toast.type);
        
        return (
          <div
            key={toast.id}
            className="peerfusion-toast"
            style={{
              '--toast-bg': config.bgColor,
              '--toast-border': config.borderColor,
              '--toast-accent': config.accentColor,
              '--toast-text': config.textColor,
              '--toast-icon': config.iconColor,
              transform: `translateY(${index * 80}px)`
            }}
          >
            <div className="peerfusion-toast-content">
              <div className="peerfusion-toast-icon">
                {config.icon}
              </div>
              
              <div className="peerfusion-toast-message">
                <div className="peerfusion-toast-header">
                  <span className="peerfusion-toast-title">
                    {toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}
                  </span>
                  <span className="peerfusion-toast-brand">PeerFusion</span>
                </div>
                <div className="peerfusion-toast-body">
                  {toast.message}
                </div>
              </div>

              <button 
                className="peerfusion-toast-close"
                onClick={() => clearToast(toast.id)}
                aria-label="Close notification"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Progress bar */}
            <div className="peerfusion-toast-progress">
              <div 
                className="peerfusion-toast-progress-bar"
                style={{
                  backgroundColor: config.accentColor,
                  animation: `shrink ${AUTO_DISMISS_MS}ms linear forwards`
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ToastHost;
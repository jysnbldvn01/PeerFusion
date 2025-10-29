import React, { useEffect, useState, useCallback } from 'react';

// Global branded confirm host. Listens for 'peerfusion-confirm' events and
// shows a modal. Resolves or rejects the pending promise based on user's choice.
const ConfirmHost = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [resolver, setResolver] = useState(null);

  const handleEvent = useCallback((e) => {
    const { message, resolve } = e.detail || {};
    setMessage(message || 'Are you sure?');
    setResolver(() => resolve);
    setOpen(true);
  }, []);

  useEffect(() => {
    window.addEventListener('peerfusion-confirm', handleEvent);
    return () => window.removeEventListener('peerfusion-confirm', handleEvent);
  }, [handleEvent]);

  const close = () => {
    setOpen(false);
    setMessage('');
    setResolver(null);
  };

  const onConfirm = () => {
    if (resolver) resolver(true);
    close();
  };

  const onCancel = () => {
    if (resolver) resolver(false);
    close();
  };

  if (!open) return null;

  return (
    <div className="peerfusion-notification-modal-overlay" role="dialog" aria-modal="true">
      <div className="peerfusion-notification-modal-content" style={{ maxWidth: 420 }}>
        <div className="peerfusion-notification-modal-header">
          <div className="peerfusion-notification-modal-user">
            <h3>Confirm Action</h3>
          </div>
        </div>
        <div className="peerfusion-notification-modal-body">
          <div className="peerfusion-notification-modal-message">
            {message}
          </div>
        </div>
        <div className="peerfusion-notification-modal-actions" style={{ gap: '0.75rem' }}>
          <button className="peerfusion-notification-btn peerfusion-notification-btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="peerfusion-notification-btn peerfusion-notification-btn-primary" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmHost;

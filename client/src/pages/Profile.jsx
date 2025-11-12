import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../css/profile.css';

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
);

// Skeleton Loading Components
const SkeletonSidebar = () => (
  <div className="peerfusion-skeleton-sidebar">
    <div className="peerfusion-skeleton peerfusion-skeleton-avatar"></div>
    <div className="peerfusion-skeleton peerfusion-skeleton-username"></div>
    <div className="peerfusion-skeleton peerfusion-skeleton-bio"></div>
  </div>
);

const SkeletonMainContent = () => (
  <div className="peerfusion-skeleton-main">
    <div className="peerfusion-skeleton-section">
      <div className="peerfusion-skeleton peerfusion-skeleton-section-title"></div>
      <div className="peerfusion-skeleton-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="peerfusion-skeleton-item">
            <div className="peerfusion-skeleton peerfusion-skeleton-label"></div>
            <div className="peerfusion-skeleton peerfusion-skeleton-value"></div>
          </div>
        ))}
      </div>
    </div>
    <div className="peerfusion-skeleton-section">
      <div className="peerfusion-skeleton peerfusion-skeleton-section-title"></div>
      <div className="peerfusion-skeleton-grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="peerfusion-skeleton-item">
            <div className="peerfusion-skeleton peerfusion-skeleton-label"></div>
            <div className="peerfusion-skeleton peerfusion-skeleton-value"></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Account Deactivation Modal Component
const AccountDeactivationModal = ({ isOpen, onClose, onDeactivate }) => {
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (confirmation !== 'DEACTIVATE MY ACCOUNT') {
      alert('Please type "DEACTIVATE MY ACCOUNT" to confirm');
      return;
    }

    setIsLoading(true);
    const success = await onDeactivate(reason);
    setIsLoading(false);
    
    if (success) {
      setReason('');
      setConfirmation('');
    }
  };

  const handleClose = () => {
    setReason('');
    setConfirmation('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="account-action-overlay" onClick={handleClose}>
      <div className="account-action-modal account-deactivation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="account-action-header deactivation-header">
          <div className="account-action-icon deactivation-icon">
            <div className="main-icon"></div>
          </div>
          <h3 className="account-action-title deactivation-title">Pause Your Account</h3>
          <p className="account-action-subtitle deactivation-subtitle">
            Take a temporary break. Your data stays safe and you can return anytime.
          </p>
        </div>

        <div className="account-action-content">
          <form onSubmit={handleSubmit} className="deactivation-form">
            <div className="account-action-field">
              <label className="account-action-label">Why are you taking a break? (Optional)</label>
              <textarea 
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="account-action-textarea deactivation-textarea"
                placeholder="We'd love to know how we can improve..."
                rows="3"
                disabled={isLoading}
              />
            </div>

            <div className="account-action-field">
              <label className="account-action-label">
                Confirm by typing: <strong>DEACTIVATE MY ACCOUNT</strong>
              </label>
              <input 
                type="text" 
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                className="account-action-input deactivation-input"
                placeholder="DEACTIVATE MY ACCOUNT"
                disabled={isLoading}
              />
            </div>

            <div className="account-action-features deactivation-features">
              <div className="feature-item">
                <span className="feature-icon user-icon"></span>
                <span className="feature-text">Profile hidden from others</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon data-icon"></span>
                <span className="feature-text">All data preserved</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon lock-icon"></span>
                <span className="feature-text">Login to reactivate anytime</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon logout-icon"></span>
                <span className="feature-text">Immediate logout</span>
              </div>
            </div>

            <div className="account-action-buttons deactivation-buttons">
              <button 
                type="button" 
                className="account-action-secondary deactivation-cancel"
                onClick={handleClose}
                disabled={isLoading}
              >
                Keep Account Active
              </button>
              <button 
                type="submit" 
                className="account-action-primary deactivation-confirm"
                disabled={isLoading || confirmation !== 'DEACTIVATE MY ACCOUNT'}
              >
                {isLoading ? (
                  <>
                    <span className="action-loading"></span>
                    Pausing Account...
                  </>
                ) : (
                  'Pause My Account'
                )}
              </button>
            </div>
          </form>
        </div>
        
        <button className="account-action-close" onClick={handleClose}>
          <CloseIcon />
        </button>
      </div>
    </div>
  );
};


// Account Deletion Modal Component
const AccountDeletionModal = ({ isOpen, onClose, onDelete }) => {
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (confirmation !== 'DELETE MY ACCOUNT') {
      alert('Please type "DELETE MY ACCOUNT" to confirm');
      return;
    }

    setIsLoading(true);
    const success = await onDelete(reason);
    setIsLoading(false);
    
    if (success) {
      setReason('');
      setConfirmation('');
    }
  };

  const handleClose = () => {
    setReason('');
    setConfirmation('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="account-action-overlay" onClick={handleClose}>
      <div className="account-action-modal account-deletion-modal" onClick={(e) => e.stopPropagation()}>
        <div className="account-action-header deletion-header">
          <div className="account-action-icon deletion-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="#DC2626">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </div>
          <h3 className="account-action-title deletion-title">Remove Account</h3>
          <p className="account-action-subtitle deletion-subtitle">
            This action cannot be undone after 30 days
          </p>
        </div>

        <div className="account-action-content">
          <form onSubmit={handleSubmit} className="deletion-form">
            <div className="account-action-field">
              <label className="account-action-label">Help us improve (optional)</label>
              <textarea 
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="account-action-textarea deletion-textarea"
                placeholder="What led to this decision?"
                rows="3"
                disabled={isLoading}
              />
            </div>

            <div className="account-action-field">
              <label className="account-action-label">
                Type to confirm: <strong>DELETE MY ACCOUNT</strong>
              </label>
              <input 
                type="text" 
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                className="account-action-input deletion-input"
                placeholder="DELETE MY ACCOUNT"
                disabled={isLoading}
              />
            </div>

            <div className="deletion-timeline">
              <div className="timeline-item">
                <div className="timeline-marker immediate">Now</div>
                <div className="timeline-content">
                  <strong>Immediate Changes</strong>
                  <p>Account scheduled for removal, profile hidden</p>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-marker grace-period">30 Days</div>
                <div className="timeline-content">
                  <strong>Grace Period</strong>
                  <p>You can cancel removal anytime during this period</p>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-marker permanent">After 30 Days</div>
                <div className="timeline-content">
                  <strong>Permanent Removal</strong>
                  <p>All data permanently deleted, cannot be recovered</p>
                </div>
              </div>
            </div>

            <div className="deletion-warning-alert">
              <div className="warning-icon">⚠️</div>
              <div className="warning-content">
                <strong>This is a permanent action</strong>
                <p>After 30 days, all your data including profile, sessions, and history will be permanently erased.</p>
              </div>
            </div>

            <div className="account-action-buttons deletion-buttons">
              <button 
                type="button" 
                className="account-action-secondary deletion-cancel"
                onClick={handleClose}
                disabled={isLoading}
              >
                Keep My Account
              </button>
              <button 
                type="submit" 
                className="account-action-primary deletion-confirm"
                disabled={isLoading || confirmation !== 'DELETE MY ACCOUNT'}
              >
                {isLoading ? (
                  <>
                    <span className="action-loading"></span>
                    Scheduling Removal...
                  </>
                ) : (
                  'Schedule Account Removal'
                )}
              </button>
            </div>
          </form>
        </div>
        
        <button className="account-action-close" onClick={handleClose}>
          <CloseIcon />
        </button>
      </div>
    </div>
  );
};

// Updated AccountStatusModal Component
const AccountStatusModal = ({ isOpen, onClose, accountStatus, onReactivate, onCancelDeletion }) => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleReactivate = async () => {
    setIsLoading(true);
    await onReactivate();
    setIsLoading(false);
  };

  const handleCancelDeletion = async () => {
    setIsLoading(true);
    await onCancelDeletion();
    setIsLoading(false);
  };

  const handleAppealRedirect = () => {
    navigate('/appeal');
    onClose();
  };

  if (!isOpen || !accountStatus) return null;

  const getStatusConfig = () => {
    const status = accountStatus.status;
    switch(status) {
      case 'active':
        return {
          badgeClass: accountStatus.has_strikes ? 'account-warning' : 'account-active',
          badgeText: accountStatus.has_strikes ? 'Under Review' : 'Active & Visible',
          statusColor: accountStatus.has_strikes ? '#eab308' : '#10b981',
          messageType: accountStatus.has_strikes ? 'warning' : 'success',
          message: accountStatus.has_strikes 
            ? `Your account is active but under review with ${accountStatus.strike_count} strike(s). Please ensure future interactions comply with our community guidelines.`
            : 'Your account is in good standing. You can pause or schedule removal from settings.',
          showAction: accountStatus.has_strikes,
          actionType: 'appeal',
          actionText: 'Submit Appeal',
          actionHandler: handleAppealRedirect
        };
      case 'deactivated':
        return {
          badgeClass: 'account-deactivated',
          badgeText: 'Account Paused',
          statusColor: '#f59e0b',
          messageType: 'warning',
          message: accountStatus.has_strikes 
            ? `Your account is currently paused. You have ${accountStatus.strike_count} strike(s). When you reactivate, your warning status will remain.`
            : 'Your account is currently paused. Reactivate to make your profile visible again.',
          showAction: true,
          actionType: 'reactivate',
          actionText: 'Reactivate Account',
          actionHandler: handleReactivate
        };
      case 'deletion_pending':
        return {
          badgeClass: 'account-deletion_pending',
          badgeText: 'Scheduled for Removal',
          statusColor: '#f97316',
          messageType: 'warning',
          message: `Account removal scheduled for ${new Date(accountStatus.scheduled_for_deletion_at).toLocaleDateString()}. Cancel to keep your account active.`,
          showAction: true,
          actionType: 'cancelDeletion',
          actionText: 'Cancel Removal',
          actionHandler: handleCancelDeletion
        };
      case 'suspended':
        return {
          badgeClass: 'account-suspended',
          badgeText: 'Temporarily Restricted',
          statusColor: '#ef4444',
          messageType: 'error',
          message: `Your account is currently suspended. Full access will be restored on ${new Date(accountStatus.suspended_until).toLocaleDateString()}.`,
          showAction: true,
          actionType: 'appeal',
          actionText: 'Submit Appeal',
          actionHandler: handleAppealRedirect
        };
      case 'banned':
        return {
          badgeClass: 'account-banned',
          badgeText: 'Permanently Restricted',
          statusColor: '#6b7280',
          messageType: 'error',
          message: 'This account has been permanently restricted. Contact support for assistance.',
          showAction: true,
          actionType: 'appeal',
          actionText: 'Submit Appeal',
          actionHandler: handleAppealRedirect
        };
      case 'warning':
        return {
          badgeClass: 'account-warning',
          badgeText: 'Under Review',
          statusColor: '#eab308',
          messageType: 'warning',
          message: 'Your account is under review. You may submit an appeal if you believe this is a mistake.',
          showAction: true,
          actionType: 'appeal',
          actionText: 'Submit Appeal',
          actionHandler: handleAppealRedirect
        };
      default:
        return {
          badgeClass: 'account-active',
          badgeText: 'Active & Visible',
          statusColor: '#10b981',
          messageType: 'success',
          message: 'Your account is in good standing. You can pause or schedule removal from settings.',
          showAction: false
        };
    }
  };

  const statusConfig = getStatusConfig();
  const statusValueClass = `peerfusion-status-value-${accountStatus.status}`;

  const getActionButtonClass = () => {
    switch(statusConfig.actionType) {
      case 'reactivate':
        return 'reactivate-btn';
      case 'cancelDeletion':
        return 'cancel-deletion-btn';
      case 'appeal':
        return 'peerfusion-appeal-btn';
      default:
        return 'peerfusion-status-action-btn';
    }
  };

  return (
    <div className="account-action-overlay" onClick={onClose}>
      <div className="account-action-modal account-status-modal" onClick={(e) => e.stopPropagation()}>
        <div className="account-action-header status-header">
          <div className="account-action-icon status-icon">
            <div className="main-icon"></div>
          </div>
          <h3 className="account-action-title status-title">Account Status</h3>
          <p className="account-action-subtitle status-subtitle">
            Current account information and available actions
          </p>
        </div>

        <div className="account-action-content">
          <div className="peerfusion-status-dashboard">
            <div className="peerfusion-status-card">
              
              <div className="peerfusion-status-details">
                <div className="peerfusion-status-item">
                  <span className="peerfusion-status-label">
                    Account State:
                  </span>
                  <span className={statusValueClass} style={{ color: statusConfig.statusColor }}>
                    {accountStatus.status.charAt(0).toUpperCase() + accountStatus.status.slice(1).replace('_', ' ')}
                  </span>
                </div>

                {accountStatus.strike_count > 0 && (
                  <div className="peerfusion-status-item">
                    <span className="peerfusion-status-label">
                      Community Strikes:
                    </span>
                    <span className="peerfusion-status-value-warning">{accountStatus.strike_count}</span>
                  </div>
                )}

                {accountStatus.suspended_until && (
                  <div className="peerfusion-status-item">
                    <span className="peerfusion-status-label">
                      Restriction Ends:
                    </span>
                    <span className="peerfusion-status-value">
                      {new Date(accountStatus.suspended_until).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {accountStatus.is_pending_deletion && (
                  <>
                    <div className="peerfusion-status-item">
                      <span className="peerfusion-status-label">
                        Removal Date:
                      </span>
                      <span className="peerfusion-status-value-deletion-date">
                        {new Date(accountStatus.scheduled_for_deletion_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="peerfusion-status-item">
                      <span className="peerfusion-status-label">
                        Time Remaining:
                      </span>
                      <span className="peerfusion-status-value-deletion-countdown">
                        {accountStatus.days_until_deletion} days
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Status Message - Contains all the descriptive text */}
            <div className={`peerfusion-status-message peerfusion-status-message-${statusConfig.messageType}`}>
              <div className="peerfusion-message-icon"></div>
              <div className="peerfusion-message-content">
                <h4>{statusConfig.badgeText}</h4>
                <p>{statusConfig.message}</p>
              </div>
            </div>

            {/* Action Button - Only the button, no duplicate text */}
            {statusConfig.showAction && (
              <div className="peerfusion-status-actions">
                <button 
                  className={`peerfusion-status-action-btn ${getActionButtonClass()}`}
                  onClick={statusConfig.actionHandler}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="action-loading"></span>
                      {statusConfig.actionType === 'reactivate' && 'Activating...'}
                      {statusConfig.actionType === 'cancelDeletion' && 'Cancelling...'}
                      {statusConfig.actionType === 'appeal' && 'Redirecting...'}
                    </>
                  ) : (
                    statusConfig.actionText
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
        
        <button className="account-action-close" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
    </div>
  );
};

// Change Email Modal Component
const ChangeEmailModal = ({ isOpen, onClose, onEmailChange }) => {
  const [emailForm, setEmailForm] = useState({
    currentPassword: '',
    newEmail: '',
    confirmEmail: ''
  });
  const [emailErrors, setEmailErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailInputChange = (e) => {
    const { name, value } = e.target;
    setEmailForm(prev => ({ ...prev, [name]: value }));
    if (emailErrors[name]) {
      setEmailErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateEmail = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailForm.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!emailForm.newEmail) {
      errors.newEmail = 'New email is required';
    } else if (!emailRegex.test(emailForm.newEmail)) {
      errors.newEmail = 'Please enter a valid email address';
    }

    if (!emailForm.confirmEmail) {
      errors.confirmEmail = 'Please confirm your new email';
    } else if (emailForm.newEmail !== emailForm.confirmEmail) {
      errors.confirmEmail = 'Email addresses do not match';
    }

    setEmailErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateEmail()) {
      return;
    }

    setIsLoading(true);
    const success = await onEmailChange(emailForm.currentPassword, emailForm.newEmail);
    setIsLoading(false);
    
    if (success) {
      setEmailForm({
        currentPassword: '',
        newEmail: '',
        confirmEmail: ''
      });
      setEmailErrors({});
    }
  };

  const handleClose = () => {
    setEmailForm({
      currentPassword: '',
      newEmail: '',
      confirmEmail: ''
    });
    setEmailErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="peerfusion-modal-overlay" onClick={handleClose}>
      <div className="peerfusion-modal-content peerfusion-email-modal" onClick={(e) => e.stopPropagation()}>
        <button className="peerfusion-close-modal" onClick={handleClose}>
          <CloseIcon />
        </button>

        <div className="peerfusion-email-header">
          <h3 className="peerfusion-email-title">Change Email Address</h3>
          <p className="peerfusion-email-subtitle">Enter your current password and new email address</p>
        </div>

        <div className="peerfusion-modal-main">
          <form onSubmit={handleSubmit} className="peerfusion-email-form">
            <div className="peerfusion-form-group">
              <label className="peerfusion-form-label">Current Password</label>
              <input 
                type="password" 
                name="currentPassword"
                value={emailForm.currentPassword}
                onChange={handleEmailInputChange}
                className={`peerfusion-email-input ${emailErrors.currentPassword ? 'peerfusion-email-input-error' : ''}`}
                placeholder="Enter your current password"
                disabled={isLoading}
              />
              {emailErrors.currentPassword && (
                <span className="peerfusion-email-error">{emailErrors.currentPassword}</span>
              )}
            </div>

            <div className="peerfusion-form-group">
              <label className="peerfusion-form-label">New Email Address</label>
              <input 
                type="email" 
                name="newEmail"
                value={emailForm.newEmail}
                onChange={handleEmailInputChange}
                className={`peerfusion-email-input ${emailErrors.newEmail ? 'peerfusion-email-input-error' : ''}`}
                placeholder="Enter your new email address"
                disabled={isLoading}
              />
              {emailErrors.newEmail && (
                <span className="peerfusion-email-error">{emailErrors.newEmail}</span>
              )}
            </div>

            <div className="peerfusion-form-group">
              <label className="peerfusion-form-label">Confirm New Email</label>
              <input 
                type="email" 
                name="confirmEmail"
                value={emailForm.confirmEmail}
                onChange={handleEmailInputChange}
                className={`peerfusion-email-input ${emailErrors.confirmEmail ? 'peerfusion-email-input-error' : ''}`}
                placeholder="Confirm your new email address"
                disabled={isLoading}
              />
              {emailErrors.confirmEmail && (
                <span className="peerfusion-email-error">{emailErrors.confirmEmail}</span>
              )}
            </div>

            <div className="peerfusion-email-notice">
              <p className="peerfusion-email-notice-title">Important Note</p>
              <ul className="peerfusion-email-notice-list">
                <li className="peerfusion-email-notice-item">You will need to verify your new email address</li>
                <li className="peerfusion-email-notice-item">Your login credentials will be updated immediately</li>
                <li className="peerfusion-email-notice-item">All future communications will be sent to the new email</li>
              </ul>
            </div>

            <div className="peerfusion-email-actions">
              <button 
                type="button" 
                className="peerfusion-email-cancel"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="peerfusion-email-submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="peerfusion-email-loading"></span>
                    Changing...
                  </>
                ) : (
                  'Change Email'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Change Password Modal Component
const ChangePasswordModal = ({ isOpen, onClose, onPasswordChange }) => {
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validatePassword = () => {
    const errors = {};

    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[A-Z])/.test(passwordForm.newPassword)) {
      errors.newPassword = 'Password must contain at least one uppercase letter';
    } else if (!/(?=.*\d)/.test(passwordForm.newPassword)) {
      errors.newPassword = 'Password must contain at least one number';
    } else if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(passwordForm.newPassword)) {
      errors.newPassword = 'Password must contain at least one special character';
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePassword()) {
      return;
    }

    setIsLoading(true);
    const success = await onPasswordChange(passwordForm.currentPassword, passwordForm.newPassword);
    setIsLoading(false);
    
    if (success) {
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setPasswordErrors({});
    }
  };

  const handleClose = () => {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="peerfusion-modal-overlay" onClick={handleClose}>
      <div className="peerfusion-modal-content peerfusion-password-modal" onClick={(e) => e.stopPropagation()}>
        <button className="peerfusion-close-modal" onClick={handleClose}>
          <CloseIcon />
        </button>

        <div className="peerfusion-password-header">
          <h3 className="peerfusion-password-title">Change Password</h3>
          <p className="peerfusion-password-subtitle">Enter your current password and set a new one</p>
        </div>

        <div className="peerfusion-modal-main">
          <form onSubmit={handleSubmit} className="peerfusion-password-form">
            <div className="peerfusion-form-group">
              <label className="peerfusion-form-label">Current Password</label>
              <input 
                type="password" 
                name="currentPassword"
                value={passwordForm.currentPassword}
                onChange={handlePasswordInputChange}
                className={`peerfusion-password-input ${passwordErrors.currentPassword ? 'peerfusion-password-input-error' : ''}`}
                placeholder="Enter your current password"
                disabled={isLoading}
              />
              {passwordErrors.currentPassword && (
                <span className="peerfusion-password-error">{passwordErrors.currentPassword}</span>
              )}
            </div>

            <div className="peerfusion-form-group">
              <label className="peerfusion-form-label">New Password</label>
              <input 
                type="password" 
                name="newPassword"
                value={passwordForm.newPassword}
                onChange={handlePasswordInputChange}
                className={`peerfusion-password-input ${passwordErrors.newPassword ? 'peerfusion-password-input-error' : ''}`}
                placeholder="Enter your new password"
                disabled={isLoading}
              />
              {passwordErrors.newPassword && (
                <span className="peerfusion-password-error">{passwordErrors.newPassword}</span>
              )}
            </div>

            <div className="peerfusion-form-group">
              <label className="peerfusion-form-label">Confirm New Password</label>
              <input 
                type="password" 
                name="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordInputChange}
                className={`peerfusion-password-input ${passwordErrors.confirmPassword ? 'peerfusion-password-input-error' : ''}`}
                placeholder="Confirm your new password"
                disabled={isLoading}
              />
              {passwordErrors.confirmPassword && (
                <span className="peerfusion-password-error">{passwordErrors.confirmPassword}</span>
              )}
            </div>

            <div className="peerfusion-password-requirements">
              <p className="peerfusion-password-requirements-title">Password Requirements</p>
              <ul className="peerfusion-password-requirements-list">
                <li className="peerfusion-password-requirement-item">At least 8 characters long</li>
                <li className="peerfusion-password-requirement-item">Contains at least one uppercase letter</li>
                <li className="peerfusion-password-requirement-item">Contains at least one number</li>
                <li className="peerfusion-password-requirement-item">Contains at least one special character</li>
              </ul>
            </div>

            <div className="peerfusion-password-actions">
              <button 
                type="button" 
                className="peerfusion-password-cancel"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="peerfusion-password-submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="peerfusion-password-loading"></span>
                    Changing...
                  </>
                ) : (
                  'Change Password'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Settings Dropdown Component
const SettingsDropdown = ({ 
  setEditMode, 
  editMode, 
  setViewAs, 
  setShowChangePassword, 
  setShowChangeEmail, 
  setShowDeactivation,
  setShowDeletion,
  setShowAccountStatus,
  profile, 
  form, 
  selectedSubjects, 
  setSelectedSubjects, 
  availability, 
  handleSave, 
  resetForm,
  accountStatus
}) => {
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => {
      setShowSettings(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="peerfusion-settings-dropdown">
      <button 
        className="peerfusion-settings-button"
        onClick={(e) => {
          e.stopPropagation();
          setShowSettings(!showSettings);
        }}
      >
        <span className="peerfusion-settings-icon"></span>
        Settings
      </button>
      
      {showSettings && (
        <div className="peerfusion-settings-menu">
          <button 
            className={`peerfusion-settings-item ${editMode ? 'active' : ''}`}
            onClick={() => {
              setEditMode(true);
              setShowSettings(false);
            }}
          >
            <span className="peerfusion-edit-icon"></span>
            Edit Profile
          </button>
          
          <button 
            className="peerfusion-settings-item"
            onClick={() => {
              setShowAccountStatus(true);
              setShowSettings(false);
            }}
          >
            <span className="peerfusion-status-icon"></span>
            Account Status
          </button>
          
          <button 
            className="peerfusion-settings-item"
            onClick={() => {
              setShowChangeEmail(true);
              setShowSettings(false);
            }}
          >
            <span className="peerfusion-email-icon"></span>
            Change Email
          </button>
          
          <button 
            className="peerfusion-settings-item"
            onClick={() => {
              setShowChangePassword(true);
              setShowSettings(false);
            }}
          >
            <span className="peerfusion-password-lock-icon"></span>
            Change Password
          </button>
          
          <button 
            className="peerfusion-settings-item"
            onClick={() => {
              setViewAs(true);
              setShowSettings(false);
            }}
          >
            <span className="peerfusion-eye-icon"></span>
            View As Public
          </button>

          {/* Account Control Section */}
          <div className="peerfusion-settings-divider"></div>
          
          {!accountStatus?.is_deactivated && !accountStatus?.is_pending_deletion && (
            <button 
              className={`peerfusion-settings-item peerfusion-settings-warning ${
                accountStatus?.is_banned || accountStatus?.is_suspended ? 'peerfusion-settings-disabled' : ''
              }`}
              onClick={() => {
                if (accountStatus?.is_banned || accountStatus?.is_suspended) {
                  alert(accountStatus.is_banned 
                    ? 'Cannot deactivate a banned account. Please contact support.' 
                    : 'Cannot deactivate while account is suspended.');
                  return;
                }
                setShowDeactivation(true);
                setShowSettings(false);
              }}
              disabled={accountStatus?.is_banned || accountStatus?.is_suspended}
            >
              <span className="peerfusion-deactivate-icon"></span>
              Deactivate Account
              {accountStatus?.has_strikes && (
                <span className="peerfusion-strike-badge">⚠️ {accountStatus.strike_count} strike(s)</span>
              )}
            </button>
          )}
          
          {!accountStatus?.is_pending_deletion && (
            <button 
              className="peerfusion-settings-item peerfusion-settings-danger"
              onClick={() => {
                setShowDeletion(true);
                setShowSettings(false);
              }}
            >
              <span className="peerfusion-delete-icon"></span>
              Delete Account
            </button>
          )}

          {editMode && (
            <>
              <div className="peerfusion-settings-divider"></div>
              <button 
                className="peerfusion-settings-item"
                onClick={() => {
                  handleSave(new Event('click'));
                  setShowSettings(false);
                }}
              >
                <span className="peerfusion-save-icon"></span>
                Save Changes
              </button>
              <button 
                className="peerfusion-settings-item"
                onClick={() => {
                  resetForm();
                  setEditMode(false);
                  setShowSettings(false);
                }}
              >
                <span className="peerfusion-cancel-icon"></span>
                Cancel Edit
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Rating Display Component
const RatingDisplay = ({ rating }) => {
  const numericRating = Number(rating) || 0;
  return (
    <div className="peerfusion-rating-display">
      <span className="peerfusion-star-icon"></span>
      {numericRating.toFixed(1)}
    </div>
  );
};

// Availability Display Component
const AvailabilityDisplay = ({ availability }) => {
  if (!availability || availability.length === 0) {
    return <p className="peerfusion-no-availability">No availability set</p>;
  }

  let parsedAvailability = availability;
  if (typeof availability === 'string') {
    try {
      parsedAvailability = JSON.parse(availability);
    } catch (err) {
      console.error('Error parsing availability:', err);
      return <p className="peerfusion-no-availability">No availability set</p>;
    }
  }

  const availableDays = parsedAvailability.filter(day => 
    day && day.enabled && day.slots && day.slots.length > 0
  );

  if (availableDays.length === 0) {
    return <p className="peerfusion-no-availability">No availability set</p>;
  }

  return (
    <div className="peerfusion-availability-display">
      {availableDays.map((daySchedule) => (
        <div key={daySchedule.day} className="peerfusion-availability-day">
          <strong className="peerfusion-day-label">{daySchedule.day}:</strong>
          <div className="peerfusion-time-slots-display">
            {daySchedule.slots.map((slot, index) => (
              <span key={index} className="peerfusion-time-slot-badge">
                {slot.start} - {slot.end}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Availability Editor Component
const AvailabilityEditor = ({ availability, onUpdate }) => {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const timeOptions = [
    '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'
  ];

  const toggleDayAvailability = (day) => {
    const newAvailability = availability.map(item => 
      item.day === day 
        ? { ...item, enabled: !item.enabled }
        : item
    );
    onUpdate(newAvailability);
  };

  const addTimeSlot = (day) => {
    const newAvailability = availability.map(item => 
      item.day === day 
        ? { ...item, slots: [...item.slots, { start: '09:00 AM', end: '10:00 AM' }] }
        : item
    );
    onUpdate(newAvailability);
  };

  const removeTimeSlot = (day, index) => {
    const newAvailability = availability.map(item => 
      item.day === day 
        ? { 
            ...item, 
            slots: item.slots.filter((_, i) => i !== index),
            enabled: item.slots.length > 1 ? item.enabled : false
          }
        : item
    );
    onUpdate(newAvailability);
  };

  const updateTimeSlot = (day, index, field, value) => {
    const newAvailability = availability.map(item => 
      item.day === day 
        ? { 
            ...item, 
            slots: item.slots.map((slot, i) => 
              i === index ? { ...slot, [field]: value } : slot
            )
          }
        : item
    );
    onUpdate(newAvailability);
  };

  return (
    <div className="peerfusion-availability-editor">
      <p className="peerfusion-availability-help">Check the days you're available and set your time slots:</p>
      {availability.map((daySchedule) => (
        <div key={daySchedule.day} className={`peerfusion-day-availability-editor ${daySchedule.enabled ? 'enabled' : ''}`}>
          <div className="peerfusion-day-header-editor">
            <label className="peerfusion-day-checkbox">
              <input
                type="checkbox"
                checked={daySchedule.enabled}
                onChange={() => toggleDayAvailability(daySchedule.day)}
              />
              <span className="peerfusion-day-name">{daySchedule.day}</span>
            </label>
          </div>
          
          {daySchedule.enabled && (
            <div className="peerfusion-time-slots-editor">
              {daySchedule.slots.map((slot, index) => (
                <div key={index} className="peerfusion-time-slot-edit">
                  <select
                    value={slot.start}
                    onChange={(e) => updateTimeSlot(daySchedule.day, index, 'start', e.target.value)}
                    className="peerfusion-time-select"
                  >
                    {timeOptions.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                  <span className="peerfusion-time-separator">to</span>
                  <select
                    value={slot.end}
                    onChange={(e) => updateTimeSlot(daySchedule.day, index, 'end', e.target.value)}
                    className="peerfusion-time-select"
                  >
                    {timeOptions.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                  {daySchedule.slots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTimeSlot(daySchedule.day, index)}
                      className="peerfusion-remove-time-btn"
                      title="Remove time slot"
                    >
                      <CloseIcon />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addTimeSlot(daySchedule.day)}
                className="peerfusion-add-time-btn"
              >
                <span className="peerfusion-add-icon"></span>
                Add Another Time
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Main Profile Component
const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showAvatarEdit, setShowAvatarEdit] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [subjectCategories, setSubjectCategories] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [viewAs, setViewAs] = useState(false);
  const [availability, setAvailability] = useState([]);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [showDeactivation, setShowDeactivation] = useState(false);
  const [showDeletion, setShowDeletion] = useState(false);
  const [showAccountStatus, setShowAccountStatus] = useState(false);
  const [accountStatus, setAccountStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({
    username: '',
    bio: '',
    birthday: '',
    gender: '',
    social_links: '',
    contact_number: '',
    role: 'Skill Learner',
    year_level: ''
  });

  const yearLevels = [
    'First Year',
    'Second Year',
    'Third Year',
    'Fourth Year',
    'Masteral Degree',
    'Professor'
  ];

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const resetForm = () => {
    if (profile) {
      setForm({
        username: profile.username || '',
        bio: profile.bio || '',
        birthday: profile.birthday || '',
        gender: profile.gender || '',
        social_links: profile.social_links || '',
        contact_number: profile.contact_number || '',
        role: profile.role || 'Skill Learner',
        year_level: profile.year_level || ''
      });
      
      const initialSubjects = profile.subject ? profile.subject.split(',') : [];
      setSelectedSubjects(initialSubjects);
      
      // Reset availability
      if (profile.availability) {
        try {
          let parsedAvailability = [];
          if (typeof profile.availability === 'string') {
            parsedAvailability = JSON.parse(profile.availability);
          } else {
            parsedAvailability = profile.availability;
          }
          setAvailability(parsedAvailability);
        } catch (err) {
          console.error('Error parsing availability:', err);
          setAvailability([]);
        }
      } else {
        setAvailability([]);
      }
      
      // Reset avatar preview
      if (profile.avatar) {
        setAvatarPreview(`http://localhost:5000/uploads/${profile.avatar}`);
      } else {
        setAvatarPreview('');
      }
      setAvatarFile(null);
    }
  };

 useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await axios.get('http://localhost:5000/api/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(res.data);
        
        let parsedAvailability = [];
        if (res.data.availability) {
          try {
            if (typeof res.data.availability === 'string') {
              parsedAvailability = JSON.parse(res.data.availability);
            } else {
              parsedAvailability = res.data.availability;
            }
            
            if (!Array.isArray(parsedAvailability) || parsedAvailability.length === 0) {
              throw new Error('Invalid availability format');
            }
          } catch (err) {
            console.error('Error parsing availability:', err);
            parsedAvailability = [];
          }
        }
        
        if (!parsedAvailability || parsedAvailability.length === 0) {
          if (res.data.role && res.data.role !== 'Skill Learner') {
            parsedAvailability = daysOfWeek.map(day => ({
              day,
              enabled: false,
              slots: [{ start: '09:00 AM', end: '10:00 AM' }]
            }));
          } else {
            parsedAvailability = [];
          }
        }
        
        setAvailability(parsedAvailability);

        const initialSubjects = res.data.subject ? res.data.subject.split(',') : [];
        setSelectedSubjects(initialSubjects);
        setForm({
          username: res.data.username || '',
          bio: res.data.bio || '',
          birthday: res.data.birthday || '',
          gender: res.data.gender || '',
          social_links: res.data.social_links || '',
          contact_number: res.data.contact_number || '',
          role: res.data.role || 'Skill Learner',
          year_level: res.data.year_level || ''
        });
        
        if (res.data.avatar) {
          setAvatarPreview(`http://localhost:5000/uploads/${res.data.avatar}`);
        }
      } catch (err) {
        console.error('Profile fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchSubjects = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/profile/subjects');
        setSubjectCategories(res.data);
      } catch (err) {
        console.error('Error fetching subjects:', err);
      }
    };

    const fetchAccountStatus = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await axios.get('http://localhost:5000/api/profile/account-status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAccountStatus(response.data);
      } catch (err) {
        console.error('Error fetching account status:', err);
      }
    };

    fetchProfile();
    fetchSubjects();
    fetchAccountStatus();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    
    if (name === 'role') {
      if (value === 'Skill Learner') {
        setSelectedSubjects([]);
        setAvailability([]);
      } else if (value !== 'Skill Learner' && (!availability || availability.length === 0)) {
        const initialAvailability = daysOfWeek.map(day => ({
          day,
          enabled: false,
          slots: [{ start: '09:00 AM', end: '10:00 AM' }]
        }));
        setAvailability(initialAvailability);
      }
    }
  };

  const handleSubjectSelect = (e) => {
    const value = e.target.value;
    if (value && !selectedSubjects.includes(value)) {
      setSelectedSubjects([...selectedSubjects, value]);
    }
    e.target.value = '';
  };

  const removeSubject = (subjectToRemove) => {
    setSelectedSubjects(selectedSubjects.filter(subject => subject !== subjectToRemove));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleAvatarSave = async () => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    if (avatarFile) formData.append('avatar', avatarFile);

    try {
      await axios.post('http://localhost:5000/api/profile/avatar', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setAvatarFile(null);
      setShowAvatarEdit(false);
      const res = await axios.get('http://localhost:5000/api/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(res.data);
    } catch (err) {
      console.error('Avatar update failed:', err);
    }
  };

  const updateAvailability = (newAvailability) => {
    setAvailability(newAvailability);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const formData = new FormData();
    
    const formWithSubjects = {
      ...form,
      subject: form.role === 'Skill Learner' ? '' : selectedSubjects.join(','),
      birthday: form.birthday ? new Date(form.birthday).toISOString().split('T')[0] : form.birthday,
      availability: form.role !== 'Skill Learner' ? JSON.stringify(availability) : '[]'
    };

    Object.keys(formWithSubjects).forEach(key => {
      if (formWithSubjects[key] !== null && formWithSubjects[key] !== undefined) {
        formData.append(key, formWithSubjects[key]);
      }
    });

    try {
      const response = await axios.post('http://localhost:5000/api/profile/setup', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Update successful:', response.data);
      setEditMode(false);
      
      const res = await axios.get('http://localhost:5000/api/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(res.data);
      
      if (res.data.availability) {
        try {
          const parsedAvailability = typeof res.data.availability === 'string' 
            ? JSON.parse(res.data.availability) 
            : res.data.availability;
          setAvailability(parsedAvailability);
        } catch (err) {
          console.error('Error parsing refreshed availability:', err);
        }
      }
      
      alert('Profile updated successfully!');
      
    } catch (err) {
      console.error('Update failed - Full error:', err);
      alert(`Update failed: ${err.response?.data?.details || err.response?.data?.error || err.message}`);
    }
  };

  // API Calls for Account Management
  const handlePasswordChange = async (currentPassword, newPassword) => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.post(
        'http://localhost:5000/api/profile/change-password',
        {
          currentPassword,
          newPassword
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        alert('Password changed successfully!');
        return true;
      }
    } catch (err) {
      console.error('Password change error:', err);
      const errorMessage = err.response?.data?.error || 'Failed to change password';
      if (err.response?.status === 401) {
        alert('Error: Current password is incorrect');
      } else {
        alert(`Error: ${errorMessage}`);
      }
      return false;
    }
  };

  const handleEmailChange = async (currentPassword, newEmail) => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.post(
        'http://localhost:5000/api/profile/change-email',
        {
          currentPassword,
          newEmail
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        alert('Email changed successfully! Please check your new email for verification.');
        
        // Update the profile state with new email
        setProfile(prev => ({
          ...prev,
          email: newEmail
        }));
        
        return true;
      }
    } catch (err) {
      console.error('Email change error:', err);
      const errorMessage = err.response?.data?.error || 'Failed to change email';
      if (err.response?.status === 401) {
        alert('Error: Current password is incorrect');
      } else if (err.response?.status === 409) {
        alert('Error: This email is already in use');
      } else {
        alert(`Error: ${errorMessage}`);
      }
      return false;
    }
  };

  const handleDeactivate = async (reason) => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.post(
        'http://localhost:5000/api/profile/deactivate',
        { reason },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        alert(response.data.message);
        // Log user out after deactivation
        localStorage.removeItem('token');
        window.location.href = '/login';
        return true;
      }
    } catch (err) {
      console.error('Deactivation error:', err);
      const errorMessage = err.response?.data?.error || 'Failed to deactivate account';
      alert(`Error: ${errorMessage}`);
      return false;
    }
  };

  const handleDelete = async (reason) => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.post(
        'http://localhost:5000/api/profile/request-deletion',
        { reason },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        alert(response.data.message);
        setShowDeletion(false);
        // Refresh account status
        const statusResponse = await axios.get('http://localhost:5000/api/profile/account-status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAccountStatus(statusResponse.data);
        return true;
      }
    } catch (err) {
      console.error('Deletion error:', err);
      const errorMessage = err.response?.data?.error || 'Failed to schedule deletion';
      alert(`Error: ${errorMessage}`);
      return false;
    }
  };

  const handleReactivate = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.post(
        'http://localhost:5000/api/profile/reactivate',
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        if (response.data.status === 'warning') {
          alert(`Account reactivated successfully. Your account is under warning status with ${response.data.strike_count} strike(s).`);
        } else if (response.data.status === 'suspended') {
          alert('Account reactivated successfully. Your account remains suspended.');
        } else {
          alert('Account reactivated successfully!');
        }
        
        setShowAccountStatus(false);
        
        const statusResponse = await axios.get('http://localhost:5000/api/profile/account-status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAccountStatus(statusResponse.data);
        return true;
      }
    } catch (err) {
      console.error('Reactivation error:', err);
      const errorMessage = err.response?.data?.error || 'Failed to reactivate account';
      alert(`Error: ${errorMessage}`);
      return false;
    }
  };
  const handleCancelDeletion = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.post(
        'http://localhost:5000/api/profile/cancel-deletion',
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        alert(response.data.message);
        setShowAccountStatus(false);
        // Refresh account status
        const statusResponse = await axios.get('http://localhost:5000/api/profile/account-status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAccountStatus(statusResponse.data);
        return true;
      }
    } catch (err) {
      console.error('Cancel deletion error:', err);
      const errorMessage = err.response?.data?.error || 'Failed to cancel deletion';
      alert(`Error: ${errorMessage}`);
      return false;
    }
  };

 return (
    <div className="peerfusion-profile-container">
      {/* Header */}
      <div className="peerfusion-profile-header">
        <h1 className="peerfusion-profile-title">Profile Settings</h1>
        <div className="peerfusion-header-actions">
          <SettingsDropdown 
            setEditMode={setEditMode}
            editMode={editMode}
            setViewAs={setViewAs}
            setShowChangePassword={setShowChangePassword}
            setShowChangeEmail={setShowChangeEmail}
            setShowDeactivation={setShowDeactivation}
            setShowDeletion={setShowDeletion}
            setShowAccountStatus={setShowAccountStatus}
            profile={profile}
            form={form}
            selectedSubjects={selectedSubjects}
            setSelectedSubjects={setSelectedSubjects}
            availability={availability}
            handleSave={handleSave}
            resetForm={resetForm}
            accountStatus={accountStatus}
          />
        </div>
      </div>

      {/* Profile Content */}
      <div className="peerfusion-profile-content">
        {/* Sidebar */}
        <div className="peerfusion-profile-sidebar">
          {isLoading ? (
            <SkeletonSidebar />
          ) : (
            <div className="peerfusion-avatar-section">
              <div
                className="peerfusion-avatar-wrapper"
                onMouseEnter={() => setShowAvatarEdit(true)}
                onMouseLeave={() => !avatarFile && setShowAvatarEdit(false)}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile" className="peerfusion-avatar" />
                ) : (
                  <div className="peerfusion-avatar-placeholder">
                    <span className="peerfusion-user-icon"></span>
                  </div>
                )}
                {showAvatarEdit && (
                  <label className="peerfusion-avatar-edit">
                    <span className="peerfusion-edit-icon"></span>
                    <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
              
              {avatarFile && (
                <div className="peerfusion-avatar-actions">
                  <button className="peerfusion-avatar-btn peerfusion-avatar-save" onClick={handleAvatarSave}>
                    <span className="peerfusion-save-icon"></span>
                    Save
                  </button>
                  <button className="peerfusion-avatar-btn peerfusion-avatar-cancel" onClick={() => {
                    setAvatarFile(null);
                    setAvatarPreview(profile?.avatar ? `http://localhost:5000/uploads/${profile.avatar}` : '');
                  }}>
                    <span className="peerfusion-cancel-icon"></span>
                    Cancel
                  </button>
                </div>
              )}

              <div className="peerfusion-user-info">
                <h2 className="peerfusion-username">{profile?.username || 'User'}</h2>
                <p className="peerfusion-user-bio">{profile?.bio || 'No bio yet'}</p>
                {profile?.email && (
                  <p className="peerfusion-user-email">
                    <span className="peerfusion-email-icon-small"></span>
                    {profile.email}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="peerfusion-profile-main">
          {isLoading ? (
            <SkeletonMainContent />
          ) : profile && (
            <div className="peerfusion-profile-sections">
              {/* Personal Information */}
              <div className="peerfusion-profile-section">
                <h3 className="peerfusion-section-title">
                  <span className="peerfusion-user-icon"></span>
                  Personal Information
                </h3>
                {editMode ? (
                  <div className="peerfusion-form-grid">
                    <div className="peerfusion-form-group">
                      <label className="peerfusion-form-label">Username</label>
                      <input 
                        type="text" 
                        name="username" 
                        value={form.username} 
                        onChange={handleChange}
                        className="peerfusion-form-input"
                      />
                    </div>
                    <div className="peerfusion-form-group">
                      <label className="peerfusion-form-label">Email</label>
                      <div className="peerfusion-email-display">
                        <span className="peerfusion-email-value">{profile.email}</span>
                        <span className="peerfusion-email-note">(Change email from Settings)</span>
                      </div>
                    </div>
                    <div className="peerfusion-form-group">
                      <label className="peerfusion-form-label">Bio</label>
                      <textarea 
                        name="bio" 
                        value={form.bio} 
                        onChange={handleChange} 
                        rows="3"
                        className="peerfusion-form-textarea"
                        placeholder="Tell others about yourself..."
                      />
                    </div>
                    <div className="peerfusion-form-group">
                      <label className="peerfusion-form-label">Birthday</label>
                      <input 
                        type="date" 
                        name="birthday" 
                        value={form.birthday?.split('T')[0]} 
                        onChange={handleChange}
                        className="peerfusion-form-input"
                      />
                    </div>
                    <div className="peerfusion-form-group">
                      <label className="peerfusion-form-label">Gender</label>
                      <select 
                        name="gender" 
                        value={form.gender} 
                        onChange={handleChange}
                        className="peerfusion-form-select"
                      >
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="peerfusion-form-group">
                      <label className="peerfusion-form-label">Role</label>
                      <select 
                        name="role" 
                        value={form.role} 
                        onChange={handleChange}
                        className="peerfusion-form-select"
                      >
                        <option value="Skill Learner">Skill Learner</option>
                        <option value="Skill Sharer">Skill Sharer</option>
                        <option value="Skill Sharer & Learner">Skill Sharer & Learner</option>
                      </select>
                    </div>

                    {(form.role !== 'Skill Learner') && (
                      <div className="peerfusion-form-group">
                        <label className="peerfusion-form-label">Subjects</label>
                        <select name="subject" onChange={handleSubjectSelect} className="peerfusion-subject-select">
                          <option value="">Select Subject</option>
                          {subjectCategories.map(category => (
                            <optgroup key={category.id} label={category.name}>
                              {category.subjects.map(subject => (
                                !selectedSubjects.includes(subject.name) && (
                                  <option key={subject.id} value={subject.name}>{subject.name}</option>
                                )
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <div className="peerfusion-selected-subjects">
                          {selectedSubjects.map((subject, i) => (
                            <span key={i} className="peerfusion-subject-tag">
                              {subject}
                              <button onClick={() => removeSubject(subject)} className="peerfusion-remove-subject">
                                <CloseIcon />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="peerfusion-form-group">
                      <label className="peerfusion-form-label">Year Level</label>
                      <select 
                        name="year_level" 
                        value={form.year_level} 
                        onChange={handleChange}
                        className="peerfusion-form-select"
                      >
                        <option value="">Select Year Level</option>
                        {yearLevels.map((level, index) => (
                          <option key={index} value={level}>{level}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="peerfusion-info-grid">
                    <div className="peerfusion-info-item">
                      <span className="peerfusion-info-label">Username</span>
                      <span className="peerfusion-info-value">{profile.username}</span>
                    </div>
                    <div className="peerfusion-info-item">
                      <span className="peerfusion-info-label">Email</span>
                      <span className="peerfusion-info-value">
                        <span className="peerfusion-email-icon-small"></span>
                        {profile.email}
                      </span>
                    </div>
                    <div className="peerfusion-info-item">
                      <span className="peerfusion-info-label">Bio</span>
                      <span className="peerfusion-info-value">{profile.bio || 'No bio yet'}</span>
                    </div>
                    <div className="peerfusion-info-item">
                      <span className="peerfusion-info-label">Birthday</span>
                      <span className="peerfusion-info-value">{profile.birthday?.split('T')[0] || 'Not specified'}</span>
                    </div>
                    <div className="peerfusion-info-item">
                      <span className="peerfusion-info-label">Gender</span>
                      <span className="peerfusion-info-value">{profile.gender || 'Not specified'}</span>
                    </div>
                    <div className="peerfusion-info-item">
                      <span className="peerfusion-info-label">Role</span>
                      <span className="peerfusion-info-value">{profile.role}</span>
                    </div>
                    {(profile.role !== 'Skill Learner') && (
                      <div className="peerfusion-info-item">
                        <span className="peerfusion-info-label">Subjects</span>
                        <div className="peerfusion-info-value">
                          {profile.subject ? profile.subject.split(',').map((subj, i) => (
                            <span key={i} className="peerfusion-subject-tag">{subj.trim()}</span>
                          )) : 'Not specified'}
                        </div>
                      </div>
                    )}
                    <div className="peerfusion-info-item">
                      <span className="peerfusion-info-label">Year Level</span>
                      <span className="peerfusion-info-value">{profile.year_level || 'Not specified'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Schedule Availability */}
              {(form.role !== 'Skill Learner' || profile.role !== 'Skill Learner') && (
                <div className="peerfusion-profile-section">
                  <h3 className="peerfusion-section-title">
                    <span className="peerfusion-clock-icon"></span>
                    Schedule Availability
                  </h3>
                  {editMode ? (
                    <AvailabilityEditor 
                      availability={availability} 
                      onUpdate={updateAvailability} 
                    />
                  ) : (
                    <AvailabilityDisplay availability={availability} />
                  )}
                </div>
              )}
              
              {/* Contact Information */}
              <div className="peerfusion-profile-section">
                <h3 className="peerfusion-section-title">
                  <span className="peerfusion-link-icon"></span>
                  Contact Information
                </h3>
                {editMode ? (
                  <div className="peerfusion-form-grid">
                    <div className="peerfusion-form-group">
                      <label className="peerfusion-form-label">Social Links (one per line)</label>
                      <textarea
                        name="social_links"
                        value={form.social_links}
                        onChange={handleChange}
                        rows="3"
                        className="peerfusion-form-textarea"
                        placeholder="https://linkedin.com/in/yourprofile&#10;https://github.com/yourusername"
                      />
                    </div>
                    <div className="peerfusion-form-group">
                      <label className="peerfusion-form-label">
                        <span className="peerfusion-phone-icon"></span>
                        Contact Number
                      </label>
                      <input
                        type="text"
                        name="contact_number"
                        value={form.contact_number}
                        onChange={handleChange}
                        className="peerfusion-form-input"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="peerfusion-info-grid">
                    <div className="peerfusion-info-item">
                      <span className="peerfusion-info-label">Social Links</span>
                      <div className="peerfusion-info-value">
                        {profile.social_links ? (
                          <div className="peerfusion-social-links">
                            {profile.social_links.split('\n').map((link, i) => (
                              <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="peerfusion-social-link">
                                <span className="peerfusion-link-icon"></span>
                                {link}
                              </a>
                            ))}
                          </div>
                        ) : 'No links provided'}
                      </div>
                    </div>
                    <div className="peerfusion-info-item">
                      <span className="peerfusion-info-label">Contact Number</span>
                      <span className="peerfusion-info-value">
                        {profile.contact_number ? (
                          <>
                            <span className="peerfusion-phone-icon"></span>
                            {profile.contact_number}
                          </>
                        ) : 'Not specified'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

        {/* View As Public Modal */}
      {viewAs && profile && (
        <div className="peerfusion-modal-overlay" onClick={() => setViewAs(false)}>
          <div className="peerfusion-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="peerfusion-close-modal" onClick={() => setViewAs(false)}>
              <CloseIcon />
            </button>

            <div className="peerfusion-modal-avatar-container">
              {profile.avatar && (
                <img
                  src={`http://localhost:5000/uploads/${profile.avatar}`}
                  alt="Avatar"
                  className="peerfusion-modal-avatar"
                />
              )}
              <div className="peerfusion-modal-rating">
                <RatingDisplay rating={profile.rating} />
                <span>({profile.total_reviews || 0} reviews)</span>
              </div>
            </div>

            <div className="peerfusion-modal-main">
              <h3 className="peerfusion-modal-title">{profile.username}</h3>
              <p className="peerfusion-modal-role">{profile.role || 'N/A'}</p>
              <p className="peerfusion-modal-bio">{profile.bio || 'No bio yet'}</p>

              <div className="peerfusion-modal-section">
                <h4 className="peerfusion-modal-section-title">Subject Expertise</h4>
                {profile.subject && profile.role !== 'Skill Learner' ? (
                  <div className="peerfusion-modal-subject-tags">
                    {profile.subject.split(',').map((subject, i) => (
                      <span key={i} className="peerfusion-subject-tag">{subject.trim()}</span>
                    ))}
                  </div>
                ) : <p>N/A</p>}
              </div>

              <div className="peerfusion-modal-section">
                <h4 className="peerfusion-modal-section-title">Year Level</h4>
                <p>{profile.year_level || 'N/A'}</p>
              </div>

              {profile.role !== 'Skill Learner' && availability && availability.length > 0 && (
                <div className="peerfusion-modal-section">
                  <h4 className="peerfusion-modal-section-title">
                    <span className="peerfusion-clock-icon"></span>
                    Available Times
                  </h4>
                  <AvailabilityDisplay availability={availability} />
                </div>
              )}

              {profile.social_links && (
                <div className="peerfusion-modal-section">
                  <h4 className="peerfusion-modal-section-title">Social Links</h4>
                  <div className="peerfusion-modal-social-links">
                    {profile.social_links.split('\n').map((link, i) => (
                      <a
                        key={i}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="peerfusion-modal-social-link"
                      >
                        <span className="peerfusion-link-icon"></span>
                        <span className="peerfusion-link-text">{link}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="peerfusion-modal-section">
                <h4 className="peerfusion-modal-section-title">Contact</h4>
                <p className="peerfusion-contact-info">
                  {profile.contact_number ? (
                    <a href={`tel:${profile.contact_number}`} className="peerfusion-contact-link">
                      <span className="peerfusion-phone-icon"></span>
                      {profile.contact_number}
                    </a>
                  ) : 'Not provided'}
                </p>
              </div>

              <div className="peerfusion-modal-actions">
                <button className="peerfusion-schedule-btn">
                  <span className="peerfusion-calendar-icon"></span>
                  Request Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal 
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onPasswordChange={handlePasswordChange}
      />

      {/* Change Email Modal */}
      <ChangeEmailModal 
        isOpen={showChangeEmail}
        onClose={() => setShowChangeEmail(false)}
        onEmailChange={handleEmailChange}
      />

      {/* Deactivation Modal */}
      <AccountDeactivationModal 
        isOpen={showDeactivation}
        onClose={() => setShowDeactivation(false)}
        onDeactivate={handleDeactivate}
      />

      {/* Deletion Modal */}
      <AccountDeletionModal 
        isOpen={showDeletion}
        onClose={() => setShowDeletion(false)}
        onDelete={handleDelete}
      />

      {/* Account Status Modal */}
      <AccountStatusModal 
        isOpen={showAccountStatus}
        onClose={() => setShowAccountStatus(false)}
        accountStatus={accountStatus}
        onReactivate={handleReactivate}
        onCancelDeletion={handleCancelDeletion}
      />
    </div>
  );
};

export default Profile;
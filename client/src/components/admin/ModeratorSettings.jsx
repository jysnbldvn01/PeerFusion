import React, { useState } from 'react';
import axios from 'axios';
import { 
  FiShield, FiKey, FiCheckCircle, FiAlertCircle, 
  FiEye, FiEyeOff 
} from 'react-icons/fi';
import '../../css/moderatorsettings.css';

export default function ModeratorSettings() {
  const [changePassword, setChangePassword] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const API_BASE_URL = process.env.REACT_APP_API_URL;


  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    // Validation
    if (!changePassword.currentPassword || !changePassword.newPassword || !changePassword.confirmPassword) {
      setError('All password fields are required');
      setLoading(false);
      return;
    }

    if (changePassword.newPassword !== changePassword.confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (changePassword.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (changePassword.newPassword === changePassword.currentPassword) {
      setError('New password must be different from current password');
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    try {
      await axios.put(`${API_BASE_URL}/api/admin/change-password`, 
        {
          currentPassword: changePassword.currentPassword,
          newPassword: changePassword.newPassword
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setMessage('Password changed successfully');
      setChangePassword({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      console.error('Error changing password:', err);
      setError(err.response?.data?.error || 'Failed to change password. Please check your current password.');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const getPasswordStrength = (password) => {
    if (!password) return '';
    if (password.length < 6) return 'weak';
    if (password.length < 8) return 'fair';
    if (/[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) {
      return 'strong';
    }
    return 'good';
  };

  const getPasswordStrengthText = (password) => {
    const strength = getPasswordStrength(password);
    switch (strength) {
      case 'weak': return { text: 'Weak', class: 'ms-password-weak' };
      case 'fair': return { text: 'Fair', class: 'ms-password-fair' };
      case 'good': return { text: 'Good', class: 'ms-password-good' };
      case 'strong': return { text: 'Strong', class: 'ms-password-strong' };
      default: return { text: '', class: '' };
    }
  };

  const clearForm = () => {
    setChangePassword({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setError('');
    setMessage('');
  };

  return (
    <div className="ms-container">
      {/* Header */}
      <div className="ms-header">
        <div className="ms-header-content">
          <div className="ms-title-section">
            <div className="ms-header-icon">
              <FiShield />
            </div>
            <div>
              <h1 className="ms-main-title">Moderator Settings</h1>
              <p className="ms-subtitle">Manage your account security settings</p>
            </div>
          </div>
          <div className="ms-stats">
            <div className="ms-stat-card">
              <FiShield className="ms-stat-icon" />
              <span className="ms-stat-number">Moderator</span>
              <span className="ms-stat-label">Account Type</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className="ms-message-banner ms-message-success">
          <FiCheckCircle className="ms-message-icon" />
          <div className="ms-message-content">
            <strong>Success!</strong>
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage('')} className="ms-message-close">
            ×
          </button>
        </div>
      )}
      
      {error && (
        <div className="ms-message-banner ms-message-error">
          <FiAlertCircle className="ms-message-icon" />
          <div className="ms-message-content">
            <strong>Error:</strong>
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="ms-message-close">
            ×
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="ms-content">
        {/* Change Password Card */}
        <div className="ms-card">
          <div className="ms-card-header">
            <h2 className="ms-card-title">
              <FiKey className="ms-card-title-icon" />
              Change Password
            </h2>
            <div className="ms-card-badge">Security</div>
          </div>
          
          <div className="ms-card-body">
            <p className="ms-card-description">
              Update your moderator account password. For security reasons, please choose a strong, unique password that you don't use for other services.
            </p>
            
            <form onSubmit={handleChangePassword} className="ms-form">
              {/* Current Password */}
              <div className="ms-form-group">
                <label className="ms-form-label">
                  Current Password *
                </label>
                <div className="ms-input-group">
                  <FiKey className="ms-input-icon" />
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    value={changePassword.currentPassword}
                    onChange={(e) => setChangePassword({...changePassword, currentPassword: e.target.value})}
                    required
                    placeholder="Enter your current password"
                    className="ms-form-input"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="ms-password-toggle"
                    onClick={() => togglePasswordVisibility('current')}
                    disabled={loading}
                  >
                    {showPasswords.current ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
              
              {/* New Password */}
              <div className="ms-form-group">
                <label className="ms-form-label">
                  New Password *
                </label>
                <div className="ms-input-group">
                  <FiKey className="ms-input-icon" />
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    value={changePassword.newPassword}
                    onChange={(e) => setChangePassword({...changePassword, newPassword: e.target.value})}
                    required
                    minLength="6"
                    placeholder="Enter new password (min. 6 characters)"
                    className="ms-form-input"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="ms-password-toggle"
                    onClick={() => togglePasswordVisibility('new')}
                    disabled={loading}
                  >
                    {showPasswords.new ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {changePassword.newPassword && (
                  <div className={`ms-password-strength ${getPasswordStrengthText(changePassword.newPassword).class}`}>
                    Password strength: {getPasswordStrengthText(changePassword.newPassword).text}
                  </div>
                )}
                <div className="ms-password-requirements">
                  <strong>Password requirements:</strong>
                  <ul>
                    <li className={changePassword.newPassword.length >= 6 ? 'ms-requirement-met' : ''}>
                      At least 6 characters long
                    </li>
                    <li className={changePassword.newPassword.length >= 8 ? 'ms-requirement-met' : ''}>
                      At least 8 characters for better security
                    </li>
                    <li className={/[A-Z]/.test(changePassword.newPassword) ? 'ms-requirement-met' : ''}>
                      Include uppercase letters
                    </li>
                    <li className={/[0-9]/.test(changePassword.newPassword) ? 'ms-requirement-met' : ''}>
                      Include numbers
                    </li>
                    <li className={/[^A-Za-z0-9]/.test(changePassword.newPassword) ? 'ms-requirement-met' : ''}>
                      Include special characters
                    </li>
                  </ul>
                </div>
              </div>
              
              {/* Confirm New Password */}
              <div className="ms-form-group">
                <label className="ms-form-label">
                  Confirm New Password *
                </label>
                <div className="ms-input-group">
                  <FiKey className="ms-input-icon" />
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    value={changePassword.confirmPassword}
                    onChange={(e) => setChangePassword({...changePassword, confirmPassword: e.target.value})}
                    required
                    minLength="6"
                    placeholder="Confirm your new password"
                    className={`ms-form-input ${
                      changePassword.confirmPassword && 
                      changePassword.newPassword !== changePassword.confirmPassword 
                        ? 'ms-input-error' 
                        : ''
                    }`}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="ms-password-toggle"
                    onClick={() => togglePasswordVisibility('confirm')}
                    disabled={loading}
                  >
                    {showPasswords.confirm ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {changePassword.confirmPassword && changePassword.newPassword !== changePassword.confirmPassword && (
                  <div className="ms-error-text">
                    Passwords do not match
                  </div>
                )}
              </div>
              
              {/* Form Actions */}
              <div className="ms-form-actions">
                <button 
                  type="button"
                  onClick={clearForm}
                  className="ms-btn ms-btn-secondary"
                  disabled={loading}
                >
                  Clear
                </button>
                <button 
                  type="submit" 
                  className="ms-btn ms-btn-primary"
                  disabled={
                    loading || 
                    !changePassword.currentPassword || 
                    !changePassword.newPassword || 
                    !changePassword.confirmPassword ||
                    changePassword.newPassword !== changePassword.confirmPassword
                  }
                >
                  {loading ? (
                    <>
                      <div className="ms-loading-spinner-small"></div>
                      Changing Password...
                    </>
                  ) : (
                    <>
                      <FiKey className="ms-btn-icon" />
                      Change Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Security Information Card */}
        <div className="ms-card">
          <div className="ms-card-header">
            <h2 className="ms-card-title">
              <FiShield className="ms-card-title-icon" />
              Security Information
            </h2>
            <div className="ms-card-badge">Overview</div>
          </div>
          
          <div className="ms-card-body">
            <div className="ms-security-info">
              <div className="ms-info-item">
                <div className="ms-info-label">Account Role:</div>
                <div className="ms-info-value">
                  <span className="ms-role-badge">Moderator</span>
                </div>
              </div>
              
              <div className="ms-info-item">
                <div className="ms-info-label">Permissions Level:</div>
                <div className="ms-info-value">Limited System Access</div>
              </div>
              
              <div className="ms-info-item">
                <div className="ms-info-label">Security Level:</div>
                <div className="ms-info-value">
                  <span className="ms-security-badge">High Security</span>
                </div>
              </div>
              
              <div className="ms-info-item">
                <div className="ms-info-label">Last Password Change:</div>
                <div className="ms-info-value">Just now</div>
              </div>
            </div>
            
            <div className="ms-security-tips">
              <h4 className="ms-tips-title">Security Tips:</h4>
              <ul className="ms-tips-list">
                <li>Use a unique password for your moderator account</li>
                <li>Change your password regularly</li>
                <li>Never share your password with anyone</li>
                <li>Log out when using shared computers</li>
                <li>Use a password manager to generate and store strong passwords</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
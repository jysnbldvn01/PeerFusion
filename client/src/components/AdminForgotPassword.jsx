import React, { useState } from 'react';
import axios from 'axios';
import '../css/adminauth.css';

export default function AdminForgotPassword({ onBackToLogin, roleType }) {
  const [step, setStep] = useState(1); // 1: email, 2: code, 3: new password
  const [form, setForm] = useState({ 
    email: '', 
    code: '', 
    password: '', 
    confirmPassword: '' 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  // Step 1: Request reset code
  const handleRequestCode = async (e) => {
    e.preventDefault();
    if (!form.email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/admin-forgot-password', {
        email: form.email
      });

      setSuccess(res.data.message);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!form.code || form.code.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/verify-reset-code', {
        email: form.email,
        code: form.code
      });

      setTempToken(res.data.tempToken);
      setSuccess(res.data.message);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!form.password || !form.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/admin-reset-password', {
        email: form.email,
        tempToken: tempToken,
        password: form.password
      });

      setSuccess(res.data.message);
      setTimeout(() => {
        onBackToLogin();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <div className="admin-auth-header">
              <img
                src="/Logos.png"
                alt="Admin Icon"
                className="admin-auth-icon"
              />
              <h2>Reset {roleType} Password</h2>
              <p>Enter your email to receive a verification code</p>
            </div>

            <form onSubmit={handleRequestCode} className="admin-auth-form" noValidate>
              <div className="admin-form-group">
                <label htmlFor="admin-email">Email Address</label>
                <div className="admin-input-with-icon">
                  <i className="fa-solid fa-envelope admin-input-left-icon" aria-hidden="true" />
                  <input
                    id="admin-email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="admin@example.com"
                    autoComplete="username"
                    required
                    className="admin-input"
                  />
                </div>
              </div>

              {error && <div className="admin-error" role="alert">{error}</div>}
              {success && <div className="admin-success" role="alert">{success}</div>}

              <button type="submit" className="admin-submit" disabled={loading}>
                {loading ? 'Sending Code...' : 'Send Verification Code'}
              </button>
            </form>
          </>
        );

      case 2:
        return (
          <>
            <div className="admin-auth-header">
              <img
                src="/Logos.png"
                alt="Admin Icon"
                className="admin-auth-icon"
              />
              <h2>Enter Verification Code</h2>
              <p>Check your email for the 6-digit code</p>
            </div>

            <form onSubmit={handleVerifyCode} className="admin-auth-form" noValidate>
              <div className="admin-form-group">
                <label htmlFor="reset-code">6-Digit Code</label>
                <div className="admin-input-with-icon">
                  <i className="fa-solid fa-shield-halved admin-input-left-icon" aria-hidden="true" />
                  <input
                    id="reset-code"
                    name="code"
                    type="text"
                    value={form.code}
                    onChange={handleChange}
                    placeholder="123456"
                    maxLength="6"
                    pattern="[0-9]{6}"
                    required
                    className="admin-input admin-code-input"
                  />
                </div>
                <div className="admin-input-hint">
                  Enter the 6-digit code sent to {form.email}
                </div>
              </div>

              {error && <div className="admin-error" role="alert">{error}</div>}
              {success && <div className="admin-success" role="alert">{success}</div>}

              <div className="admin-form-actions">
                <button 
                  type="button" 
                  className="admin-secondary-btn"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  Back
                </button>
                <button type="submit" className="admin-submit" disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify Code'}
                </button>
              </div>
            </form>
          </>
        );

      case 3:
        return (
          <>
            <div className="admin-auth-header">
              <img
                src="/Logos.png"
                alt="Admin Icon"
                className="admin-auth-icon"
              />
              <h2>Set New Password</h2>
              <p>Create a new password for your account</p>
            </div>

            <form onSubmit={handleResetPassword} className="admin-auth-form" noValidate>
              <div className="admin-form-group">
                <label htmlFor="new-password">New Password</label>
                <div className="admin-input-with-icon">
                  <input
                    id="new-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    className="admin-input"
                  />
                  <button
                    type="button"
                    className="admin-password-toggle"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <i className="fa-solid fa-eye-slash" aria-hidden="true" />
                    ) : (
                      <i className="fa-solid fa-eye" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <div className="admin-form-group">
                <label htmlFor="confirm-password">Confirm Password</label>
                <div className="admin-input-with-icon">
                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    className="admin-input"
                  />
                  <button
                    type="button"
                    className="admin-password-toggle"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <i className="fa-solid fa-eye-slash" aria-hidden="true" />
                    ) : (
                      <i className="fa-solid fa-eye" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {error && <div className="admin-error" role="alert">{error}</div>}
              {success && <div className="admin-success" role="alert">{success}</div>}

              <div className="admin-form-actions">
                <button 
                  type="button" 
                  className="admin-secondary-btn"
                  onClick={() => setStep(2)}
                  disabled={loading}
                >
                  Back
                </button>
                <button type="submit" className="admin-submit" disabled={loading}>
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="admin-auth-container">
      <div className="admin-auth-card">
        {renderStep()}
        
        <div className="admin-auth-footer">
          <button 
            type="button" 
            className="admin-back-to-login"
            onClick={onBackToLogin}
          >
            <i className="fa-solid fa-arrow-left" /> Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
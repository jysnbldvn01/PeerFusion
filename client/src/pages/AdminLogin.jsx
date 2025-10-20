import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../css/adminauth.css';
import AdminForgotPassword from '../components/AdminForgotPassword';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [roleType, setRoleType] = useState('admin');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', form);
      const { token } = res.data;
      const decoded = JSON.parse(atob(token.split('.')[1]));

      if (decoded.role !== roleType) {
        setError(`You are not authorized as ${roleType}`);
        setLoading(false);
        return;
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(decoded));

      if (decoded.role === 'admin') navigate('/admin/dashboard');
      else navigate('/moderator/dashboard');
    } catch (err) {
      console.error(err);
      setLoading(false);
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  if (showForgotPassword) {
    return (
      <AdminForgotPassword 
        onBackToLogin={() => setShowForgotPassword(false)}
        roleType={roleType}
      />
    );
  }

  return (
    <div className="admin-auth-container">
      <div className="admin-auth-card">
        <div className="admin-auth-header">
          <img
            src="/Logos.png"
            alt="Admin Icon"
            className="admin-auth-icon"
          />
          <h2>{roleType === 'admin' ? 'Admin Login' : 'Moderator Login'}</h2>
          <p>Access your secure dashboard</p>
        </div>

        <div className="admin-role-toggle">
          <button
            type="button"
            className={`admin-role-btn ${roleType === 'admin' ? 'active' : ''}`}
            onClick={() => setRoleType('admin')}
          >
            <i className="fa-solid fa-user-shield" /> Admin
          </button>
          <button
            type="button"
            className={`admin-role-btn ${roleType === 'moderator' ? 'active' : ''}`}
            onClick={() => setRoleType('moderator')}
          >
            <i className="fa-solid fa-user-gear" /> Moderator
          </button>
        </div>

        <form onSubmit={handleSubmit} className="admin-auth-form" noValidate>
          <div className="admin-form-group">
            <label htmlFor="admin-email">Email</label>
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

          <div className="admin-form-group">
            <label htmlFor="admin-password">Password</label>
            <div className="admin-input-with-icon">
              <input
                id="admin-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="current-password"
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

          {error && <div className="admin-error" role="alert">{error}</div>}

          <button type="submit" className="admin-submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="admin-auth-footer">
            <button 
              type="button" 
              className="admin-forgot-password"
              onClick={() => setShowForgotPassword(true)}
            >
              <i className="fa-solid fa-key" /> Forgot Password?
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
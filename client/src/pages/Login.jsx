// client/src/pages/Login.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { identifySocket } from '../utils/socket';
import '../css/auth.css';

import { io } from 'socket.io-client';
// initialise socket once
const socket = io('http://localhost:5000');

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  /**
   * Generic function after a successful login (email or Google)
   */
  const handleLoginSuccess = async (token) => {
    try {
      // save token
      localStorage.setItem('token', token);

      // fetch profile
      const profileRes = await axios.get('http://localhost:5000/api/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const user = profileRes.data;
      // store user in localStorage
      localStorage.setItem('user', JSON.stringify(user));

      // identify socket
      const userId = user.id || user.user_id;
      if (userId) {
        identifySocket(userId);
        socket.emit('user_logged_in', userId);
      }

      setLoading(false);
      alert('Login successful!');

      // redirect
      if (user && user.username) {
        navigate('/home');
      } else {
        navigate('/setup-account');
      }
    } catch (err) {
      console.error('Could not fetch profile', err);
      setLoading(false);
      alert('Login successful, but profile fetch failed. Redirecting to home.');
      navigate('/home');
    }
  };

  /**
   * Handles standard email/password login
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', form);
      const token = res.data.token;
      await handleLoginSuccess(token);
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    }
  };

  /**
   * Handles Google login
   */
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/google-login', {
        token: credentialResponse.credential,
      });
      const { token } = res.data;
      await handleLoginSuccess(token);
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'Google login failed.');
    }
  };

  const handleGoogleError = () => {
    setError('Google login failed. Please try again.');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Welcome to PeerFusion</h2>
          <p>Sign in to your account</p>
        </div>
        <div className="auth-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-control"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <div className="form-options">
              <Link to="/forgot-password">Forgot your password?</Link>
            </div>

            <div className={`error-message ${error ? 'show' : ''}`}>{error}</div>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? <span>Signing In...</span> : <span>Sign In</span>}
            </button>
          </form>

          <div className="or-separator">
            <span>OR</span>
          </div>
          <div className="google-login-container">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="filled_black"
              shape="pill"
              text="continue_with"
            />
          </div>
          <div className="auth-footer">
            <p>
              Don't have an account? <Link to="/register">Register now</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
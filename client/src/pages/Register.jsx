import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../css/auth.css';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState([false, false, false]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setError('');
    
    // Update password strength indicator
    if (name === 'password') {
      const strength = [
        value.length >= 6,
        /[A-Z]/.test(value),
        /[0-9!@#$%^&*]/.test(value)
      ];
      setPasswordStrength(strength);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous messages
    setError('');
    setSuccess('');
    
    // Frontend validation
    if (!form.name || !form.email || !form.password) {
      setError('Please fill in all fields');
      return;
    }
    
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await axios.post('http://localhost:5000/api/auth/register', form);
      
      if (response.status === 201) {
        setSuccess('Registration successful! Redirecting to login...');
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (err) {
      if (err.response) {
        // Handle specific error cases from backend
        if (err.response.status === 409) {
          setError('This email is already registered. Please use a different email.');
        } else if (err.response.data?.error === 'EMAIL_EXISTS') {
          setError('Email address already in use');
        } else {
          setError(err.response.data?.error || 'Registration failed. Please try again.');
        }
      } else {
        setError('Network error. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Create Account</h2>
          <p>Get started with us today</p>
        </div>
        
        <div className="auth-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                className="form-control"
                placeholder="Your name"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
              />
            </div>
            
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
                autoComplete="email"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                className="form-control"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
              
              <div className="password-strength">
                {passwordStrength.map((strong, index) => (
                  <div 
                    key={index} 
                    className="strength-bar" 
                    style={{ 
                      background: strong ? 
                        (index === 0 ? '#4cd964' : index === 1 ? '#5ac8fa' : '#ffcc00') 
                        : '#e0e0e0'
                    }}
                  ></div>
                ))}
              </div>
              <div className="password-hints">
                {form.password.length > 0 && (
                  <ul>
                    <li style={{ color: passwordStrength[0] ? '#4cd964' : '#666' }}>
                      At least 6 characters
                    </li>
                    <li style={{ color: passwordStrength[1] ? '#4cd964' : '#666' }}>
                      Contains uppercase letter
                    </li>
                    <li style={{ color: passwordStrength[2] ? '#4cd964' : '#666' }}>
                      Contains number or symbol
                    </li>
                  </ul>
                )}
              </div>
            </div>
            
            <div className={`error-message ${error ? 'show' : ''}`}>
              {error}
            </div>
            
            {success && (
              <div className="success-message">
                {success}
              </div>
            )}
            
            <button 
              type="submit" 
              className="submit-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="button-loader"></span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
          
          <div className="auth-footer">
            <p>Already have an account? <a href="/" onClick={(e) => { 
              e.preventDefault(); 
              navigate('/'); 
            }}>Sign in</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { identifySocket } from '../utils/socket';
import '../css/auth.css';
import { io } from 'socket.io-client';
const SOCKET_BASE_URL = process.env.NODE_ENV === 'production'
  ? process.env.REACT_APP_API_URL_PROD
  : process.env.REACT_APP_API_URL;

const socket = io(SOCKET_BASE_URL);
// SVG Icons for features

const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16.25 6.875L8.125 15L3.75 10.625" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M13.75 16.25V15C13.75 13.7574 12.9926 12.5 11.25 12.5H8.75C7.00736 12.5 6.25 13.7574 6.25 15V16.25"/>
    <path d="M10 9.375C11.3807 9.375 12.5 8.25571 12.5 6.875C12.5 5.49429 11.3807 4.375 10 4.375C8.61929 4.375 7.5 5.49429 7.5 6.875C7.5 8.25571 8.61929 9.375 10 9.375Z"/>
  </svg>
);

const VideoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="15 5 10 8.75 15 12.5 15 5"/>
    <rect x="3.75" y="4.375" width="7.5" height="11.25" rx="1.25"/>
  </svg>
);

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', rememberMe: false });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
    setError('');
  };

  const handleLoginSuccess = async (token) => {
    try {
      localStorage.setItem('token', token);

      const profileRes = await axios.get(`${SOCKET_BASE_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const user = profileRes.data;
      localStorage.setItem('user', JSON.stringify(user));

      const userId = user.id || user.user_id;
      if (userId) {
        identifySocket(userId);
        socket.emit('user_logged_in', userId);
      }

      setLoading(false);
      alert('Login successful!');

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${SOCKET_BASE_URL}/api/auth/login`, form);
      const token = res.data.token;
      await handleLoginSuccess(token);
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const res = await axios.post(`${SOCKET_BASE_URL}/api/auth/google-login`, {
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

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  const toggleMobileMenu = () => {
  setMobileMenuOpen(!mobileMenuOpen);
};

  return (
    <div className="auth-container">
      {/* Navigation - Same as landing page */}
<nav className="peerfusion-auth-nav">
  <div className="nav-container">
    <div className="nav-logo" onClick={() => navigate('/')}>
      <img src="/Logos.png" alt="PeerFusion" className="logo-image" />
      <span>PeerFusion</span>
    </div>
    
    {/* Desktop Navigation Links */}
    <div className="nav-links">
      <a 
        href="#home" 
        className="nav-link"
        onClick={(e) => {
          e.preventDefault();
          navigate('/');
          setTimeout(() => scrollToSection('home'), 100);
        }}
      >
        Home
      </a>
      <a 
        href="#about" 
        className="nav-link"
        onClick={(e) => {
          e.preventDefault();
          navigate('/');
          setTimeout(() => scrollToSection('about'), 100);
        }}
      >
        About
      </a>
      <a 
        href="#features" 
        className="nav-link"
        onClick={(e) => {
          e.preventDefault();
          navigate('/');
          setTimeout(() => scrollToSection('features'), 100);
        }}
      >
        Features
      </a>
      <a 
        href="#community" 
        className="nav-link"
        onClick={(e) => {
          e.preventDefault();
          navigate('/');
          setTimeout(() => scrollToSection('community'), 100);
        }}
      >
        Community
      </a>
    </div>

    {/* Desktop Actions */}
    <div className="nav-actions">
      <button className="nav-login" onClick={() => navigate('/login')}>
        Log in
      </button>
      <button className="nav-get-started" onClick={() => navigate('/register')}>
        Get Started
      </button>
    </div>

    {/* Mobile Menu Button - ADD THIS */}
    <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
      {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
    </button>
  </div>

  {/* Mobile Dropdown Menu - ADD THIS */}
  <div className={`mobile-dropdown-menu ${mobileMenuOpen ? 'open' : ''}`}>
    <div className="mobile-nav-links">
      <a 
        href="#home" 
        className="mobile-nav-link"
        onClick={(e) => {
          e.preventDefault();
          navigate('/');
          setTimeout(() => scrollToSection('home'), 100);
        }}
      >
        Home
      </a>
      <a 
        href="#about" 
        className="mobile-nav-link"
        onClick={(e) => {
          e.preventDefault();
          navigate('/');
          setTimeout(() => scrollToSection('about'), 100);
        }}
      >
        About
      </a>
      <a 
        href="#features" 
        className="mobile-nav-link"
        onClick={(e) => {
          e.preventDefault();
          navigate('/');
          setTimeout(() => scrollToSection('features'), 100);
        }}
      >
        Features
      </a>
      <a 
        href="#community" 
        className="mobile-nav-link"
        onClick={(e) => {
          e.preventDefault();
          navigate('/');
          setTimeout(() => scrollToSection('community'), 100);
        }}
      >
        Community
      </a>
    </div>
    <div className="mobile-nav-actions">
      <button className="mobile-nav-login" onClick={() => navigate('/login')}>
        Log in
      </button>
      <button className="mobile-nav-get-started" onClick={() => navigate('/register')}>
        Get Started
      </button>
    </div>
  </div>
</nav>

      {/* Main Content - CodeCred.dev Style */}
      <main className="auth-main">
        <div className="auth-layout">
          {/* Left Side - Brand Section */}
          <div className="auth-brand-side">
            <div className="auth-brand-content">
              <h1>
                Welcome back to <span className="gradient-text">PeerFusion</span>
              </h1>
              <p>
                Let's get you back to learning and collaborating with your peers. 
                Continue your journey of knowledge sharing and skill development.
              </p>

                  {/* Add the SVG here */}
                <div className="brand-graphic">
                  <img 
                    src="/Graphics2 design.svg" 
                    alt="PeerFusion Learning Illustration" 
                    className="brand-svg"
                  />
                </div>
            </div>
          </div>

          {/* Right Side - Form Section */}
          <div className="auth-form-side">
            <div className="auth-form-container">
              <div className="auth-form-header">
                <h2>Welcome back</h2>
                <p>Let's get you back to learning</p>
              </div>
              
              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="email">Email address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="form-control"
                    placeholder="Enter your email"
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <div className="password-input-container">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      className="form-control"
                      placeholder="Enter your password"
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
                </div>

                <div className="form-options">
                  <div className="remember-me">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      name="rememberMe"
                      checked={form.rememberMe}
                      onChange={handleChange}
                    />
                    <label htmlFor="rememberMe">Remember me</label>
                  </div>
                  <Link to="/forgot-password" className="forgot-password">
                    Forgot password?
                  </Link>
                </div>

                <div className={`error-message ${error ? 'show' : ''}`}>
                  {error}
                </div>
                
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="button-loader"></span>
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </form>

              <div className="or-separator">
                <span>OR</span>
              </div>
              
              <div className="google-login-container">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="filled_blue"
                  shape="rectangular"
                  text="continue_with"
                  size="large"
                />
              </div>

              <div className="auth-form-footer">
                <p>
                  Don't have an account?{' '}
                  <Link to="/register">Create an account</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="peerfusion-auth-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="footer-logo">
                <img src="/Logos.png" alt="PeerFusion" className="logo-image" />
                <span>PeerFusion</span>
              </div>
              <p>
                Empowering learners through collaborative learning and peer-to-peer skill sharing.
              </p>
            </div>
            <div className="footer-links">
              <div className="link-group">
                <h4>Platform</h4>
                <a 
                  href="#features"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/');
                    setTimeout(() => scrollToSection('features'), 100);
                  }}
                >
                  Features
                </a>
                <a 
                  href="#community"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/');
                    setTimeout(() => scrollToSection('community'), 100);
                  }}
                >
                  Community
                </a>
                <a 
                  href="#about"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/');
                    setTimeout(() => scrollToSection('about'), 100);
                  }}
                >
                  About
                </a>
              </div>
              <div className="link-group">
                <h4>Support</h4>
                <a href="/support">Help Center</a>
                <a href="/user-appeal">Appeals</a>
                <a href="#contact">Contact</a>
              </div>
              <div className="link-group">
                <h4>Legal</h4>
                <a href="/privacy">Privacy</a>
                <a href="/terms">Terms</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 PeerFusion. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
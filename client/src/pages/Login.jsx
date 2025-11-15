import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { identifySocket } from '../utils/socket';
import { socket } from '../utils/socket';
import '../css/auth.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || "https://peerfusion-xh73.onrender.com";

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

const SuspendedIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <line x1="8" y1="12" x2="16" y2="12" />
    <path d="M12 8v4" />
  </svg>
);

const BannedIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    <path d="M16 8a4 4 0 0 0-6.83-2.83" />
  </svg>
);

const WarningIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const DeletionIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const DeactivatedIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <path d="m4.93 4.93 14.14 14.14" />
    <path d="M16 12a4 4 0 0 0-4-4" />
    <path d="M12 16a4 4 0 0 0 4-4" />
  </svg>
);

const InfoIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

// Account Status Modal Component
const AccountStatusModal = ({ status, message, onClose, userData, onContinue }) => {
  const getStatusDetails = () => {
    switch (status) {
      case 'suspended':
        return {
          title: 'Account Suspended',
          icon: <SuspendedIcon />,
          color: '#ff9800',
          type: 'blocked',
          message: 'Your account is temporarily suspended and cannot access the platform.',
          actions: [
            { label: 'Appeal Suspension', path: '/user-appeal', type: 'primary' },
            { label: 'Contact Support', path: '/support', type: 'secondary' }
          ]
        };
      case 'banned':
        return {
          title: 'Account Banned',
          icon: <BannedIcon />,
          color: '#f44336',
          type: 'blocked',
          message: 'Your account has been permanently banned from the platform.',
          actions: [
            { label: 'Submit Appeal', path: '/user-appeal', type: 'primary' },
            { label: 'Contact Support', path: '/support', type: 'secondary' }
          ]
        };
      case 'warning':
        return {
          title: 'Account Warning',
          icon: <WarningIcon />,
          color: '#ffc107',
          type: 'allowed',
          message: 'Your account has active warnings. Please review community guidelines.',
          actions: [
            { label: 'Review Terms of use', path: '/terms', type: 'primary' },
            { label: 'Continue to Platform', action: 'continue', type: 'secondary' }
          ]
        };
      case 'deletion_pending':
        return {
          title: 'Account Scheduled for Deletion',
          icon: <DeletionIcon />,
          color: '#9c27b0',
          type: 'allowed',
          message: 'Your account is scheduled for deletion. You can cancel this process.',
          actions: [
            { label: 'Cancel Deletion', path: '/profile', type: 'primary' },
          ]
        };
      case 'deactivated':
        return {
          title: 'Account Deactivated',
          icon: <DeactivatedIcon />,
          color: '#607d8b',
          type: 'allowed',
          message: 'Your account is currently deactivated. You can reactivate it.',
          actions: [
            { label: 'Reactivate Account', path: '/profile', type: 'primary' },
          ]
        };
      default:
        return {
          title: 'Account Status',
          icon: <InfoIcon />,
          color: '#2196f3',
          type: 'allowed',
          actions: []
        };
    }
  };

  const statusDetails = getStatusDetails();
  const navigate = useNavigate();

  const handleAction = (action) => {
    if (action.path) {
      navigate(action.path);
      onClose();
    } else if (action.action === 'continue') {
      onContinue();
      onClose();
    }
  };

  return (
    <div className="account-status-modal-overlay">
      <div className="account-status-modal">
        <div className="account-status-header" style={{ backgroundColor: statusDetails.color }}>
          <div className="account-status-icon">
            {statusDetails.icon}
          </div>
          <h2>{statusDetails.title}</h2>
        </div>
        
        <div className="account-status-body">
          <div className="status-message">
            <p>{statusDetails.message}</p>
            {message && <p className="additional-message">{message}</p>}
          </div>

          {userData && (
            <div className="status-details">
              {userData.strike_count > 0 && (
                <div className="status-detail">
                  <strong>Strikes:</strong> {userData.strike_count}/3
                </div>
              )}
              {userData.suspended_until && (
                <div className="status-detail">
                  <strong>Suspended Until:</strong> {new Date(userData.suspended_until).toLocaleDateString()}
                </div>
              )}
              {status === 'deletion_pending' && userData.scheduled_for_deletion_at && (
                <div className="status-detail">
                  <strong>Scheduled Deletion:</strong> {new Date(userData.scheduled_for_deletion_at).toLocaleDateString()}
                </div>
              )}
              {status === 'deactivated' && userData.deactivation_requested_at && (
                <div className="status-detail">
                  <strong>Deactivated Since:</strong> {new Date(userData.deactivation_requested_at).toLocaleDateString()}
                </div>
              )}
            </div>
          )}

          <div className="status-actions">
            {statusDetails.actions.map((action, index) => (
              <button
                key={index}
                className={`status-action-btn ${action.type === 'primary' ? 'primary' : 'secondary'}`}
                onClick={() => handleAction(action)}
              >
                {action.label}
              </button>
            ))}
            {statusDetails.type === 'allowed' && (
              <button className="status-action-btn primary" onClick={onContinue}>
                Continue to Platform
              </button>
            )}
            <button className="status-action-btn secondary" onClick={onClose}>
              {statusDetails.type === 'blocked' ? 'Close' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', rememberMe: false });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountStatus, setAccountStatus] = useState(null);
  const [userData, setUserData] = useState(null);
  const [pendingLogin, setPendingLogin] = useState(null);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
    setError('');
  };

  const completeLogin = (userData) => {
    const userId = userData.id || userData.user_id;
    if (userId) {
      identifySocket(userId);
      socket.emit('user_logged_in', userId);
    }

    setLoading(false);
    
    // Check if user needs to setup account
    if (userData && userData.username) {
      navigate('/home');
    } else {
      navigate('/setup-account');
    }
  };

  const handleLoginSuccess = async (token, userDataFromLogin = null) => {
    try {
      localStorage.setItem('token', token);

      // Fetch fresh profile data to get latest status
      const profileRes = await axios.get(`${API_BASE_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const user = profileRes.data;
      localStorage.setItem('user', JSON.stringify(user));

      // Check account status and handle accordingly
      if (user.status === 'suspended') {
        // Check if suspension period has ended (auto-reactivate should have happened, but double check)
        if (user.suspended_until && new Date(user.suspended_until) > new Date()) {
          setAccountStatus('suspended');
          setUserData(user);
          setError(`Your account is suspended until ${new Date(user.suspended_until).toLocaleDateString()}`);
          setLoading(false);
          // Clear token since they can't login
          localStorage.removeItem('token');
          return;
        } else {
          // Suspension ended, proceed with login
          completeLogin(user);
        }
      } else if (user.status === 'banned') {
        setAccountStatus('banned');
        setUserData(user);
        setError('Your account has been permanently banned.');
        setLoading(false);
        // Clear token since they can't login
        localStorage.removeItem('token');
        return;
      } else if (user.status === 'warning') {
        // User can login but show warning
        setAccountStatus('warning');
        setUserData(user);
        setPendingLogin(() => () => completeLogin(user));
        return;
      } else if (user.status === 'deletion_pending') {
        // User can login to cancel deletion
        setAccountStatus('deletion_pending');
        setUserData(user);
        setPendingLogin(() => () => completeLogin(user));
        return;
      } else if (user.status === 'deactivated') {
        // User can login to reactivate
        setAccountStatus('deactivated');
        setUserData(user);
        setPendingLogin(() => () => completeLogin(user));
        return;
      } else {
        // Active user, proceed normally
        completeLogin(user);
      }
    } catch (err) {
      console.error('Could not fetch profile', err);
      setLoading(false);
      
      // If profile fetch fails but we have user data from login, use that
      if (userDataFromLogin) {
        localStorage.setItem('user', JSON.stringify(userDataFromLogin));
        
        // Check status from login response
        if (userDataFromLogin.status === 'suspended') {
          setAccountStatus('suspended');
          setUserData(userDataFromLogin);
          setError(`Your account is suspended until ${new Date(userDataFromLogin.suspended_until).toLocaleDateString()}`);
          localStorage.removeItem('token');
        } else if (userDataFromLogin.status === 'banned') {
          setAccountStatus('banned');
          setUserData(userDataFromLogin);
          setError('Your account has been permanently banned.');
          localStorage.removeItem('token');
        } else if (userDataFromLogin.status === 'warning') {
          setAccountStatus('warning');
          setUserData(userDataFromLogin);
          setPendingLogin(() => () => completeLogin(userDataFromLogin));
        } else if (userDataFromLogin.status === 'deletion_pending') {
          setAccountStatus('deletion_pending');
          setUserData(userDataFromLogin);
          setPendingLogin(() => () => completeLogin(userDataFromLogin));
        } else if (userDataFromLogin.status === 'deactivated') {
          setAccountStatus('deactivated');
          setUserData(userDataFromLogin);
          setPendingLogin(() => () => completeLogin(userDataFromLogin));
        } else {
          completeLogin(userDataFromLogin);
        }
      } else {
        alert('Login successful, but profile fetch failed. Redirecting to home.');
        navigate('/home');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, form);
      
      if (res.data.success) {
        const token = res.data.token;
        const userData = res.data.user;
        
        await handleLoginSuccess(token, userData);
      } else {
        setError(res.data.error || 'Login failed');
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
      
      // Enhanced error handling to show specific suspension/ban messages
      if (err.response?.data) {
        const errorData = err.response.data;
        
        // Handle suspended account with specific message
        if (errorData.status === 'suspended') {
          const suspensionMessage = errorData.error || `Your account has been suspended. It will be reactivated in ${errorData.timeLeft} days.`;
          setAccountStatus('suspended');
          setUserData({
            suspended_until: errorData.suspended_until,
            strike_count: errorData.strike_count
          });
          setError(suspensionMessage);
        } 
        // Handle banned account with specific message
        else if (errorData.status === 'banned') {
          const banMessage = errorData.error || 'Your account has been permanently banned. Please contact support.';
          setAccountStatus('banned');
          setUserData({
            strike_count: errorData.strike_count
          });
          setError(banMessage);
        }
        // Handle other specific error messages from backend
        else if (errorData.error) {
          setError(errorData.error);
        }
        // Handle validation errors
        else if (errorData.message) {
          setError(errorData.message);
        }
        // Fallback for other errors
        else {
          setError('Login failed. Please try again.');
        }
      } else {
        setError('Login failed. Please check your connection and try again.');
      }
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError('');
    
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/google-login`, {
        token: credentialResponse.credential,
      });
      
      if (res.data.success) {
        const { token, user: userData } = res.data;
        await handleLoginSuccess(token, userData);
      } else {
        setError(res.data.error || 'Google login failed');
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
      
      // Enhanced error handling for Google login
      if (err.response?.data) {
        const errorData = err.response.data;
        
        if (errorData.status === 'suspended') {
          const suspensionMessage = errorData.error || `Your account has been suspended. It will be reactivated in ${errorData.timeLeft} days.`;
          setAccountStatus('suspended');
          setUserData({
            suspended_until: errorData.suspended_until,
            strike_count: errorData.strike_count
          });
          setError(suspensionMessage);
        } 
        else if (errorData.status === 'banned') {
          const banMessage = errorData.error || 'Your account has been permanently banned. Please contact support.';
          setAccountStatus('banned');
          setUserData({
            strike_count: errorData.strike_count
          });
          setError(banMessage);
        }
        else if (errorData.error) {
          setError(errorData.error);
        }
        else {
          setError('Google login failed. Please try again.');
        }
      } else {
        setError('Google login failed. Please check your connection and try again.');
      }
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

  const closeAccountStatusModal = () => {
    setAccountStatus(null);
    setUserData(null);
    setPendingLogin(null);
  };

  const handleContinueToPlatform = () => {
    if (pendingLogin) {
      pendingLogin();
    }
    closeAccountStatusModal();
  };

  return (
    <div className="auth-container">
      {/* Navigation - Same as before */}
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

          {/* Mobile Menu Button */}
          <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
            {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
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

      {/* Main Content */}
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

      {/* Account Status Modal */}
      {accountStatus && (
        <AccountStatusModal
          status={accountStatus}
          message={error}
          userData={userData}
          onClose={closeAccountStatusModal}
          onContinue={handleContinueToPlatform}
        />
      )}
    </div>
  );
}
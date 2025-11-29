import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import '../css/auth.css';

// SVG Icons
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

const ChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="15" y1="15" x2="15" y2="7.5"/>
    <line x1="10" y1="15" x2="10" y2="2.5"/>
    <line x1="5" y1="15" x2="5" y2="10"/>
  </svg>
);

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

const EmailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3.75 5.625L10 10L16.25 5.625"/>
    <rect x="3.125" y="4.375" width="13.75" height="11.25" rx="1.25"/>
  </svg>
);

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    confirmPassword: '',
    acceptTerms: false 
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState([false, false, false]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL;

  // Auto-clear registration when leaving the page
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (verificationSent && userEmail) {
        // Registration data will automatically expire in 15 minutes on backend
        console.log('Registration cancelled due to page exit');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [verificationSent, userEmail]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    
    setForm({ ...form, [name]: fieldValue });
    setError('');
    
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
    
    setError('');
    setSuccess('');
    
    // Validation
    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (!form.acceptTerms) {
      setError('Please accept the Terms of Service and Privacy Policy');
      return;
    }
    
    setLoading(true);
    
    try {
      const { confirmPassword, acceptTerms, ...submitData } = form;
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, submitData);
      
      if (response.status === 201) {
        setUserEmail(form.email);
        setVerificationSent(true);
      }
    } catch (err) {
      if (err.response) {
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

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    
    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }
    
    setVerifying(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/verify-email`, {
        email: userEmail,
        code: verificationCode
      });
      
      if (response.data.success) {
        setSuccess('Email verified successfully! You can now login to your account.');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setSuccess('');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/resend-verification`, {
        email: userEmail
      });
      
      if (response.data.success) {
        setSuccess('New verification code sent to your email.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend verification code.');
    }
  };

  const handleStartOver = () => {
    // Clear everything and go back to registration form
    setVerificationSent(false);
    setUserEmail('');
    setVerificationCode('');
    setForm({ 
      name: '', 
      email: '', 
      password: '', 
      confirmPassword: '',
      acceptTerms: false 
    });
    setError('');
    setSuccess('');
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
    setMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="auth-container">
      {/* Navigation */}
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

      <main className="auth-main">
        <div className="auth-layout">
          {/* Left Side - Brand Section */}
          <div className="auth-brand-side">
            <div className="auth-brand-content">
              <h1>
                Join <span className="gradient-text">PeerFusion</span> today
              </h1>
              <p>
                Start your learning journey. Share knowledge, develop skills, 
                and grow together in our collaborative community.
              </p><br></br>
              <p>
                "The beautiful thing about learning is nobody can take it away from you." — B.B. King
              </p>
            </div>
          </div>

          {/* Right Side - Form Section */}
          <div className="auth-form-side">
            <div className="auth-form-container">
              {!verificationSent ? (
                <>
                  <div className="auth-form-header">
                    <h2>Create your account</h2>
                    <p>Get started with PeerFusion in seconds</p>
                  </div>
                  
                  <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                      <label htmlFor="name">Username</label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        className="form-control"
                        placeholder="Enter your Username"
                        value={form.name}
                        onChange={handleChange}
                        autoComplete="name"
                      />
                    </div>
                    
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
                        autoComplete="email"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="password">Password</label>
                      <div className="password-input-container">
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          className="form-control"
                          placeholder="Create a password"
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
                      </div>
                      
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

                    {/* Confirm Password Field */}
                    <div className="form-group">
                      <label htmlFor="confirmPassword">Confirm Password</label>
                      <div className="password-input-container">
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          className="form-control"
                          placeholder="Confirm your password"
                          value={form.confirmPassword}
                          onChange={handleChange}
                          autoComplete="new-password"
                        />
                        <button 
                          type="button" 
                          className="password-toggle"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                      {/* Show confirmation status */}
                      {form.confirmPassword && (
                        <div className="password-hints">
                          <ul>
                            <li style={{ 
                              color: form.password === form.confirmPassword ? '#4cd964' : '#ff3b30' 
                            }}>
                              {form.password === form.confirmPassword 
                                ? '✓ Passwords match' 
                                : '✗ Passwords do not match'
                              }
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Terms and Conditions */}
                    <div className="form-group terms-group">
                      <div className="terms-container">
                        <input
                          type="checkbox"
                          id="acceptTerms"
                          name="acceptTerms"
                          checked={form.acceptTerms}
                          onChange={handleChange}
                          className="terms-checkbox"
                        />
                        <label htmlFor="acceptTerms" className="terms-label">
                          I agree to the{' '}
                          <Link to="/terms" className="terms-link">
                            Terms of Service
                          </Link>{' '}
                          and{' '}
                          <Link to="/privacy" className="terms-link">
                            Privacy Policy
                          </Link>
                        </label>
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
                        <>
                          <span className="button-loader"></span>
                          Creating account...
                        </>
                      ) : (
                        'Create account'
                      )}
                    </button>
                  </form>

                  <div className="auth-form-footer">
                    <p>
                      Already have an account?{' '}
                      <Link to="/login">Sign in here</Link>
                    </p>
                  </div>
                </>
              ) : (
                // Verification Code Section
                <div className="verification-sent">
                  <div className="verification-icon">
                    <EmailIcon />
                  </div>
                  <h2>Verify your email address</h2>
                  <p>
                    We've sent a 6-digit verification code to <strong>{userEmail}</strong>. 
                    Please check your inbox and enter the code below to verify your account.
                  </p>
                  
                  <form className="auth-form" onSubmit={handleVerifyEmail}>
                    <div className="form-group">
                      <label htmlFor="verificationCode">Verification Code</label>
                      <input
                        id="verificationCode"
                        name="verificationCode"
                        type="text"
                        className="form-control"
                        placeholder="Enter 6-digit code"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength="6"
                        pattern="[0-9]{6}"
                      />
                      <small className="form-text">
                        Enter the 6-digit code from your email
                      </small>
                    </div>

                    <div className={`error-message ${error ? 'show' : ''}`}>
                      {error}
                    </div>
                    
                    {success && (
                      <div className="success-message">
                        {success}
                      </div>
                    )}

                    <div className="verification-actions">
                      <button 
                        type="submit" 
                        className="submit-btn" 
                        disabled={verifying || verificationCode.length !== 6}
                      >
                        {verifying ? (
                          <>
                            <span className="button-loader"></span>
                            Verifying...
                          </>
                        ) : (
                          'Verify Email'
                        )}
                      </button>
                      
                      <button 
                        type="button" 
                        className="secondary-btn"
                        onClick={handleResendCode}
                        disabled={verifying}
                      >
                        Resend Code
                      </button>
                      
                      <button 
                        type="button" 
                        className="text-btn"
                        onClick={handleStartOver}
                        disabled={verifying}
                      >
                        Use Different Email
                      </button>
                    </div>
                  </form>

                  <div className="verification-help">
                    <p>Didn't receive the code?</p>
                    <ul>
                      <li>Check your spam folder</li>
                      <li>Make sure you entered the correct email address</li>
                      <li>Wait a few minutes and try resending the code</li>
                    </ul>
                  </div>

                  <div className="auth-form-footer">
                    <p>
                      Already verified your account?{' '}
                      <Link to="/login">Sign in here</Link>
                    </p>
                  </div>
                </div>
              )}
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
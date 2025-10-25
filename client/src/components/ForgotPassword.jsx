import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import '../css/auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:5000/api/auth/forgot-password', { email });
      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
        className="auth-container"
        style={{
          background: `url('/background.svg') no-repeat center center fixed`,
          backgroundSize: 'cover'
        }}
      >
      <div className="auth-layout">
        <div className="auth-form-section">
          <div className="auth-card">
            <div className="auth-header">
              <img src="/logos.png" alt="PeerFusion Logo" className="logo" />
              <h2>Forgot Password?</h2>
              <p>We'll send a recovery link to your email.</p>
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className={`error-message ${error ? 'show' : ''}`}>{error}</div>
                {message && <div className="success-message">{message}</div>}

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="button-loader"></span>
                      Sending...
                    </>
                  ) : (
                    'Send Recovery Link'
                  )}
                </button>
              </form>

              <div className="auth-footer">
                <Link to="/login">Back to Login</Link>
              </div>
            </div>

             <footer className="auth-internal-footer">
                <div className="footer-content">
                  <p>&copy; 2024 PeerFusion. All rights reserved.</p>
                  <div className="footer-links">
                    <a href="/privacy">Privacy</a>
                    <a href="/terms">Terms</a>
                    <a href="/help">Help</a>
                  </div>
                </div>
              </footer>
          </div>
        </div>

        <div className="auth-graphics">
          <div className="svg-container">
            <img src="/LoginSvg.svg" alt="Password Recovery Illustration" className="login-svg" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
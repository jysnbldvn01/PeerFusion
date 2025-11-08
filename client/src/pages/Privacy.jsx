import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../css/terms.css';

// SVG Icons
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

const PrivacyPolicy = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    const handleScroll = () => {
      const isScrolled = window.scrollY > 50;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <div className="peerfusion-legal-container">
      {/* Navigation - Exact same as register page */}
      <nav className={`peerfusion-legal-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="peerfusion-nav-container">
          <div className="peerfusion-nav-logos" onClick={() => navigate('/')}>
            <img 
              src="/logos.png" 
              alt="PeerFusion" 
              className="peerfusion-logo-image"
              onError={(e) => {
                e.target.style.display = 'none';
                console.log('Logo failed to load');
              }}
            />
            <span>PeerFusion</span>
          </div>
          
          {/* Desktop Navigation Links */}
          <div className="peerfusion-nav-links">
            <a 
              href="#home" 
              className="peerfusion-nav-link"
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
              className="peerfusion-nav-link"
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
              className="peerfusion-nav-link"
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
              className="peerfusion-nav-link"
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
          <div className="peerfusion-nav-actions">
            <button className="peerfusion-nav-login" onClick={() => navigate('/login')}>
              Log in
            </button>
            <button className="peerfusion-nav-get-started" onClick={() => navigate('/register')}>
              Get Started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button className="peerfusion-mobile-menu-toggle" onClick={toggleMobileMenu}>
            {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        <div className={`peerfusion-mobile-dropdown-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <div className="peerfusion-mobile-nav-links">
            <a 
              href="#home" 
              className="peerfusion-mobile-nav-link"
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
              className="peerfusion-mobile-nav-link"
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
              className="peerfusion-mobile-nav-link"
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
              className="peerfusion-mobile-nav-link"
              onClick={(e) => {
                e.preventDefault();
                navigate('/');
                setTimeout(() => scrollToSection('community'), 100);
              }}
            >
              Community
            </a>
          </div>
          <div className="peerfusion-mobile-nav-actions">
            <button className="peerfusion-mobile-nav-login" onClick={() => navigate('/login')}>
              Log in
            </button>
            <button className="peerfusion-mobile-nav-get-started" onClick={() => navigate('/register')}>
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="peerfusion-legal-content">
        <div className="peerfusion-legal-header">
          <h1>Privacy Policy</h1>
          <p className="peerfusion-last-updated">Last Updated: December 2025</p>
          <div className="peerfusion-meta">
            <span className="peerfusion-meta-item">Data Protection</span>
            <span className="peerfusion-meta-item">DPA Compliant</span>
            <span className="peerfusion-meta-item">8 min read</span>
          </div>
        </div>

        <div>
          {/* Table of Contents */}
          <nav className="peerfusion-toc">
            <h3>Table of Contents</h3>
            <ul>
              <li><a href="#overview">1. Overview</a></li>
              <li><a href="#collection">2. Information We Collect</a></li>
              <li><a href="#use">3. How We Use Your Information</a></li>
              <li><a href="#protection">4. Data Protection and Security</a></li>
              <li><a href="#sharing">5. Information Sharing</a></li>
              <li><a href="#rights">6. Your Rights</a></li>
              <li><a href="#retention">7. Data Retention</a></li>
              <li><a href="#cookies">8. Cookies and Tracking</a></li>
              <li><a href="#compliance">9. Legal Compliance</a></li>
              <li><a href="#changes">10. Changes to Privacy Policy</a></li>
              <li><a href="#contact">11. Contact Information</a></li>
            </ul>
          </nav>

          <section id="overview" className="peerfusion-section">
            <h2>1. Overview</h2>
            <p>
              At <strong>PeerFusion</strong>, we are committed to protecting your privacy and ensuring the security of your personal information. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our peer tutoring platform.
            </p>
            <p>
              We comply with the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong> and other applicable Philippine data protection laws.
            </p>
            <div className="peerfusion-warning">
              By using PeerFusion, you consent to the data practices described in this policy.
            </div>
          </section>

          <section id="collection" className="peerfusion-section">
            <h2>2. Information We Collect</h2>

            <h3>Personal Information</h3>
            <div className="peerfusion-grid">
              <div className="peerfusion-card">
                <h4>Account Information</h4>
                <ul>
                  <li>Full name and email address</li>
                  <li>Educational institution and student status</li>
                  <li>Profile picture and biography</li>
                  <li>Contact preferences</li>
                </ul>
              </div>
              <div className="peerfusion-card">
                <h4>Academic Information</h4>
                <ul>
                  <li>Courses and subjects of expertise</li>
                  <li>Tutoring specialties and skills</li>
                  <li>Academic year and program</li>
                  <li>Learning preferences</li>
                </ul>
              </div>
              <div className="peerfusion-card">
                <h4>Platform Activity</h4>
                <ul>
                  <li>Session schedules</li>
                  <li>Messages and communications</li>
                  <li>Reviews and ratings given/received</li>
                  <li>Platform usage patterns</li>
                </ul>
              </div>
            </div>

            <h3>Technical Information</h3>
            <p>We automatically collect:</p>
            <ul>
              <li>IP address and device information</li>
              <li>Browser type and version</li>
              <li>Pages visited and features used</li>
              <li>Time and duration of session</li>
            </ul>

            <h3>Sensitive Information</h3>
            <p>
              We do not intentionally collect sensitive personal information unless required for 
              specific educational purposes with your explicit consent.
            </p>
          </section>

          <section id="use" className="peerfusion-section">
            <h2>3. How We Use Your Information</h2>

            <div className="peerfusion-grid">
              <div className="peerfusion-card">
                <h4>Platform Operation</h4>
                <p>To create and maintain your account, provide services, and facilitate connections between users</p>
              </div>
              <div className="peerfusion-card">
                <h4>Communication</h4>
                <p>To send important updates, session reminders, and platform notifications</p>
              </div>
              <div className="peerfusion-card">
                <h4>Quality Improvement</h4>
                <p>To enhance our services, develop new features, and improve user experience</p>
              </div>
              <div className="peerfusion-card">
                <h4>Safety & Moderation</h4>
                <p>To monitor platform activity, enforce policies, and handle reports</p>
              </div>
              <div className="peerfusion-card">
                <h4>Analytics</h4>
                <p>To understand usage patterns and optimize platform performance</p>
              </div>
              <div className="peerfusion-card">
                <h4>Legal Compliance</h4>
                <p>To comply with laws and respond to legal requests</p>
              </div>
            </div>
          </section>

          <section id="protection" className="peerfusion-section">
            <h2>4. Data Protection and Security</h2>

            <h3>Security Measures</h3>
            <p>We implement appropriate technical and organizational measures including:</p>
            <ul>
              <li>Encryption of sensitive data in transit and at rest</li>
              <li>Regular security assessments and updates</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Secure server infrastructure with regular backups</li>
              <li>Employee training on data protection</li>
            </ul>

            <h3>User Responsibilities</h3>
            <p>You play a crucial role in protecting your information:</p>
            <ul>
              <li>Keep your login credentials confidential</li>
              <li>Use strong, unique passwords</li>
              <li>Log out after each session, especially on shared devices</li>
              <li>Report any suspicious activity immediately</li>
            </ul>

            <div className="peerfusion-note">
              While we implement robust security measures, no online platform can guarantee absolute security.
            </div>
          </section>

          <section id="sharing" className="peerfusion-section">
            <h2>5. Information Sharing</h2>

            <h3>With Other Users</h3>
            <p>We share limited information to facilitate connections:</p>
            <ul>
              <li>Profile information (name, bio, subjects) with potential session partners</li>
              <li>Reviews and ratings with the community</li>
              <li>Availability and expertise with searching users</li>
            </ul>

            <h3>Service Providers</h3>
            <p>We may share information with trusted partners who help us operate the platform:</p>
            <ul>
              <li>Cloud hosting providers</li>
              <li>Email and notification services</li>
              <li>Analytics and monitoring tools</li>
            </ul>

            <h3>Legal Requirements</h3>
            <p>We may disclose information when required by law:</p>
            <ul>
              <li>To comply with legal obligations or court orders</li>
              <li>To protect our rights, property, or safety</li>
              <li>To investigate fraud or security issues</li>
              <li>As required by Philippine authorities</li>
            </ul>

            <div className="peerfusion-warning">
              We do not sell your personal information to third parties for marketing purposes.
            </div>
          </section>

          <section id="rights" className="peerfusion-section">
            <h2>6. Your Rights</h2>
            <p>Under the Data Privacy Act of 2012, you have the following rights:</p>

            <div className="peerfusion-grid">
              <div className="peerfusion-card">
                <h4>Right to Access</h4>
                <p>Request copies of your personal information we hold</p>
              </div>
              <div className="peerfusion-card">
                <h4>Right to Correction</h4>
                <p>Request correction of inaccurate or incomplete information</p>
              </div>
              <div className="peerfusion-card">
                <h4>Right to Object</h4>
                <p>Object to certain processing of your information</p>
              </div>
              <div className="peerfusion-card">
                <h4>Right to Erasure</h4>
                <p>Request deletion of your personal information</p>
              </div>
              <div className="peerfusion-card">
                <h4>Right to Data Portability</h4>
                <p>Request transfer of your data to another organization</p>
              </div>
              <div className="peerfusion-card">
                <h4>Right to Withdraw Consent</h4>
                <p>Withdraw previously given consent for data processing</p>
              </div>
            </div>
          </section>

          <section id="retention" className="peerfusion-section">
            <h2>7. Data Retention</h2>

            <h3>Retention Periods</h3>
            <p>We retain your information only as long as necessary:</p>
            <ul>
              <li><strong>Active Accounts:</strong> Until account deletion request</li>
              <li><strong>Inactive Accounts:</strong> 2 years of inactivity</li>
              <li><strong>Session Records:</strong> 3 years for quality and dispute resolution</li>
              <li><strong>Moderation Records:</strong> Permanently for safety purposes</li>
            </ul>

            <h3>Account Deletion</h3>
            <p>You may request account deletion at any time. Upon deletion, we will:</p>
            <ul>
              <li>Remove your personal information from active systems</li>
              <li>Anonymize your activity data for analytical purposes</li>
              <li>Retain necessary records as required by law</li>
              <li>Complete the process within 30 days</li>
            </ul>
          </section>

          <section id="cookies" className="peerfusion-section">
            <h2>8. Cookies and Tracking</h2>

            <h3>Types of Cookies</h3>
            <div className="peerfusion-grid">
              <div className="peerfusion-card">
                <h4>Essential Cookies</h4>
                <p>Required for platform functionality and security</p>
              </div>
              <div className="peerfusion-card">
                <h4>Performance Cookies</h4>
                <p>Help us understand how users interact with our platform</p>
              </div>
              <div className="peerfusion-card">
                <h4>Functional Cookies</h4>
                <p>Remember your preferences and settings</p>
              </div>
            </div>

            <h3>Cookie Management</h3>
            <p>
              You can control cookies through your browser settings. However, disabling essential 
              cookies may affect platform functionality.
            </p>
          </section>

          <section id="compliance" className="peerfusion-section">
            <h2>9. Legal Compliance</h2>
            <p>We comply with:</p>
            <ul>
              <li><strong>Republic Act No. 10173:</strong> Data Privacy Act of 2012</li>
              <li><strong>Republic Act No. 10175:</strong> Cybercrime Prevention Act of 2012</li>
              <li><strong>Republic Act No. 8792:</strong> E-Commerce Act of 2000</li>
            </ul>

            <h3>Data Protection Principles</h3>
            <p>
              We adhere to data protection principles and maintain appropriate security measures 
              to ensure the confidentiality, integrity, and availability of your personal information.
            </p>
          </section>

          <section id="changes" className="peerfusion-section">
            <h2>10. Changes to Privacy Policy</h2>
            <p>
              We may update this Privacy Policy to reflect changes in our practices, services, or legal requirements.
            </p>
            
            <h3>Notification</h3>
            <p>For significant changes, we will:</p>
            <ul>
              <li>Provide at least 30 days' notice before changes take effect</li>
              <li>Notify users via email or platform announcements</li>
              <li>Clearly indicate what changes are being made</li>
            </ul>

            <p>
              Your continued use of PeerFusion after changes to this Privacy Policy constitutes acceptance 
              of the modified terms.
            </p>
          </section>

          {/* Contact Information Section */}
          <section id="contact" className="peerfusion-section">
            <h2>11. Contact Information</h2>
            <p>For privacy-related questions, data access requests, or concerns, please contact:</p>
            <div className="peerfusion-contact-infos">
              <div className="peerfusion-contact-item">
                <strong>Email:</strong> PeerFusion@gmail.com
              </div>
              <div className="peerfusion-contact-item">
                <strong>Administrator:</strong> PeerFusion Devs
              </div>
              <div className="peerfusion-contact-item">
                <strong>Data Protection Inquiry:</strong> Please include "Data Request" in subject line
              </div>
            </div>
            <p>
              We are committed to responding to all data privacy inquiries within the timeframe 
              required by the Data Privacy Act of 2012.
            </p>
          </section>

          {/* Actions */}
          <div className="peerfusion-actions">
            <button onClick={scrollToTop} className="peerfusion-back-to-top">
              Back to Top
            </button>
            <div className="peerfusion-nav-buttons">
              <Link 
                to="/terms" 
                className="peerfusion-nav-button secondary"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                Terms of Use
              </Link>
              <Link 
                to="/" 
                className="peerfusion-nav-button primary"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer - Exact same as register page */}
      <footer className="peerfusion-legal-footer">
        <div className="peerfusion-footer-content">
          <div className="peerfusion-footer-brand">
            <div className="peerfusion-footer-logo">
              <img 
                src="/logos.png" 
                alt="PeerFusion" 
                className="peerfusion-logo-image"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <span>PeerFusion</span>
            </div>
            <p>
              Committed to protecting your privacy and data rights under Philippine law.
            </p>
          </div>
          <div className="peerfusion-footer-links">
            <div className="peerfusion-link-group">
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
            <div className="peerfusion-link-group">
              <h4>Support</h4>
              <a href="/help">Help Center</a>
              <a href="/user-appeal">Appeals</a>
              <a href="#contact">Contact</a>
            </div>
            <div className="peerfusion-link-group">
              <h4>Legal</h4>
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
            </div>
          </div>
        </div>
        <div className="peerfusion-footer-bottom">
          <p>&copy; 2025 PeerFusion. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
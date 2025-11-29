import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../css/terms.css';

// SVG Icons (same as register page)
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

const TermsOfUse = () => {
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

  const handleNavigation = (path) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => navigate(path), 100);
  };

  return (
    <div className="peerfusion-legal-container">
      {/* Navigation - Exact same as register page */}
      <nav className={`peerfusion-legal-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="peerfusion-nav-container">
          <div className="peerfusion-nav-logos" onClick={() => navigate('/')}>
            <img 
              src="/Logos.png" 
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
          <h1>Terms and Conditions</h1>
          <p className="peerfusion-last-updated">Last Updated: December 2025</p>
          <div className="peerfusion-meta">
            <span className="peerfusion-meta-item">Legal Document</span>
            <span className="peerfusion-meta-item">Philippines</span>
          </div>
        </div>

        <div>
          {/* Table of Contents */}
          <nav className="peerfusion-toc">
            <h3>Table of Contents</h3>
            <ul>
              <li><a href="#overview">1. Overview</a></li>
              <li><a href="#eligibility">2. User Eligibility and Roles</a></li>
              <li><a href="#conduct">3. Code of Conduct</a></li>
              <li><a href="#moderation">4. Report User, Strike System, and Moderation</a></li>
              <li><a href="#reviews">5. Reviews and Feedback</a></li>
              <li><a href="#privacy">6. Data Privacy and Security</a></li>
              <li><a href="#intellectual">7. Intellectual Property and Copyright</a></li>
              <li><a href="#legal">8. Legal Basis</a></li>
              <li><a href="#liability">9. Disclaimer of Liability</a></li>
              <li><a href="#updates">10. Updates to Terms</a></li>
              <li><a href="#contact">11. Contact Information</a></li>
            </ul>
          </nav>

          {/* Terms Sections */}
          <section id="overview" className="peerfusion-section">
            <h2>1. Overview</h2>
            <p>
              Welcome to <strong>PeerFusion</strong>, a peer tutoring and collaboration platform created for entrepreneurship students.
              By creating an account or using this website, you agree to these Terms and Conditions and Privacy Policy.
            </p>
            <div className="peerfusion-warning">
              If you do not agree, please stop using the site immediately.
            </div>
            <p>
              PeerFusion allows users to act as <strong>Peers (Tutors)</strong> or <strong>Learners</strong>, connect with others, 
              exchange knowledge, and review each other's performance.
            </p>
          </section>

          <section id="eligibility" className="peerfusion-section">
            <h2>2. User Eligibility and Roles</h2>
            
            <div className="peerfusion-grid">
              <div className="peerfusion-card">
                <h4>Peers (Tutors)</h4>
                <p>Students who offer tutoring sessions.</p>
              </div>
              <div className="peerfusion-card">
                <h4>Learners</h4>
                <p>Students who receive help or attend sessions.</p>
              </div>
            </div>

            <h3>Requirements</h3>
            <ul>
              <li>All users must be at least 18 years old or have parental/school consent.</li>
              <li>Users must provide accurate information during registration.</li>
              <li>PeerFusion reserves the right to suspend or remove accounts that provide false or misleading details.</li>
            </ul>
          </section>

          <section id="conduct" className="peerfusion-section">
            <h2>3. Code of Conduct</h2>
            <p>All users must:</p>
            <ul>
              <li>Treat others with respect and professionalism.</li>
              <li>Avoid posting or sending offensive, explicit, or harmful content.</li>
              <li>Refrain from harassment, discrimination, impersonation, or fraud.</li>
              <li>Use PeerFusion solely for educational and peer-learning purposes.</li>
            </ul>
            <div className="peerfusion-warning">
              Violation of these rules can lead to warnings, suspensions, or permanent bans (see Section 4).
            </div>
          </section>

          <section id="moderation" className="peerfusion-section">
            <h2>4. Report User, Strike System, and Moderation</h2>

            <h3>4.1. Reporting Procedure</h3>
            <p>
              PeerFusion users can report another user using the "Report User" feature.
              Reports can include evidence (screenshots, chat logs, etc.) and must specify a reason from the following categories:
            </p>
            <ul>
              <li>Harassment</li>
              <li>Hate Speech</li>
              <li>Spam</li>
              <li>Scam or Fraud</li>
              <li>Sexual Content</li>
              <li>Violence or Threats</li>
              <li>Self-harm</li>
              <li>Other</li>
            </ul>
            <p>All reports are reviewed by PeerFusion's moderation team or admin, who determine the appropriate action.</p>

            <h3>4.2. Strike Progression System</h3>
            <p>PeerFusion enforces community safety through a Strike Policy:</p>
            <div className="peerfusion-strike-system">
              <div className="peerfusion-strike-level">
                <span className="peerfusion-strike-counts">0 Strikes</span>
                <span className="peerfusion-strike-status">Active</span>
              </div>
              <div className="peerfusion-strike-level">
                <span className="peerfusion-strike-counts">1–2 Strikes</span>
                <span className="peerfusion-strike-status">Warning</span>
              </div>
              <div className="peerfusion-strike-level">
                <span className="peerfusion-strike-counts">3+ Strikes</span>
                <span className="peerfusion-strike-status">Suspended (unless permanently banned)</span>
              </div>
            </div>

            <h3>4.3. Report Severity Classification</h3>
            <div className="peerfusion-grid">
              <div className="peerfusion-card">
                <h4>Category 3 – Zero Tolerance (Immediate Ban)</h4>
                <p>Includes:</p>
                <ul>
                  <li>Hate Speech</li>
                  <li>Sexual Content</li>
                  <li>Violence or Threats</li>
                  <li>Self-harm</li>
                </ul>
                <p><strong>Result:</strong> Immediate 3 strikes → Permanent Ban</p>
              </div>

              <div className="peerfusion-card">
                <h4>Category 2 – High Severity</h4>
                <p>Includes:</p>
                <ul>
                  <li>Harassment</li>
                  <li>Scam or Fraud</li>
                </ul>
                <p><strong>Penalties:</strong></p>
                <ul>
                  <li>0 strikes → 1 strike (Warning)</li>
                  <li>1 strike → 2 strikes (Warning)</li>
                  <li>2+ strikes → 3 strikes → 30-day Suspension</li>
                </ul>
              </div>

              <div className="peerfusion-card">
                <h4>Category 1 – Low/Medium Severity</h4>
                <p>Includes:</p>
                <ul>
                  <li>Spam</li>
                  <li>Minor misconduct or inappropriate behavior</li>
                </ul>
                <p><strong>Progression:</strong></p>
                <ul>
                  <li>0→1→2→3→4→5 strikes</li>
                  <li>3 strikes = 7-day Suspension</li>
                  <li>4 strikes = 30-day Suspension</li>
                  <li>5+ strikes = Permanent Ban</li>
                </ul>
              </div>
            </div>

            <h3>4.4. Appeals Process</h3>
            <p>Users who receive a strike are notified and given one opportunity to appeal. The appeal process allows users to:</p>
            <ul>
              <li>Explain their side of the incident,</li>
              <li>Provide evidence or context, and</li>
              <li>Request reconsideration.</li>
            </ul>
            <p>
              PeerFusion's moderation team reviews appeals carefully but retains the right to uphold or overturn decisions.
            </p>
          </section>

          <section id="reviews" className="peerfusion-section">
            <h2>5. Reviews and Feedback</h2>
            <p>After each session, both Peers and Learners may leave ratings and written feedback.</p>
            <ul>
              <li>Reviews must be honest and respectful.</li>
              <li>Fake or manipulated reviews are strictly prohibited.</li>
              <li>PeerFusion may remove reviews that violate community standards.</li>
            </ul>
          </section>

          <section id="privacy" className="peerfusion-section">
            <h2>6. Data Privacy and Security</h2>
            <p>
              PeerFusion values user privacy and follows applicable data protection laws, including the Data Privacy Act of 2012 (Philippines).
            </p>
            
            <h3>Collected information includes:</h3>
            <ul>
              <li>Name, email, and school affiliation</li>
              <li>Profile information (photo, bio, tutoring subjects)</li>
              <li>Activity logs (reviews, reports, session history)</li>
            </ul>

            <h3>Data is used to:</h3>
            <ul>
              <li>Provide and improve the service</li>
              <li>Monitor user activity for violations</li>
              <li>Support dispute resolution</li>
            </ul>

            <p>User data will not be shared with third parties without consent, except when required by law.</p>
          </section>

        <section id="intellectual" className="peerfusion-section">
            <h2>7. Intellectual Property and Copyright</h2>
            <p>
                All <strong>original</strong> website content, features, and functionality developed by PeerFusion—including the overall design, text, and proprietary software features—are the intellectual property of PeerFusion and protected by the Intellectual Property Code of the Philippines (R.A. 8293) and international copyright laws.
            </p>
            <p>
                <strong>Licensed Materials:</strong> The PeerFusion logo and certain graphic elements used on the website (the "Licensed Elements") may incorporate templates and stock media provided under license by third-party providers, such as Canva. The intellectual property rights for these specific Licensed Elements belong to their respective owners (e.g., Canva or its contributors), and they are used by PeerFusion under a non-exclusive, perpetual license. <strong>PeerFusion does not claim exclusive trademark rights or copyright ownership over these individual Licensed Elements.</strong>
            </p>
            <p>
                <strong>User-Uploaded Content:</strong> Users retain ownership of materials they upload (such as notes or learning resources) but grant PeerFusion a non-exclusive, royalty-free, worldwide right to display, distribute, and reproduce those materials solely for the educational purposes outlined by the platform's services.
            </p>
            <div className="peerfusion-warning">
                Unauthorized reproduction, redistribution, modification, or misuse of PeerFusion's proprietary platform materials and the Licensed Elements (beyond the scope of normal website use) is strictly prohibited. Violation of these terms may result in immediate account termination and potential legal action under applicable intellectual property laws.
            </div>
        </section>
        
          <section id="legal" className="peerfusion-section">
            <h2>8. Legal Basis</h2>
            <p>PeerFusion operates in compliance with:</p>
            <ul>
              <li><strong>Republic Act No. 10173</strong> – Data Privacy Act of 2012</li>
              <li><strong>Republic Act No. 8293</strong> – Intellectual Property Code of the Philippines</li>
              <li>Applicable university or academic conduct policies</li>
            </ul>
          </section>

          <section id="liability" className="peerfusion-section">
            <h2>9. Disclaimer of Liability</h2>
            <p>
              PeerFusion serves as a platform for peer-to-peer learning and is not responsible for the quality or outcomes of tutoring sessions.
              Users are fully responsible for their interactions and posted content.
            </p>
            <p>PeerFusion is not liable for:</p>
            <ul>
              <li>Damages resulting from misuse of the platform</li>
              <li>Disputes between users</li>
              <li>Temporary unavailability or data loss</li>
            </ul>
          </section>

          <section id="updates" className="peerfusion-section">
            <h2>10. Updates to Terms</h2>
            <p>PeerFusion may revise these Terms and Conditions at any time.</p>
            <p>
              Users will be notified of significant updates, and continued use of the site implies acceptance of the new terms.
            </p>
          </section>

          {/* Contact Information Section */}
          <section id="contact" className="peerfusion-section">
            <h2>11. Contact Information</h2>
            <p>For questions, reports, or appeals, please contact:</p>
            <div className="peerfusion-contact-infos">
              <div className="peerfusion-contact-item">
                <strong>Email:</strong> Peerfusion@gmail.com
              </div>
              <div className="peerfusion-contact-item">
                <strong>Administrator:</strong> PeerFusion Devs
              </div>
            </div>
            <p>
              We typically respond to inquiries within 1-3 business days. For urgent matters 
              regarding account safety or immediate threats, please indicate "URGENT" in your subject line.
            </p>
          </section>

          {/* Actions */}
          <div className="peerfusion-actions">
            <button onClick={scrollToTop} className="peerfusion-back-to-top">
              Back to Top
            </button>
            <div className="peerfusion-nav-buttons">
              <Link 
                to="/privacy" 
                className="peerfusion-nav-button secondary"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                Privacy Policy
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

      {/* Footer */}
      <footer className="peerfusion-legal-footer">
        <div className="peerfusion-footer-content">
          <div className="footer-brand">
            <div className="footer-logo">
              <img src="/Logos.png" alt="PeerFusion" className="logo-image" />
              <span>PeerFusion</span>
            </div>
            <p>
              Empowering learners through collaborative learning and peer-to-peer skill sharing.
            </p>
            <div className="footer-contact-info">
              <div className="footer-email-display">
                <span className="email-icon-small"></span>
                Peerfusion@gmail.com
              </div>
            </div>
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
              <a href="/support">Help Center</a>
              <a href="/user-appeal">Appeals</a>              
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

export default TermsOfUse;
// pages/SupportPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../css/support.css';
const API_BASE_URL = process.env.REACT_APP_API_URL;

// SVG Icons - Same as your register page
const EmailIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);

const BuildingIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9l6 6 6-6"/>
  </svg>
);

const HelpCircleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
    <line x1="12" y1="17" x2="12" y2="17"></line>
  </svg>
);

const MessageSquareIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
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

const UploadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
);

const FileIcon = ({ file }) => {
  const getFileType = (file) => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type === 'application/pdf') return 'pdf';
    if (file.type.includes('document') || file.type.includes('word')) return 'document';
    if (file.type === 'application/zip') return 'zip';
    return 'file';
  };

  const fileType = getFileType(file);

  const icons = {
    image: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
    ),
    pdf: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    ),
    document: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    ),
    zip: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <path d="M16 13l-1.5-1.5"></path>
        <path d="M16 17l-1.5 1.5"></path>
        <path d="M10 13l1.5-1.5"></path>
        <path d="M10 17l1.5 1.5"></path>
      </svg>
    ),
    file: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>
    )
  };

  return icons[fileType] || icons.file;
};


const SupportPage = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('general');
  const [openFaq, setOpenFaq] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: 'general',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  // FAQ Data organized by categories
  const faqData = {
    general: [
      {
        id: 1,
        question: "What is PeerFusion and how does it work?",
        answer: "PeerFusion is a web-based interactive platform for peer-to-peer skill sharing and live collaboration. It connects learners with skill sharers based on their interests, skills, and academic needs through features like session scheduling, real-time communication, and feedback systems."
      },
      {
        id: 2,
        question: "Is PeerFusion free to use?",
        answer: "Yes! PeerFusion is completely free for students and learners. We believe in making education accessible to everyone without financial barriers."
      },
      {
        id: 3,
        question: "Who can use PeerFusion?",
        answer: "Currently, PeerFusion is available for BS Entrepreneurship students at EARIST campus. We're starting with this department to ensure quality and focused skill sharing within our academic community."
      },
      {
        id: 4,
        question: "How do I create an account?",
        answer: "Click the 'Get Started' button on our homepage. You'll need to verify your email address to complete the registration process."
      }
    ],
    technical: [
      {
        id: 5,
        question: "What are the system requirements?",
        answer: "PeerFusion works on any modern web browser (Chrome, Firefox, Safari, Edge) on desktop, laptop, tablet, or smartphone. For video sessions, a stable internet connection and webcam are recommended."
      },
      {
        id: 6,
        question: "Do I need to install any software?",
        answer: "No installation required! PeerFusion is a web-based platform accessible through your browser. No downloads or installations needed."
      },
      {
        id: 7,
        question: "How do I reset my password?",
        answer: "Click on 'Forgot Password' on the login page. You'll receive an email with instructions to reset your password securely."
      },
      {
        id: 8,
        question: "The video/audio isn't working during sessions",
        answer: "First, check your browser permissions to ensure PeerFusion has access to your camera and microphone. Also, try refreshing the page or using a different browser. Make sure you're using HTTPS connection."
      }
    ],
    sessions: [
      {
        id: 9,
        question: "How do I schedule a learning session?",
        answer: "Navigate to the 'Home Page' section, browse available skill sharers, and use the scheduling feature to book a session based on mutual availability. You'll receive confirmation and reminders."
      },
      {
        id: 10,
        question: "Can I cancel or reschedule a session?",
        answer: "Yes, you can cancel or reschedule sessions up to 2 hours before the scheduled time through your dashboard. This gives the other party adequate notice."
      },
      {
        id: 11,
        question: "What happens if my session partner doesn't show up?",
        answer: "Wait for 15 minutes, then you can mark the session as 'no-show'. This will be reflected in their rating, and you can reschedule with another skill sharer."
      },
      {
        id: 12,
        question: "How long do sessions typically last?",
        answer: "Sessions can be scheduled for 30, 60, or 90 minutes. The duration is agreed upon when booking the session and can be customized based on the skill being shared."
      }
    ],
    safety: [
      {
        id: 13,
        question: "How does PeerFusion ensure user safety?",
        answer: "We have community guidelines, reporting systems, verified student accounts, and moderator oversight. All sessions can be rated and reviewed to maintain quality and safety standards."
      },
      {
        id: 14,
        question: "What should I do if I encounter inappropriate behavior?",
        answer: "Use the 'Report User' feature immediately. Our moderators will review the report and take appropriate action within 24 hours. You can also contact support directly through this page."
      },
      {
        id: 15,
        question: "Is my personal information safe?",
        answer: "Yes, we follow strict data protection practices. Your personal information is encrypted and only shared with session partners when necessary for scheduling. We never sell your data to third parties."
      }
    ]
  };

  const handleFaqToggle = (id) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const handleFileChange = (e) => {
  setSelectedFiles(Array.from(e.target.files));
};

const handleRemoveFile = (index) => {
  setSelectedFiles(prev => prev.filter((_, i) => i !== index));
};
  
const handleSubmit = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);
  setSubmitStatus(null);
  
  try {
    const formDataToSend = new FormData();
    formDataToSend.append('name', formData.name);
    formDataToSend.append('email', formData.email);
    formDataToSend.append('subject', formData.subject);
    formDataToSend.append('category', formData.category);
    formDataToSend.append('message', formData.message);

    selectedFiles.forEach(file => {
      formDataToSend.append('evidence', file);
    });

    console.log('Submitting support ticket with:', {
      name: formData.name,
      email: formData.email,
      subject: formData.subject,
      category: formData.category,
      files: selectedFiles.length
    });

    const response = await fetch(`${API_BASE_URL}/api/support/tickets`, {
      method: 'POST',
      body: formDataToSend,
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Server response:', result);

    if (result.success) {
      setSubmitStatus('success');
      setFormData({
        name: '',
        email: '',
        subject: '',
        category: 'general',
        message: ''
      });
      setSelectedFiles([]);
    } else {
      setSubmitStatus('error');
    }
  } catch (error) {
    console.error('Error submitting support ticket:', error);
    setSubmitStatus('error');
  } finally {
    setIsSubmitting(false);
  }
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
    <div className="peerfusion-support-page">
      {/* Navigation - Exact same as Register page */}
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
            <a href="/support" className="nav-link active">
              Support
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
            <a href="/support" className="mobile-nav-link active">
              Support
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

      {/* Support Hero Section */}
      <section className="support-hero">
        <div className="container">
          <div className="support-hero-content">
            <h1>How can we help you?</h1>
            <p>Find answers to common questions, get troubleshooting help, or contact our support team directly</p>
          </div>
        </div>
      </section>

      {/* Quick Help Sections */}
      <section className="quick-help-section">
        <div className="container">
          <div className="quick-help-grid">
            <div className="help-card">
              <div className="help-card-icon">
                <HelpCircleIcon />
              </div>
              <h3>FAQ Center</h3>
              <p>Browse frequently asked questions and find quick solutions to common issues</p>
            </div>
            <div className="help-card">
              <div className="help-card-icon">
                <MessageSquareIcon />
              </div>
              <h3>Contact Support</h3>
              <p>Can't find what you need? Send us a message and we'll help you personally</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container">
        <div className="support-content">
          {/* FAQ Section */}
          <section className="faq-section">
            <div className="section-header">
              <h2>Frequently Asked Questions</h2>
              <p>Quick answers to common questions about PeerFusion</p>
            </div>

            {/* Category Filters */}
            <div className="faq-categories">
              {Object.keys(faqData).map(category => (
                <button
                  key={category}
                  className={`category-btn ${activeCategory === category ? 'active' : ''}`}
                  onClick={() => setActiveCategory(category)}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>

            {/* FAQ List */}
            <div className="faq-list">
              {faqData[activeCategory].map(faq => (
                <div key={faq.id} className="faq-item">
                  <button
                    className="faq-question"
                    onClick={() => handleFaqToggle(faq.id)}
                  >
                    <span>{faq.question}</span>
                    <ChevronDownIcon className={`faq-icon ${openFaq === faq.id ? 'open' : ''}`} />
                  </button>
                  {openFaq === faq.id && (
                    <div className="faq-answer">
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Contact Form Section */}
          <section className="contact-section">
            <div className="section-header">
              <h2>Contact Support Team</h2>
              <p>Send us a message and we'll get back to you as soon as possible</p>
            </div>

            <div className="contact-content">
              <form className="contact-form" onSubmit={handleSubmit}>
                {submitStatus === 'success' && (
                  <div className="alert alert-success">
                    <strong>Thank you!</strong> Your message has been sent successfully. We'll get back to you within 24 hours.
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="name">Full Name *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email Address *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter your email address"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="subject">Subject *</label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      required
                      placeholder="Brief description of your issue"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="category">Category *</label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="general">General Inquiry</option>
                      <option value="technical">Technical Issue</option>
                      <option value="sessions">Session Related</option>
                      <option value="safety">Safety Concern</option>
                      <option value="feedback">Feedback & Suggestions</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="message">Message *</label>
                  <textarea
                    id="message"
                    name="message"
                    rows="6"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Please describe your issue or question in detail..."
                    required
                  ></textarea>
                </div>
                    <div className="form-group">
                    <label htmlFor="evidence" className="file-upload-label">
                        Attach Files (Optional)
                    </label>
                    
                    <div className="file-upload-container">
                        <input
                        type="file"
                        id="evidence"
                        name="evidence"
                        multiple
                        accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.doc,.docx,.zip"
                        onChange={handleFileChange}
                        className="file-upload-input"
                        />
                        <div className="file-upload-design">
                        <div className="file-upload-icon">
                            <UploadIcon />
                        </div>
                        <div className="file-upload-text">
                            <span className="file-upload-title">Choose files to upload</span>
                            <span className="file-upload-subtitle">
                            PNG, JPG, PDF, DOC up to 10MB each
                            </span>
                        </div>
                        </div>
                    </div>

                    {selectedFiles.length > 0 && (
                        <div className="file-preview">
                        <div className="file-preview-header">
                            <span className="file-preview-title">Selected Files</span>
                            <span className="file-preview-count">{selectedFiles.length} files</span>
                        </div>
                        <div className="file-preview-list">
                            {selectedFiles.map((file, index) => (
                            <div key={index} className="file-preview-item">
                                <div className="file-preview-icon">
                                <FileIcon file={file} />
                                </div>
                                <div className="file-preview-info">
                                <span className="file-preview-name">{file.name}</span>
                                <span className="file-preview-size">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                </span>
                                </div>
                                <button
                                type="button"
                                className="file-remove-button"
                                onClick={() => handleRemoveFile(index)}
                                >
                                <CloseIcon />
                                </button>
                            </div>
                            ))}
                        </div>
                        </div>
                    )}
                    
                    <small className="file-upload-hint">
                        Maximum 5 files, 10MB each. Supported: Images, PDF, Documents, ZIP
                    </small>
                    </div>
                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending Message...' : 'Send Message'}
                </button>
              </form>

              {/* Alternative Contact Methods */}
              <div className="alternative-contact">
                <h3>Other Ways to Reach Us</h3>
                <div className="contact-methods">
                  <div className="contact-method">
                    <div className="method-icon">
                      <EmailIcon />
                    </div>
                    <div className="method-info">
                      <h4>Email Support</h4>
                      <p>support@peerfusion.edu</p>
                      <small>Typically responds within 24 hours</small>
                    </div>
                  </div>
                  <div className="contact-method">
                    <div className="method-icon">
                      <BuildingIcon />
                    </div>
                    <div className="method-info">
                      <h4>Department Office</h4>
                      <p>BS Entrepreneurship Department</p>
                      <small>EARIST Campus, Office Hours: 8AM-5PM</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Footer - Exact same as Register page */}
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
};

export default SupportPage;
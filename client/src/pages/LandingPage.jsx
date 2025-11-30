// pages/LandingPage.js
import React, { useEffect, useState, useRef } from 'react';
import '../css/landingpage.css';

// SVG Icons
const UsersIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const VideoIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="23 7 16 12 23 17 23 7"></polygon>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
  </svg>
);

const CalendarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const StarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);

const ShieldIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>
);

const ChartIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="20" x2="18" y2="10"></line>
    <line x1="12" y1="20" x2="12" y2="4"></line>
    <line x1="6" y1="20" x2="6" y2="14"></line>
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

const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const testimonialTrackRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

useEffect(() => {
  const organizeExistingTestimonials = () => {
    const track = testimonialTrackRef.current;
    if (!track) return;

    const testimonials = Array.from(track.children);
    const isMobile = window.innerWidth <= 768;
    
    track.innerHTML = '';
    
    if (isMobile) {
      testimonials.forEach(testimonial => {
        const card = testimonial.cloneNode(true);
        card.classList.remove('testimonial-column');
        track.appendChild(card);
      });
      
      const allCards = Array.from(track.children);
      allCards.forEach(card => {
        const clone = card.cloneNode(true);
        track.appendChild(clone);
      });
    } else {
      const columns = 5;
      const columnData = Array.from({ length: columns }, () => []);
      
      testimonials.forEach((testimonial, index) => {
        const columnIndex = index % columns;
        columnData[columnIndex].push(testimonial);
      });
      
      columnData.forEach((columnTestimonials) => {
        const columnDiv = document.createElement('div');
        columnDiv.className = 'testimonial-column';
        
        columnTestimonials.forEach(testimonial => {
          columnDiv.appendChild(testimonial.cloneNode(true));
        });
        
        track.appendChild(columnDiv);
      });

      const allColumns = Array.from(track.children);
      allColumns.forEach(column => {
        const clone = column.cloneNode(true);
        track.appendChild(clone);
      });
    }
  };

  organizeExistingTestimonials();
  
  const handleResize = () => {
    organizeExistingTestimonials();
  };
  
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

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

  const navigateTo = (path) => {
    setMobileMenuOpen(false);
    window.location.href = path;
  };

  return (
    <div className="peerfusion-landing-page">
      {/* Navigation */}
      <nav className={`peerfusion-landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-container">
          <div className="nav-logo">
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
                scrollToSection('home');
              }}
            >
              Home
            </a>
            <a 
              href="#about" 
              className="nav-link"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('about');
              }}
            >
              About
            </a>
            <a 
              href="#features" 
              className="nav-link"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('features');
              }}
            >
              Features
            </a>
            <a 
              href="#community" 
              className="nav-link"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('community');
              }}
            >
              Community
            </a>
          </div>

          {/* Desktop Actions */}
          <div className="nav-actions">
            <button className="nav-login" onClick={() => navigateTo('/login')}>
              Log in
            </button>
            <button className="nav-get-started" onClick={() => navigateTo('/register')}>
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
                scrollToSection('home');
              }}
            >
              Home
            </a>
            <a 
              href="#about" 
              className="mobile-nav-link"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('about');
              }}
            >
              About
            </a>
            <a 
              href="#features" 
              className="mobile-nav-link"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('features');
              }}
            >
              Features
            </a>
            <a 
              href="#community" 
              className="mobile-nav-link"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('community');
              }}
            >
              Community
            </a>
          </div>
          <div className="mobile-nav-actions">
            <button className="mobile-nav-login" onClick={() => navigateTo('/login')}>
              Log in
            </button>
            <button className="mobile-nav-get-started" onClick={() => navigateTo('/register')}>
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section - UPDATED VERSION */}
      <section className="hero-section" id="home">
        <div className="hero-background">
          <div className="hero-gradient"></div>
        </div>
        <div className="container">
          <div className="hero-content">
            {/* Left Side - Text Content */}
            <div className="hero-text">
              <h1 className="hero-title">
                Connect, Collaborate & 
                <span className="gradient-text"> Grow Together</span>
              </h1>
              <p className="hero-description">
                PeerFusion is a revolutionary platform that brings together learners 
                to share knowledge through real-time collaboration, interactive sessions, 
                and community-driven learning experiences.
              </p>

              <div className="hero-actions">
                <button 
                  className="sbtn-primary" 
                  onClick={() => navigateTo('/register')}
                >
                  Start Learning Now
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => scrollToSection('features')}
                >
                  Explore Features
                </button>
              </div>
            </div>

            {/* Right Side - Graphic Design - Will be hidden on mobile */}
            <div className="hero-graphic">
              <div className="graphic-container">
                <img 
                  src="/graphics.svg" 
                  alt="PeerFusion Platform Visualization" 
                  className="graphic-svg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section" id="about">
        <div className="container">
          <div className="about-content">
            <h2>About PeerFusion</h2>
            <p className="about-statement">
              We believe in the power of collaborative learning. PeerFusion was born from 
              the vision to create a space where knowledge flows freely between peers, 
              breaking down traditional educational barriers and fostering a culture of 
              mutual growth and continuous learning.
            </p>
            <div className="about-pillars">
              <div className="pillar">
                <div className="pillar-icon">
                  <UsersIcon />
                </div>
                <h3>Peer Collaboration</h3>
                <p>Learn directly from fellow learners who understand your journey and challenges</p>
              </div>
              <div className="pillar">
                <div className="pillar-icon">
                  <VideoIcon />
                </div>
                <h3>Real-time Interaction</h3>
                <p>Live chat, video sessions, and instant feedback for effective learning experiences</p>
              </div>
              <div className="pillar">
                <div className="pillar-icon">
                  <ChartIcon />
                </div>
                <h3>Continuous Growth</h3>
                <p>develop valuable skills through community engagement</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section" id="features">
        <div className="container">
          <div className="section-header">
            <h2>Powerful Features for Seamless Learning</h2>
            <p>Everything you need to share knowledge and grow together</p>
          </div>
          <div className="features-grid">
            {/* First Row - 3 features */}
            <div className="features-row first-row">
              <div className="feature-card">
                <div className="feature-icon">
                  <UsersIcon />
                </div>
                <h3>Skill Matching</h3>
                <p>Find perfect learning partners based on your interests, skills, and availability</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <CalendarIcon />
                </div>
                <h3>Session Scheduling</h3>
                <p>Easily plan learning sessions</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <VideoIcon />
                </div>
                <h3>Live Collaboration</h3>
                <p>Real-time chat, video calls, and screen sharing for interactive learning</p>
              </div>
            </div>
            
            {/* Second Row - 2 features centered */}
            <div className="features-row second-row">
              <div className="feature-card">
                <div className="feature-icon">
                  <StarIcon />
                </div>
                <h3>Feedback System</h3>
                <p>Rate sessions and build reputation within the learning community</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <ShieldIcon />
                </div>
                <h3>Secure Environment</h3>
                <p>Safe and moderated platform with community guidelines and support</p>
              </div>
            </div>
          </div>
        </div>
      </section>

{/* Community Section */}
<section className="community-section" id="community">
  <div className="container">
    <div className="community-content">
      <div className="community-text">
        <h2>Join Our Growing Community</h2>
        <p>
          Become part of a dynamic ecosystem where knowledge flows freely. 
          Share your expertise, learn new skills, and build lasting connections.
        </p>
      </div>
      
      <div className="community-visual">
        {/* Shadow elements */}
        <div className="left-shadow"></div>
        <div className="right-shadow"></div>
        <div className="bottom-shadow"></div>
        
        <div className="testimonial-track" ref={testimonialTrackRef}>
          {/* ORIGINAL CONTENT */}
          <div className="testimonial-card">
            <div className="testimonial-header">
              <div className="testimonial-avatar">
                <img src="/testimonial/grain-leveon.png" alt="Grain Leveon" />
              </div>
              <div className="testimonial-user">
                <div className="testimonial-username">Grain Leveon</div>
                <div className="testimonial-handle">@grainleveon</div>
              </div>
            </div>
            <p className="testimonial-content">
              Lately been using PeerFusion over traditional platforms for learning to save on costs and rapid skill building that do not need all the complex setup.
            </p>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-header">
              <div className="testimonial-avatar">
                <img src="/testimonial/open-toast.png" alt="Open Toast" />
              </div>
              <div className="testimonial-user">
                <div className="testimonial-username">Open Toast</div>
                <div className="testimonial-handle">@opentoast</div>
              </div>
            </div>
            <p className="testimonial-content">
              I love everything about PeerFusion.
            </p>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-header">
              <div className="testimonial-avatar">
                <img src="/testimonial/grad-burn.png" alt="Grad Burn" />
              </div>
              <div className="testimonial-user">
                <div className="testimonial-username">Grad Burn</div>
                <div className="testimonial-handle">@gradburn</div>
              </div>
            </div>
            <p className="testimonial-content">
              It's fun, feels lightweight, and really quick to find learning partners. Almost too easy! Highly recommend.
            </p>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-header">
              <div className="testimonial-avatar">
                <img src="/testimonial/spark-ele.png" alt="Spark Ele" />
              </div>
              <div className="testimonial-user">
                <div className="testimonial-username">Spark Ele</div>
                <div className="testimonial-handle">@sparkele</div>
              </div>
            </div>
            <p className="testimonial-content">
              Very impressed by PeerFusion's growth. For new learners, they seem to have gone from "promising" to "standard" in remarkably short order.
            </p>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-header">
              <div className="testimonial-avatar">
                <img src="/testimonial/red-elix.png" alt="Red Elix" />
              </div>
              <div className="testimonial-user">
                <div className="testimonial-username">Red Elix</div>
                <div className="testimonial-handle">@redelix</div>
              </div>
            </div>
            <p className="testimonial-content">
              PeerFusion's matching system is awesome. It's helping me create better learning paths and telling me best practices for setting up my learning journey.
            </p>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-header">
              <div className="testimonial-avatar">
                <img src="/testimonial/tyron-bache.png" alt="Tyron Bache" />
              </div>
              <div className="testimonial-user">
                <div className="testimonial-username">Tyron Bache</div>
                <div className="testimonial-handle">@tyronbache</div>
              </div>
            </div>
            <p className="testimonial-content">
              Really impressed with PeerFusion Assistant. It has helped me improve our team's learning efficiency.
            </p>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-header">
              <div className="testimonial-avatar">
                <img src="/testimonial/chris-madge.png" alt="Chris Madge" />
              </div>
              <div className="testimonial-user">
                <div className="testimonial-username">Chris Madge</div>
                <div className="testimonial-handle">@chismadge</div>
              </div>
            </div>
            <p className="testimonial-content">
              Great solution overall.
            </p>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-header">
              <div className="testimonial-avatar">
                <img src="/testimonial/sue-abase.png" alt="Sue Abase" />
              </div>
              <div className="testimonial-user">
                <div className="testimonial-username">Sue Abase</div>
                <div className="testimonial-handle">@sueabase</div>
              </div>
            </div>
            <p className="testimonial-content">
              The community features are exceptional. I've never felt more supported in my learning journey.
            </p>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-header">
              <div className="testimonial-avatar">
                <img src="/testimonial/star-dose.png" alt="Star Dose" />
              </div>
              <div className="testimonial-user">
                <div className="testimonial-username">Star Dose</div>
                <div className="testimonial-handle">@stardose</div>
              </div>
            </div>
            <p className="testimonial-content">
              Perfect for rapid skill development.
            </p>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-header">
              <div className="testimonial-avatar">
                <img src="/testimonial/erlando-pecho.png" alt="Erlando Pecho" />
              </div>
              <div className="testimonial-user">
                <div className="testimonial-username">Erlando Pecho</div>
                <div className="testimonial-handle">@erlandopecho</div>
              </div>
            </div>
            <p className="testimonial-content">
              Love PeerFusion's session features - makes collaborative learning so much better than traditional platforms with much more flexibility and better user experience.
            </p>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-header">
              <div className="testimonial-avatar">
                <img src="/testimonial/ada-steele.png" alt="Ada Steele" />
              </div>
              <div className="testimonial-user">
                <div className="testimonial-username">Ada Steele</div>
                <div className="testimonial-handle">@adasteele</div>
              </div>
            </div>
            <p className="testimonial-content">
              Great community.
            </p>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-header">
              <div className="testimonial-avatar">
                <img src="/testimonial/mike-johnson.png" alt="Mike Johnson" />
              </div>
              <div className="testimonial-user">
                <div className="testimonial-username">Mike Johnson</div>
                <div className="testimonial-handle">@mikej</div>
              </div>
            </div>
            <p className="testimonial-content">
              As a busy professional, the scheduling flexibility has been a complete game-changer for my ongoing learning journey and career development.
            </p>
          </div>

          {/* DUPLICATE CONTENT FOR CONTINUOUS ROTATION */}
          <div className="testimonial-card">
            <div className="testimonial-header">
              <div className="testimonial-avatar">
                <img src="/testimonial/grain-leveon.png" alt="Grain Leveon" />
              </div>
              <div className="testimonial-user">
                <div className="testimonial-username">Grain Leveon</div>
                <div className="testimonial-handle">@grainleveon</div>
              </div>
            </div>
            <p className="testimonial-content">
              Lately been using PeerFusion over traditional platforms for learning to save on costs and rapid skill building that do not need all the complex setup.
            </p>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-header">
              <div className="testimonial-avatar">
                <img src="/testimonial/open-toast.png" alt="Open Toast" />
              </div>
              <div className="testimonial-user">
                <div className="testimonial-username">Open Toast</div>
                <div className="testimonial-handle">@opentoast</div>
              </div>
            </div>
            <p className="testimonial-content">
              I love everything about PeerFusion.
            </p>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-header">
              <div className="testimonial-avatar">
                <img src="/testimonial/grad-burn.png" alt="Grad Burn" />
              </div>
              <div className="testimonial-user">
                <div className="testimonial-username">Grad Burn</div>
                <div className="testimonial-handle">@gradburn</div>
              </div>
            </div>
            <p className="testimonial-content">
              It's fun, feels lightweight, and really quick to find learning partners. Almost too easy! Highly recommend.
            </p>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-header">
              <div className="testimonial-avatar">
                <img src="/testimonial/spark-ele.png" alt="Spark Ele" />
              </div>
              <div className="testimonial-user">
                <div className="testimonial-username">Spark Ele</div>
                <div className="testimonial-handle">@sparkele</div>
              </div>
            </div>
            <p className="testimonial-content">
              Very impressed by PeerFusion's growth. For new learners, they seem to have gone from "promising" to "standard" in remarkably short order.
            </p>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-header">
              <div className="testimonial-avatar">
                <img src="/testimonial/red-elix.png" alt="Red Elix" />
              </div>
              <div className="testimonial-user">
                <div className="testimonial-username">Red Elix</div>
                <div className="testimonial-handle">@redelix</div>
              </div>
            </div>
            <p className="testimonial-content">
              PeerFusion's matching system is awesome. It's helping me create better learning paths and telling me best practices for setting up my learning journey.
            </p>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-header">
              <div className="testimonial-avatar">
                <img src="/testimonial/tyron-bache.png" alt="Tyron Bache" />
              </div>
              <div className="testimonial-user">
                <div className="testimonial-username">Tyron Bache</div>
                <div className="testimonial-handle">@tyronbache</div>
              </div>
            </div>
            <p className="testimonial-content">
              Really impressed with PeerFusion Assistant. It has helped me improve our team's learning efficiency.
            </p>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-header">
              <div className="testimonial-avatar">
                <img src="/testimonial/chris-madge.png" alt="Chris Madge" />
              </div>
              <div className="testimonial-user">
                <div className="testimonial-username">Chris Madge</div>
                <div className="testimonial-handle">@chismadge</div>
              </div>
            </div>
            <p className="testimonial-content">
              Great solution overall.
            </p>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-header">
              <div className="testimonial-avatar">
                <img src="/testimonial/sue-abase.png" alt="Sue Abase" />
              </div>
              <div className="testimonial-user">
                <div className="testimonial-username">Sue Abase</div>
                <div className="testimonial-handle">@sueabase</div>
              </div>
            </div>
            <p className="testimonial-content">
              The community features are exceptional. I've never felt more supported in my learning journey.
            </p>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-header">
              <div className="testimonial-avatar">
                <img src="/testimonial/star-dose.png" alt="Star Dose" />
              </div>
              <div className="testimonial-user">
                <div className="testimonial-username">Star Dose</div>
                <div className="testimonial-handle">@stardose</div>
              </div>
            </div>
            <p className="testimonial-content">
              Perfect for rapid skill development.
            </p>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-header">
              <div className="testimonial-avatar">
                <img src="/testimonial/erlando-pecho.png" alt="Erlando Pecho" />
              </div>
              <div className="testimonial-user">
                <div className="testimonial-username">Erlando Pecho</div>
                <div className="testimonial-handle">@erlandopecho</div>
              </div>
            </div>
            <p className="testimonial-content">
              Love PeerFusion's session features - makes collaborative learning so much better than traditional platforms with much more flexibility and better user experience.
            </p>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-header">
              <div className="testimonial-avatar">
                <img src="/testimonial/ada-steele.png" alt="Ada Steele" />
              </div>
              <div className="testimonial-user">
                <div className="testimonial-username">Ada Steele</div>
                <div className="testimonial-handle">@adasteele</div>
              </div>
            </div>
            <p className="testimonial-content">
              Great community.
            </p>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-header">
              <div className="testimonial-avatar">
                <img src="/testimonial/mike-johnson.png" alt="Mike Johnson" />
              </div>
              <div className="testimonial-user">
                <div className="testimonial-username">Mike Johnson</div>
                <div className="testimonial-handle">@mikej</div>
              </div>
            </div>
            <p className="testimonial-content">
              As a busy professional, the scheduling flexibility has been a complete game-changer for my ongoing learning journey and career development.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Start Your Learning Journey?</h2>
            <p>Join PeerFusion today and experience the power of peer-to-peer education</p>
            <div className="cta-actions">
              <button 
                className="sbtn-primary large"
                onClick={() => navigateTo('/register')}
              >
                Create Your Account
              </button>
              <button 
                className="btn-outline"
                onClick={() => scrollToSection('about')}
              >
                Learn More About Us
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="peerfusion-footer">
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
              <div className="footer-contact-info">
                <div className="footer-email-display">
                  <span className="email-icon-small"></span>
                  Peerfusion@gmail.com
                </div>
              </div>
            </div>
            <div className="footer-links">
              <div className="link-group">
                <h4>Platform</h4>
                <a 
                  href="#features"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('features');
                  }}
                >
                  Features
                </a>
                <a 
                  href="#community"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('community');
                  }}
                >
                  Community
                </a>
                <a 
                  href="#about"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('about');
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

export default LandingPage;
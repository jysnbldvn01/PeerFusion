import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiHome, FiUser, FiMessageSquare, FiBell, FiMenu, FiX, FiLogOut, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import '../../css/sidebar.css';
import axios from 'axios';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000'); 

const NavigationBar = ({ isCollapsed, onToggle }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchNotificationCount = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setNotificationCount(0); // Ensure it's 0 if no token
      return;
    }
  
    try {
      const res = await axios.get('http://localhost:5000/api/profile/notifications/unread-count', {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Make sure we're setting the actual count from response
      setNotificationCount(res.data.count || 0);
    } catch (err) {
      console.error('Failed to fetch notification count:', err);
      setNotificationCount(0); // Reset to 0 on error
    }
  };

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    // Fetch notification count after a short delay to ensure token is available
    const timer = setTimeout(() => {
      fetchNotificationCount();
    }, 100);
    
    const handleNewNotification = () => {
      fetchNotificationCount();
    };

    socket.on('new_notification', handleNewNotification);
    window.addEventListener('notificationsUpdated', fetchNotificationCount);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('notificationsUpdated', fetchNotificationCount);
      socket.off('new_notification', handleNewNotification);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event("storageClear"));
    socket.disconnect();
    navigate('/login');
  };

  // Full refresh only for chat (Firebase issue)
  const handleChatNavigation = (e) => {
    e.preventDefault();
    window.location.href = '/chat';
  };

  const handleMobileToggle = () => {
    onToggle(); // Toggle mobile menu
  };

  const handleDesktopToggle = () => {
    if (!isMobile) {
      onToggle(); // Only toggle on desktop
    }
  };

  const handleNavClick = () => {
    if (isMobile) {
      onToggle(); // Close mobile menu when item is clicked
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Mobile Header */}
      {isMobile && (
        <div className="peerfusion-nav-mobile-header">
          <button 
            className="peerfusion-nav-mobile-toggle"
            onClick={handleMobileToggle}
          >
            {isCollapsed ? <FiMenu size={24} /> : <FiX size={24} />}
          </button>
          <div className="peerfusion-nav-mobile-logo">
            <img src="/logo.png" alt="PeerFusion" />
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      {isMobile && !isCollapsed && (
        <div 
          className="peerfusion-nav-mobile-overlay"
          onClick={handleMobileToggle}
        />
      )}

      {/* Sidebar */}
      <nav className={`peerfusion-nav-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobile ? 'mobile' : ''}`}>
        {/* Desktop Header with Toggle */}
        {!isMobile && (
          <div className="peerfusion-nav-header">
            {!isCollapsed && (
              <img src="/logo.png" alt="PeerFusion" className="peerfusion-nav-logo" />
            )}
            <button 
              className="peerfusion-nav-toggle-btn"
              onClick={handleDesktopToggle}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
            </button>
          </div>
        )}

        {/* Scrollable Navigation Container */}
        <div className="peerfusion-nav-scroll-container">
          {/* Navigation Items */}
          <div className="peerfusion-nav-items">
            <Link 
              to="/home" 
              className={`peerfusion-nav-item ${isActive('/home') ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              <FiHome className="peerfusion-nav-icon" />
              <span className="peerfusion-nav-label">Home</span>
            </Link>
            
            {/* Chat with full refresh */}
            <a 
              href="/chat" 
              className={`peerfusion-nav-item ${isActive('/chat') ? 'active' : ''}`}
              onClick={handleChatNavigation}
            >
              <FiMessageSquare className="peerfusion-nav-icon" />
              <span className="peerfusion-nav-label">Chat</span>
            </a>
            
            <Link 
              to="/notifications" 
              className={`peerfusion-nav-item ${isActive('/notifications') ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              <div className="peerfusion-nav-notification-container">
                <FiBell className="peerfusion-nav-icon" />
                {notificationCount > 0 && (
                  <span className="peerfusion-nav-notification-indicator">
                    <span className="peerfusion-nav-notification-count">
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </span>
                  </span>
                )}
              </div>
              <span className="peerfusion-nav-label">Notifications</span>
              {notificationCount > 0 && !isCollapsed && (
                <span className="peerfusion-nav-notification-text">
                  {notificationCount} new
                </span>
              )}
            </Link>
            
            <Link 
              to="/profile" 
              className={`peerfusion-nav-item ${isActive('/profile') ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              <FiUser className="peerfusion-nav-icon" />
              <span className="peerfusion-nav-label">Profile</span>
            </Link>
          </div>

          {/* Logout Section */}
          <div className="peerfusion-nav-footer">
            <button 
              onClick={handleLogout} 
              className="peerfusion-nav-logout-btn"
            >
              <FiLogOut className="peerfusion-nav-icon" />
              <span className="peerfusion-nav-label">Logout</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};

export default NavigationBar;
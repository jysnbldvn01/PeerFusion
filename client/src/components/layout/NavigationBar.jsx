import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiUser, FiMessageSquare, FiBell, FiChevronRight } from 'react-icons/fi';
import { RiLogoutCircleRLine } from 'react-icons/ri';
import '../../css/sidebar.css';
import axios from 'axios';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000'); 

const NavigationBar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchNotificationCount = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const res = await axios.get('http://localhost:5000/api/profile/notifications/unread-count', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotificationCount(res.data.count);
    } catch (err) {
      console.error('Failed to fetch notification count:', err);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setIsCollapsed(true);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    fetchNotificationCount();
    
    const handleNewNotification = () => {
      console.log('New notification received! Refetching count.');
      fetchNotificationCount();
    };

    socket.on('new_notification', handleNewNotification);
    
    window.addEventListener('notificationsUpdated', fetchNotificationCount);

    return () => {
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

  // NUCLEAR OPTION: Always do full page refresh for ALL navigation
  const handleNavigation = (path, e) => {
    e.preventDefault();
    console.log(`Navigating to ${path} with full refresh...`);
    window.location.href = path; // This ALWAYS does full page refresh
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Helper to check active path
  const isActive = (path) => location.pathname === path;

  return (
    <>
      <div className={`sidebar ${isCollapsed ? 'collapsed sidebar-collapsed' : 'expanded sidebar-expanded'}`}>
        <button 
          className={`toggle-btn ${isCollapsed ? 'collapsed' : ''}`}
          onClick={toggleSidebar}
          style={{ left: isCollapsed ? '80px' : '250px' }}
        >
          <FiChevronRight className={`toggle-icon ${isCollapsed ? '' : 'rotated'}`} />
        </button>

        <div className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobile ? 'mobile' : ''}`}>
          {!isCollapsed && (
            <div className="sidebar-header">
              <img src="/logo.png" alt="SkillShare Logo" className="logo" />
            </div>
          )}

          <nav className="sidebar-nav">
            {/* All navigation uses full page refresh */}
            <a 
              href="/home" 
              className={`nav-link ${isActive('/home') ? 'active' : ''}`}
              onClick={(e) => handleNavigation('/home', e)}
            >
              <FiHome className="icon" />
              {!isCollapsed && <span>Home</span>}
            </a>
            
            {/* Chat - ALWAYS full page refresh */}
            <a 
              href="/chat" 
              className={`nav-link ${isActive('/chat') ? 'active' : ''}`}
              onClick={(e) => handleNavigation('/chat', e)}
            >
              <FiMessageSquare className="icon" />
              {!isCollapsed && <span>Chat</span>}
            </a>
            
            {/* Notifications - ALWAYS full page refresh */}
            <a 
              href="/notifications" 
              className={`nav-link ${isActive('/notifications') ? 'active' : ''}`}
              onClick={(e) => handleNavigation('/notifications', e)}
            >
              <div className="notification-badge-container">
                <FiBell className="icon" />
                {notificationCount > 0 && (
                  <span className="notification-badge">{notificationCount}</span>
                )}
              </div>
              {!isCollapsed && <span>Notifications</span>}
            </a>
            
            {/* Profile - ALWAYS full page refresh */}
            <a 
              href="/profile" 
              className={`nav-link ${isActive('/profile') ? 'active' : ''}`}
              onClick={(e) => handleNavigation('/profile', e)}
            >
              <FiUser className="icon" />
              {!isCollapsed && <span>Profile</span>}
            </a>
            
            <div className={`logout-container ${isCollapsed ? 'collapsed' : ''}`}>
              <button onClick={handleLogout} className="logout-btn">
                <RiLogoutCircleRLine className="icon" />
                {!isCollapsed && <span>Logout</span>}
              </button>
            </div>
          </nav>
        </div>
      </div>
    </>
  );
};

export default NavigationBar;
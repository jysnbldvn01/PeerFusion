import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiHome, FiUser, FiMessageSquare, FiBell, FiMenu, FiX, FiLogOut, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import '../../css/sidebar.css';
import axios from 'axios';
import { io } from 'socket.io-client';
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from '../../firebase';
import { AuthContext } from '../../context/AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_URL;
const SOCKET_URL = API_BASE_URL;
const socket = io(SOCKET_URL, { autoConnect: false });

const NavigationBar = ({ isCollapsed, onToggle, isMobile }) => {
  const [notificationCount, setNotificationCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);

  const notifiedMessageIds = useRef(new Set());

  const setupRealTimeChatCount = () => {
    if (!user?.user_id) return () => {};

    const conversationsQuery = query(
      collection(db, "conversations"),
      where("participants", "array-contains", Number(user.user_id)),
      orderBy("lastMessageTime", "desc")
    );

    const unsubscribeConversations = onSnapshot(conversationsQuery, (snapshot) => {
      const conversationUnreadCounts = {};
      const unsubscribeCallbacks = [];

      snapshot.docs.forEach((conversationDoc) => {
        const conversationId = conversationDoc.id;
        const messagesQuery = query(
          collection(db, "conversations", conversationId, "messages"),
          orderBy("createdAt", "desc")
        );

        const unsubscribeMessages = onSnapshot(messagesQuery, (messagesSnapshot) => {
          let unread = 0;
          
          messagesSnapshot.docs.forEach((messageDoc) => {
            const message = messageDoc.data();
            const messageId = messageDoc.id;
            
            if (String(message.senderId) !== String(user.user_id)) {
              const seenBy = message.seenBy || [];
              if (!seenBy.map(String).includes(String(user.user_id))) {
                unread++;
                if (!notifiedMessageIds.current.has(messageId)) {
                  notifiedMessageIds.current.add(messageId);
                }
              }
            }
          });
          conversationUnreadCounts[conversationId] = unread;
          
          const totalUnread = Object.values(conversationUnreadCounts).reduce((sum, count) => sum + count, 0);
          setChatCount(totalUnread);
        });

        unsubscribeCallbacks.push(unsubscribeMessages);
      });

      return () => {
        unsubscribeCallbacks.forEach(unsubscribe => unsubscribe());
      };
    });

    return () => {
      unsubscribeConversations();
    };
  };

  const fetchCounts = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setNotificationCount(0);
      setChatCount(0);
      return;
    }

    try {
      const res = await axios.get(`${API_BASE_URL}/api/counts/real-time-counts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotificationCount(res.data.notifications || 0);
    } catch (err) {
      console.error('Failed to fetch counts:', err);
      fetchNotificationCount();
    }
  };

  const fetchNotificationCount = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setNotificationCount(0);
      return;
    }

    try {
      const res = await axios.get(`${API_BASE_URL}/api/profile/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotificationCount(res.data.count || 0);
    } catch (err) {
      console.error('Failed to fetch notification count:', err);
      setNotificationCount(0);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCounts();
    }, 100);
    
    let unsubscribeFirebase;
    if (user?.user_id) {
      unsubscribeFirebase = setupRealTimeChatCount();
    }

    const handleCountsUpdated = (data) => {
      setNotificationCount(data.notifications || 0);
    };

    const handleNewNotification = () => {
      fetchNotificationCount();
    };

    const token = localStorage.getItem('token');
    if (token) {
      try {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser && storedUser.id) {
          socket.emit('identify', { userId: storedUser.id });
          socket.emit('getCounts', { userId: storedUser.id });
        }
      } catch (err) {
        console.error('Failed to identify user with socket:', err);
      }
    }

    socket.on('counts_updated', handleCountsUpdated);
    socket.on('new_notification', handleNewNotification);
    
    window.addEventListener('notificationsUpdated', fetchCounts);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('notificationsUpdated', fetchCounts);
      socket.off('counts_updated', handleCountsUpdated);
      socket.off('new_notification', handleNewNotification);
      if (unsubscribeFirebase) {
        unsubscribeFirebase();
      }
      notifiedMessageIds.current.clear();
    };
  }, [user?.user_id]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event("storageClear"));
    socket.disconnect();
    navigate('/login');
  };

  const handleMobileToggle = () => {
    onToggle();
  };

  const handleDesktopToggle = () => {
    if (!isMobile) {
      onToggle();
    }
  };

  const handleNavClick = () => {
    if (isMobile) {
      onToggle();
    }
  };

  const isActive = (path) => location.pathname === path;

  const formatCount = (count) => {
    if (count > 99) return '99+';
    return count;
  };

  return (
    <>
      {/* Mobile Header - Always visible with hamburger menu */}
      {isMobile && (
        <div className="peerfusion-nav-mobile-header">
          <button 
            className="peerfusion-nav-mobile-toggle"
            onClick={handleMobileToggle}
            aria-label={isCollapsed ? "Open menu" : "Close menu"}
          >
            {isCollapsed ? <FiMenu size={24} /> : <FiX size={24} />}
          </button>
          <div className="peerfusion-nav-mobile-logo">
            <img src="/logo.png" alt="PeerFusion" />
          </div>
        </div>
      )}

      {/* Mobile Overlay - Only shows when sidebar is open */}
      {isMobile && !isCollapsed && (
        <div 
          className="peerfusion-nav-mobile-overlay"
          onClick={handleMobileToggle}
        />
      )}

      {/* Sidebar - Hidden by default on mobile, shows when hamburger is clicked */}
      <nav className={`peerfusion-nav-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobile ? 'mobile' : ''}`}>

        {/* Desktop Header with Toggle */}
        {!isMobile && (
          <div className="peerfusion-nav-header">
            {!isCollapsed && (
              <img src="/logo.png" alt="PeerFusion" className="peerfusion-nav-logoss" />
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
            
            <Link 
              to="/chat" 
              className={`peerfusion-nav-item ${isActive('/chat') ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              <div className="peerfusion-nav-notification-container">
                <FiMessageSquare className="peerfusion-nav-icon" />
                {chatCount > 0 && (
                  <span className="peerfusion-nav-notification-indicator peerfusion-chat-indicator">
                    <span className="peerfusion-nav-notification-count">
                      {formatCount(chatCount)}
                    </span>
                  </span>
                )}
              </div>
              <span className="peerfusion-nav-label">Chat</span>
              {chatCount > 0 && !isCollapsed && (
                <span className="peerfusion-nav-notification-text">
                  {formatCount(chatCount)} new
                </span>
              )}
            </Link>
            
            <Link 
              to="/notifications" 
              className={`peerfusion-nav-item ${isActive('/notifications') ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              <div className="peerfusion-nav-notification-container">
                <FiBell className="peerfusion-nav-icon" />
                {notificationCount > 0 && (
                  <span className="peerfusion-nav-notification-indicator peerfusion-notification-indicator">
                    <span className="peerfusion-nav-notification-count">
                      {formatCount(notificationCount)}
                    </span>
                  </span>
                )}
              </div>
              <span className="peerfusion-nav-label">Notifications</span>
              {notificationCount > 0 && !isCollapsed && (
                <span className="peerfusion-nav-notification-text">
                  {formatCount(notificationCount)} new
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

          {/* Logout Section - Always visible when sidebar is open */}
          <div className="peerfusion-nav-footer">
            <button 
              onClick={() => {
                handleLogout();
                if (isMobile) {
                  onToggle();
                }
              }} 
              className="peerfusion-nav-logout-btn"
            >
              <FiLogOut className="peerfusion-nav-logout-icon" />
              <span className="peerfusion-nav-logout-label">Logout</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};

export default NavigationBar;
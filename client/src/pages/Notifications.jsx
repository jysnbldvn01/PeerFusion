import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import '../css/notification.css';
import { useNavigate } from "react-router-dom";

// Internet icons as React components
const InternetIcons = {
  Approved: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
    </svg>
  ),
  Rejected: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
  ),
  Accepted: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
    </svg>
  ),
  Warning: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
    </svg>
  ),
  Suspension: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM15.1 8H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
    </svg>
  ),
  Ban: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z"/>
    </svg>
  ),
  Rating: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
    </svg>
  ),
  Penalty: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
    </svg>
  ),
  Session: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 9h-2V5h2v6zm0 4h-2v-2h2v2z"/>
    </svg>
  ),
  Team: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
    </svg>
  )
};

const Notification = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [profile, setProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [feedbackDetails, setFeedbackDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);
  const menuRefs = useRef({});
  const unreadCount = notifications.filter(n => !n.is_read).length;
  
  const navigate = useNavigate();

  // Skeleton Loading Component
  const SkeletonNotification = () => (
    <div className="peerfusion-skeleton-notification">
      <div className="peerfusion-skeleton peerfusion-skeleton-avatar"></div>
      <div className="peerfusion-skeleton-content">
        <div className="peerfusion-skeleton-header">
          <div className="peerfusion-skeleton peerfusion-skeleton-username"></div>
          <div className="peerfusion-skeleton peerfusion-skeleton-time"></div>
        </div>
        <div className="peerfusion-skeleton peerfusion-skeleton-message"></div>
        <div className="peerfusion-skeleton peerfusion-skeleton-message-short"></div>
        <div className="peerfusion-skeleton peerfusion-skeleton-badge"></div>
      </div>
    </div>
  );

  const formatNotificationMessage = (message) => {
    if (!message) return '';
    
    let formattedMessage = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedMessage = formattedMessage.replace(/\n/g, '<br />');

    formattedMessage = formattedMessage.replace(
      /\[Terms and Conditions\]\(\/terms\)/g, 
      '<a href="/terms" class="notification-link" data-route="/terms">Terms and Conditions</a>'
    );
    formattedMessage = formattedMessage.replace(
      /\[Submit Appeal\]\(\/appeal\)/g,
      '<a href="/appeal" class="notification-link" data-route="/appeal">Submit Appeal</a>'
    );
    
    return formattedMessage;
  };

    useEffect(() => {
      const handleNotificationsUpdated = () => {
        console.log('📢 Notifications updated event received, refreshing...');
        fetchNotifications();
      };

      window.addEventListener('notificationsUpdated', handleNotificationsUpdated);
      
      return () => {
        window.removeEventListener('notificationsUpdated', handleNotificationsUpdated);
      };
    }, []);

  useEffect(() => {
    const handleLinkClick = (event) => {
      if (event.target.classList.contains('notification-link')) {
        event.preventDefault();
        event.stopPropagation();
        
        const route = event.target.getAttribute('data-route');
        console.log('Link clicked, navigating to:', route);
        
        if (route === '/terms') {
          navigate('/terms');
          closeModal();
        } else if (route === '/appeal') {
          navigate('/appeal');
          closeModal();
        }
      }
    };

    document.addEventListener('click', handleLinkClick);
    
    return () => {
      document.removeEventListener('click', handleLinkClick);
    };
  }, [navigate]);

  const handleModalMessageClick = (event) => {
    if (event.target.classList.contains('notification-link')) {
      event.preventDefault();
      const route = event.target.getAttribute('data-route');
      console.log('Modal link clicked, navigating to:', route);
      
      if (route === '/terms') {
        navigate('/terms');
        closeModal();
      } else if (route === '/appeal') {
        navigate('/appeal');
        closeModal();
      }
    }
  };

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('token');
    const url =
      activeTab === 'archived'
        ? 'http://localhost:5000/api/profile/notifications/archived'
        : 'http://localhost:5000/api/profile/notifications';

    try {
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Fetched notifications:', res.data);
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      window.pfToast?.error?.(err?.response?.data?.message || 'Failed to fetch notifications');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await axios.get('http://localhost:5000/api/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(res.data);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        window.pfToast?.error?.(err?.response?.data?.message || 'Failed to fetch profile');
      }
    };

    fetchProfile();
    fetchNotifications();

    // Close menu when clicking outside
    const handleClickOutside = (event) => {
      const isOutside = Object.values(menuRefs.current).every((ref) => {
        return ref && !ref.contains(event.target);
      });

      if (isOutside) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [fetchNotifications]);

const getDisplayName = (notification) => {
  console.log('Processing notification:', {
    id: notification.id,
    type: notification.type,
    sender_id: notification.sender_id,
    sender_name: notification.sender_name,
    message: notification.message?.substring(0, 100)
  });

  if (notification.type === 'penalty') {
    return 'PeerFusion Team';
  }
  
  if (notification.sender_id === null || notification.sender_id === 0) {
    return 'PeerFusion Team';
  }
  
  if (notification.type === 'warning' || 
      notification.type === 'suspension' || 
      notification.type === 'ban' || 
      notification.type === 'appeal_approved' ||
      notification.type === 'appeal_rejected' ||
      notification.type === 'account_reactivated' ||
      notification.type === 'strikes_adjusted' ||
      notification.type === 'account_status') {
    return 'PeerFusion Team';
  }

  if (notification.type === 'feedback' && (notification.sender_role === 'admin' || notification.sender_role === 'moderator')) {
    return 'PeerFusion Team';
  }
  
  return notification.sender_name || 'System';
};

const getDisplayAvatar = (notification) => {
  if (notification.type === 'penalty' || 
      notification.sender_id === null || 
      notification.sender_id === 0 ||
      notification.type === 'warning' || 
      notification.type === 'suspension' || 
      notification.type === 'ban' || 
      notification.type === 'appeal_approved' ||
      notification.type === 'appeal_rejected' ||
      notification.type === 'account_reactivated' ||
      notification.type === 'strikes_adjusted' ||
      notification.type === 'account_status') {
    return null;
  }
  
  if (notification.type === 'feedback' && (notification.sender_role === 'admin' || notification.sender_role === 'moderator')) {
    return null;
  }
  
  return notification.sender_avatar;
};

  const getAvatarPlaceholder = (notification) => {
    const displayName = getDisplayName(notification);
    if (displayName === 'PeerFusion Team') {
      return <InternetIcons.Team />;
    }
    return displayName.charAt(0) || 'U';
  };

  const fetchFeedbackDetails = async (notificationId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(
        `http://localhost:5000/api/profile/notification-feedback/${notificationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.success) {
        setFeedbackDetails(res.data.feedback);
      }
    } catch (err) {
      console.error('Failed to fetch feedback details:', err);
      window.pfToast?.error?.(err?.response?.data?.message || 'Failed to fetch feedback details');
    }
  };

  const markNotificationAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    const token = localStorage.getItem('token');
    try {
      await axios.put(
        `http://localhost:5000/api/profile/notifications/${id}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      fetchNotifications();
      window.dispatchEvent(new Event('notificationsUpdated'));
      setOpenMenuId(null);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      window.pfToast?.error?.(err?.response?.data?.message || 'Failed to mark notification as read');
    }
  };

  const markNotificationAsUnread = async (id, e) => {
    if (e) e.stopPropagation();
    const token = localStorage.getItem('token');
    try {
      await axios.put(
        `http://localhost:5000/api/profile/notifications/${id}/unread`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      fetchNotifications();
      window.dispatchEvent(new Event('notificationsUpdated'));
      setOpenMenuId(null);
    } catch (err) {
      console.error('Failed to mark notification as unread:', err);
      window.pfToast?.error?.(err?.response?.data?.message || 'Failed to mark notification as unread');
    }
  };

  const archiveNotification = async (id, e) => {
    if (e) e.stopPropagation();
    const token = localStorage.getItem('token');
    try {
      await axios.put(
        `http://localhost:5000/api/profile/notifications/${id}/archive`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      fetchNotifications();
      window.dispatchEvent(new Event('notificationsUpdated'));
      setOpenMenuId(null);
    } catch (err) {
      console.error('Failed to archive notification:', err);
      window.pfToast?.error?.(err?.response?.data?.message || 'Failed to archive notification');
    }
  };

  const unarchiveNotification = async (id, e) => {
    if (e) e.stopPropagation();
    const token = localStorage.getItem('token');
    try {
      await axios.put(
        `http://localhost:5000/api/profile/notifications/${id}/unarchive`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      fetchNotifications();
      window.dispatchEvent(new Event('notificationsUpdated'));
      setOpenMenuId(null);
    } catch (err) {
      console.error('Failed to unarchive notification:', err);
      window.pfToast?.error?.(err?.response?.data?.message || 'Failed to unarchive notification');
    }
  };

  const markAllAsRead = async () => {
    if (!notifications || notifications.length === 0) return;
    const token = localStorage.getItem('token');
    const unread = notifications.filter(n => !n.is_read);
    if (unread.length === 0) {
      window.pfToast?.info?.('All notifications are already read');
      return;
    }
    try {
      await Promise.all(
        unread.map(n =>
          axios.put(
            `http://localhost:5000/api/profile/notifications/${n.id}/read`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      );
      await fetchNotifications();
      window.dispatchEvent(new Event('notificationsUpdated'));
      window.pfToast?.success?.('All notifications marked as read');
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      window.pfToast?.error?.(err?.response?.data?.message || 'Failed to mark all as read');
    }
  };

  const deleteNotification = async (id, e) => {
    if (e) e.stopPropagation();
    const token = localStorage.getItem('token');
    try {
      await axios.delete(
        `http://localhost:5000/api/profile/notifications/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      fetchNotifications();
      window.dispatchEvent(new Event('notificationsUpdated'));
      setOpenMenuId(null);
    } catch (err) {
      console.error('Failed to delete notification:', err);
      window.pfToast?.error?.(err?.response?.data?.message || 'Failed to delete notification');
    }
  };

  const toggleMenu = (id, event) => {
    event.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const viewNotification = async (notification) => {
    if (!notification.is_read) {
      await markNotificationAsRead(notification.id);
    }

    setSelectedNotification(notification);

    if (notification.type === 'feedback') {
      await fetchFeedbackDetails(notification.id);
    }
  };

  const closeModal = () => {
    setSelectedNotification(null);
    setFeedbackDetails(null);
  };

  const handleAccept = async (notification) => {
    if (acceptingId === notification.id) return;
    const token = localStorage.getItem("token");
    try {
      setAcceptingId(notification.id);
      const res = await axios.post(
        `http://localhost:5000/api/session/accept`,
        {
          requestId: notification.session_request_id || notification.id,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success && res.data.conversationId) {
        setNotifications((prev) =>
          prev.filter((n) => n.id !== notification.id)
        );
        closeModal();
        window.pfToast?.success?.('Session request accepted');
        navigate(`/chat?conv=${res.data.conversationId}`);
      } else {
        fetchNotifications();
        window.pfToast?.info?.('Session accepted');
      }
    } catch (err) {
      console.error("❌ Failed to accept session request:", err);
      window.pfToast?.error?.(err?.response?.data?.message || 'Error accepting session request');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleDecline = async (notification) => {
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `http://localhost:5000/api/session/reject`,
        {
          requestId: notification.session_request_id || notification.id,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications((prev) =>
        prev.filter((n) => n.id !== notification.id)
      );
      closeModal();
      window.pfToast?.success?.('Session request declined');
    } catch (err) {
      console.error("❌ Failed to reject session request:", err);
      window.pfToast?.error?.(err?.response?.data?.message || 'Error rejecting session request');
    }
  };

  const getNotificationBadge = (notification) => {
    switch (notification.type) {
      case 'feedback': {
        const ratingMatch = notification.message.match(/(\d)-star/);
        const rating = ratingMatch ? ratingMatch[1] : '0';
        return (
          <span className="peerfusion-notification-badge peerfusion-badge-rating">
            <InternetIcons.Rating /> {rating}/5
          </span>
        );
      }
      case 'session_request': {
        return notification.status && (
          <span className={`peerfusion-notification-badge peerfusion-badge-${notification.status}`}>
            <InternetIcons.Session /> {notification.status}
          </span>
        );
      }
      case 'warning': {
        const strikeMatch = notification.message.match(/strike.*?(\d)\/3/i) || 
                           notification.message.match(/Strike.*?(\d)\/3/i);
        const strikeCount = strikeMatch ? strikeMatch[1] : '1';
        return (
          <span className={`peerfusion-notification-badge peerfusion-badge-strike-${strikeCount}`}>
            <InternetIcons.Warning /> Strike {strikeCount}/3
          </span>
        );
      }
      case 'penalty': {
        const strikeMatch = notification.message.match(/strike.*?(\d+)/i) || 
                           notification.message.match(/Strike.*?(\d+)/i);
        const strikeCount = strikeMatch ? strikeMatch[1] : '1';
        return (
          <span className={`peerfusion-notification-badge peerfusion-badge-strike-${strikeCount}`}>
            <InternetIcons.Penalty /> Strike {strikeCount}/3
          </span>
        );
      }
      case 'suspension': {
        return (
          <span className="peerfusion-notification-badge peerfusion-badge-suspension">
            <InternetIcons.Suspension /> Suspended
          </span>
        );
      }
      case 'ban': {
        return (
          <span className="peerfusion-notification-badge peerfusion-badge-ban">
            <InternetIcons.Ban /> Banned
          </span>
        );
      }
      case 'appeal_approved': {
        return (
          <span className="peerfusion-notification-badge peerfusion-badge-approved">
            <InternetIcons.Approved /> Approved
          </span>
        );
      }
      case 'appeal_rejected': {
        return (
          <span className="peerfusion-notification-badge peerfusion-badge-rejected">
            <InternetIcons.Rejected /> Rejected
          </span>
        );
      }
      case 'account_reactivated': {
        return (
          <span className="peerfusion-notification-badge peerfusion-badge-approved">
            <InternetIcons.Approved /> Reactivated
          </span>
        );
      }
      case 'strikes_adjusted': {
        const strikeMatch = notification.message.match(/strike.*?(\d+)/i);
        const strikeCount = strikeMatch ? strikeMatch[1] : '1';
        return (
          <span className={`peerfusion-notification-badge peerfusion-badge-strike-${strikeCount}`}>
            <InternetIcons.Warning /> Strike {strikeCount}/3
          </span>
        );
      }
      // ADD THIS CASE FOR ACCOUNT STATUS NOTIFICATIONS
      case 'account_status': {
        if (notification.message.includes('deactivated')) {
          return (
            <span className="peerfusion-notification-badge peerfusion-badge-system">
              <InternetIcons.Suspension /> Account Paused
            </span>
          );
        }
        if (notification.message.includes('reactivated')) {
          return (
            <span className="peerfusion-notification-badge peerfusion-badge-approved">
              <InternetIcons.Approved /> Account Reactivated
            </span>
          );
        }
        if (notification.message.includes('deletion')) {
          return (
            <span className="peerfusion-notification-badge peerfusion-badge-warning">
              <InternetIcons.Warning /> Deletion Scheduled
            </span>
          );
        }
        if (notification.message.includes('cancelled')) {
          return (
            <span className="peerfusion-notification-badge peerfusion-badge-approved">
              <InternetIcons.Approved /> Deletion Cancelled
            </span>
          );
        }
        return (
          <span className="peerfusion-notification-badge peerfusion-badge-info">
            <InternetIcons.Team /> Account Status
          </span>
        );
      }
      default:
        return null;
    }
  };

  const filteredNotifications = notifications.filter(
    (notification) =>
      getDisplayName(notification)
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      notification.message?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="peerfusion-notification-container">
      {/* Header */}
      <div className="peerfusion-notification-header">
        <div className="peerfusion-notification-header-content">
          <div className="peerfusion-notification-header-left">
            <h1 className="peerfusion-notification-title">Notifications</h1>
            <div className="peerfusion-notification-search-container">
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="peerfusion-notification-search-input"
              />
              <span className="peerfusion-notification-search-icon"></span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="peerfusion-notification-tabs">
        <button
          className={`peerfusion-notification-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Notifications
        </button>
        <button
          className={`peerfusion-notification-tab ${activeTab === 'archived' ? 'active' : ''}`}
          onClick={() => setActiveTab('archived')}
        >
          Archived
        </button>
        <button
          className={`peerfusion-notification-tab peerfusion-mark-all-btn`}
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
          title={unreadCount === 0 ? 'No unread notifications' : 'Mark all as read'}
          style={{ opacity: unreadCount === 0 ? 0.6 : 1, cursor: unreadCount === 0 ? 'not-allowed' : 'pointer' }}
        >
          Mark all as read {unreadCount > 0 ? `(${unreadCount})` : ''}
        </button>
      </div>

      {/* Single Row Notifications List */}
      <div className="peerfusion-notification-list">
        {isLoading ? (
          // Skeleton loading state
          Array.from({ length: 5 }).map((_, index) => (
            <SkeletonNotification key={index} />
          ))
        ) : filteredNotifications.length === 0 ? (
          <div className="peerfusion-notification-empty">
            <div className="peerfusion-notification-empty-icon">📭</div>
            <h3>No notifications found</h3>
            <p>
              {activeTab === 'archived' 
                ? 'Your archived notifications will appear here' 
                : 'You\'re all caught up!'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              className={`peerfusion-notification-item ${notification.is_read ? 'read' : 'unread'} ${
                (notification.type === 'warning' || 
                 notification.type === 'suspension' || 
                 notification.type === 'ban' || 
                 notification.type === 'penalty' ||
                 notification.type === 'appeal_approved' ||
                 notification.type === 'appeal_rejected' ||
                 notification.type === 'account_reactivated') 
                  ? 'peerfusion-notification-important' 
                  : ''
              } ${
                notification.type === 'appeal_approved' || notification.type === 'account_reactivated' || notification.status === 'accepted'
                  ? 'peerfusion-notification-approved'
                  : notification.type === 'appeal_rejected' || notification.status === 'rejected'
                  ? 'peerfusion-notification-rejected'
                  : ''
              }`}
              key={notification.id}
              onClick={() => viewNotification(notification)}
            >
              <div className="peerfusion-notification-content">
                {/* Avatar */}
                {getDisplayAvatar(notification) ? (
                  <img
                    src={`http://localhost:5000/uploads/${getDisplayAvatar(notification)}`}
                    alt={getDisplayName(notification)}
                    className="peerfusion-notification-avatar"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className={`peerfusion-notification-avatar-placeholder ${
                    getDisplayName(notification) === 'PeerFusion Team' ? 'peerfusion-team-avatar' : ''
                  }`}
                  style={{ display: getDisplayAvatar(notification) ? 'none' : 'flex' }}
                >
                  {getAvatarPlaceholder(notification)}
                </div>

                {/* Content */}
                <div className="peerfusion-notification-details">
                  <div className="peerfusion-notification-header">
                    <h4 className="peerfusion-notification-username">
                      {getDisplayName(notification)}
                    </h4>
                    <p className="peerfusion-notification-time">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                  
                  <p 
                    className="peerfusion-notification-message"
                    dangerouslySetInnerHTML={{ 
                      __html: formatNotificationMessage(notification.message) 
                    }}
                  />

                  <div className="peerfusion-notification-badges">
                    {getNotificationBadge(notification)}
                  </div>
                </div>
              </div>

              {/* Menu */}
              <div
                className="peerfusion-notification-menu-container"
                ref={(el) => (menuRefs.current[notification.id] = el)}
              >
                <button
                  className="peerfusion-notification-menu-button"
                  onClick={(e) => toggleMenu(notification.id, e)}
                >
                  ⋮
                </button>

                {openMenuId === notification.id && (
                  <div className="peerfusion-notification-menu">
                    {notification.is_read ? (
                      <button
                        className="peerfusion-notification-menu-item mark-unread"
                        onClick={(e) =>
                          markNotificationAsUnread(notification.id, e)
                        }
                      >
                        Mark as Unread
                      </button>
                    ) : (
                      <button
                        className="peerfusion-notification-menu-item mark-read"
                        onClick={(e) =>
                          markNotificationAsRead(notification.id, e)
                        }
                      >
                        Mark as Read
                      </button>
                    )}
                    {!notification.is_archived ? (
                      <button
                        className="peerfusion-notification-menu-item"
                        onClick={(e) =>
                          archiveNotification(notification.id, e)
                        }
                      >
                        Archive
                      </button>
                    ) : (
                      <button
                        className="peerfusion-notification-menu-item"
                        onClick={(e) =>
                          unarchiveNotification(notification.id, e)
                        }
                      >
                        Unarchive
                      </button>
                    )}
                    <button
                      className="peerfusion-notification-menu-item delete"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const ok = await window.pfConfirm?.('Are you sure you want to delete this notification?');
                        if (ok) {
                          deleteNotification(notification.id, e);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {selectedNotification && (
        <div className="peerfusion-notification-modal-overlay" onClick={closeModal}>
          <div className="peerfusion-notification-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="peerfusion-notification-close-modal" onClick={closeModal}>
              ×
            </button>

            <div className="peerfusion-notification-modal-header">
              {getDisplayAvatar(selectedNotification) ? (
                <img
                  src={`http://localhost:5000/uploads/${getDisplayAvatar(selectedNotification)}`}
                  alt={getDisplayName(selectedNotification)}
                  className="peerfusion-notification-modal-avatar"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className={`peerfusion-notification-avatar-placeholder ${
                  getDisplayName(selectedNotification) === 'PeerFusion Team' ? 'peerfusion-team-avatar' : ''
                }`}
                style={{ display: getDisplayAvatar(selectedNotification) ? 'none' : 'flex' }}
              >
                {getAvatarPlaceholder(selectedNotification)}
              </div>
              <div className="peerfusion-notification-modal-user">
                <h3>{getDisplayName(selectedNotification)}</h3>
                <div className="peerfusion-notification-modal-time">
                  {new Date(selectedNotification.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="peerfusion-notification-modal-body">
              <h4 className="peerfusion-notification-modal-title">
                {selectedNotification.type === 'feedback'
                  ? 'Rating Received'
                  : selectedNotification.type === 'session_request'
                  ? 'Session Request'
                  : selectedNotification.type === 'warning'
                  ? 'Account Warning'
                  : selectedNotification.type === 'suspension'
                  ? 'Account Suspension'
                  : selectedNotification.type === 'ban'
                  ? 'Account Ban'
                  : selectedNotification.type === 'penalty'
                  ? 'Account Penalty'
                  : selectedNotification.type === 'appeal_approved'
                  ? 'Appeal Approved'
                  : selectedNotification.type === 'appeal_rejected'
                  ? 'Appeal Rejected'
                  : selectedNotification.type === 'account_reactivated'
                  ? 'Account Reactivated'
                  : selectedNotification.type === 'account_status'
                  ? 'Account Status Update'
                  : 'Notification'}
              </h4>
              
              <div 
                className="peerfusion-notification-modal-message"
                dangerouslySetInnerHTML={{ 
                  __html: formatNotificationMessage(selectedNotification.message) 
                }}
                onClick={handleModalMessageClick}
              />

              {/* Accept / Decline buttons for pending session requests */}
              {selectedNotification.type === 'session_request' &&
                selectedNotification.status === 'pending' && (
                  <div className="peerfusion-notification-session-actions">
                    <button
                      className="peerfusion-notification-btn peerfusion-notification-btn-accept"
                      onClick={() => handleAccept(selectedNotification)}
                      disabled={acceptingId === selectedNotification.id}
                    >
                      <InternetIcons.Accepted /> {acceptingId === selectedNotification.id ? 'Accepting...' : 'Accept'}
                    </button>
                    <button
                      className="peerfusion-notification-btn peerfusion-notification-btn-reject"
                      onClick={() => handleDecline(selectedNotification)}
                    >
                      <InternetIcons.Rejected /> Decline
                    </button>
                  </div>
                )}

              {/* Important notice for system notifications */}
              {(selectedNotification.type === 'warning' || 
                selectedNotification.type === 'suspension' || 
                selectedNotification.type === 'ban' ||
                selectedNotification.type === 'penalty' ||
                selectedNotification.type === 'appeal_approved' ||
                selectedNotification.type === 'appeal_rejected' ||
                selectedNotification.type === 'account_reactivated' ||
                selectedNotification.type === 'account_status') && (
                <div className={`peerfusion-notification-important-notice ${
                  selectedNotification.type === 'appeal_approved' || selectedNotification.type === 'account_reactivated' ? 'peerfusion-notice-approved' :
                  selectedNotification.type === 'appeal_rejected' ? 'peerfusion-notice-rejected' : ''
                }`}>
                  <div className="peerfusion-notification-important-icon">
                    {selectedNotification.type === 'warning' && <InternetIcons.Warning />}
                    {selectedNotification.type === 'suspension' && <InternetIcons.Suspension />}
                    {selectedNotification.type === 'ban' && <InternetIcons.Ban />}
                    {selectedNotification.type === 'penalty' && <InternetIcons.Penalty />}
                    {selectedNotification.type === 'appeal_approved' && <InternetIcons.Approved />}
                    {selectedNotification.type === 'appeal_rejected' && <InternetIcons.Rejected />}
                    {selectedNotification.type === 'account_reactivated' && <InternetIcons.Approved />}
                    {selectedNotification.type === 'account_status' && <InternetIcons.Team />} {/* ADD this */}
                  </div>
                  <p>
                    {selectedNotification.type === 'warning' && 
                      'This is an official warning from PeerFusion Team. Please review our community guidelines.'}
                    {selectedNotification.type === 'suspension' && 
                      'Your account has been temporarily suspended by PeerFusion Team. You will not be able to access certain features during this period.'}
                    {selectedNotification.type === 'ban' && 
                      'Your account has been permanently banned by PeerFusion Team. If you believe this is a mistake, please contact support.'}
                    {selectedNotification.type === 'penalty' && 
                      'A penalty has been applied to your account by PeerFusion Team.'}
                    {selectedNotification.type === 'appeal_approved' && 
                      'This appeal decision was made by the PeerFusion Team after careful review of your case.'}
                    {selectedNotification.type === 'appeal_rejected' && 
                      'This appeal decision was made by the PeerFusion Team based on our community guidelines and review process.'}
                    {selectedNotification.type === 'account_reactivated' && 
                      'Your account has been reactivated by the PeerFusion Team. Welcome back!'}
                    {selectedNotification.type === 'account_status' && 
                      'This is an automated notification about your account status changes.'} {/* ADD this */}
                  </p>
                </div>
              )}

              {/* Feedback Details */}
              {selectedNotification.type === 'feedback' &&
                feedbackDetails && (
                  <div className="peerfusion-notification-feedback-details">
                    <div className="peerfusion-notification-rating-display">
                      <h5>Rating Details:</h5>
                      <div className="peerfusion-notification-rating-stars">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={
                              star <= feedbackDetails.rating ? 'filled' : ''
                            }
                          >
                            {star <= feedbackDetails.rating ? <InternetIcons.Rating /> : '☆'}
                          </span>
                        ))}
                        <span className="peerfusion-notification-rating-value">
                          ({feedbackDetails.rating}/5)
                        </span>
                      </div>
                      {feedbackDetails.feedback_message && (
                        <div className="peerfusion-notification-feedback-message">
                          <p>{feedbackDetails.feedback_message}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
            </div>

            <div className="peerfusion-notification-modal-actions">
              <button 
                className="peerfusion-notification-btn peerfusion-notification-btn-primary" 
                onClick={closeModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notification;
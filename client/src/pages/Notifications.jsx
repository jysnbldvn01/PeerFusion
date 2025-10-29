import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import '../css/notification.css';
import { useNavigate } from "react-router-dom";

const Notification = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [profile, setProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [feedbackDetails, setFeedbackDetails] = useState(null);
  const menuRefs = useRef({});
  const unreadCount = notifications.filter(n => !n.is_read).length;

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
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      window.pfToast?.error?.(err?.response?.data?.message || 'Failed to fetch notifications');
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

  // Mark all notifications as read
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

  const navigate = useNavigate();

  // Accept session request
  const handleAccept = async (notification) => {
    const token = localStorage.getItem("token");
    try {
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
    }
  };

  // Decline session request
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
            ⭐ {rating}/5
          </span>
        );
      }
      case 'session_request': {
        return notification.status && (
          <span className={`peerfusion-notification-badge peerfusion-badge-${notification.status}`}>
            {notification.status}
          </span>
        );
      }
      default:
        return null;
    }
  };

  const filteredNotifications = notifications.filter(
    (notification) =>
      notification.sender_name
        ?.toLowerCase()
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
        {filteredNotifications.length === 0 ? (
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
              className={`peerfusion-notification-item ${notification.is_read ? 'read' : 'unread'}`}
              key={notification.id}
              onClick={() => viewNotification(notification)}
            >
              <div className="peerfusion-notification-content">
                {/* Avatar */}
                {notification.sender_avatar ? (
                  <img
                    src={`http://localhost:5000/uploads/${notification.sender_avatar}`}
                    alt={notification.sender_name}
                    className="peerfusion-notification-avatar"
                  />
                ) : (
                  <div className="peerfusion-notification-avatar-placeholder">
                    {notification.sender_name?.charAt(0) || 'U'}
                  </div>
                )}

                {/* Content */}
                <div className="peerfusion-notification-details">
                  <div className="peerfusion-notification-header">
                    <h4 className="peerfusion-notification-username">
                      {notification.sender_name || 'System'}
                    </h4>
                    <p className="peerfusion-notification-time">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                  
                  <p className="peerfusion-notification-message">
                    {notification.message}
                  </p>

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
              {selectedNotification.sender_avatar ? (
                <img
                  src={`http://localhost:5000/uploads/${selectedNotification.sender_avatar}`}
                  alt={selectedNotification.sender_name}
                  className="peerfusion-notification-modal-avatar"
                />
              ) : (
                <div className="peerfusion-notification-avatar-placeholder">
                  {selectedNotification.sender_name?.charAt(0) || 'U'}
                </div>
              )}
              <div className="peerfusion-notification-modal-user">
                <h3>{selectedNotification.sender_name || 'System'}</h3>
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
                  : 'Notification'}
              </h4>
              <div className="peerfusion-notification-modal-message">
                {selectedNotification.message}
              </div>

              {/* Accept / Decline buttons for pending session requests */}
              {selectedNotification.type === 'session_request' &&
                selectedNotification.status === 'pending' && (
                  <div className="peerfusion-notification-session-actions">
                    <button
                      className="peerfusion-notification-btn peerfusion-notification-btn-primary"
                      onClick={() => handleAccept(selectedNotification)}
                    >
                      Accept
                    </button>
                    <button
                      className="peerfusion-notification-btn peerfusion-notification-btn-secondary"
                      onClick={() => handleDecline(selectedNotification)}
                    >
                      Decline
                    </button>
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
                            {star <= feedbackDetails.rating ? '★' : '☆'}
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
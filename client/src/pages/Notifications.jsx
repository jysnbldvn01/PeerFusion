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
      // ✅ Navigate with Firestore conversationId
      navigate(`/chat?conv=${res.data.conversationId}`);
    } else {
      fetchNotifications();
    }
  } catch (err) {
    console.error("❌ Failed to accept session request:", err);
    alert("Error accepting session request");
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
  } catch (err) {
    console.error("❌ Failed to reject session request:", err);
    alert("Error rejecting session request");
  }
};



  const getNotificationPreview = (notification) => {
    switch (notification.type) {
      case 'feedback': {
        const ratingMatch = notification.message.match(/(\d)-star/);
        const rating = ratingMatch ? ratingMatch[1] : '0';
        return (
          <div className="feedback-preview">
            <span className="rating-badge">⭐ {rating}/5</span>
            <p>{notification.message}</p>
            {/* no status badge for feedback */}
          </div>
        );
      }
      case 'session_request': {
        return (
          <div className="session-preview">
            <p>{notification.message}</p>
            {notification.status && (
              <span className={`status-badge ${notification.status}`}>
                {notification.status}
              </span>
            )}
          </div>
        );
      }
      default:
        return (
          <div className="default-preview">
            <p>{notification.message}</p>
            {/* no status badge */}
          </div>
        );
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
    <div className="account-settings">
      <div className="settings-container">
        <div className="settings-header">
          <h2>Notifications</h2>
          {profile && (
            <div className="header-actions">
              <div className="avatar-wrapper" style={{ width: 50, height: 50 }}>
                <img
                  src={`http://localhost:5000/uploads/${profile.avatar}`}
                  alt="Avatar"
                  className="avatar"
                />
              </div>
            </div>
          )}
        </div>

        <div className="notification-actions">
          <div className="notification-search">
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="search-icon">🔍︎</span>
          </div>
        </div>

        <div className="profile-sections">
          <div className="profile-section">
            <div className="notification-tabs">
              <button
                className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All Notifications
              </button>
              <button
                className={`tab-button ${
                  activeTab === 'archived' ? 'active' : ''
                }`}
                onClick={() => setActiveTab('archived')}
              >
                Archived
              </button>
            </div>

            <div className="notification-list">
              {filteredNotifications.length === 0 ? (
                <div className="empty-state">
                  <p>No notifications found</p>
                  {activeTab === 'archived' ? (
                    <span>Your archived notifications will appear here</span>
                  ) : (
                    <span>You're all caught up!</span>
                  )}
                </div>
              ) : (
                filteredNotifications.map((notification, index) => (
                  <div
                    className={`notification-card ${notification.type} ${
                      notification.is_read ? 'read' : 'unread'
                    } ${openMenuId === notification.id ? 'menu-open' : ''}`}
                    key={notification.id}
                    onClick={() => viewNotification(notification)}
                  >
                    <div className="notification-avatar">
                      {notification.sender_avatar ? (
                        <img
                          src={`http://localhost:5000/uploads/${notification.sender_avatar}`}
                          alt={notification.sender_name}
                          className="sender-avatar"
                        />
                      ) : (
                        <div className="avatar-placeholder">
                          {notification.sender_name?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="notification-content">
                      <div className="notification-header">
                        <h4>{notification.sender_name || 'System'}</h4>
                        <span className="notification-time">
                          {new Date(notification.created_at).toLocaleString()}
                        </span>
                      </div>
                      {getNotificationPreview(notification)}
                    </div>

                    <div
                      className={`notification-menu-container ${
                        index === 0 ? 'top-notification' : ''
                      }`}
                      ref={(el) => (menuRefs.current[notification.id] = el)}
                    >
                      <button
                        className="menu-button"
                        onClick={(e) => toggleMenu(notification.id, e)}
                      >
                        ⋮
                      </button>

                      {openMenuId === notification.id && (
                        <div className="notification-menu">
                          {notification.is_read ? (
                            <button
                              className="menu-item mark-unread"
                              onClick={(e) =>
                                markNotificationAsUnread(notification.id, e)
                              }
                            >
                              Mark as Unread
                            </button>
                          ) : (
                            <button
                              className="menu-item mark-read"
                              onClick={(e) =>
                                markNotificationAsRead(notification.id, e)
                              }
                            >
                              Mark as Read
                            </button>
                          )}
                          {!notification.is_archived ? (
                            <button
                              className="menu-item"
                              onClick={(e) =>
                                archiveNotification(notification.id, e)
                              }
                            >
                              Archive
                            </button>
                          ) : (
                            <button
                              className="menu-item"
                              onClick={(e) =>
                                unarchiveNotification(notification.id, e)
                              }
                            >
                              Unarchive
                            </button>
                          )}
                          <button
                            className="menu-item delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (
                                window.confirm(
                                  'Are you sure you want to delete this notification?'
                                )
                              ) {
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
          </div>
        </div>
      </div>

      {selectedNotification && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={closeModal}>
              ×
            </button>

            <div className="modal-header">
              <div className="sender-info">
                <div className="sender-avatar">
                  {selectedNotification.sender_avatar ? (
                    <img
                      src={`http://localhost:5000/uploads/${selectedNotification.sender_avatar}`}
                      alt={selectedNotification.sender_name}
                    />
                  ) : (
                    <div className="avatar-placeholder">
                      {selectedNotification.sender_name?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>
                <div className="sender-details">
                  <h3>{selectedNotification.sender_name || 'System'}</h3>
                  <span className="notification-time">
                    {new Date(selectedNotification.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-body">
              <div className="notification-details">
                <h4>
                  {selectedNotification.type === 'feedback'
                    ? 'Rating Received'
                    : selectedNotification.type === 'session_request'
                    ? 'Session Request'
                    : 'Notification'}
                </h4>
                <p className="notification-message">
                  {selectedNotification.message}
                </p>

                {/* Accept / Decline buttons for pending session requests */}
                {selectedNotification.type === 'session_request' &&
                  selectedNotification.status === 'pending' && (
                    <div className="session-request-actions">
                      <button
                        className="btn-primary"
                        onClick={() => handleAccept(selectedNotification)}
                      >
                        Accept
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => handleDecline(selectedNotification)}
                      >
                        Decline
                      </button>
                    </div>
                  )}

                {selectedNotification.type === 'feedback' &&
                  feedbackDetails && (
                    <div className="feedback-details">
                      <div className="rating-display">
                        <h5>Rating Details:</h5>
                        <div className="rating-stars">
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
                          <span className="rating-value">
                            ({feedbackDetails.rating}/5)
                          </span>
                        </div>
                        {feedbackDetails.feedback_message && (
                          <div className="feedback-message">
                            <p>{feedbackDetails.feedback_message}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-primary" onClick={closeModal}>
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
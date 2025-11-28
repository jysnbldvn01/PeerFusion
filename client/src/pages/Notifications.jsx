import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import '../css/notification.css';
import { useNavigate } from "react-router-dom";

const API_BASE_URL = process.env.REACT_APP_API_URL;

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
  ),
  Clock: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
    </svg>
  ),
  Calendar: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
    </svg>
  )
};

const Notification = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [sortFilter, setSortFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [allNotifications, setAllNotifications] = useState([]);
  const [profile, setProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [feedbackDetails, setFeedbackDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const menuRefs = useRef({});
  const observerRef = useRef(null);
  const listRef = useRef(null);
  
  const navigate = useNavigate();

  const ITEMS_PER_PAGE = 10;

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

  // Handle link clicks
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
    return () => document.removeEventListener('click', handleLinkClick);
  }, [navigate]);

  // Handle modal message clicks specifically
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

  const fetchNotifications = useCallback(async (pageNum = 1, isLoadMore = false) => {
    const token = localStorage.getItem('token');
    const url =
      activeTab === 'archived'
        ? `${API_BASE_URL}/api/profile/notifications/archived`
        : `${API_BASE_URL}/api/profile/notifications`;

    try {
      if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setPage(1);
        setHasMore(true);
      }

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: pageNum,
          limit: ITEMS_PER_PAGE
        }
      });
      
      console.log('Fetched notifications:', res.data);
      
      if (isLoadMore) {
        // Append new notifications for infinite scroll
        setAllNotifications(prev => [...prev, ...res.data]);
      } else {
        // Replace all notifications for initial load
        setAllNotifications(res.data);
      }
      
      // Check if there are more notifications to load
      const hasMoreData = res.data.length === ITEMS_PER_PAGE;
      setHasMore(hasMoreData);
      
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      window.pfToast?.error?.(err?.response?.data?.message || 'Failed to fetch notifications');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [activeTab]);

  // Load more notifications
  const loadMoreNotifications = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchNotifications(nextPage, true);
    }
  }, [page, hasMore, isLoadingMore, fetchNotifications]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMoreNotifications();
        }
      },
      { threshold: 0.1 }
    );

    const currentObserver = observerRef.current;
    const sentinel = document.querySelector('.load-more-sentinel');
    
    if (sentinel && hasMore && !isLoading) {
      currentObserver.observe(sentinel);
    }

    return () => {
      if (currentObserver) {
        currentObserver.disconnect();
      }
    };
  }, [hasMore, isLoadingMore, isLoading, loadMoreNotifications]);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await axios.get(`${API_BASE_URL}/api/profile`, {
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

  // Enhanced helper functions to determine display name and avatar
  const getDisplayName = (notification) => {
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
    
    return notification.sender_name || 'User';
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
    return displayName.charAt(0)?.toUpperCase() || 'U';
  };

  // Categorize notifications for sorting
  const categorizeNotifications = (notification) => {
    if (notification.type === 'session_request' && notification.status === 'pending') {
      return 'pending';
    } else if (notification.type === 'feedback') {
      return 'feedback';
    } else if (notification.type === 'session_request' && (notification.status === 'accepted' || notification.status === 'completed')) {
      return 'meetings';
    }
    return 'other';
  };

  const fetchFeedbackDetails = async (notificationId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/profile/notification-feedback/${notificationId}`,
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
        `${API_BASE_URL}/api/profile/notifications/${id}/read`,
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
        `${API_BASE_URL}/api/profile/notifications/${id}/unread`,
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
        `${API_BASE_URL}/api/profile/notifications/${id}/archive`,
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
        `${API_BASE_URL}/api/profile/notifications/${id}/unarchive`,
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
    if (!allNotifications || allNotifications.length === 0) return;
    const token = localStorage.getItem('token');
    const unread = allNotifications.filter(n => !n.is_read);
    if (unread.length === 0) {
      window.pfToast?.info?.('All notifications are already read');
      return;
    }
    try {
      await Promise.all(
        unread.map(n =>
          axios.put(
            `${API_BASE_URL}/api/profile/notifications/${n.id}/read`,
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
        `${API_BASE_URL}/api/profile/notifications/${id}`,
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

  // Accept session request
  const handleAccept = async (notification) => {
    if (acceptingId === notification.id) return;
    const token = localStorage.getItem("token");
    try {
      setAcceptingId(notification.id);
      const res = await axios.post(
        `${API_BASE_URL}/api/session/accept`,
        {
          requestId: notification.session_request_id || notification.id,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success && res.data.conversationId) {
        setAllNotifications(prev => prev.filter((n) => n.id !== notification.id));
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

  // Decline session request - Auto delete after rejection
  const handleDecline = async (notification) => {
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `${API_BASE_URL}/api/session/reject`,
        {
          requestId: notification.session_request_id || notification.id,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Auto delete the notification after rejection
      await deleteNotification(notification.id);
      
      closeModal();
      window.pfToast?.success?.('Session request declined');
    } catch (err) {
      console.error("❌ Failed to reject session request:", err);
      window.pfToast?.error?.(err?.response?.data?.message || 'Error rejecting session request');
    }
  };

  const getNotificationBadge = (notification) => {
    const category = categorizeNotifications(notification);
    
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
        if (notification.status === 'pending') {
          return (
            <span className="peerfusion-notification-badge peerfusion-badge-pending">
              <InternetIcons.Clock /> Pending
            </span>
          );
        } else if (notification.status === 'accepted') {
          return (
            <span className="peerfusion-notification-badge peerfusion-badge-accepted">
              <InternetIcons.Accepted /> Accepted
            </span>
          );
        } else if (notification.status === 'rejected') {
          return (
            <span className="peerfusion-notification-badge peerfusion-badge-rejected">
              <InternetIcons.Rejected /> Declined
            </span>
          );
        } else if (notification.status === 'completed') {
          return (
            <span className="peerfusion-notification-badge peerfusion-badge-completed">
              <InternetIcons.Calendar /> Completed
            </span>
          );
        }
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

  // Filter notifications (no pagination here since we're using infinite scroll)
  const filteredNotifications = allNotifications
    .filter((notification) =>
      getDisplayName(notification)
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      notification.message?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(notification => {
      if (sortFilter === 'all') return true;
      const category = categorizeNotifications(notification);
      return category === sortFilter;
    });

  const unreadCount = allNotifications.filter(n => !n.is_read).length;

  // Get counts for each category
  const getCategoryCount = (category) => {
    return allNotifications.filter(notification => 
      categorizeNotifications(notification) === category
    ).length;
  };

  // Skeleton loading component
  const NotificationSkeleton = () => (
    <div className="peerfusion-skeleton-notification">
      <div className="peerfusion-skeleton-avatar peerfusion-skeleton"></div>
      <div className="peerfusion-skeleton-content">
        <div className="peerfusion-skeleton-header">
          <div className="peerfusion-skeleton-username peerfusion-skeleton"></div>
          <div className="peerfusion-skeleton-time peerfusion-skeleton"></div>
        </div>
        <div className="peerfusion-skeleton-message peerfusion-skeleton"></div>
        <div className="peerfusion-skeleton-message-short peerfusion-skeleton"></div>
        <div className="peerfusion-skeleton-badge peerfusion-skeleton"></div>
      </div>
    </div>
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

      {/* Main Tabs */}
      <div className="peerfusion-notification-tabs">
        <button
          className={`peerfusion-notification-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('all');
            setSortFilter('all');
            setPage(1);
            fetchNotifications(1, false);
          }}
        >
          All Notifications
        </button>
        <button
          className={`peerfusion-notification-tab ${activeTab === 'archived' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('archived');
            setSortFilter('all');
            setPage(1);
            fetchNotifications(1, false);
          }}
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

      {/* Sorting Filters - Available in both All and Archived tabs */}
      <div className="peerfusion-notification-sorting-filters">
        <button
          className={`peerfusion-sorting-filter ${sortFilter === 'all' ? 'active' : ''}`}
          onClick={() => setSortFilter('all')}
        >
          All ({allNotifications.length})
        </button>
        <button
          className={`peerfusion-sorting-filter ${sortFilter === 'pending' ? 'active' : ''}`}
          onClick={() => setSortFilter('pending')}
        >
          <InternetIcons.Clock /> Pending ({getCategoryCount('pending')})
        </button>
        <button
          className={`peerfusion-sorting-filter ${sortFilter === 'feedback' ? 'active' : ''}`}
          onClick={() => setSortFilter('feedback')}
        >
          <InternetIcons.Rating /> Feedback ({getCategoryCount('feedback')})
        </button>
        <button
          className={`peerfusion-sorting-filter ${sortFilter === 'meetings' ? 'active' : ''}`}
          onClick={() => setSortFilter('meetings')}
        >
          <InternetIcons.Calendar /> Meetings ({getCategoryCount('meetings')})
        </button>
      </div>

      {/* Single Row Notifications List */}
      <div className="peerfusion-notification-list" ref={listRef}>
        {isLoading ? (
          // Initial loading skeleton
          <>
            {[...Array(5)].map((_, index) => (
              <NotificationSkeleton key={index} />
            ))}
          </>
        ) : filteredNotifications.length === 0 ? (
          <div className="peerfusion-notification-empty">
            <div className="peerfusion-notification-empty-icon">
              {sortFilter === 'pending' ? '⏰' : 
               sortFilter === 'feedback' ? '⭐' : 
               sortFilter === 'meetings' ? '📅' : '📭'}
            </div>
            <h3>
              {sortFilter === 'pending' ? 'No pending requests' : 
               sortFilter === 'feedback' ? 'No feedback received' : 
               sortFilter === 'meetings' ? 'No meeting notifications' : 
               'No notifications found'}
            </h3>
            <p>
              {activeTab === 'archived' 
                ? 'Your archived notifications will appear here' 
                : sortFilter !== 'all'
                ? `No ${sortFilter} notifications found`
                : 'You\'re all caught up!'}
            </p>
          </div>
        ) : (
          <>
            {filteredNotifications.map((notification) => (
              <div
                className={`peerfusion-notification-item ${notification.is_read ? 'read' : 'unread'} ${
                  notification.type === 'appeal_approved' || 
                  notification.type === 'account_reactivated' || 
                  notification.status === 'accepted' ||
                  notification.status === 'completed'
                    ? 'peerfusion-notification-approved'
                    : notification.type === 'appeal_rejected' || 
                      notification.status === 'rejected'
                    ? 'peerfusion-notification-rejected'
                    : categorizeNotifications(notification) === 'pending'
                    ? 'peerfusion-notification-pending'
                    : ''
                }`}
                key={notification.id}
                onClick={() => viewNotification(notification)}
              >
                <div className="peerfusion-notification-content">
                  {/* Avatar */}
                  {getDisplayAvatar(notification) ? (
                    <img
                      src={`${API_BASE_URL}/uploads/${getDisplayAvatar(notification)}`}
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
            ))}
            
            {/* Load More Section */}
            {hasMore && (
              <div className="load-more-sentinel">
                {isLoadingMore ? (
                  // Loading more skeleton
                  <>
                    {[...Array(3)].map((_, index) => (
                      <NotificationSkeleton key={`loading-${index}`} />
                    ))}
                    <div className="peerfusion-loading-more">
                      <div className="peerfusion-loading-spinner"></div>
                      <p>Loading more notifications...</p>
                    </div>
                  </>
                ) : (
                  <div className="peerfusion-load-more-trigger">
                    Scroll down to load more
                  </div>
                )}
              </div>
            )}
            
            {/* No more notifications message */}
            {!hasMore && filteredNotifications.length > 0 && (
              <div className="peerfusion-no-more-notifications">
                <p>No more notifications to load</p>
              </div>
            )}
          </>
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
                  src={`${API_BASE_URL}/uploads/${getDisplayAvatar(selectedNotification)}`}
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
                    {selectedNotification.type === 'account_status' && <InternetIcons.Team />}
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
                      'This is an automated notification about your account status changes.'}
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
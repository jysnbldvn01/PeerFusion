import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FiMessageSquare, FiStar, FiUser, FiSearch, 
  FiFilter, FiChevronDown, FiChevronUp, 
  FiThumbsUp, FiThumbsDown, FiCalendar, FiMail,
  FiChevronRight
} from 'react-icons/fi';
import '../../css/feedbackmanagement.css';

export default function FeedbackManagement() {
  const [uniqueUsers, setUniqueUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [userFeedback, setUserFeedback] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [stats, setStats] = useState({
    total_feedback: 0,
    average_rating: 0,
    total_recommended: 0,
    five_star: 0,
    four_star: 0,
    three_star: 0,
    two_star: 0,
    one_star: 0
  });
  const [expandedFeedback, setExpandedFeedback] = useState({});
  const [filters, setFilters] = useState({
    rating: '',
    recommended: ''
  });
  const [userListFilters, setUserListFilters] = useState({
    recommended: '' // '', 'recommended'
  });
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [hasMoreFeedback, setHasMoreFeedback] = useState(false);
  const [skeletonLoading, setSkeletonLoading] = useState({
    users: false,
    feedback: false,
    stats: false,
    header: false,
    filters: false
  });

  // Get avatar URL - handle both full URLs and relative paths
  const getAvatarUrl = (avatar) => {
    if (!avatar) return null;
    
    // If it's already a full URL, return as is
    if (avatar.startsWith('http')) return avatar;
    
    // If it starts with /uploads or similar, construct full URL
    if (avatar.startsWith('/')) {
      return `http://localhost:5000${avatar}`;
    }
    
    // If it's just a filename, assume it's in uploads directory
    return `http://localhost:5000/uploads/${avatar}`;
  };

  useEffect(() => {
    fetchUniqueUsers();
    fetchStats();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [uniqueUsers, searchTerm, userListFilters]);

  const fetchUniqueUsers = async () => {
    const token = localStorage.getItem('token');
    try {
      setSkeletonLoading(prev => ({ ...prev, users: true, header: true }));
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/admin/feedback/unique-users-with-recommended', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUniqueUsers(response.data.users);
    } catch (err) {
      console.error('Error fetching unique users:', err);
      setError('Failed to load users data');
    } finally {
      setLoading(false);
      setSkeletonLoading(prev => ({ ...prev, users: false, header: false }));
    }
  };

  const fetchStats = async () => {
    const token = localStorage.getItem('token');
    try {
      setSkeletonLoading(prev => ({ ...prev, stats: true }));
      const response = await axios.get('http://localhost:5000/api/admin/feedback/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const statsData = response.data.stats || {};
      
      // Ensure we only show ratings that actually exist in the database
      const accurateStats = {
        total_feedback: Number(statsData.total_feedback) || 0,
        average_rating: Number(statsData.average_rating) || 0,
        total_recommended: Number(statsData.total_recommended) || 0,
        five_star: Number(statsData.five_star) || 0,
        four_star: Number(statsData.four_star) || 0,
        three_star: Number(statsData.three_star) || 0,
        two_star: Number(statsData.two_star) || 0,
        one_star: Number(statsData.one_star) || 0
      };
      
      setStats(accurateStats);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setStats({
        total_feedback: 0,
        average_rating: 0,
        total_recommended: 0,
        five_star: 0,
        four_star: 0,
        three_star: 0,
        two_star: 0,
        one_star: 0
      });
    } finally {
      setSkeletonLoading(prev => ({ ...prev, stats: false }));
    }
  };

  const fetchUserFeedback = async (userId, page = 1, loadMore = false) => {
    const token = localStorage.getItem('token');
    try {
      setSkeletonLoading(prev => ({ ...prev, feedback: true, filters: true }));
      setLoading(true);
      const response = await axios.get(`http://localhost:5000/api/admin/feedback/user/${userId}?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const user = uniqueUsers.find(u => u.user_id === userId);
      setSelectedUserDetails(user);
      
      if (loadMore) {
        setUserFeedback(prev => [...prev, ...response.data.feedback]);
      } else {
        setUserFeedback(response.data.feedback);
        setFeedbackPage(1);
      }
      
      setSelectedUser(userId);
      setHasMoreFeedback(response.data.feedback.length === 10);
    } catch (err) {
      console.error('Error fetching user feedback:', err);
      setError('Failed to load user feedback');
    } finally {
      setLoading(false);
      setSkeletonLoading(prev => ({ ...prev, feedback: false, filters: false }));
    }
  };

  const loadMoreFeedback = () => {
    const nextPage = feedbackPage + 1;
    setFeedbackPage(nextPage);
    fetchUserFeedback(selectedUser, nextPage, true);
  };

  const filterUsers = () => {
    let filtered = [...uniqueUsers];

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by recommended status in user list - ONLY show recommended when filter is 'recommended'
    if (userListFilters.recommended === 'recommended') {
      filtered = filtered.filter(user => user.has_recommended === true);
    }
    // If userListFilters.recommended is empty string, show all users

    setFilteredUsers(filtered);
  };

  const filterFeedback = () => {
    let filtered = [...userFeedback];

    // Rating filter
    if (filters.rating) {
      filtered = filtered.filter(item => item.rating === parseInt(filters.rating));
    }

    // Recommended filter - ONLY show recommended when filter is "true"
    if (filters.recommended === 'true') {
      filtered = filtered.filter(item => item.is_recommended === true || item.is_recommended === 1);
    }
    // If filters.recommended is empty string, show all (no filtering)

    return filtered;
  };

  const toggleFeedbackExpansion = (feedbackId) => {
    setExpandedFeedback(prev => ({
      ...prev,
      [feedbackId]: !prev[feedbackId]
    }));
  };

  const truncateMessage = (message, maxLength = 100) => {
    if (!message) return '';
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <FiStar
        key={i}
        className={i < rating ? "fm-star-filled" : "fm-star-empty"}
        size={16}
      />
    ));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const clearFilters = () => {
    setFilters({
      rating: '',
      recommended: ''
    });
    setSearchTerm('');
    setUserListFilters({
      recommended: ''
    });
  };

  const clearUserListFilters = () => {
    setUserListFilters({
      recommended: ''
    });
  };

  const formatNumber = (num) => {
    if (typeof num !== 'number' || isNaN(num)) return '0.0';
    return num.toFixed(1);
  };

  const calculatePercentage = (part, total) => {
    if (!total || total === 0) return 0;
    return (part / total) * 100;
  };

  const getInitials = (username) => {
    if (!username) return 'U';
    return username.charAt(0).toUpperCase();
  };

  // Check if user has recommended feedback
  const hasRecommendedFeedback = (user) => {
    return user.has_recommended === true;
  };

  // Skeleton Loading Components
  const HeaderSkeleton = () => (
    <div className="fm-header skeleton">
      <div className="fm-header-content">
        <div className="fm-title-section">
          <div className="fm-header-icon skeleton-pulse"></div>
          <div>
            <div className="fm-main-title skeleton-text skeleton-pulse"></div>
            <div className="fm-subtitle skeleton-text skeleton-pulse"></div>
          </div>
        </div>
        <div className="fm-stats">
          {[1, 2, 3].map((item) => (
            <div key={item} className="fm-stat-card skeleton">
              <div className="fm-stat-icon skeleton-pulse"></div>
              <div className="fm-stat-number skeleton-text skeleton-pulse"></div>
              <div className="fm-stat-label skeleton-text skeleton-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const FiltersSkeleton = () => (
    <div className="fm-card skeleton">
      <div className="fm-card-header">
        <div className="fm-card-title skeleton-text skeleton-pulse"></div>
      </div>
      <div className="fm-filters-grid">
        <div className="fm-search-box skeleton-pulse">
          <div className="fm-search-icon skeleton-pulse"></div>
          <div className="fm-search-input skeleton-pulse"></div>
        </div>
        <div className="fm-filter-group">
          <div className="fm-filter-label skeleton-text skeleton-pulse"></div>
          <div className="fm-filter-select skeleton-pulse"></div>
        </div>
        <div className="fm-filter-actions">
          <div className="fm-btn fm-btn-secondary skeleton-pulse"></div>
        </div>
      </div>
    </div>
  );

  const UserCardSkeleton = () => (
    <div className="fm-user-card skeleton">
      <div className="fm-user-header">
        <div className="fm-user-avatar">
          <div className="fm-avatar-placeholder skeleton-pulse"></div>
        </div>
        <div className="fm-user-details">
          <div className="fm-username skeleton-text skeleton-pulse"></div>
          <div className="fm-user-email skeleton-text skeleton-pulse"></div>
        </div>
      </div>
      <div className="fm-user-stats">
        <div className="fm-feedback-count skeleton-text skeleton-pulse"></div>
        <div className="fm-view-history">
          <span className="skeleton-text skeleton-pulse"></span>
        </div>
      </div>
    </div>
  );

  const FeedbackItemSkeleton = () => (
    <div className="fm-feedback-item skeleton">
      <div className="fm-feedback-header">
        <div className="fm-feedback-users">
          <div className="fm-user-pair">
            <div className="fm-user-info">
              <div className="fm-user-avatar-small">
                <div className="fm-avatar-placeholder-small skeleton-pulse"></div>
              </div>
              <div className="fm-user-details-small">
                <div className="fm-username-small skeleton-text skeleton-pulse"></div>
                <div className="fm-user-role skeleton-text skeleton-pulse"></div>
              </div>
            </div>
            
            <div className="fm-arrow skeleton-pulse">→</div>
            
            <div className="fm-user-info">
              <div className="fm-user-avatar-small">
                <div className="fm-avatar-placeholder-small skeleton-pulse"></div>
              </div>
              <div className="fm-user-details-small">
                <div className="fm-username-small skeleton-text skeleton-pulse"></div>
                <div className="fm-user-role skeleton-text skeleton-pulse"></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="fm-feedback-meta">
          <div className="fm-rating skeleton-pulse">
            <div className="skeleton-stars"></div>
          </div>
          <div className="fm-feedback-date skeleton-text skeleton-pulse"></div>
          <div className="fm-recommended-badge skeleton-text skeleton-pulse"></div>
        </div>
      </div>
      
      <div className="fm-feedback-message">
        <div className="skeleton-text-long skeleton-pulse"></div>
        <div className="skeleton-text-medium skeleton-pulse"></div>
        <div className="skeleton-text-short skeleton-pulse"></div>
      </div>
    </div>
  );

  const StatsSkeleton = () => (
    <div className="fm-stats-grid">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="fm-stat-item skeleton">
          <div className="fm-stat-value skeleton-pulse"></div>
          <div className="fm-stat-label skeleton-text skeleton-pulse"></div>
        </div>
      ))}
    </div>
  );

  const RatingDistributionSkeleton = () => (
    <div className="fm-rating-distribution skeleton">
      <h4 className="fm-distribution-title skeleton-text skeleton-pulse"></h4>
      {[1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="fm-rating-bar">
          <div className="fm-rating-label skeleton-text skeleton-pulse"></div>
          <div className="fm-bar-container">
            <div className="fm-bar-fill skeleton-pulse"></div>
          </div>
          <div className="fm-rating-count skeleton-text skeleton-pulse"></div>
        </div>
      ))}
    </div>
  );

  const UserInfoSkeleton = () => (
    <div className="fm-card skeleton">
      <div className="fm-card-header">
        <h2 className="fm-card-title skeleton-text skeleton-pulse"></h2>
      </div>
      <div className="fm-user-header">
        <div className="fm-user-avatar">
          <div className="fm-avatar-placeholder skeleton-pulse"></div>
        </div>
        <div className="fm-user-details">
          <div className="fm-username skeleton-text skeleton-pulse"></div>
          <div className="fm-user-email skeleton-text skeleton-pulse"></div>
        </div>
        <div className="fm-user-stats">
          <div className="fm-feedback-count skeleton-text skeleton-pulse"></div>
          <div className="fm-user-recommended-badge skeleton-text skeleton-pulse"></div>
        </div>
      </div>
    </div>
  );

  // Update the Rating Distribution to show accurate data
  const RatingDistribution = () => {
    const ratingLabels = ['5 Stars', '4 Stars', '3 Stars', '2 Stars', '1 Stars'];
    const ratingValues = [stats.five_star, stats.four_star, stats.three_star, stats.two_star, stats.one_star];
    
    return (
      <div className="fm-rating-distribution">
        <h4 className="fm-distribution-title">Rating Distribution</h4>
        {ratingLabels.map((label, index) => {
          const stars = 5 - index; // 5, 4, 3, 2, 1
          const count = ratingValues[index];
          const percentage = calculatePercentage(count, stats.total_feedback);
          
          // Only show ratings that actually have data
          if (count === 0) return null;
          
          return (
            <div key={stars} className="fm-rating-bar">
              <div className="fm-rating-label">
                {label}
              </div>
              <div className="fm-bar-container">
                <div 
                  className="fm-bar-fill"
                  style={{
                    width: `${percentage}%`
                  }}
                ></div>
              </div>
              <div className="fm-rating-count">
                {count}
              </div>
            </div>
          );
        })}
        
        {/* Show message if no ratings exist */}
        {stats.total_feedback === 0 && (
          <div className="fm-no-ratings">
            No ratings data available
          </div>
        )}
      </div>
    );
  };

  if (selectedUser) {
    const filteredFeedback = filterFeedback();
    
    return (
      <div className="fm-container">
        {/* Header */}
        {skeletonLoading.header ? (
          <HeaderSkeleton />
        ) : (
          <div className="fm-header">
            <div className="fm-header-content">
              <div className="fm-title-section">
                <div className="fm-header-icon">
                  <FiMessageSquare />
                </div>
                <div>
                  <h1 className="fm-main-title">Feedback History</h1>
                  <p className="fm-subtitle">
                    All feedback for {selectedUserDetails?.username || 'User'}
                    <button 
                      onClick={() => setSelectedUser(null)}
                      className="fm-btn fm-btn-secondary fm-btn-small ml-4"
                    >
                      ← Back to Users
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Info */}
        <div className="fm-content">
          {skeletonLoading.filters ? (
            <UserInfoSkeleton />
          ) : (
            <div className="fm-card">
              <div className="fm-card-header">
                <h2 className="fm-card-title">User Information</h2>
              </div>
              <div className="fm-user-header">
                <div className="fm-user-avatar">
                  {selectedUserDetails?.avatar ? (
                    <img 
                      src={getAvatarUrl(selectedUserDetails.avatar)} 
                      alt={selectedUserDetails.username}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const fallback = e.target.nextSibling;
                        if (fallback) fallback.style.display = 'flex';
                      }} 
                    />
                  ) : null}
                  <div 
                    className="fm-avatar-placeholder"
                    style={{ display: selectedUserDetails?.avatar ? 'none' : 'flex' }}
                  >
                    {getInitials(selectedUserDetails?.username)}
                  </div>
                </div>
                <div className="fm-user-details">
                  <div className="fm-username">{selectedUserDetails?.username || 'Unknown User'}</div>
                  <div className="fm-user-email">
                    <FiMail size={12} />
                    {selectedUserDetails?.email || 'No email'}
                  </div>
                </div>
                <div className="fm-user-stats">
                  <div className="fm-feedback-count">
                    {userFeedback.length} feedback entries
                  </div>
                  {/* Show recommended badge on user detail page */}
                  {hasRecommendedFeedback(selectedUserDetails) && (
                    <div className="fm-user-recommended-badge">
                      <FiThumbsUp size={12} />
                      Recommended User
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Filters for User Feedback */}
          {skeletonLoading.filters ? (
            <FiltersSkeleton />
          ) : (
            <div className="fm-card">
              <div className="fm-card-header">
                <h2 className="fm-card-title">Filter Feedback</h2>
              </div>
              
              <div className="fm-filters-grid">
                <div className="fm-filter-group">
                  <label className="fm-filter-label">Rating</label>
                  <select
                    value={filters.rating}
                    onChange={(e) => setFilters({...filters, rating: e.target.value})}
                    className="fm-filter-select"
                  >
                    <option value="">All Ratings</option>
                    <option value="5">5 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="2">2 Stars</option>
                    <option value="1">1 Star</option>
                  </select>
                </div>
                
                <div className="fm-filter-group">
                  <label className="fm-filter-label">Recommended</label>
                  <select
                    value={filters.recommended}
                    onChange={(e) => setFilters({...filters, recommended: e.target.value})}
                    className="fm-filter-select"
                  >
                    <option value="">All</option>
                    <option value="true">Recommended Only</option>
                  </select>
                </div>
                
                <div className="fm-filter-actions">
                  <button onClick={clearFilters} className="fm-btn fm-btn-secondary">
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* User Feedback List */}
          <div className="fm-card">
            <div className="fm-card-header">
              <h2 className="fm-card-title">Feedback History</h2>
              <div className="fm-card-badge">{filteredFeedback.length} entries</div>
            </div>

            {skeletonLoading.feedback && userFeedback.length === 0 ? (
              <div className="fm-feedback-list">
                {[1, 2, 3, 4, 5].map((item) => (
                  <FeedbackItemSkeleton key={item} />
                ))}
              </div>
            ) : loading && userFeedback.length === 0 ? (
              <div className="fm-loading">
                <div className="fm-loading-spinner"></div>
                <p>Loading feedback...</p>
              </div>
            ) : filteredFeedback.length === 0 ? (
              <div className="fm-empty-state">
                <FiMessageSquare className="fm-empty-icon" />
                <h3>No feedback found</h3>
                <p>No feedback matches your current filters.</p>
              </div>
            ) : (
              <>
                <div className="fm-feedback-list">
                  {filteredFeedback.map((item) => (
                    <div key={item.id} className="fm-feedback-item">
                      <div className="fm-feedback-header">
                        <div className="fm-feedback-users">
                          <div className="fm-user-pair">
                            <div className="fm-user-info">
                              <div className="fm-user-avatar-small">
                                {item.sender_avatar ? (
                                  <img 
                                    src={getAvatarUrl(item.sender_avatar)} 
                                    alt={item.sender_username}
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      const fallback = e.target.nextSibling;
                                      if (fallback) fallback.style.display = 'flex';
                                    }} 
                                  />
                                ) : null}
                                <div 
                                  className="fm-avatar-placeholder-small"
                                  style={{ display: item.sender_avatar ? 'none' : 'flex' }}
                                >
                                  {getInitials(item.sender_username)}
                                </div>
                              </div>
                              <div className="fm-user-details-small">
                                <div className="fm-username-small">
                                  {item.sender_username || 'Unknown User'}
                                </div>
                                <div className="fm-user-role">Sender</div>
                              </div>
                            </div>
                            
                            <div className="fm-arrow">→</div>
                            
                            <div className="fm-user-info">
                              <div className="fm-user-avatar-small">
                                {item.receiver_avatar ? (
                                  <img 
                                    src={getAvatarUrl(item.receiver_avatar)} 
                                    alt={item.receiver_username}
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      const fallback = e.target.nextSibling;
                                      if (fallback) fallback.style.display = 'flex';
                                    }} 
                                  />
                                ) : null}
                                <div 
                                  className="fm-avatar-placeholder-small"
                                  style={{ display: item.receiver_avatar ? 'none' : 'flex' }}
                                >
                                  {getInitials(item.receiver_username)}
                                </div>
                              </div>
                              <div className="fm-user-details-small">
                                <div className="fm-username-small">
                                  {item.receiver_username || 'Unknown User'}
                                </div>
                                <div className="fm-user-role">Receiver</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="fm-feedback-meta">
                          <div className="fm-rating">
                            {renderStars(item.rating)}
                            <span className="fm-rating-text">({item.rating}/5)</span>
                          </div>
                          <div className="fm-feedback-date">
                            <FiCalendar size={12} />
                            {formatDate(item.created_at)}
                          </div>
                          {/* Only show recommended badge, no "Not Recommended" badge */}
                          {(item.is_recommended === true || item.is_recommended === 1) && (
                            <div className="fm-recommended-badge">
                              <FiThumbsUp size={12} />
                              Recommended
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="fm-feedback-message">
                        {item.message ? (
                          <>
                            <p className={expandedFeedback[item.id] ? '' : 'truncated'}>
                              {expandedFeedback[item.id] ? item.message : truncateMessage(item.message)}
                            </p>
                            {item.message.length > 100 && (
                              <button
                                onClick={() => toggleFeedbackExpansion(item.id)}
                                className="fm-expand-btn"
                              >
                                {expandedFeedback[item.id] ? (
                                  <>Show Less <FiChevronUp /></>
                                ) : (
                                  <>Show More <FiChevronDown /></>
                                )}
                              </button>
                            )}
                          </>
                        ) : (
                          <p className="fm-no-message">No message provided</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {hasMoreFeedback && (
                  <div className="fm-load-more">
                    <button 
                      onClick={loadMoreFeedback}
                      className="fm-btn fm-btn-primary"
                      disabled={loading}
                    >
                      {loading ? 'Loading...' : 'Load More Feedback'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fm-container">
      {/* Header */}
      {skeletonLoading.header ? (
        <HeaderSkeleton />
      ) : (
        <div className="fm-header">
          <div className="fm-header-content">
            <div className="fm-title-section">
              <div className="fm-header-icon">
                <FiMessageSquare />
              </div>
              <div>
                <h1 className="fm-main-title">Feedback Management</h1>
                <p className="fm-subtitle">Monitor and manage user feedback and ratings</p>
              </div>
            </div>
            <div className="fm-stats">
              <div className="fm-stat-card">
                <FiMessageSquare className="fm-stat-icon" />
                <span className="fm-stat-number">{stats.total_feedback}</span>
                <span className="fm-stat-label">Total Feedback</span>
              </div>
              <div className="fm-stat-card">
                <FiStar className="fm-stat-icon" />
                <span className="fm-stat-number">{formatNumber(stats.average_rating)}</span>
                <span className="fm-stat-label">Avg Rating</span>
              </div>
              <div className="fm-stat-card">
                <FiThumbsUp className="fm-stat-icon" />
                <span className="fm-stat-number">{stats.total_recommended}</span>
                <span className="fm-stat-label">Recommended</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="fm-content">
        {skeletonLoading.filters ? (
          <FiltersSkeleton />
        ) : (
          <div className="fm-card">
            <div className="fm-card-header">
              <h2 className="fm-card-title">Search Users</h2>
            </div>
            
            <div className="fm-filters-grid">
              <div className="fm-search-box">
                <FiSearch className="fm-search-icon" />
                <input
                  type="text"
                  placeholder="Search by username or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="fm-search-input"
                />
              </div>
              
              {/* User list filters */}
              <div className="fm-filter-group">
                <label className="fm-filter-label">Show Users</label>
                <select
                  value={userListFilters.recommended}
                  onChange={(e) => setUserListFilters({...userListFilters, recommended: e.target.value})}
                  className="fm-filter-select"
                >
                  <option value="">All Users</option>
                  <option value="recommended">Recommended Only</option>
                </select>
              </div>
              
              <div className="fm-filter-actions">
                <button onClick={clearFilters} className="fm-btn fm-btn-secondary">
                  Clear All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Users List */}
        <div className="fm-card">
          <div className="fm-card-header">
            <h2 className="fm-card-title">Users with Feedback</h2>
            <div className="fm-card-badge">{filteredUsers.length} users</div>
          </div>

          {skeletonLoading.users ? (
            <div className="fm-users-list">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <UserCardSkeleton key={item} />
              ))}
            </div>
          ) : loading ? (
            <div className="fm-loading">
              <div className="fm-loading-spinner"></div>
              <p>Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="fm-empty-state">
              <FiUser className="fm-empty-icon" />
              <h3>No users found</h3>
              <p>No users match your search criteria.</p>
            </div>
          ) : (
            <div className="fm-users-list">
              {filteredUsers.map((user) => (
                <div 
                  key={user.user_id} 
                  className="fm-user-card"
                  onClick={() => fetchUserFeedback(user.user_id)}
                >
                  <div className="fm-user-header">
                    <div className="fm-user-avatar">
                      {user.avatar ? (
                        <img 
                          src={getAvatarUrl(user.avatar)} 
                          alt={user.username}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const fallback = e.target.nextSibling;
                            if (fallback) fallback.style.display = 'flex';
                          }} 
                        />
                      ) : null}
                      <div 
                        className="fm-avatar-placeholder"
                        style={{ display: user.avatar ? 'none' : 'flex' }}
                      >
                        {getInitials(user.username)}
                      </div>
                    </div>
                    <div className="fm-user-details">
                      <div className="fm-username">{user.username || 'Unknown User'}</div>
                      <div className="fm-user-email">
                        <FiMail size={12} />
                        {user.email || 'No email'}
                      </div>
                    </div>
                  </div>
                  <div className="fm-user-stats">
                    <div className="fm-feedback-count">
                      {user.total_feedbacks || 0} feedback entries
                    </div>
                    <div className="fm-view-history">
                      View History <FiChevronRight size={12} />
                      {/* Recommended indicator in user list */}
                      {hasRecommendedFeedback(user) && (
                        <div className="fm-user-recommended-indicator">
                          <FiThumbsUp size={10} />
                          Recommended
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Statistics Card */}
        <div className="fm-card">
          <div className="fm-card-header">
            <h2 className="fm-card-title">Feedback Statistics</h2>
          </div>
          
          {skeletonLoading.stats ? (
            <>
              <StatsSkeleton />
              <RatingDistributionSkeleton />
            </>
          ) : (
            <>
              <div className="fm-stats-grid">
                <div className="fm-stat-item">
                  <div className="fm-stat-value">{stats.total_feedback}</div>
                  <div className="fm-stat-label">Total Feedback</div>
                </div>
                <div className="fm-stat-item">
                  <div className="fm-stat-value">{formatNumber(stats.average_rating)}</div>
                  <div className="fm-stat-label">Average Rating</div>
                </div>
                <div className="fm-stat-item">
                  <div className="fm-stat-value">{stats.total_recommended}</div>
                  <div className="fm-stat-label">Recommended</div>
                </div>
                <div className="fm-stat-item">
                  <div className="fm-stat-value">{stats.five_star}</div>
                  <div className="fm-stat-label">5-Star Ratings</div>
                </div>
              </div>
              
              {/* Use the new RatingDistribution component */}
              <RatingDistribution />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
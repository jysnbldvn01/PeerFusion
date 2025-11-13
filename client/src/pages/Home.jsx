import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../css/home.css';

const API_BASE_URL = process.env.REACT_APP_API_URL;

const Home = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [subjectCategories, setSubjectCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [feedbackList, setFeedbackList] = useState([]);
  const [allFeedbacks, setAllFeedbacks] = useState([]);
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showAllFeedback, setShowAllFeedback] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState({});
  const [recommendedUsers, setRecommendedUsers] = useState([]);


  const slides = [
    { image: "/images/banner1.png", alt: "Share your skills" },
    { image: "/images/banner2.png", alt: "Learn new things" },
    { image: "/images/banner3.png", alt: "Build your network" }
  ];

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    setToken(storedToken);

    const fetchUsersAndSubjects = async () => {
      setIsLoading(true);
      try {
        const [usersRes, subjectsRes, recommendedRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/profile/others`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          }),
          axios.get(`${API_BASE_URL}/api/profile/subjects`),
          axios.get(`${API_BASE_URL}/api/profile/recommended`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          }).catch(err => {
            console.error('Recommended API Error:', err.response?.data || err.message);
            throw err;
          })
        ]);

        const processedUsers = usersRes.data.map(user => {
          let parsedAvailability = [];
          
          if (user.availability) {
            try {
              if (typeof user.availability === 'string') {
                parsedAvailability = JSON.parse(user.availability);
              } else {
                parsedAvailability = user.availability;
              }
            } catch (err) {
              console.error('Error parsing availability for user:', user.id, err);
              parsedAvailability = [];
            }
          }

          return {
            ...user,
            rating: user.rating ? parseFloat(user.rating) : 0,
            total_reviews: user.total_reviews || 0,
            is_recommended: user.is_recommended || false,
            availability: parsedAvailability
          };
        });

        setUsers(processedUsers);
        setSubjectCategories(subjectsRes.data);
        setRecommendedUsers(recommendedRes.data.recommended || []);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsersAndSubjects();

    const slideInterval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(slideInterval);
  }, [slides.length]);

  // Skeleton Loading Component
  const SkeletonCard = () => (
    <div className="peerfusion-skeleton-card">
      <div className="peerfusion-card-avatar-container">
        <div className="peerfusion-skeleton peerfusion-skeleton-avatar"></div>
        <div className="peerfusion-skeleton peerfusion-skeleton-rating"></div>
      </div>
      <div className="peerfusion-user-info">
        <div className="peerfusion-skeleton peerfusion-skeleton-text" style={{ width: '70%', height: '24px', marginBottom: '1rem' }}></div>
        <div className="peerfusion-user-details">
          <div className="peerfusion-skeleton peerfusion-skeleton-text" style={{ width: '90%' }}></div>
          <div className="peerfusion-skeleton peerfusion-skeleton-text" style={{ width: '80%' }}></div>
          <div className="peerfusion-skeleton peerfusion-skeleton-text" style={{ width: '85%' }}></div>
        </div>
        <div className="peerfusion-social-links-preview">
          <div className="peerfusion-skeleton peerfusion-skeleton-text-sm" style={{ width: '100%', height: '32px' }}></div>
          <div className="peerfusion-skeleton peerfusion-skeleton-text-sm" style={{ width: '80%', height: '32px' }}></div>
        </div>
      </div>
    </div>
  );

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.subject && user.subject.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!selectedCategory) return matchesSearch;

    if (selectedCategory.id === 'recommended') {
      const isRecommended = recommendedUsers.some(recUser => recUser.id === user.id);
      return matchesSearch && isRecommended;
    }

    const userSubjects = user.subject?.split(',').map(s => s.trim()) || [];
    return matchesSearch && selectedCategory.subjects.some(subject =>
      userSubjects.includes(subject.name)
    );
  });

  const fetchFeedback = async (userId) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/profile/feedback/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        const feedbacks = res.data.feedbacks || [];
        setAllFeedbacks(feedbacks);
        
        const feedbackBySender = {};
        feedbacks.forEach(fb => {
          if (!feedbackBySender[fb.sender_id] || new Date(fb.created_at) > new Date(feedbackBySender[fb.sender_id].created_at)) {
            feedbackBySender[fb.sender_id] = fb;
          }
        });

        const uniqueFeedbacks = Object.values(feedbackBySender)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        setFeedbackList(uniqueFeedbacks);
        setSelectedUser(prev => ({
          ...prev,
          rating: res.data.averageRating,
          total_reviews: Object.keys(feedbackBySender).length
        }));
      }
    } catch (err) {
      console.error('Failed to fetch feedback:', err);
      alert('Failed to load feedback. Please try again.');
    }
  };

  const handleOpenModal = async (user) => {
    setSelectedUser({
      ...user,
      rating: user.rating || 0,
      total_reviews: user.total_reviews || 0,
    });
    setShowAllFeedback(false);
    setExpandedUsers({});
    fetchFeedback(user.id);

    try {
      const countRes = await axios.get(
        `${API_BASE_URL}/api/session/unique-partners/${user.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedUser((prev) => ({
        ...prev,
        uniquePartnerCount: countRes.data.count,
      }));
    } catch (err) {
      console.error("Failed to fetch session partner count:", err);
    }
  };

  const handleRequestSession = async () => {
    if (!selectedUser) { alert("⚠️ Please select a user first."); return; }

    try {
      const { data: me } = await axios.get(
        `${API_BASE_URL}/api/profile`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!me.user_id) { alert("❌ Error: Could not fetch your user ID."); return; }

      const response = await axios.post(
        `${API_BASE_URL}/api/session/request`,
        { requester_id: me.user_id, receiver_id: selectedUser.id },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );

      if (response.data.success) {
        alert("Session request sent successfully!");
        setNotifications(prev => [
          {
            id: Date.now(),
            sender_id: me.user_id,
            receiver_id: selectedUser.id,
            session_request_id: response.data.requestId,
            message: "You have a new session request",
            type: "session_request",
            status: "pending",
            created_at: new Date().toISOString(),
          },
          ...prev
        ]);
      } else { alert("Failed to send request."); }
    } catch (err) {
      console.error("Request session error:", err);
      alert(`Error: ${err.response?.data?.error || err.message}`);
    }
  };

  const RatingDisplay = ({ rating }) => {
    const numericRating = Number(rating) || 0;
    return (
      <div className="peerfusion-rating-display">
        <span className="peerfusion-star-icon"></span>
        {numericRating.toFixed(1)}
      </div>
    );
  };

  const RecommendedBadge = () => (
    <span className="peerfusion-recommended-badge">
      <span className="peerfusion-recommended-icon"></span>
      Recommended
    </span>
  );

  const getUserFeedbacks = (senderId) => {
    return allFeedbacks
      .filter(fb => fb.sender_id === senderId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  const hasMultipleReviews = (senderId) => {
    return getUserFeedbacks(senderId).length >= 2;
  };

  const toggleUserExpansion = (senderId) => {
    setExpandedUsers(prev => ({
      ...prev,
      [senderId]: !prev[senderId]
    }));
  };

  const getDisplayedFeedback = () => {
    const displayed = showAllFeedback ? feedbackList : feedbackList.slice(0, 2);
    
    return displayed.map(userFeedback => {
      const userFeedbacks = getUserFeedbacks(userFeedback.sender_id);
      const isExpanded = expandedUsers[userFeedback.sender_id];
      const hasMultiple = hasMultipleReviews(userFeedback.sender_id);
      
      const reviewsToShow = (hasMultiple && isExpanded) ? userFeedbacks : [userFeedbacks[0]];
      
      return {
        user: userFeedback,
        reviews: reviewsToShow,
        hasMultiple,
        isExpanded,
        totalReviews: userFeedbacks.length
      };
    });
  };

  const displayedFeedbackData = getDisplayedFeedback();
  const hasMoreFeedback = feedbackList.length > 2;

  return (
    <div className="peerfusion-home-container">
      <div className="peerfusion-header-section">
        <h2 className="peerfusion-header-title">PeerFusion SkillShare</h2>
        <div className="peerfusion-search-container">
          <input
            type="text"
            placeholder="Search by name or subject..."
            className="peerfusion-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="chat-search-icon"></span>
        </div>
      </div>

      {/* Slide Banner */}
      <div className="peerfusion-banner-container">
        {slides.map((slide, index) => (
          <div key={index} className={`peerfusion-banner-slide ${index === currentSlide ? 'active' : ''}`}>
            <img src={slide.image} alt={slide.alt} className="peerfusion-banner-image" />
          </div>
        ))}
        <div className="peerfusion-banner-dots">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`peerfusion-dot ${index === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>
      </div>

      {/* Subject Category Filter with Recommended */}
      <div className="peerfusion-category-filter">
        <button className={`peerfusion-category-btn ${!selectedCategory ? 'active' : ''}`} onClick={() => setSelectedCategory(null)}>
          All Subjects
        </button>
        <button 
          key="recommended" 
          className={`peerfusion-category-btn ${selectedCategory?.id === 'recommended' ? 'active' : ''}`} 
          onClick={() => setSelectedCategory({ id: 'recommended', name: 'Recommended' })}
        >
          Recommended
        </button>
        {subjectCategories.map(category => (
          <button key={category.id} className={`peerfusion-category-btn ${selectedCategory?.id === category.id ? 'active' : ''}`} onClick={() => setSelectedCategory(category)}>
            {category.name}
          </button>
        ))}
      </div>

      {/* Pinterest-style User Cards with Skeleton Loading */}
      <div className="peerfusion-user-list">
        {isLoading ? (
          // Skeleton loading state
          Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))
        ) : (
          filteredUsers.map(user => {
            const isRecommended = recommendedUsers.some(recUser => recUser.id === user.id);
            return (
              <div className="peerfusion-user-card" key={user.id} onClick={() => handleOpenModal(user)}>
                <div className="peerfusion-card-avatar-container">
                  {user.avatar && (
                    <img 
                      src={`${API_BASE_URL}/uploads/${user.avatar}`} 
                      alt="Avatar" 
                      className="peerfusion-user-avatar" 
                    />
                  )}
                  <div className="peerfusion-user-rating">
                    <RatingDisplay rating={user?.rating} />
                  </div>
                  {isRecommended && (
                    <div className="peerfusion-card-recommended-badge">
                      <RecommendedBadge />
                    </div>
                  )}
                </div>
                <div className="peerfusion-user-info">
                  <h3 className="peerfusion-user-name">{user.username}</h3>
                  <div className="peerfusion-user-details">
                    <p className="peerfusion-user-subject">
                      <span className="peerfusion-detail-label">Subject:</span> 
                      {user.subject || 'N/A'}
                    </p>
                    <p className="peerfusion-user-level">
                      <span className="peerfusion-detail-label">Year Level:</span> 
                      {user.year_level || 'N/A'}
                    </p>
                    <p className="peerfusion-user-role">
                      <span className="peerfusion-detail-label">Role:</span> 
                      {user.role || 'N/A'}
                    </p>
                  </div>
                  {user.social_links && (
                    <div className="peerfusion-social-links-preview">
                      {user.social_links.split('\n').slice(0, 2).map((link, i) => (
                        <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="peerfusion-card-link">
                          <span className="peerfusion-link-icon"></span>
                          {link.length > 20 ? link.substring(0, 20) + '...' : link}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {selectedUser && (
        <div className="peerfusion-modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="peerfusion-modal-content" onClick={e => e.stopPropagation()}>
            <button className="peerfusion-close-modal" onClick={() => setSelectedUser(null)}>×</button>
            
            <div className="peerfusion-modal-avatar-container">
              {selectedUser.avatar && (
                <img
                  src={`${API_BASE_URL}/uploads/${selectedUser.avatar}`}
                  alt="Avatar"
                  className="peerfusion-modal-avatar"
                />
              )}
              {recommendedUsers.some(recUser => recUser.id === selectedUser.id) && (
                <RecommendedBadge />
              )}
              <div className="peerfusion-modal-rating">
                <RatingDisplay rating={selectedUser?.rating} />
                <span>({selectedUser?.total_reviews || 0} reviews)</span>
              </div>
            </div>

            <div className="peerfusion-modal-main">
              <h3 className="peerfusion-modal-title">{selectedUser.username}</h3>
              <p className="peerfusion-modal-role">{selectedUser.role || 'N/A'}</p>
              <p className="peerfusion-modal-bio">{selectedUser.bio || 'No bio provided'}</p>
              
              <div className="peerfusion-modal-section">
                <h4 className="peerfusion-modal-section-title">Subject Expertise</h4>
                <div className="peerfusion-subject-tags">
                  {selectedUser.subject?.split(',').map((s, i) => (
                    <span key={i} className="peerfusion-subject-tag">{s.trim()}</span>
                  )) || 'N/A'}
                </div>
              </div>

              <div className="peerfusion-modal-section">
                <h4 className="peerfusion-modal-section-title">Year Level</h4>
                <p>{selectedUser.year_level || 'N/A'}</p>
              </div>

              <div className="peerfusion-modal-section">
                <h4 className="peerfusion-modal-section-title">Number of Tutored Skill Learners</h4>
                <p>{selectedUser.uniquePartnerCount ?? 0} Skill Sharers</p>
              </div>

              {selectedUser.social_links && (
                <div className="peerfusion-modal-section">
                  <h4 className="peerfusion-modal-section-title">Social Links</h4>
                  <div className="peerfusion-modal-social-links">
                    {selectedUser.social_links.split('\n').map((link, i) => (
                      <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="peerfusion-modal-social-link">
                        <span className="peerfusion-link-icon"></span>
                        <span className="peerfusion-link-text">{link}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="peerfusion-modal-section">
                <h4 className="peerfusion-modal-section-title">Contact</h4>
                <p className="peerfusion-contact-info">
                  {selectedUser.contact_number ? (
                    <a href={`tel:${selectedUser.contact_number}`} className="peerfusion-contact-link">
                      <span className="peerfusion-phone-icon"></span>
                      {selectedUser.contact_number}
                    </a>
                  ) : 'Not provided'}
                </p>
              </div>

              {/* Availability Section */}
              {selectedUser.availability && selectedUser.role !== 'Skill Learner' && (
                <div className="peerfusion-modal-section">
                  <h4 className="peerfusion-modal-section-title">Time Availability</h4>
                  <div className="peerfusion-availability-display">
                    {(() => {
                      let availability = selectedUser.availability;
                      if (typeof availability === 'string') {
                        try {
                          availability = JSON.parse(availability);
                        } catch (err) {
                          console.error('Error parsing availability:', err);
                          availability = [];
                        }
                      }
                      
                      const availableDays = availability.filter(day => 
                        day.enabled && day.slots && day.slots.length > 0
                      );
                      
                      if (availableDays.length === 0) {
                        return <p className="peerfusion-no-availability">No availability set</p>;
                      }

                      return availableDays.map((daySchedule) => (
                        <div key={daySchedule.day} className="peerfusion-availability-day">
                          <strong className="peerfusion-day-label">{daySchedule.day}:</strong>
                          <div className="peerfusion-time-slots-display">
                            {daySchedule.slots.map((slot, index) => (
                              <span key={index} className="peerfusion-time-slot-badge">
                                {slot.start} - {slot.end}
                              </span>
                            ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

            <div className="peerfusion-modal-section">
              <h4 className="peerfusion-modal-section-title">Feedback & Ratings</h4>
              <div className="peerfusion-feedback-list">
                {feedbackList.length === 0 ? (
                  <p className="peerfusion-no-feedback">No feedback yet. Be the first to review!</p>
                ) : (
                  <>
                    {selectedUser?.rating > 0 && (
                      <div className="peerfusion-average-rating">
                        <RatingDisplay rating={selectedUser?.rating} />
                      </div>
                    )}
                    {displayedFeedbackData.map(({ user, reviews, hasMultiple, isExpanded, totalReviews }) => (
                      <div key={user.sender_id}>
                        {reviews.length > 0 && (
                          <div className="peerfusion-feedback-item">
                            <div className="peerfusion-feedback-header">
                              <img 
                                src={reviews[0].sender_avatar ? `${API_BASE_URL}/uploads/${reviews[0].sender_avatar}` : '/default-avatar.png'} 
                                alt={reviews[0].sender_name} 
                                className="peerfusion-feedback-avatar" 
                              />
                              <div className="peerfusion-feedback-user-info">
                                <div className="peerfusion-feedback-user-main">
                                  <strong className="peerfusion-feedback-user-name">
                                    {reviews[0].sender_name}
                                  </strong>
                                </div>
                                <div className="peerfusion-feedback-rating-container">
                                  {reviews[0].rating > 0 && (
                                    <div className="peerfusion-feedback-rating">
                                      {Array.from({ length: 5 }).map((_, i) => (
                                        <span key={i} className={i < reviews[0].rating ? 'filled' : ''}>
                                          {i < reviews[0].rating ? '★' : '☆'}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {!!reviews[0].is_recommended && (
                                    <span className="peerfusion-recommended-indicator">
                                      Recommended
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <p className="peerfusion-feedback-message">
                              {reviews[0].message && reviews[0].message !== '0' ? reviews[0].message : ''}
                            </p>
                            <small className="peerfusion-feedback-date">
                              {reviews[0].created_at && !isNaN(new Date(reviews[0].created_at)) 
                                ? new Date(reviews[0].created_at).toLocaleDateString('en-US', {
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric'
                                  })
                                : ''}
                            </small>
                          </div>
                        )}
                        
                        {reviews.slice(1).map((fb, index) => (
                          <div key={fb.id} className="peerfusion-feedback-item additional-review">
                            <div className="peerfusion-compact-rating">
                              <div className="peerfusion-compact-stars">
                                {Array.from({ length:5 }).map((_, i) => (
                                  <span key={i} className={`peerfusion-compact-star ${i < fb.rating ? 'filled' : ''}`}>
                                    {i < fb.rating ? '★' : '☆'}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <p className="peerfusion-feedback-message">
                              {fb.message && fb.message !== '0' ? fb.message : ''}
                            </p>
                            <small className="peerfusion-feedback-date">
                              {fb.created_at && !isNaN(new Date(fb.created_at)) 
                                ? new Date(fb.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric'
                                  })
                                : ''}
                            </small>
                          </div>
                        ))}
                        
                        {hasMultiple && !isExpanded && (
                          <div className="peerfusion-view-more-container">
                            <button 
                              className="peerfusion-view-more-btn"
                              onClick={() => toggleUserExpansion(user.sender_id)}
                            >
                              View {totalReviews - 1} more review{totalReviews - 1 > 1 ? 's' : ''} from {user.sender_name}
                            </button>
                          </div>
                        )}
                        
                        {hasMultiple && isExpanded && (
                          <div className="peerfusion-view-more-container">
                            <button 
                              className="peerfusion-view-more-btn"
                              onClick={() => toggleUserExpansion(user.sender_id)}
                            >
                              Show less from {user.sender_name}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {hasMoreFeedback && !showAllFeedback && (
                      <div className="peerfusion-see-more-container">
                        <button 
                          className="peerfusion-see-more-btn"
                          onClick={() => setShowAllFeedback(true)}
                        >
                          See More Reviews
                        </button>
                      </div>
                    )}

                    {showAllFeedback && hasMoreFeedback && (
                      <div className="peerfusion-see-more-container">
                        <button 
                          className="peerfusion-see-more-btn"
                          onClick={() => setShowAllFeedback(false)}
                        >
                          Show Less
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

              <div className="peerfusion-modal-actions">
                <button className="peerfusion-schedule-btn" onClick={handleRequestSession}>
                  <span className="peerfusion-calendar-icon"></span>
                  Request Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
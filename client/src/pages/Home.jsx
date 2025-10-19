import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../css/home.css';

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
    { image: "/images/banner1.png", alt: "Learn new things" },
    { image: "/images/banner1.png", alt: "Build your network" }
  ];

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    setToken(storedToken);

    const fetchUsersAndSubjects = async () => {
      setIsLoading(true);
      try {
        const [usersRes, subjectsRes, recommendedRes] = await Promise.all([
          axios.get('http://localhost:5000/api/profile/others', {
            headers: { Authorization: `Bearer ${storedToken}` },
          }),
          axios.get('http://localhost:5000/api/profile/subjects'),
          axios.get('http://localhost:5000/api/profile/recommended', {
            headers: { Authorization: `Bearer ${storedToken}` },
          }).catch(err => {
            console.error('Recommended API Error:', err.response?.data || err.message);
            throw err;
          })
        ]);

        console.log('Fetched users:', usersRes.data);
        console.log('Recommended users:', recommendedRes.data);
        // Process users with proper availability parsing
        const processedUsers = usersRes.data.map(user => {
          let parsedAvailability = [];
          
          // Parse availability if it exists
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

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.subject && user.subject.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!selectedCategory) return matchesSearch;

    // Handle "Recommended" category
    if (selectedCategory.id === 'recommended') {
      const isRecommended = recommendedUsers.some(recUser => recUser.id === user.id);
      return matchesSearch && isRecommended;
    }

    // Handle subject categories
    const userSubjects = user.subject?.split(',').map(s => s.trim()) || [];
    return matchesSearch && selectedCategory.subjects.some(subject =>
      userSubjects.includes(subject.name)
    );
  });

  const fetchFeedback = async (userId) => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/profile/feedback/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        const feedbacks = res.data.feedbacks || [];
        setAllFeedbacks(feedbacks);
        
        // Group by sender_id to get unique users and their latest feedback
        const feedbackBySender = {};
        feedbacks.forEach(fb => {
          if (!feedbackBySender[fb.sender_id] || new Date(fb.created_at) > new Date(feedbackBySender[fb.sender_id].created_at)) {
            feedbackBySender[fb.sender_id] = fb;
          }
        });

        // Convert to array and sort by date
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

    // Fetch unique partner count
    try {
      const countRes = await axios.get(
        `http://localhost:5000/api/session/unique-partners/${user.id}`,
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
        "http://localhost:5000/api/profile",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!me.user_id) { alert("❌ Error: Could not fetch your user ID."); return; }

      const response = await axios.post(
        "http://localhost:5000/api/session/request",
        { requester_id: me.user_id, receiver_id: selectedUser.id },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );

      if (response.data.success) {
        alert(" Session request sent successfully!");
        setNotifications(prev => [
          {
            id: Date.now(),
            sender_id: me.user_id,
            receiver_id: selectedUser.id,
            session_request_id: response.data.requestId,
            message: "📅 You have a new session request",
            type: "session_request",
            status: "pending",
            created_at: new Date().toISOString(),
          },
          ...prev
        ]);
      } else { alert("⚠️ Failed to send request."); }
    } catch (err) {
      console.error("Request session error:", err);
      alert(`❌ Error: ${err.response?.data?.error || err.message}`);
    }
  };

  const RatingDisplay = ({ rating }) => {
    const numericRating = Number(rating) || 0;
    return <span>⭐ {numericRating.toFixed(1)}</span>;
  };

  // Recommended Badge component
  const RecommendedBadge = () => (
    <span className="recommended-badge">Recommended</span>
  );

  // Availability Display Component for Modal
  const AvailabilityDisplay = ({ availability }) => {
    if (!availability || availability.length === 0) {
      return <p className="no-availability">No availability set</p>;
    }

    let parsedAvailability = availability;
    if (typeof availability === 'string') {
      try {
        parsedAvailability = JSON.parse(availability);
      } catch (err) {
        console.error('Error parsing availability:', err);
        return <p className="no-availability">No availability set</p>;
      }
    }

    const availableDays = parsedAvailability.filter(day => 
      day && day.enabled && day.slots && day.slots.length > 0
    );

    if (availableDays.length === 0) {
      return <p className="no-availability">No availability set</p>;
    }

    return (
      <div className="availability-display">
        {availableDays.map((daySchedule) => (
          <div key={daySchedule.day} className="availability-day">
            <strong className="day-label">{daySchedule.day}:</strong>
            <div className="time-slots-display">
              {daySchedule.slots.map((slot, index) => (
                <span key={index} className="time-slot-badge">
                  {slot.start} - {slot.end}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Get all feedbacks from a specific user
  const getUserFeedbacks = (senderId) => {
    return allFeedbacks
      .filter(fb => fb.sender_id === senderId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  // Check if a user has multiple reviews (2 or more)
  const hasMultipleReviews = (senderId) => {
    return getUserFeedbacks(senderId).length >= 2;
  };

  // Toggle expanded state for a specific user
  const toggleUserExpansion = (senderId) => {
    setExpandedUsers(prev => ({
      ...prev,
      [senderId]: !prev[senderId]
    }));
  };

  // Get displayed feedback for the modal
  const getDisplayedFeedback = () => {
    const displayed = showAllFeedback ? feedbackList : feedbackList.slice(0, 2);
    
    return displayed.map(userFeedback => {
      const userFeedbacks = getUserFeedbacks(userFeedback.sender_id);
      const isExpanded = expandedUsers[userFeedback.sender_id];
      const hasMultiple = hasMultipleReviews(userFeedback.sender_id);
      
      // If user has multiple reviews and is expanded, show all their reviews
      // Otherwise, show only their latest review
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
    <div className="home-container">
      <div className="header-section">
        <h2>PeerFusion SkillShare</h2>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search by name or subject..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="search-icon"></span>
        </div>
      </div>

      {/* Slide Banner */}
      <div className="banner-container">
        {slides.map((slide, index) => (
          <div key={index} className={`banner-slide ${index === currentSlide ? 'active' : ''}`}>
            <img src={slide.image} alt={slide.alt} className="banner-image" />
          </div>
        ))}
        <div className="banner-dots">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`dot ${index === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>
      </div>

      {/* Subject Category Filter with Recommended */}
      <div className="category-filter">
        <button className={`category-btn ${!selectedCategory ? 'active' : ''}`} onClick={() => setSelectedCategory(null)}>All Subjects</button>
        {/* Recommended Category */}
        <button 
          key="recommended" 
          className={`category-btn ${selectedCategory?.id === 'recommended' ? 'active' : ''}`} 
          onClick={() => setSelectedCategory({ id: 'recommended', name: 'Recommended' })}
        >
         Recommended
        </button>
        {subjectCategories.map(category => (
          <button key={category.id} className={`category-btn ${selectedCategory?.id === category.id ? 'active' : ''}`} onClick={() => setSelectedCategory(category)}>{category.name}</button>
        ))}
      </div>

      {/* User Cards with Recommended Badge */}
      <div className="user-list">
        {isLoading ? (
          <div className="loading-spinner-container"><div className="loading-spinner"></div></div>
        ) : (
          filteredUsers.map(user => {
            const isRecommended = recommendedUsers.some(recUser => recUser.id === user.id);
            return (
              <div className="user-card" key={user.id} onClick={() => handleOpenModal(user)}>
                {user.avatar && <img src={`http://localhost:5000/uploads/${user.avatar}`} alt="Avatar" className="user-avatar" />}
                <div className="user-rating">
                  <RatingDisplay rating={user?.rating} />
                  {isRecommended && <RecommendedBadge />}
                </div>
                <div className="user-info">
                  <h3 className="user-name">{user.username}</h3>
                  <div className="user-details">
                    <p className="user-subject"><span className="detail-label">Subject:</span> {user.subject || 'N/A'}</p>
                    <p className="user-level"><span className="detail-label">Year Level:</span> {user.year_level || 'N/A'}</p>
                    <p className="user-role"><span className="detail-label">Role:</span> {user.role || 'N/A'}</p>
                  </div>
                  {user.social_links && (
                    <div className="social-links-preview">
                      {user.social_links.split('\n').slice(0, 2).map((link, i) => (
                        <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="card-link">🔗 {link.length > 20 ? link.substring(0, 20) + '...' : link}</a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal with Recommended Features */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setSelectedUser(null)}>×</button>
            <div className="modal-avatar-container">
              {selectedUser.avatar && (
                <img
                  src={`http://localhost:5000/uploads/${selectedUser.avatar}`}
                  alt="Avatar"
                  className="modal-avatar"
                />
              )}
              {recommendedUsers.some(recUser => recUser.id === selectedUser.id) && (
                  <RecommendedBadge />
                )}
              <div className="modal-rating">
                <RatingDisplay rating={selectedUser?.rating} />
                <span>({selectedUser?.total_reviews || 0} reviews)</span>
              </div>
            </div>

            <div className="modal-main">
              <h3>{selectedUser.username}</h3>
              <p className="modal-role">{selectedUser.role || 'N/A'}</p>
              <p className="modal-bio">{selectedUser.bio || 'No bio provided'}</p>
              <div className="modal-section">
                <h4>Subject Expertise</h4>
                <div className="subject-tags">{selectedUser.subject?.split(',').map((s, i) => <span key={i} className="subject-tag">{s.trim()}</span>) || 'N/A'}</div>
              </div>
              <div className="modal-section">
                <h4>Year Level</h4>
                <p>{selectedUser.year_level || 'N/A'}</p>
              </div>
              <div className="modal-section">
                <h4>Number of Tutored Skill Learners</h4>
                <p>{selectedUser.uniquePartnerCount ?? 0} Skill Sharers</p>
              </div>
              {selectedUser.social_links && (
                <div className="modal-section">
                  <h4>Social Links</h4>
                  <div className="modal-social-links">
                    {selectedUser.social_links.split('\n').map((link, i) => (
                      <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="modal-social-link">
                        <span className="link-icon">🔗</span><span className="link-text">{link}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <div className="modal-section">
                <h4>Contact</h4>
                <p className="contact-info">
                  {selectedUser.contact_number ? (
                    <a href={`tel:${selectedUser.contact_number}`} className="contact-link">📞 {selectedUser.contact_number}</a>
                  ) : 'Not provided'}
                </p>
              </div>

            {/* Availability Section */}
            {selectedUser.availability && selectedUser.role !== 'Skill Learner' && (
              <div className="modal-section">
                <h4> Time Availability</h4>
                <div className="availability-display">
                  {(() => {
                    // Ensure availability is properly parsed
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
                      return <p className="no-availability">No availability set</p>;
                    }

                    return availableDays.map((daySchedule) => (
                      <div key={daySchedule.day} className="availability-day">
                        <strong className="day-label">{daySchedule.day}:</strong>
                        <div className="time-slots-display">
                          {daySchedule.slots.map((slot, index) => (
                            <span key={index} className="time-slot-badge">
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

              <div className="modal-section">
                <h4>Feedback & Ratings</h4>

                {/* Feedback List */}
                <div className="feedback-list">
                  {feedbackList.length === 0 ? <p className="no-feedback">No feedback yet. Be the first to review!</p> :
                    <>
                      {selectedUser?.rating > 0 && (
                        <div className="average-rating"><RatingDisplay rating={selectedUser?.rating} /></div>
                      )}
                      {displayedFeedbackData.map(({ user, reviews, hasMultiple, isExpanded, totalReviews }) => (
                        <div key={user.sender_id}>
                          {/* First review - shows full profile */}
                          {reviews.length > 0 && (
                            <div className="feedback-item">
                              <div className="feedback-header">
                                <img src={reviews[0].sender_avatar ? `http://localhost:5000/uploads/${reviews[0].sender_avatar}` : '/default-avatar.png'} alt={reviews[0].sender_name} className="feedback-avatar" />
                                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%' }}>
                                  <strong style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'70%' }}>{reviews[0].sender_name}</strong>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      {reviews[0].rating > 0 && (
                                        <div className="feedback-rating" style={{ flexShrink: 0 }}>
                                          {Array.from({ length: 5 }).map((_, i) => (
                                            <span key={i} className={i < reviews[0].rating ? 'filled' : ''}>
                                              {i < reviews[0].rating ? '★' : '☆'}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                        {!!reviews[0].is_recommended && (
                                          <span className="recommended-indicator">
                                            ⭐ Recommended
                                          </span>
                                        )}
                                  </div>
                                </div>
                              </div>
                              <p className="feedback-message">
                                {reviews[0].message && reviews[0].message !== '0' ? reviews[0].message : ''}
                              </p>
                              <small className="feedback-date">
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
                          
                          {/* Additional reviews - compact view without profile */}
                          {reviews.slice(1).map((fb, index) => (
                            <div 
                              key={fb.id} 
                              className="feedback-item additional-review"
                            >
                              <div className="compact-rating">
                                <div className="compact-stars">
                                  {Array.from({ length:5 }).map((_, i) => (
                                    <span key={i} className={`compact-star ${i < fb.rating ? 'filled' : ''}`}>
                                      {i < fb.rating ? '★' : '☆'}
                                    </span>
                                  ))}
                                </div>
                                {!!reviews[0].is_recommended && (
                                  <span className="recommended-indicator">
                                  </span>
                                )}
                              </div>
                              <p className="feedback-message">
                                {fb.message && fb.message !== '0' ? fb.message : ''}
                              </p>
                              <small className="feedback-date">
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
                          
                          {/* View More for specific user with 2+ reviews */}
                          {hasMultiple && !isExpanded && (
                            <div className="view-more-container">
                              <button 
                                className="view-more-btn"
                                onClick={() => toggleUserExpansion(user.sender_id)}
                              >
                                View {totalReviews - 1} more review{totalReviews - 1 > 1 ? 's' : ''} from {user.sender_name}
                              </button>
                            </div>
                          )}
                          
                          {/* Show Less for specific user */}
                          {hasMultiple && isExpanded && (
                            <div className="view-more-container">
                              <button 
                                className="view-more-btn"
                                onClick={() => toggleUserExpansion(user.sender_id)}
                              >
                                Show less from {user.sender_name}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {/* See More Reviews for different users */}
                      {hasMoreFeedback && !showAllFeedback && (
                        <div className="see-more-container">
                          <button 
                            className="see-more-btn"
                            onClick={() => setShowAllFeedback(true)}
                          >
                            See More Reviews
                          </button>
                        </div>
                      )}

                      {/* Show Less Reviews for different users */}
                      {showAllFeedback && hasMoreFeedback && (
                        <div className="see-more-container">
                          <button 
                            className="see-more-btn"
                            onClick={() => setShowAllFeedback(false)}
                          >
                            Show Less
                          </button>
                        </div>
                      )}
                    </>
                  }
                </div>
              </div>
              <div className="modal-actions">
                <button className="schedule-btn" onClick={handleRequestSession}>📅 Request Session</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default Home;
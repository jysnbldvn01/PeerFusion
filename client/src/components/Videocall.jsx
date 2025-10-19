import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import "../css/Videocall.css";

const Videocall = () => {
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const location = useLocation();
  
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [partnerInfo, setPartnerInfo] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecommended, setIsRecommended] = useState(false);
  
  // Report states
  const [reportType, setReportType] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const REPORT_TYPES = [
    "Inappropriate Behavior",
    "Harassment",
    "Spam",
    "False Information",
    "Technical Issues",
    "No Show/Unreliable",
    "Other"
  ];

  useEffect(() => {
    const initJitsi = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Authentication token not found.");
        
        const profileRes = await axios.get("http://localhost:5000/api/profile/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const { username: currentUsername, avatar: currentUserAvatar } = profileRes.data;
        const currentUserId = JSON.parse(atob(token.split(".")[1])).id;

        const params = new URLSearchParams(location.search);
        const partnerId = parseInt(params.get("partnerId"), 10);
        
        const partnerUsername = params.get('partnerUsername') || `User ${partnerId}`;
        const partnerAvatar = params.get('partnerAvatar') || null;
        
        console.log("Partner info from URL:", { partnerId, partnerUsername, partnerAvatar });

        setPartnerInfo({
          id: partnerId,
          username: decodeURIComponent(partnerUsername),
          avatar: partnerAvatar ? decodeURIComponent(partnerAvatar) : null
        });

        const ids = [currentUserId, partnerId].sort((a, b) => a - b);
        const roomName = `peerfusion-${ids[0]}-${ids[1]}`;

        const res = await axios.post("http://localhost:5000/api/jitsi/token", {
          roomName,
          user: {
            id: currentUserId,
            name: currentUsername,
            email: `user${currentUserId}@peerfusion.com`,
            avatar: currentUserAvatar,
          },
        });

        const data = res.data;
        if (!data.success) throw new Error(data.error);

        if (apiRef.current) {
          apiRef.current.dispose();
        }

        apiRef.current = new window.JitsiMeetExternalAPI("8x8.vc", {
          roomName: data.room,
          parentNode: containerRef.current,
          jwt: data.token,
          userInfo: {
            displayName: currentUsername,
            avatarURL: currentUserAvatar,
          },
          configOverwrite: {
            prejoinPageEnabled: true, 
            disableDeepLinking: true,
            defaultLanguage: 'en',
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
              'microphone', 'camera', 'desktop', 'fullscreen',
              'fodeviceselection', 'hangup', 'profile', 'chat',
              'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
              'videoquality', 'filmstrip', 'feedback',
              'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
              'mute-video-everyone'
            ],
          },
        });

        apiRef.current.addListener('videoConferenceLeft', handleMeetingEnd);
        apiRef.current.addListener('readyToClose', handleMeetingEnd);

      } catch (err) {
        console.error("Failed to init Jitsi:", err);
      }
    };

    const handleMeetingEnd = () => {
      console.log("Meeting ended - showing feedback modal");
      console.log("Partner info for feedback:", partnerInfo);
      setShowFeedbackModal(true);
    };

    initJitsi();

    return () => {
      if (apiRef.current) {
        apiRef.current.removeListener('videoConferenceLeft', handleMeetingEnd);
        apiRef.current.removeListener('readyToClose', handleMeetingEnd);
        apiRef.current.dispose();
      }
    };
  }, [location.search]);

  const closeWindow = () => {
    window.close();
  };

  const handleFeedbackSubmit = async () => {
    if (!rating) { 
      alert('Please select a rating first'); 
      return; 
    }
    
    if (!partnerInfo) {
      alert('Partner information not available');
      return;
    }

    console.log("Submitting feedback for partner:", partnerInfo);

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        'http://localhost:5000/api/profile/feedback',
        { 
          receiver_id: partnerInfo.id, 
          rating: Number(rating), 
          message,
          is_recommended: isRecommended
        },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      if (response.data.success) {
        setRating(0);
        setHoverRating(0);
        setMessage('');
        setIsRecommended(false);
        alert('Thank you for your feedback!');
        setShowFeedbackModal(false);
      
        setTimeout(closeWindow, 500);
      }
    } catch (err) {
      console.error('Feedback submission error:', err);
      alert(`Failed to submit feedback: ${err.response?.data?.error || err.message}`);
      setIsSubmitting(false);
    }
  };

  const handleSkipFeedback = () => {
    setShowFeedbackModal(false);
    closeWindow();
  };

  const handleCloseModal = () => {
    setShowFeedbackModal(false);
    closeWindow();
  };

  const handleReportSubmit = async () => {
    if (!reportType) {
      alert('Please select a report type');
      return;
    }

    if (!reportDescription.trim()) {
      alert('Please provide details about the report');
      return;
    }

    setIsSubmittingReport(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        'http://localhost:5000/api/reports',
        { 
          reported_user_id: partnerInfo.id, 
          report_type: reportType,
          description: reportDescription
        },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      if (response.data.success) {
        alert('Thank you for your report. We will review it shortly.');
        setReportType("");
        setReportDescription("");
        setShowReportModal(false);
        setShowFeedbackModal(true); // Return to feedback modal
      }
    } catch (err) {
      console.error('Report submission error:', err);
      alert(`Failed to submit report: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <>
      <div ref={containerRef} style={{ height: "100vh", width: "100%" }} />
      
      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="feedback-modal-overlay">
          <div className="feedback-modal-content">
            <button className="close-modal-btn" onClick={handleCloseModal}>×</button>
            
            <div className="feedback-modal-header">
              <h2>Rate Your Session</h2>
              <p>How was your video call experience with your partner?</p>
            </div>
            
            <div className="feedback-partner-info">
              {partnerInfo?.avatar ? (
                <img 
                  src={`http://localhost:5000/uploads/${partnerInfo.avatar}`} 
                  alt={partnerInfo.username}
                  className="partner-avatar"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="partner-avatar placeholder">
                  {partnerInfo?.username?.charAt(0) || 'U'}
                </div>
              )}
              <div className="partner-details">
                <h3>{partnerInfo?.username || 'Your Partner'}</h3>
                <span className="session-completed">Session Completed</span>
                {/* Add Report Button */}
                <button 
                  className="report-user-btn"
                  onClick={() => {
                    setShowFeedbackModal(false);
                    setShowReportModal(true);
                  }}
                >
                  Report User
                </button>
              </div>
            </div>

            <div className="feedback-form">
              <div className="rating-section">
                <label>Rate your experience with {partnerInfo?.username || 'your partner'}:</label>
                <div className="rating-stars">
                  {[1, 2, 3, 4, 5].map(star => (
                    <span 
                      key={star}
                      className={`star ${star <= (hoverRating || rating) ? 'active' : ''}`}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                    >
                      {star <= (hoverRating || rating) ? '★' : '☆'}
                    </span>
                  ))}
                </div>
                <span className="rating-text">
                  {rating ? `${rating} star${rating !== 1 ? 's' : ''}` : 'Click stars to rate'}
                </span>
              </div>

              {/* Recommended Checkbox */}
              <div className="recommended-section">
                <label className="recommended-checkbox">
                  <input
                    type="checkbox"
                    checked={isRecommended}
                    onChange={(e) => setIsRecommended(e.target.checked)}
                    className="recommended-input"
                  />
                  <span className="checkmark"></span>
                  I recommend {partnerInfo?.username || 'this partner'}
                </label>
              </div>

              <div className="message-section">
                <label>Share your feedback about {partnerInfo?.username || 'your partner'} (optional):</label>
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`What did you enjoy about the session with ${partnerInfo?.username || 'your partner'}? Any suggestions for improvement?`}
                  rows={4}
                  className="feedback-textarea"
                />
              </div>

              <div className="feedback-actions">
                <button 
                  onClick={handleSkipFeedback}
                  className="skip-btn"
                  disabled={isSubmitting}
                >
                  Skip Feedback
                </button>
                <button 
                  onClick={handleFeedbackSubmit}
                  disabled={!rating || isSubmitting}
                  className="submit-feedback-btn"
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner"></span> Submitting...
                    </>
                  ) : (
                    'Submit Feedback'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="feedback-modal-overlay">
          <div className="feedback-modal-content report-modal">
            <button className="close-modal-btn" onClick={() => {
              setShowReportModal(false);
              setShowFeedbackModal(true);
            }}>×</button>
            
            <div className="feedback-modal-header">
              <h2>Report User</h2>
              <p>Help us maintain a safe community by reporting inappropriate behavior</p>
            </div>
            
            <div className="feedback-partner-info">
              {partnerInfo?.avatar ? (
                <img 
                  src={`http://localhost:5000/uploads/${partnerInfo.avatar}`} 
                  alt={partnerInfo.username}
                  className="partner-avatar"
                />
              ) : (
                <div className="partner-avatar placeholder">
                  {partnerInfo?.username?.charAt(0) || 'U'}
                </div>
              )}
              <div className="partner-details">
                <h3>{partnerInfo?.username || 'Your Partner'}</h3>
                <span className="session-completed">Reporting this user</span>
              </div>
            </div>

            <div className="report-form">
              <div className="report-section">
                <label>What would you like to report?</label>
                <div className="report-types">
                  {REPORT_TYPES.map(type => (
                    <label key={type} className="report-type-option">
                      <input
                        type="radio"
                        name="reportType"
                        value={type}
                        checked={reportType === type}
                        onChange={(e) => setReportType(e.target.value)}
                      />
                      <span className="checkmark"></span>
                      {type}
                    </label>
                  ))}
                </div>
              </div>

              <div className="message-section">
                <label>Please provide details about the issue:</label>
                <textarea 
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Please describe what happened in detail. This helps us take appropriate action."
                  rows={4}
                  className="feedback-textarea"
                />
              </div>

              <div className="feedback-actions">
                <button 
                  onClick={() => {
                    setShowReportModal(false);
                    setShowFeedbackModal(true);
                  }}
                  className="skip-btn"
                  disabled={isSubmittingReport}
                >
                  Back to Feedback
                </button>
                <button 
                  onClick={handleReportSubmit}
                  disabled={!reportType || !reportDescription.trim() || isSubmittingReport}
                  className="submit-report-btn"
                >
                  {isSubmittingReport ? (
                    <>
                      <span className="spinner"></span> Submitting Report...
                    </>
                  ) : (
                    'Submit Report'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Videocall;
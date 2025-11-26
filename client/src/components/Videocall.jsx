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
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [partnerInfo, setPartnerInfo] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecommended, setIsRecommended] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  
  // Report states
  const [reportType, setReportType] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const API_BASE_URL = process.env.REACT_APP_API_URL;

  const REPORT_TYPES = [
    "Inappropriate Behavior",
    "Harassment",
    "Spam",
    "False Information",
    "Technical Issues",
    "No Show/Unreliable",
    "Other"
  ];

  const ALLOWED_FILE_TYPES = [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'video/mp4',
    'video/avi',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  const getAvatarUrl = (avatar) => {
    if (!avatar) return null;
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar;
    return `${API_BASE_URL}/uploads/${avatar}`;
  };

  useEffect(() => {
    const initJitsi = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Authentication token not found.");
        
        const profileRes = await axios.get(`${API_BASE_URL}/api/profile/me`, {
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

        const res = await axios.post(`${API_BASE_URL}/api/jitsi/token`, {
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
              'mute-video-everyone', 'invite',
            ],
          },
        });

        // Add event listener for invite button
        apiRef.current.addListener('toolbarButtonClicked', (button) => {
          if (button.buttonName === 'invite') {
            handleInviteClick();
          }
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

    const handleInviteClick = () => {
      const currentUrl = window.location.href;
      setInviteLink(currentUrl);
      setShowInviteModal(true);
    };

    initJitsi();

    return () => {
      if (apiRef.current) {
        apiRef.current.removeListener('toolbarButtonClicked', handleInviteClick);
        apiRef.current.removeListener('videoConferenceLeft', handleMeetingEnd);
        apiRef.current.removeListener('readyToClose', handleMeetingEnd);
        apiRef.current.dispose();
      }
    };
  }, [location.search]);

  const closeWindow = () => {
    window.close();
  };

  const handleCopyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy invite link:', err);
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleShareInvite = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my video call on PeerFusion',
          text: `Join me for a video call on PeerFusion!`,
          url: inviteLink,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      handleCopyInviteLink();
    }
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
        `${API_BASE_URL}/api/profile/feedback`,
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

  // File handling functions
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = [];
    const errors = [];

    files.forEach(file => {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type`);
        return;
      }
      
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large (max 50MB)`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      alert('Some files were rejected:\n' + errors.join('\n'));
    }

    if (validFiles.length > 0) {
      setEvidenceFiles(prev => [...prev, ...validFiles]);
    }

    // Reset file input
    event.target.value = '';
  };

  const removeFile = (index) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[index];
      return newProgress;
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.startsWith('video/')) return '🎥';
    if (file.type === 'application/pdf') return '📄';
    return '📎';
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
      const formData = new FormData();
      const payload = {
      reported_user_id: partnerInfo.id,
      report_type: reportType,
      description: reportDescription,
      source: 'video_call'
    };
      // Add report data
      formData.append('reported_user_id', partnerInfo.id);
      formData.append('report_type', reportType);
      formData.append('description', reportDescription);
      formData.append('source', 'video_call');
      
      // Add evidence files
      evidenceFiles.forEach(file => {
        formData.append('evidence', file);
      });

      const response = await axios.post(
        `${API_BASE_URL}/api/reports`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(prev => ({ ...prev, overall: progress }));
            }
          }
        }
      );

      if (response.data.success) {
        alert('Thank you for your report. We will review it shortly.');
        setReportType("");
        setReportDescription("");
        setEvidenceFiles([]);
        setUploadProgress({});
        setShowReportModal(false);
        setShowFeedbackModal(true);
      }
    } catch (err) {
      console.error('Report submission error:', err);
      alert(`Failed to submit report: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSubmittingReport(false);
      setUploadProgress({});
    }
  };

  return (
    <>
      <div ref={containerRef} style={{ height: "100vh", width: "100%" }} />
      
      {/* Invite Modal */}
      {showInviteModal && (
        <div className="feedback-modal-overlay">
          <div className="feedback-modal-content invite-modal">
            <button className="close-modal-btn" onClick={() => setShowInviteModal(false)}>×</button>
            
            <div className="feedback-modal-header">
              <h2>Invite Others</h2>
              <p>Share this link to invite others to join your video call</p>
            </div>
            
            <div className="invite-section">
              <div className="invite-link-container">
                <input 
                  type="text" 
                  value={inviteLink} 
                  readOnly 
                  className="invite-link-input"
                  onClick={(e) => e.target.select()}
                />
                <button 
                  onClick={handleCopyInviteLink}
                  className={`copy-invite-btn ${isCopied ? 'copied' : ''}`}
                >
                  {isCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              
              <div className="invite-actions">
                <button 
                  onClick={handleShareInvite}
                  className="share-invite-btn"
                >
                  Share via...
                </button>
                <button 
                  onClick={() => setShowInviteModal(false)}
                  className="close-invite-btn"
                >
                  Close
                </button>
              </div>
              
              <div className="invite-note">
                <p>Anyone with this link can join your video call session.</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
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
                  src={getAvatarUrl(partnerInfo.avatar)} 
                  alt={partnerInfo.username}
                  className="partner-avatar"
                  onError={(e) => {
                    console.error('Failed to load avatar:', partnerInfo.avatar);
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className="partner-avatar placeholder"
                style={{ display: partnerInfo?.avatar ? 'none' : 'flex' }}
              >
                {partnerInfo?.username?.charAt(0)?.toUpperCase() || 'U'}
              </div>
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
                  src={getAvatarUrl(partnerInfo.avatar)} 
                  alt={partnerInfo.username}
                  className="partner-avatar"
                  onError={(e) => {
                    console.error('Failed to load avatar:', partnerInfo.avatar);
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className="partner-avatar placeholder"
                style={{ display: partnerInfo?.avatar ? 'none' : 'flex' }}
              >
                {partnerInfo?.username?.charAt(0)?.toUpperCase() || 'U'}
              </div>
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

              {/* Evidence Upload Section */}
              <div className="evidence-section">
                <label>Upload Evidence (Optional)</label>
                <p className="evidence-help">
                  You can upload screenshots, photos, videos, or documents that support your report.
                  Maximum file size: 50MB. Allowed types: Images, Videos, PDFs, Documents.
                </p>
                
                <div className="evidence-upload-area">
                  <input
                    type="file"
                    id="evidence-upload"
                    multiple
                    accept=".jpg,.jpeg,.png,.gif,.mp4,.avi,.pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    className="evidence-file-input"
                  />
                  <label htmlFor="evidence-upload" className="evidence-upload-label">
                    <div className="upload-icon">📎</div>
                    <div className="upload-text">
                      <strong>Click to upload evidence</strong>
                      <span>or drag and drop files here</span>
                    </div>
                  </label>
                </div>

                {/* Upload Progress */}
                {uploadProgress.overall > 0 && uploadProgress.overall < 100 && (
                  <div className="upload-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${uploadProgress.overall}%` }}
                      ></div>
                    </div>
                    <span className="progress-text">Uploading: {uploadProgress.overall}%</span>
                  </div>
                )}

                {/* File List */}
                {evidenceFiles.length > 0 && (
                  <div className="evidence-file-list">
                    <h4>Selected Files ({evidenceFiles.length})</h4>
                    {evidenceFiles.map((file, index) => (
                      <div key={index} className="evidence-file-item">
                        <div className="file-info">
                          <span className="file-icon">{getFileIcon(file)}</span>
                          <div className="file-details">
                            <span className="file-name">{file.name}</span>
                            <span className="file-size">{formatFileSize(file.size)}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="remove-file-btn"
                          title="Remove file"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                    `Submit Report ${evidenceFiles.length > 0 ? `(${evidenceFiles.length} files)` : ''}`
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
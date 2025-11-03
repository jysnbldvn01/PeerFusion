import React, { useState, useEffect } from 'react';
import { FaGavel, FaUpload, FaExclamationTriangle, FaInfoCircle, FaClock, FaCheck, FaTimes, FaEye, FaUserSlash, FaHistory } from 'react-icons/fa';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../css/appealpage.css';

const AppealPage = () => {
  const [appealType, setAppealType] = useState('');
  const [reason, setReason] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [userStatus, setUserStatus] = useState('active');
  const [strikeCount, setStrikeCount] = useState(0);
  const [userAppeals, setUserAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [prefilledData, setPrefilledData] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [hasPendingAppeal, setHasPendingAppeal] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchUserData();
    fetchUserAppeals();
    checkUrlParams();
  }, []);

  const checkUrlParams = () => {
    const type = searchParams.get('type');
    const reportId = searchParams.get('reportId');
    const strikeId = searchParams.get('strikeId');
    
    if (type) {
      // Only set appeal type from URL if it's valid for current user status
      if (isAppealTypeValid(type)) {
        setAppealType(type);
        setPrefilledData({
          type: type,
          reportId: reportId,
          strikeId: strikeId
        });
      }
    }
  };

  const isAppealTypeValid = (type) => {
    switch (type) {
      case 'account_reactivation':
        return userStatus === 'suspended' || userStatus === 'banned';
      case 'strike_removal':
        return strikeCount > 0;
      case 'content_review':
        return true;
      default:
        return false;
    }
  };

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('User profile data:', data);
        
        setUserStatus(data.status || 'active');
        setStrikeCount(data.strike_count || 0);
        setUserProfile(data);
        
        // Don't auto-set appeal type - let user choose based on their status
        const typeFromUrl = searchParams.get('type');
        if (!typeFromUrl) {
          // Only suggest appeal types, don't auto-select
          console.log('User status:', data.status, 'Strike count:', data.strike_count);
        }
      } else {
        console.error('Failed to fetch user profile');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchUserAppeals = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/appeals/my-appeals`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setUserAppeals(data.appeals);
        // Check if user has any pending appeals
        const pendingAppeals = data.appeals.filter(appeal => appeal.status === 'pending');
        setHasPendingAppeal(pendingAppeals.length > 0);
      }
    } catch (error) {
      console.error('Error fetching user appeals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter(file => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/avi', 'application/pdf'];
      const isValidType = allowedTypes.includes(file.type);
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB limit
      
      if (!isValidType) {
        window.pfToast?.error?.(`${file.name}: Invalid file type. Only images, videos, and PDFs are allowed.`);
      }
      if (!isValidSize) {
        window.pfToast?.error?.(`${file.name}: File too large. Maximum size is 50MB.`);
      }
      
      return isValidType && isValidSize;
    });

    setEvidenceFiles(prev => [...prev, ...validFiles]);
    event.target.value = '';
  };

  const removeFile = (index) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!appealType || !reason.trim()) {
    window.pfToast?.error?.('Please select an appeal type and provide a reason.');
    return;
  }

  if (!isAppealTypeValid(appealType)) {
    let errorMessage = '';
    switch (appealType) {
      case 'account_reactivation':
        errorMessage = 'Account reactivation appeals are only available for suspended or banned accounts.';
        break;
      case 'strike_removal':
        errorMessage = 'Strike removal appeals are only available when you have active strikes.';
        break;
      default:
        errorMessage = 'This appeal type is not available for your current account status.';
    }
    window.pfToast?.error?.(errorMessage);
    return;
  }

  if (hasPendingAppeal) {
    window.pfToast?.error?.('You already have a pending appeal. Please wait for it to be reviewed before submitting another.');
    return;
  }

  setSubmitting(true);
  try {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    
    // Add required fields
    formData.append('appeal_type', appealType);
    formData.append('reason', reason);

    // Add optional report_id if available
    const reportId = searchParams.get('reportId');
    if (reportId) {
      formData.append('report_id', reportId);
    }

    // Add evidence files with proper field name
    evidenceFiles.forEach((file) => {
      formData.append('evidence_files', file);
    });

    console.log('Submitting user appeal with data:', {
      appeal_type: appealType,
      reason: reason,
      report_id: reportId,
      files_count: evidenceFiles.length,
      user_status: userStatus,
      strike_count: strikeCount
    });

    const response = await fetch(`${API_BASE}/appeals/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    // Check if response is OK before trying to parse as JSON
    if (!response.ok) {
      let errorMessage = `Server error: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (parseError) {
        try {
          const text = await response.text();
          if (text && !text.startsWith('<!DOCTYPE')) {
            errorMessage = text;
          }
        } catch (textError) {
          console.warn('Could not read error response:', textError);
        }
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('Server response:', data);

    if (data.success) {
      window.pfToast?.success?.('Appeal submitted successfully!');
      setAppealType('');
      setReason('');
      setEvidenceFiles([]);
      setPrefilledData(null);
      setHasPendingAppeal(true); // User now has a pending appeal
      fetchUserAppeals();
      fetchUserData();
      navigate('/appeal', { replace: true });
    } else {
      throw new Error(data.error || data.message || 'Failed to submit appeal');
    }
  } catch (error) {
    console.error('Error submitting appeal:', error);
    
    let userMessage = error.message;
    if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
      userMessage = 'Network error. Please check your connection and try again.';
    } else if (error.message.includes('500')) {
      userMessage = 'Server error. Please try again later.';
    } else if (error.message.includes('400')) {
      userMessage = error.message.replace('Server error: 400 Bad Request - ', '');
    } else if (error.message.includes('404')) {
      userMessage = 'Appeal submission endpoint not found. Please contact support.';
    }
    
    window.pfToast?.error?.(userMessage);
  } finally {
    setSubmitting(false);
  }
};

  const getAppealTypeDescription = (type) => {
    switch (type) {
      case 'account_reactivation':
        return 'Appeal to reactivate your suspended or banned account';
      case 'strike_removal':
        return 'Appeal to remove a strike from your account';
      case 'content_review':
        return 'Appeal a content removal or report decision';
      default:
        return '';
    }
  };

  const getAppealTypeOptions = () => {
    const options = [
      { value: '', label: 'Select appeal type', disabled: false }
    ];

    // Only show account reactivation if user is suspended/banned
    if (userStatus === 'suspended' || userStatus === 'banned') {
      options.push({
        value: 'account_reactivation',
        label: `Account Reactivation (Your account is ${userStatus})`,
        disabled: false
      });
    } else {
      options.push({
        value: 'account_reactivation',
        label: 'Account Reactivation (Your account is active)',
        disabled: true
      });
    }

    // Only show strike removal if user has strikes
    if (strikeCount > 0) {
      options.push({
        value: 'strike_removal',
        label: `Strike Removal (You have ${strikeCount} strike${strikeCount > 1 ? 's' : ''})`,
        disabled: false
      });
    } else {
      options.push({
        value: 'strike_removal',
        label: 'Strike Removal (No strikes to remove)',
        disabled: true
      });
    }

    // Content review is always available
    options.push({
      value: 'content_review',
      label: 'Content Review',
      disabled: false
    });

    return options;
  };

  const getStatusBadge = (status) => {
    const statusClass = `peerfusion-appeal-status-badge peerfusion-status-${status}`;
    
    const statusIcons = {
      pending: FaClock,
      under_review: FaEye,
      approved: FaCheck,
      rejected: FaTimes
    };
    
    const IconComponent = statusIcons[status] || FaClock;
    
    return (
      <span className={statusClass}>
        <IconComponent style={{ fontSize: '10px' }} />
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getAccountStatusBadge = (status) => {
    const statusClass = `peerfusion-account-status peerfusion-account-${status}`;
    
    const statusIcons = {
      active: FaCheck,
      warning: FaExclamationTriangle,
      suspended: FaUserSlash,
      banned: FaExclamationTriangle
    };
    
    const IconComponent = statusIcons[status] || FaInfoCircle;
    
    return (
      <span className={statusClass}>
        <IconComponent style={{ fontSize: '10px' }} />
        {status}
      </span>
    );
  };

  const renderPrefillStatus = () => {
    if (!prefilledData) return null;
    
    let message = 'Form pre-filled based on your notification.';
    if (prefilledData.reportId) message += ` Reporting case: #${prefilledData.reportId}`;
    if (prefilledData.strikeId) message += ` Strike: #${prefilledData.strikeId}`;
    
    return (
      <div className="peerfusion-appeal-prefill-banner">
        <FaInfoCircle />
        <span>{message}</span>
      </div>
    );
  };

  const generateAutoReason = () => {
    let autoReason = '';
    const reportId = searchParams.get('reportId');
    const strikeId = searchParams.get('strikeId');

    switch(appealType) {
      case 'strike_removal':
        autoReason = `I would like to appeal the strike on my account. `;
        if (strikeId) autoReason += `This is regarding strike #${strikeId}. `;
        autoReason += `I believe this strike was issued in error because...`;
        break;
      case 'account_reactivation':
        autoReason = `I would like to appeal my account ${userStatus} status. `;
        autoReason += `I believe my account should be reactivated because...`;
        break;
      case 'content_review':
        autoReason = `I would like to appeal the content removal decision. `;
        if (reportId) autoReason += `This is regarding report #${reportId}. `;
        autoReason += `I believe this action was incorrect because...`;
        break;
      default:
        autoReason = '';
    }
    
    setReason(autoReason);
  };

  useEffect(() => {
    if (appealType && !reason) {
      generateAutoReason();
    }
  }, [appealType]);

  const renderAccountStatus = () => {
    return (
      <div className="peerfusion-appeal-card">
        <div className="peerfusion-appeal-card-header">
          <h3 className="peerfusion-appeal-card-title">
            <FaUserSlash />
            Account Status
          </h3>
        </div>
        <div className="peerfusion-appeal-card-body">
          <div className="peerfusion-account-status-display">
            <div className="peerfusion-account-status-main">
              {getAccountStatusBadge(userStatus)}
              <div className="peerfusion-account-status-details">
                <p>
                  <strong>Current Status:</strong> {userStatus.charAt(0).toUpperCase() + userStatus.slice(1)}
                </p>
                <p>
                  <strong>Strike Count:</strong> {strikeCount} / 3
                </p>
                {userStatus === 'suspended' && userProfile?.suspended_until && (
                  <p>
                    <strong>Suspended Until:</strong> {new Date(userProfile.suspended_until).toLocaleDateString()}
                  </p>
                )}
                {userStatus === 'banned' && (
                  <p>
                    <strong>Account Permanently Banned</strong>
                  </p>
                )}
                {hasPendingAppeal && (
                  <p style={{ color: '#d97706', fontWeight: '600' }}>
                    <strong>⚠ You have a pending appeal</strong>
                  </p>
                )}
              </div>
            </div>
            
            <div className="peerfusion-strike-progress">
              <div className="peerfusion-strike-progress-bar">
                <div 
                  className={`peerfusion-strike-progress-fill ${strikeCount >= 3 ? 'full' : strikeCount >= 2 ? 'warning' : strikeCount >= 1 ? 'caution' : 'safe'}`}
                  style={{ width: `${(strikeCount / 3) * 100}%` }}
                ></div>
              </div>
              <div className="peerfusion-strike-progress-labels">
                <span>0 - Safe</span>
                <span>1 - Warning</span>
                <span>2 - Final Warning</span>
                <span>3 - Suspension/Ban</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAppealHistory = () => {
    return (
      <div className="peerfusion-appeal-history-container">
        <div className="peerfusion-appeal-history-header">
          <h3 className="peerfusion-appeal-history-title">
            <FaHistory />
            Your Appeal History
          </h3>
        </div>
        <div className="peerfusion-appeal-history-content">
          <div className="peerfusion-appeal-history-scroll">
            {loading ? (
              <div className="peerfusion-appeal-loading">
                <div className="peerfusion-appeal-loading-spinner"></div>
                <p>Loading your appeals...</p>
              </div>
            ) : userAppeals.length === 0 ? (
              <div className="peerfusion-appeal-empty">
                <FaGavel />
                <h4>No appeals submitted</h4>
                <p>Your appeal history will appear here</p>
              </div>
            ) : (
              <div className="peerfusion-appeal-history-items">
                {userAppeals.map(appeal => (
                  <div key={appeal.id} className="peerfusion-appeal-history-item">
                    <div className="peerfusion-appeal-history-header-inner">
                      <div style={{ flex: 1 }}>
                        <div className="peerfusion-appeal-type-badge">
                          {appeal.appeal_type.replace('_', ' ')}
                        </div>
                        <div className="peerfusion-appeal-reason">
                          {appeal.reason.length > 100 ? `${appeal.reason.substring(0, 100)}...` : appeal.reason}
                        </div>
                        {appeal.report_type && (
                          <div className="peerfusion-appeal-report-reference">
                            Related to: {appeal.report_type}
                          </div>
                        )}
                      </div>
                      {getStatusBadge(appeal.status)}
                    </div>
                    
                    <div className="peerfusion-appeal-history-footer">
                      <span>Submitted: {new Date(appeal.created_at).toLocaleDateString()}</span>
                      {appeal.reviewed_at && (
                        <span>Reviewed: {new Date(appeal.reviewed_at).toLocaleDateString()}</span>
                      )}
                    </div>

                    {appeal.resolution_notes && (
                      <div className="peerfusion-appeal-resolution">
                        <strong>Resolution Notes:</strong> {appeal.resolution_notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const appealTypeOptions = getAppealTypeOptions();

  return (
    <div className="peerfusion-appeal-container">
      {/* Header */}
      <div className="peerfusion-appeal-header">
        <div className="peerfusion-appeal-header-content">
          <div className="peerfusion-appeal-title-section">
            <FaGavel className="peerfusion-appeal-header-icon" />
            <div>
              <h1 className="peerfusion-appeal-main-title">Appeal Center</h1>
              <p className="peerfusion-appeal-subtitle">Submit and track your appeals</p>
            </div>
          </div>
          <div className="peerfusion-appeal-stats-section">
            <div className="peerfusion-appeal-stat-card">
              <FaGavel />
              <div>
                <div className="peerfusion-appeal-stat-number">{userAppeals.length}</div>
                <div className="peerfusion-appeal-stat-label">Your Appeals</div>
              </div>
            </div>
            <div className="peerfusion-appeal-stat-card">
              <FaExclamationTriangle />
              <div>
                <div className="peerfusion-appeal-stat-number">{strikeCount}</div>
                <div className="peerfusion-appeal-stat-label">Strikes</div>
              </div>
            </div>
            <div className="peerfusion-appeal-stat-card">
              <FaUserSlash />
              <div>
                <div className="peerfusion-appeal-stat-number">
                  {userStatus === 'active' ? 'Active' : userStatus === 'warning' ? 'Warning' : userStatus === 'suspended' ? 'Suspended' : 'Banned'}
                </div>
                <div className="peerfusion-appeal-stat-label">Status</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="peerfusion-appeal-content">
        {/* Left Column */}
        <div className="peerfusion-appeal-left-column">
          {/* Account Status */}
          {renderAccountStatus()}

          {/* Appeal History - Fixed Scrollable Container */}
          {renderAppealHistory()}
        </div>

        {/* Right Column - Appeal Form */}
        <div className="peerfusion-appeal-right-column">
          {/* Appeal Form */}
          <div className="peerfusion-appeal-card">
            <div className="peerfusion-appeal-card-header">
              <h3 className="peerfusion-appeal-card-title">Submit New Appeal</h3>
              {hasPendingAppeal && (
                <div className="peerfusion-appeal-prefill-banner" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                  <FaInfoCircle />
                  <span>You have a pending appeal. Please wait for it to be reviewed before submitting another.</span>
                </div>
              )}
              {renderPrefillStatus()}
            </div>
            <div className="peerfusion-appeal-card-body">
              <form onSubmit={handleSubmit}>
                <div className="peerfusion-appeal-form-group">
                  <label className="peerfusion-appeal-form-label">
                    <FaGavel />
                    Appeal Type
                  </label>
                  <select
                    className="peerfusion-appeal-select"
                    value={appealType}
                    onChange={(e) => setAppealType(e.target.value)}
                    required
                    disabled={hasPendingAppeal}
                  >
                    {appealTypeOptions.map(option => (
                      <option 
                        key={option.value} 
                        value={option.value} 
                        disabled={option.disabled}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {appealType && (
                    <div className="peerfusion-appeal-description">
                      {getAppealTypeDescription(appealType)}
                      {prefilledData && (
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#1e5414' }}>
                          <strong>Context:</strong> {prefilledData.type.replace('_', ' ')} appeal
                          {prefilledData.reportId && ` for report #${prefilledData.reportId}`}
                          {prefilledData.strikeId && ` regarding strike #${prefilledData.strikeId}`}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="peerfusion-appeal-form-group">
                  <label className="peerfusion-appeal-form-label">
                    <FaEye />
                    Reason for Appeal
                  </label>
                  <textarea
                    className="peerfusion-appeal-textarea"
                    placeholder="Please provide a detailed explanation for your appeal..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows="6"
                    required
                    disabled={hasPendingAppeal}
                  />
                  <div className="peerfusion-appeal-hint">
                    Be specific about why you believe the action was incorrect. Include any relevant context or evidence.
                  </div>
                </div>

                <div className="peerfusion-appeal-form-group">
                  <label className="peerfusion-appeal-form-label">
                    <FaUpload />
                    Evidence (Optional)
                  </label>
                  <div className="peerfusion-appeal-upload-area">
                    <input
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.gif,.mp4,.avi,.pdf"
                      onChange={handleFileSelect}
                      id="evidence-upload"
                      disabled={hasPendingAppeal}
                    />
                    <label htmlFor="evidence-upload" className="peerfusion-appeal-upload-content">
                      <FaUpload />
                      <div className="peerfusion-appeal-upload-text">
                        <strong>Click to upload evidence</strong>
                      </div>
                      <div className="peerfusion-appeal-upload-subtext">
                        Images, videos, or PDFs (max 50MB each)
                      </div>
                    </label>
                  </div>

                  {evidenceFiles.length > 0 && (
                    <div className="peerfusion-appeal-file-list">
                      <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Selected Files ({evidenceFiles.length}):</h4>
                      {evidenceFiles.map((file, index) => (
                        <div key={index} className="peerfusion-appeal-file-item">
                          <span className="peerfusion-appeal-file-name">{file.name}</span>
                          <span className="peerfusion-appeal-file-size">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="peerfusion-appeal-file-remove"
                            disabled={hasPendingAppeal}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="peerfusion-appeal-submit-btn"
                  disabled={submitting || !appealType || !reason.trim() || hasPendingAppeal}
                >
                  {hasPendingAppeal ? (
                    'Appeal Pending - Wait for Review'
                  ) : submitting ? (
                    <>
                      <div className="peerfusion-appeal-loading-spinner" style={{ 
                        width: '20px', 
                        height: '20px', 
                        display: 'inline-block',
                        marginRight: '8px'
                      }}></div>
                      Submitting...
                    </>
                  ) : (
                    'Submit Appeal'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppealPage;
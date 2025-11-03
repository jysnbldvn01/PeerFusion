import React, { useState } from 'react';
import { FaGavel, FaUpload, FaExclamationTriangle, FaInfoCircle, FaUserSlash, FaLock, FaHistory, FaUserCheck } from 'react-icons/fa';
import '../css/userappealpage.css';

const UserAppealPage = () => {
  const [formData, setFormData] = useState({
    appellant_name: '',
    appellant_email: '',
    appellant_role: 'Skill Learner',
    appeal_type: 'account_reactivation',
    reason: ''
  });
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter(file => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/avi', 'application/pdf'];
      const isValidType = allowedTypes.includes(file.type);
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB limit
      
      if (!isValidType) {
        alert(`${file.name}: Invalid file type. Only images, videos, and PDFs are allowed.`);
      }
      if (!isValidSize) {
        alert(`${file.name}: File too large. Maximum size is 50MB.`);
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
  
  if (!formData.appellant_name || !formData.appellant_email || !formData.reason.trim()) {
    alert('Please fill in all required fields.');
    return;
  }

  setSubmitting(true);
  try {
    const formDataToSend = new FormData();
    
    // Add form fields
    formDataToSend.append('appeal_type', formData.appeal_type);
    formDataToSend.append('reason', formData.reason);
    formDataToSend.append('appellant_name', formData.appellant_name);
    formDataToSend.append('appellant_email', formData.appellant_email);
    formDataToSend.append('appellant_role', formData.appellant_role);

    // Add evidence files
    evidenceFiles.forEach((file) => {
      formDataToSend.append('evidence_files', file);
    });

    console.log('Submitting public appeal:', formData);

    // Use the new public endpoint
    const response = await fetch(`${API_BASE}/appeals/public-submit`, {
      method: 'POST',
      body: formDataToSend
    });

    // Check if response is OK before trying to parse JSON
    if (!response.ok) {
      // Try to parse error as JSON, but handle HTML responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      } else {
        // Handle HTML/other responses
        const text = await response.text();
        throw new Error(`Server error: ${response.status} - ${text.substring(0, 100)}`);
      }
    }

    const data = await response.json();

    if (data.success) {
      setSubmitted(true);
      setFormData({
        appellant_name: '',
        appellant_email: '',
        appellant_role: 'Skill Learner',
        appeal_type: 'account_reactivation',
        reason: ''
      });
      setEvidenceFiles([]);
    } else {
      throw new Error(data.error || 'Failed to submit appeal');
    }
  } catch (error) {
    console.error('Error submitting appeal:', error);
    alert(`Error: ${error.message}`);
  } finally {
    setSubmitting(false);
  }
};

  if (submitted) {
    return (
      <div className="peerfusion-appeal-container">
        <div className="peerfusion-appeal-success">
          <div className="peerfusion-appeal-success-icon">
            <FaGavel />
          </div>
          <h2>Appeal Submitted Successfully!</h2>
          <p>Your appeal has been received and will be reviewed by our moderation team.</p>
          <p>We typically respond within 3-5 business days.</p>
          <button 
            onClick={() => setSubmitted(false)}
            className="peerfusion-appeal-submit-btn"
          >
            Submit Another Appeal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="peerfusion-appeal-container">
      {/* Header */}
      <div className="peerfusion-appeal-header">
        <div className="peerfusion-appeal-header-content">
          <div className="peerfusion-appeal-title-section">
            <FaGavel className="peerfusion-appeal-header-icon" />
            <div>
              <h1 className="peerfusion-appeal-main-title">Appeal Center</h1>
              <p className="peerfusion-appeal-subtitle">
                Submit an appeal for account issues, strikes, or content disputes
              </p>
            </div>
          </div>
          <div className="peerfusion-appeal-stats-section">
            <div className="peerfusion-appeal-stat-card">
              <FaUserCheck />
              <div>
                <div className="peerfusion-appeal-stat-number">General</div>
                <div className="peerfusion-appeal-stat-label">Appeals</div>
              </div>
            </div>
            <div className="peerfusion-appeal-stat-card">
              <FaExclamationTriangle />
              <div>
                <div className="peerfusion-appeal-stat-number">3-5 Days</div>
                <div className="peerfusion-appeal-stat-label">Response Time</div>
              </div>
            </div>
            <div className="peerfusion-appeal-stat-card">
              <FaHistory />
              <div>
                <div className="peerfusion-appeal-stat-number">24/7</div>
                <div className="peerfusion-appeal-stat-label">Available</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="peerfusion-appeal-content">
        {/* Left Column - Information */}
        <div className="peerfusion-appeal-left-column">
          {/* Appeal Process Info */}
          <div className="peerfusion-appeal-card">
            <div className="peerfusion-appeal-card-header">
              <h3 className="peerfusion-appeal-card-title">
                <FaInfoCircle />
                Appeal Process
              </h3>
            </div>
            <div className="peerfusion-appeal-card-body">
              <div className="peerfusion-appeal-process-steps">
                <div className="peerfusion-appeal-process-step">
                  <div className="peerfusion-appeal-step-number">1</div>
                  <div className="peerfusion-appeal-step-content">
                    <strong>Submit Appeal</strong>
                    <p>Fill out the form with your information and appeal details</p>
                  </div>
                </div>
                <div className="peerfusion-appeal-process-step">
                  <div className="peerfusion-appeal-step-number">2</div>
                  <div className="peerfusion-appeal-step-content">
                    <strong>Review Process</strong>
                    <p>Our moderation team reviews your appeal carefully</p>
                  </div>
                </div>
                <div className="peerfusion-appeal-process-step">
                  <div className="peerfusion-appeal-step-number">3</div>
                  <div className="peerfusion-appeal-step-content">
                    <strong>Decision</strong>
                    <p>You'll receive an email with the final decision</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Appeal Types Info */}
          <div className="peerfusion-appeal-card">
            <div className="peerfusion-appeal-card-header">
              <h3 className="peerfusion-appeal-card-title">
                <FaGavel />
                Appeal Types
              </h3>
            </div>
            <div className="peerfusion-appeal-card-body">
              <div className="peerfusion-appeal-types-info">
                <div className="peerfusion-appeal-type-item">
                  <strong>Account Reactivation</strong>
                  <p>For suspended or banned accounts seeking restoration</p>
                </div>
                <div className="peerfusion-appeal-type-item">
                  <strong>Strike Removal</strong>
                  <p>Appeal strikes on your account record</p>
                </div>
                <div className="peerfusion-appeal-type-item">
                  <strong>Content Review</strong>
                  <p>Dispute content removal or reporting decisions</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Appeal Form */}
        <div className="peerfusion-appeal-right-column">
          <div className="peerfusion-appeal-card">
            <div className="peerfusion-appeal-card-header">
              <h3 className="peerfusion-appeal-card-title">
                Submit Appeal Form
              </h3>
            </div>
            <div className="peerfusion-appeal-card-body">
              <form onSubmit={handleSubmit}>
                {/* Personal Information */}
                <div className="peerfusion-appeal-form-group">
                  <label className="peerfusion-appeal-form-label">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    className="peerfusion-appeal-input"
                    placeholder="Enter your full name"
                    name="appellant_name"
                    value={formData.appellant_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="peerfusion-appeal-form-group">
                  <label className="peerfusion-appeal-form-label">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    className="peerfusion-appeal-input"
                    placeholder="Enter your email address"
                    name="appellant_email"
                    value={formData.appellant_email}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="peerfusion-appeal-form-group">
                  <label className="peerfusion-appeal-form-label">
                    Account Type
                  </label>
                  <select
                    className="peerfusion-appeal-select"
                    name="appellant_role"
                    value={formData.appellant_role}
                    onChange={handleInputChange}
                  >
                    <option value="Skill Learner">Skill Learner</option>
                    <option value="Skill Sharer">Skill Sharer</option>
                    <option value="Skill Learner & Sharer">Skill Learner & Sharer</option>
                  </select>
                </div>

                {/* Appeal Details */}
                <div className="peerfusion-appeal-form-group">
                  <label className="peerfusion-appeal-form-label">
                    <FaGavel />
                    Appeal Type *
                  </label>
                  <select
                    className="peerfusion-appeal-select"
                    name="appeal_type"
                    value={formData.appeal_type}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="account_reactivation">Account Reactivation</option>
                    <option value="strike_removal">Strike Removal</option>
                    <option value="content_review">Content Review</option>
                  </select>
                  {formData.appeal_type && (
                    <div className="peerfusion-appeal-description">
                      {formData.appeal_type === 'account_reactivation' && 
                        'Appeal to reactivate your suspended or banned account'}
                      {formData.appeal_type === 'strike_removal' && 
                        'Appeal to remove strikes from your account'}
                      {formData.appeal_type === 'content_review' && 
                        'Appeal a content removal or report decision'}
                    </div>
                  )}
                </div>

                <div className="peerfusion-appeal-form-group">
                  <label className="peerfusion-appeal-form-label">
                    Reason for Appeal *
                  </label>
                  <textarea
                    className="peerfusion-appeal-textarea"
                    placeholder="Please provide a detailed explanation for your appeal..."
                    name="reason"
                    value={formData.reason}
                    onChange={handleInputChange}
                    rows="6"
                    required
                  />
                  <div className="peerfusion-appeal-hint">
                    Be specific and include all relevant details about your situation
                  </div>
                </div>

                {/* Evidence Section */}
                <div className="peerfusion-appeal-form-group">
                  <label className="peerfusion-appeal-form-label">
                    <FaUpload />
                    Supporting Evidence (Optional)
                  </label>
                  <div className="peerfusion-appeal-upload-area">
                    <input
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.gif,.mp4,.avi,.pdf"
                      onChange={handleFileSelect}
                      id="evidence-upload"
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
                      <h4 style={{ fontSize: '14px', marginBottom: '8px', color: '#374151' }}>
                        Selected Files ({evidenceFiles.length}):
                      </h4>
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
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="peerfusion-appeal-submit-btn"
                  disabled={submitting || !formData.appellant_name || !formData.appellant_email || !formData.reason.trim()}
                >
                  {submitting ? (
                    <>
                      <div className="peerfusion-appeal-loading-spinner"></div>
                      Submitting Appeal...
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

export default UserAppealPage;
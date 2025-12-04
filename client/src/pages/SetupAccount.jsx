import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiUpload, FiUser, FiAward, FiFileText, FiCalendar, FiUsers, FiLink, FiPhone, FiSave, FiX, FiClock, FiChevronRight, FiChevronLeft, FiCheck } from 'react-icons/fi';
import '../css/setup.css';

const API_BASE_URL = process.env.REACT_APP_API_URL;

const SetupAccount = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState({
    username: '',
    bio: '',
    birthday: '',
    gender: '',
    social_links: '',
    contact_number: '',
    role: 'Skill Learner',
    year_level: ''
  });
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availability, setAvailability] = useState([]);
  const [subjectCategories, setSubjectCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false);

  const navigate = useNavigate();

  const steps = [
    { id: 1, title: 'Basic Info', icon: FiUser },
    { id: 2, title: 'Subjects', icon: FiAward },
    { id: 3, title: 'Availability', icon: FiClock },
    { id: 4, title: 'Contact', icon: FiLink }
  ];

  const yearLevels = [
    'First Year',
    'Second Year',
    'Third Year',
    'Fourth Year',
    'Masteral Degree',
    'Professor',
    'Doctoral',
  ];

  const daysOfWeek = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];

  const timeOptions = [
    '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'
  ];

  // Age validation function
  const isAtLeast18YearsOld = (birthday) => {
    if (!birthday) return true; // Return true if no birthday provided (optional field)
    
    const birthDate = new Date(birthday);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= 18;
    }
    return age >= 18;
  };

  useEffect(() => {
    const checkExistingProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setHasCheckedProfile(true);
        navigate('/login');
        return;
      }

      try {
        const res = await axios.get(`${API_BASE_URL}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data?.username && res.data.username !== `User ${res.data.user_id}`) {
          console.log('Profile already exists, redirecting to /profile');
          navigate('/profile');
        } else {
          console.log('No complete profile found, continuing setup');
        }
      } catch (err) {
        // Profile doesn't exist, continue with setup
        console.log('No existing profile found, continuing with setup');
      } finally {
        setHasCheckedProfile(true);
      }
    };
    
    checkExistingProfile();
  }, [navigate]);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setIsLoadingSubjects(true);
        const res = await axios.get(`${API_BASE_URL}/api/profile/subjects`);
        console.log('Fetched subjects:', res.data);
        setSubjectCategories(res.data);
      } catch (err) {
        console.error('Error fetching subjects:', err);
        alert('Failed to load subjects. Please refresh the page.');
      } finally {
        setIsLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (form.role !== 'Skill Learner') {
      const initialAvailability = daysOfWeek.map(day => ({
        day,
        enabled: false,
        slots: [{ start: '09:00 AM', end: '10:00 AM' }]
      }));
      setAvailability(initialAvailability);
    } else {
      setAvailability([]);
    }
  }, [form.role]);

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!form.username.trim()) newErrors.username = 'Full name is required';
        if (!form.role) newErrors.role = 'Role is required';
        if (!form.year_level) newErrors.year_level = 'Year level is required';
        
        // Age validation (only if birthday is provided)
        if (form.birthday && !isAtLeast18YearsOld(form.birthday)) {
          newErrors.birthday = 'You must be at least 18 years old';
        }
        break;
      
      case 2:
        if (form.role !== 'Skill Learner' && selectedSubjects.length === 0) {
          newErrors.subjects = 'At least one subject is required for Skill Sharers';
        }
        break;
      
      case 3:
        // No validation for step 3 - it's completely optional
        break;
      
      case 4:
        // Only validate contact number for step 4
        if (!form.contact_number.trim()) {
          newErrors.contact_number = 'Contact number is required';
        } else if (!/^\+?[\d\s\-\(\)]+$/.test(form.contact_number)) {
          newErrors.contact_number = 'Please enter a valid contact number';
        }
        break;
      
      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Special handling for birthday to validate age immediately
    if (name === 'birthday' && value) {
      if (!isAtLeast18YearsOld(value)) {
        setErrors(prev => ({ ...prev, birthday: 'You must be at least 18 years old' }));
      } else {
        setErrors(prev => ({ ...prev, birthday: '' }));
      }
    }
  };

  const handleSubjectSelect = (e) => {
    const value = e.target.value;
    if (value && !selectedSubjects.includes(value)) {
      setSelectedSubjects([...selectedSubjects, value]);
      if (errors.subjects) {
        setErrors(prev => ({ ...prev, subjects: '' }));
      }
    }
    e.target.value = '';
  };

  const removeSubject = (subjectToRemove) => {
    setSelectedSubjects(selectedSubjects.filter(subject => subject !== subjectToRemove));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    setAvatarFile(file);
    if (file) {
      setAvatarPreview(URL.createObjectURL(file));
    } else {
      setAvatarPreview('');
    }
  };

  const toggleDayAvailability = (day) => {
    setAvailability(prev => prev.map(item => 
      item.day === day 
        ? { ...item, enabled: !item.enabled }
        : item
    ));
  };

  const addTimeSlot = (day) => {
    setAvailability(prev => prev.map(item => 
      item.day === day 
        ? { ...item, slots: [...item.slots, { start: '09:00 AM', end: '10:00 AM' }] }
        : item
    ));
  };

  const removeTimeSlot = (day, index) => {
    setAvailability(prev => prev.map(item => 
      item.day === day 
        ? { 
            ...item, 
            slots: item.slots.filter((_, i) => i !== index),
            enabled: item.slots.length > 1 ? item.enabled : false
          }
        : item
    ));
  };

  const updateTimeSlot = (day, index, field, value) => {
    setAvailability(prev => prev.map(item => 
      item.day === day 
        ? { 
            ...item, 
            slots: item.slots.map((slot, i) => 
              i === index ? { ...slot, [field]: value } : slot
            )
          }
        : item
    ));
  };

  const nextStep = () => {
    console.log('Next button clicked from step:', currentStep);
    
    // Validate current step before moving forward
    if (validateStep(currentStep)) {
      console.log('Step validation passed, moving to step:', currentStep + 1);
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    } else {
      console.log('Step validation failed, staying on step:', currentStep);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate ALL steps before submitting
    let allValid = true;
    let firstInvalidStep = 1;
    
    for (let step = 1; step <= steps.length; step++) {
      if (!validateStep(step)) {
        allValid = false;
        firstInvalidStep = step;
        break;
      }
    }

    if (!allValid) {
      setCurrentStep(firstInvalidStep);
      alert(`Please complete all required fields in step ${firstInvalidStep} before submitting.`);
      return;
    }

    // Final age validation check
    if (form.birthday && !isAtLeast18YearsOld(form.birthday)) {
      setCurrentStep(1);
      setErrors(prev => ({ ...prev, birthday: 'You must be at least 18 years old' }));
      alert('You must be at least 18 years old to use this platform.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in again.');
      navigate('/login');
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      
      // Ensure role value matches what home page expects
      const formWithSubjects = {
        ...form,
        subject: selectedSubjects.join(','),
        availability: form.role !== 'Skill Learner' ? JSON.stringify(availability) : '[]'
      };
      
      for (const key in formWithSubjects) {
        if (formWithSubjects[key] !== null && formWithSubjects[key] !== undefined) {
          formData.append(key, formWithSubjects[key]);
        }
      }
      
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const response = await axios.post(`${API_BASE_URL}/api/profile/setup`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.status === 200 || response.status === 201) {
        console.log('Profile setup successful!');
        navigate('/profile');
      }
    } catch (err) {
      console.error('Setup error:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        alert('Failed to save setup info: ' + (err.response?.data?.message || 'Please try again'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while checking profile
  if (!hasCheckedProfile) {
    return (
      <div className="progressive-setup-container">
        <div className="setup-header">
          <div className="header-content">
            <h1 className="setup-title">Loading...</h1>
            <p className="setup-subtitle">Checking your profile status</p>
          </div>
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="step-content">
            <h2 className="step-title">Basic Information</h2>
            <p className="step-description">Let's start with the essentials about you</p>
            
            <div className="avatar-section">
              <div className="avatar-container">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar Preview" className="avatar-image" />
                ) : (
                  <div className="avatar-placeholder">
                    <FiUser size={32} />
                  </div>
                )}
              </div>
              <label className="upload-btn">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarChange} 
                  className="upload-input" 
                />
                <FiUpload className="upload-icon" />
                <span>Upload Photo</span>
              </label>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Full name *</label>
                <input 
                  type="text" 
                  name="username" 
                  value={form.username} 
                  onChange={handleChange} 
                  placeholder="Enter your Full name" 
                  className={`form-input ${errors.username ? 'error' : ''}`}
                  required 
                />
                {errors.username && <span className="error-message">{errors.username}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <FiFileText className="label-icon" />
                  Bio
                </label>
                <textarea 
                  name="bio" 
                  value={form.bio} 
                  onChange={handleChange} 
                  placeholder="Tell us about yourself..."
                  rows="4"
                  className="form-textarea"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    <FiCalendar className="label-icon" />
                    Birthday
                  </label>
                  <input 
                    type="date" 
                    name="birthday" 
                    value={form.birthday} 
                    onChange={handleChange} 
                    className={`form-input ${errors.birthday ? 'error' : ''}`}
                    max={new Date().toISOString().split('T')[0]} // Prevent future dates
                  />
                  {errors.birthday && <span className="error-message">{errors.birthday}</span>}
                  <small className="help-text">Must be 18 years or older</small>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <FiUsers className="label-icon" />
                    Gender
                  </label>
                  <select name="gender" value={form.gender} onChange={handleChange} className="form-select">
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select name="role" value={form.role} onChange={handleChange} className={`form-select ${errors.role ? 'error' : ''}`}>
                    <option value="Skill Learner">Skill Learner</option>
                    <option value="Skill Sharer">Skill Sharer</option>
                    <option value="Skill Learner & Sharer">Skill Learner & Sharer</option>
                  </select>
                  {errors.role && <span className="error-message">{errors.role}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Year Level *</label>
                  <select name="year_level" value={form.year_level} onChange={handleChange} className={`form-select ${errors.year_level ? 'error' : ''}`}>
                    <option value="">Select Year Level</option>
                    {yearLevels.map((level, index) => (
                      <option key={index} value={level}>{level}</option>
                    ))}
                  </select>
                  {errors.year_level && <span className="error-message">{errors.year_level}</span>}
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="step-content">
            <h2 className="step-title">Subjects & Skills</h2>
            <p className="step-description">
              {form.role === 'Skill Learner' 
                ? "You can skip this if you're a Skill Learner"
                : "Select subjects you can teach or share knowledge about"
              }
            </p>

            <div className="form-group">
              <label className="form-label">
                Subjects {form.role !== 'Skill Learner' && '*'}
              </label>
              <div className="subject-container">
                {isLoadingSubjects ? (
                  <div className="loading-subjects">
                    <div className="loading-spinner"></div>
                    <span>Loading subjects...</span>
                  </div>
                ) : (
                  <>
                    <select 
                      name="subject" 
                      onChange={handleSubjectSelect}
                      disabled={form.role === 'Skill Learner'}
                      className={`subject-select ${errors.subjects ? 'error' : ''}`}
                    >
                      <option value="">Select Subject</option>
                      {subjectCategories.map(category => (
                        <optgroup key={category.id || category._id} label={category.name}>
                          {category.subjects && category.subjects.map(subject => (
                            !selectedSubjects.includes(subject.name) && (
                              <option key={subject.id || subject._id} value={subject.name}>
                                {subject.name}
                              </option>
                            )
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    {errors.subjects && <span className="error-message">{errors.subjects}</span>}
                  </>
                )}
                <div className="subjects-list">
                  {selectedSubjects.map((subject, index) => (
                    <span key={index} className="subject-tag">
                      {subject}
                      <button 
                        type="button" 
                        onClick={() => removeSubject(subject)}
                        className="remove-subject"
                      >
                        <FiX size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        if (form.role === 'Skill Learner') {
          return (
            <div className="step-content">
              <h2 className="step-title">Schedule Availability</h2>
              <p className="step-description">
                As a Skill Learner, you don't need to set availability. You'll be able to book sessions with available Skill Sharers.
              </p>
              <div className="skip-notice">
                <FiCheck className="skip-icon" />
                <span>This step is optional for Skill Learners</span>
              </div>
            </div>
          );
        }

        return (
          <div className="step-content">
            <h2 className="step-title">Schedule Availability</h2>
            <p className="step-description">
              Set your available time slots for sessions. Students will see this when requesting sessions.
            </p>
            
            <div className="availability-info">
              <FiCheck className="info-icon" />
              <span>This step is optional. You can set your availability later.</span>
            </div>
            
            <div className="availability-container">
              {availability.map((daySchedule) => (
                <div key={daySchedule.day} className={`day-availability ${daySchedule.enabled ? 'enabled' : ''}`}>
                  <div className="day-header">
                    <label className="day-checkbox">
                      <input
                        type="checkbox"
                        checked={daySchedule.enabled}
                        onChange={() => toggleDayAvailability(daySchedule.day)}
                        className="checkbox-input"
                      />
                      <span className="day-name">{daySchedule.day}</span>
                    </label>
                  </div>
                  
                  {daySchedule.enabled && (
                    <div className="time-slots">
                      {daySchedule.slots.map((slot, index) => (
                        <div key={index} className="time-slot">
                          <select
                            value={slot.start}
                            onChange={(e) => updateTimeSlot(daySchedule.day, index, 'start', e.target.value)}
                            className="time-select"
                          >
                            {timeOptions.map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                          <span className="time-separator">to</span>
                          <select
                            value={slot.end}
                            onChange={(e) => updateTimeSlot(daySchedule.day, index, 'end', e.target.value)}
                            className="time-select"
                          >
                            {timeOptions.map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                          {daySchedule.slots.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTimeSlot(daySchedule.day, index)}
                              className="remove-time-btn"
                              title="Remove time slot"
                            >
                              <FiX size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addTimeSlot(daySchedule.day)}
                        className="add-time-btn"
                      >
                        + Add Another Time
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="step-content">
            <h2 className="step-title">Contact Information</h2>
            <p className="step-description">Share how others can connect with you</p>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Social Links (one per line)</label>
                <textarea 
                  name="social_links" 
                  value={form.social_links} 
                  onChange={handleChange} 
                  placeholder="https://linkedin.com/yourprofile&#10;https://github.com/yourusername"
                  rows="3"
                  className="form-textarea"
                />
                <small className="help-text">Add one link per line</small>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <FiPhone className="label-icon" />
                  Contact Number *
                </label>
                <input 
                  type="text" 
                  name="contact_number" 
                  value={form.contact_number} 
                  onChange={handleChange} 
                  placeholder="+(63) 945189326" 
                  className={`form-input ${errors.contact_number ? 'error' : ''}`}
                  required
                />
                {errors.contact_number && <span className="error-message">{errors.contact_number}</span>}
                <small className="help-text">Required for session coordination</small>
              </div>
            </div>

            <div className="completion-section">
              <h3>Almost Done!</h3>
              <p>Review your information and click "Complete Profile Setup" to finish.</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="progressive-setup-container">
      <div className="setup-header">
        <div className="header-content">
          <h1 className="setup-title">Complete Your Profile</h1>
          <p className="setup-subtitle">Let's get to know you better</p>
        </div>
      </div>

      <div className="progress-container">
        <div className="progress-steps">
          {steps.map((step, index) => (
            <div key={step.id} className="step-indicator">
              <div className={`step-circle ${currentStep > step.id ? 'completed' : ''} ${currentStep === step.id ? 'active' : ''}`}>
                {currentStep > step.id ? <FiCheck size={16} /> : <step.icon size={16} />}
              </div>
              <span className="step-label">{step.title}</span>
              {index < steps.length - 1 && (
                <div className={`step-connector ${currentStep > step.id ? 'completed' : ''}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Using div instead of form to prevent automatic submission */}
      <div className="setup-form">
        {renderStepContent()}

        <div className="navigation-actions">
          <button 
            type="button" 
            onClick={prevStep}
            disabled={currentStep === 1}
            className="nav-btn nav-btn-secondary"
          >
            <FiChevronLeft className="nav-icon" />
            Back
          </button>

          {currentStep < steps.length ? (
            <button 
              type="button" 
              onClick={nextStep}
              className="nav-btn nav-btn-primary"
            >
              Next
              <FiChevronRight className="nav-icon" />
            </button>
          ) : (
            <button 
              type="button" 
              onClick={handleSubmit} 
              className="submit-btns" 
              disabled={isLoading}
            >
              {isLoading ? (
                'Saving...'
              ) : (
                <>
                  <FiSave className="submit-icon" />
                  Complete Profile Setup
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupAccount;
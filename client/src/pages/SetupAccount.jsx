import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiUpload, FiUser, FiAward, FiFileText, FiCalendar, FiUsers, FiLink, FiPhone, FiSave, FiX, FiClock } from 'react-icons/fi';
import '../css/setup.css';

const SetupAccount = () => {
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

  const yearLevels = [
    'First Year',
    'Second Year',
    'Third Year',
    'Fourth Year',
    'Masteral Degree',
    'Professor'
  ];

  const daysOfWeek = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];

  const timeOptions = [
    '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'
  ];

  const navigate = useNavigate();

  useEffect(() => {
    const checkExistingProfile = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await axios.get('http://localhost:5000/api/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data?.username) {
          navigate('/profile');
        }
      } catch (err) {
        // Profile doesn't exist, continue with setup
      }
    };
    checkExistingProfile();
  }, [navigate]);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/profile/subjects');
        setSubjectCategories(res.data);
      } catch (err) {
        console.error('Error fetching subjects:', err);
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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubjectSelect = (e) => {
    const value = e.target.value;
    if (value && !selectedSubjects.includes(value)) {
      setSelectedSubjects([...selectedSubjects, value]);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    setIsLoading(true);

    try {
      const formData = new FormData();
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

      await axios.post('http://localhost:5000/api/profile/setup', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      navigate('/profile');
    } catch (err) {
      console.error(err);
      alert('Failed to save setup info');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
        className="auth-container"
        style={{
          background: `url('/background.svg') no-repeat center center fixed`,
          backgroundSize: 'cover'
        }}
      >
      <div className="peerfusion-setup-card">
        <header className="peerfusion-setup-header">
          <h1 className="peerfusion-setup-title">Complete Your Profile</h1>
          <p className="peerfusion-setup-subtitle">Let's get to know you better</p>
        </header>

        <form onSubmit={handleSubmit} className="peerfusion-setup-form">
          {/* Avatar Upload Section */}
          <div className="peerfusion-avatar-section">
            <div className="peerfusion-avatar-container">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar Preview" className="peerfusion-avatar-image" />
              ) : (
                <div className="peerfusion-avatar-placeholder">
                  <FiUser size={32} />
                </div>
              )}
            </div>
            <label className="peerfusion-upload-btn">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarChange} 
                className="peerfusion-upload-input" 
              />
              <FiUpload className="peerfusion-upload-icon" />
              <span>Upload Photo</span>
            </label>
          </div>

          {/* Basic Information Section */}
          <div className="peerfusion-form-section">
            <h2 className="peerfusion-section-title">
              <FiUser className="peerfusion-section-icon" />
              Basic Information
            </h2>
            
            <div className="peerfusion-form-group">
              <label className="peerfusion-form-label">Username</label>
              <input 
                type="text" 
                name="username" 
                value={form.username} 
                onChange={handleChange} 
                placeholder="Enter your username" 
                className="peerfusion-form-input"
                required 
              />
            </div>

            <div className="peerfusion-form-group">
              <label className="peerfusion-form-label">
                <FiFileText className="peerfusion-label-icon" />
                Bio
              </label>
              <textarea 
                name="bio" 
                value={form.bio} 
                onChange={handleChange} 
                placeholder="Tell us about yourself..."
                rows="4"
                className="peerfusion-form-textarea"
              />
            </div>

            <div className="peerfusion-form-row">
              <div className="peerfusion-form-group">
                <label className="peerfusion-form-label">
                  <FiCalendar className="peerfusion-label-icon" />
                  Birthday
                </label>
                <input 
                  type="date" 
                  name="birthday" 
                  value={form.birthday} 
                  onChange={handleChange} 
                  className="peerfusion-form-input"
                />
              </div>

              <div className="peerfusion-form-group">
                <label className="peerfusion-form-label">
                  <FiUsers className="peerfusion-label-icon" />
                  Gender
                </label>
                <select name="gender" value={form.gender} onChange={handleChange} className="peerfusion-form-select">
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="peerfusion-form-row">
              <div className="peerfusion-form-group">
                <label className="peerfusion-form-label">Role</label>
                <select name="role" value={form.role} onChange={handleChange} className="peerfusion-form-select">
                  <option value="Skill Learner">Skill Learner</option>
                  <option value="Skill Sharer">Skill Sharer</option>
                  <option value="Skill Sharer & Learner">Skill Sharer & Learner</option>
                </select>
              </div>

              <div className="peerfusion-form-group">
                <label className="peerfusion-form-label">Year Level</label>
                <select name="year_level" value={form.year_level} onChange={handleChange} className="peerfusion-form-select">
                  <option value="">Select Year Level</option>
                  {yearLevels.map((level, index) => (
                    <option key={index} value={level}>{level}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Subjects Section */}
          <div className="peerfusion-form-section">
            <h2 className="peerfusion-section-title">
              <FiAward className="peerfusion-section-icon" />
              Subjects
            </h2>
            <div className="peerfusion-form-group">
              <label className="peerfusion-form-label">Subjects</label>
              <div className="peerfusion-subject-container">
                <select 
                  name="subject" 
                  onChange={handleSubjectSelect}
                  disabled={form.role === 'Skill Learner'}
                  className="peerfusion-subject-select"
                >
                  <option value="">Select Subject</option>
                  {subjectCategories.map(category => (
                    <optgroup key={category.id} label={category.name}>
                      {category.subjects.map(subject => (
                        !selectedSubjects.includes(subject.name) && (
                          <option key={subject.id} value={subject.name}>
                            {subject.name}
                          </option>
                        )
                      ))}
                    </optgroup>
                  ))}
                </select>
                <div className="peerfusion-subjects-list">
                  {selectedSubjects.map((subject, index) => (
                    <span key={index} className="peerfusion-subject-tag">
                      {subject}
                      <button 
                        type="button" 
                        onClick={() => removeSubject(subject)}
                        className="peerfusion-remove-subject"
                      >
                        <FiX size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Availability Section */}
          {form.role !== 'Skill Learner' && (
            <div className="peerfusion-form-section">
              <h2 className="peerfusion-section-title">
                <FiClock className="peerfusion-section-icon" />
                Schedule Availability
              </h2>
              <p className="peerfusion-section-description">
                Set your available time slots for sessions. Students will see this when requesting sessions.
              </p>
              
              <div className="peerfusion-availability-container">
                {availability.map((daySchedule) => (
                  <div key={daySchedule.day} className={`peerfusion-day-availability ${daySchedule.enabled ? 'enabled' : ''}`}>
                    <div className="peerfusion-day-header">
                      <label className="peerfusion-day-checkbox">
                        <input
                          type="checkbox"
                          checked={daySchedule.enabled}
                          onChange={() => toggleDayAvailability(daySchedule.day)}
                          className="peerfusion-checkbox-input"
                        />
                        <span className="peerfusion-day-name">{daySchedule.day}</span>
                      </label>
                    </div>
                    
                    {daySchedule.enabled && (
                      <div className="peerfusion-time-slots">
                        {daySchedule.slots.map((slot, index) => (
                          <div key={index} className="peerfusion-time-slot">
                            <select
                              value={slot.start}
                              onChange={(e) => updateTimeSlot(daySchedule.day, index, 'start', e.target.value)}
                              className="peerfusion-time-select"
                            >
                              {timeOptions.map(time => (
                                <option key={time} value={time}>{time}</option>
                              ))}
                            </select>
                            <span className="peerfusion-time-separator">to</span>
                            <select
                              value={slot.end}
                              onChange={(e) => updateTimeSlot(daySchedule.day, index, 'end', e.target.value)}
                              className="peerfusion-time-select"
                            >
                              {timeOptions.map(time => (
                                <option key={time} value={time}>{time}</option>
                              ))}
                            </select>
                            {daySchedule.slots.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeTimeSlot(daySchedule.day, index)}
                                className="peerfusion-remove-time-btn"
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
                          className="peerfusion-add-time-btn"
                        >
                          + Add Another Time
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact Information Section */}
          <div className="peerfusion-form-section">
            <h2 className="peerfusion-section-title">
              <FiLink className="peerfusion-section-icon" />
              Contact Information
            </h2>
            <div className="peerfusion-form-group">
              <label className="peerfusion-form-label">Social Links (one per line)</label>
              <textarea 
                name="social_links" 
                value={form.social_links} 
                onChange={handleChange} 
                placeholder="https://linkedin.com/yourprofile&#10;https://github.com/yourusername"
                rows="3"
                className="peerfusion-form-textarea"
              />
            </div>

            <div className="peerfusion-form-group">
              <label className="peerfusion-form-label">
                <FiPhone className="peerfusion-label-icon" />
                Contact Number
              </label>
              <input 
                type="text" 
                name="contact_number" 
                value={form.contact_number} 
                onChange={handleChange} 
                placeholder="+(63) 945189326" 
                className="peerfusion-form-input"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" className="peerfusion-submit-btn" disabled={isLoading}>
            {isLoading ? (
              'Saving...'
            ) : (
              <>
                <FiSave className="peerfusion-submit-icon" />
                Complete Profile Setup
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetupAccount;
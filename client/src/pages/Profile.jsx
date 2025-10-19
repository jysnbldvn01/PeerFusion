import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FiEdit, FiSave, FiX, FiUser, FiPhone, FiLink, FiClock } from 'react-icons/fi';
import '../css/profile.css';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showAvatarEdit, setShowAvatarEdit] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [subjectCategories, setSubjectCategories] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [viewAs, setViewAs] = useState(false);
  const [availability, setAvailability] = useState([]);
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

  const yearLevels = [
    'First Year',
    'Second Year',
    'Third Year',
    'Fourth Year',
    'Masteral Degree',
    'Professor'
  ];

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const timeOptions = [
    '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'
  ];

  // Availability Display Component
  const AvailabilityDisplay = ({ availability }) => {
    if (!availability || availability.length === 0) {
      return <p className="no-availability">No availability set</p>;
    }

    // Ensure we're working with a proper array and parse if needed
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

  // Availability Editor Component
  const AvailabilityEditor = ({ availability, onUpdate }) => {
    const toggleDayAvailability = (day) => {
      const newAvailability = availability.map(item => 
        item.day === day 
          ? { ...item, enabled: !item.enabled }
          : item
      );
      onUpdate(newAvailability);
    };

    const addTimeSlot = (day) => {
      const newAvailability = availability.map(item => 
        item.day === day 
          ? { ...item, slots: [...item.slots, { start: '09:00 AM', end: '10:00 AM' }] }
          : item
      );
      onUpdate(newAvailability);
    };

    const removeTimeSlot = (day, index) => {
      const newAvailability = availability.map(item => 
        item.day === day 
          ? { 
              ...item, 
              slots: item.slots.filter((_, i) => i !== index),
              enabled: item.slots.length > 1 ? item.enabled : false
            }
          : item
      );
      onUpdate(newAvailability);
    };

    const updateTimeSlot = (day, index, field, value) => {
      const newAvailability = availability.map(item => 
        item.day === day 
          ? { 
              ...item, 
              slots: item.slots.map((slot, i) => 
                i === index ? { ...slot, [field]: value } : slot
              )
            }
          : item
      );
      onUpdate(newAvailability);
    };

    return (
      <div className="availability-editor">
        <p className="availability-help">Check the days you're available and set your time slots:</p>
        {availability.map((daySchedule) => (
          <div key={daySchedule.day} className={`day-availability-editor ${daySchedule.enabled ? 'enabled' : ''}`}>
            <div className="day-header-editor">
              <label className="day-checkbox">
                <input
                  type="checkbox"
                  checked={daySchedule.enabled}
                  onChange={() => toggleDayAvailability(daySchedule.day)}
                />
                <span className="day-name">{daySchedule.day}</span>
              </label>
            </div>
            
            {daySchedule.enabled && (
              <div className="time-slots-editor">
                {daySchedule.slots.map((slot, index) => (
                  <div key={index} className="time-slot-edit">
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
    );
  };

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await axios.get('http://localhost:5000/api/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(res.data);
        
        // Improved availability parsing and initialization
        let parsedAvailability = [];
        if (res.data.availability) {
          try {
            if (typeof res.data.availability === 'string') {
              parsedAvailability = JSON.parse(res.data.availability);
            } else {
              parsedAvailability = res.data.availability;
            }
            
            // Ensure it's a proper array with the expected structure
            if (!Array.isArray(parsedAvailability) || parsedAvailability.length === 0) {
              throw new Error('Invalid availability format');
            }
          } catch (err) {
            console.error('Error parsing availability:', err);
            parsedAvailability = [];
          }
        }
        
        // If no availability exists or it's empty, initialize it based on role
        if (!parsedAvailability || parsedAvailability.length === 0) {
          if (res.data.role && res.data.role !== 'Skill Learner') {
            parsedAvailability = daysOfWeek.map(day => ({
              day,
              enabled: false,
              slots: [{ start: '09:00 AM', end: '10:00 AM' }]
            }));
          } else {
            parsedAvailability = [];
          }
        }
        
        setAvailability(parsedAvailability);

        const initialSubjects = res.data.subject ? res.data.subject.split(',') : [];
        setSelectedSubjects(initialSubjects);
        setForm({
          username: res.data.username || '',
          bio: res.data.bio || '',
          birthday: res.data.birthday || '',
          gender: res.data.gender || '',
          social_links: res.data.social_links || '',
          contact_number: res.data.contact_number || '',
          role: res.data.role || 'Skill Learner',
          year_level: res.data.year_level || ''
        });
        
        if (res.data.avatar) {
          setAvatarPreview(`http://localhost:5000/uploads/${res.data.avatar}`);
        }
      } catch (err) {
        console.error('Profile fetch error:', err);
      }
    };

    const fetchSubjects = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/profile/subjects');
        setSubjectCategories(res.data);
      } catch (err) {
        console.error('Error fetching subjects:', err);
      }
    };

    fetchProfile();
    fetchSubjects();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    
    if (name === 'role') {
      if (value === 'Skill Learner') {
        setSelectedSubjects([]);
        setAvailability([]);
      } else if (value !== 'Skill Learner' && (!availability || availability.length === 0)) {
        // Initialize availability when switching to sharer role
        const initialAvailability = daysOfWeek.map(day => ({
          day,
          enabled: false,
          slots: [{ start: '09:00 AM', end: '10:00 AM' }]
        }));
        setAvailability(initialAvailability);
      }
    }
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
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleAvatarSave = async () => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    if (avatarFile) formData.append('avatar', avatarFile);

    try {
      await axios.post('http://localhost:5000/api/profile/avatar', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setAvatarFile(null);
      setShowAvatarEdit(false);
      const res = await axios.get('http://localhost:5000/api/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(res.data);
    } catch (err) {
      console.error('Avatar update failed:', err);
    }
  };

  const updateAvailability = (newAvailability) => {
    setAvailability(newAvailability);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const formData = new FormData();
    
    const formWithSubjects = {
      ...form,
      subject: form.role === 'Skill Learner' ? '' : selectedSubjects.join(','),
      birthday: form.birthday ? new Date(form.birthday).toISOString().split('T')[0] : form.birthday,
      availability: form.role !== 'Skill Learner' ? JSON.stringify(availability) : '[]'
    };

    console.log('Form data before sending:', formWithSubjects);
    console.log('Availability being sent:', availability);

    Object.keys(formWithSubjects).forEach(key => {
      if (formWithSubjects[key] !== null && formWithSubjects[key] !== undefined) {
        formData.append(key, formWithSubjects[key]);
      }
    });

    try {
      const response = await axios.post('http://localhost:5000/api/profile/setup', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Update successful:', response.data);
      setEditMode(false);
      
      // Refresh profile data
      const res = await axios.get('http://localhost:5000/api/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(res.data);
      
      // Update availability state with the refreshed data
      if (res.data.availability) {
        try {
          const parsedAvailability = typeof res.data.availability === 'string' 
            ? JSON.parse(res.data.availability) 
            : res.data.availability;
          setAvailability(parsedAvailability);
        } catch (err) {
          console.error('Error parsing refreshed availability:', err);
        }
      }
      
      alert('Profile updated successfully!');
      
    } catch (err) {
      console.error('Update failed - Full error:', err);
      console.error('Error response data:', err.response?.data);
      alert(`Update failed: ${err.response?.data?.details || err.response?.data?.error || err.message}`);
    }
  };

  return (
    <div className="account-settings">
      <div className="settings-container">
        <div className="settings-header">
          <h2>Account Settings</h2>
          <div className="header-actions">
          <button 
            className={`view-btn ${viewAs ? 'active' : ''}`}
            onClick={() => setViewAs(!viewAs)}
          >
            View As Public
          </button>
            {editMode ? (
              <>
                <button className="cancel-btn" onClick={() => setEditMode(false)}><FiX /> Cancel</button>
                <button className="save-btn" onClick={handleSave}><FiSave /> Save Changes</button>
              </>
            ) : (
              <button className="edit-btn" onClick={() => setEditMode(true)}><FiEdit /> Edit Profile</button>
            )}
          </div>
        </div>

        <div className="settings-body">
          <div className="profile-header">
            <div className="avatar-section">
              <div
                className="avatar-wrapper"
                onMouseEnter={() => setShowAvatarEdit(true)}
                onMouseLeave={() => !avatarFile && setShowAvatarEdit(false)}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile" className="avatar" />
                ) : (
                  <div className="avatar-placeholder"><FiUser size={32} /></div>
                )}
                {showAvatarEdit && (
                  <label className="avatar-edit-icon">
                    <FiEdit className="edit-icon" />
                    <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
              {avatarFile && (
                <div className="avatar-actions">
                  <button className="avatar-save-btn" onClick={handleAvatarSave}><FiSave /> Save</button>
                  <button className="avatar-cancel-btn" onClick={() => {
                    setAvatarFile(null);
                    setAvatarPreview(profile?.avatar ? `http://localhost:5000/uploads/${profile.avatar}` : '');
                  }}><FiX /> Cancel</button>
                </div>
              )}
            </div>

            <div className="profile-header-info">
              <h1>{profile?.username || 'User'}</h1>
              <p className="profile-title">{profile?.bio || 'No bio yet'}</p>
            </div>
          </div>

          {profile && (
            <div className="profile-sections">
              <div className="profile-section">
                <h3><FiUser /> Personal Information</h3>
                {editMode ? (
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Username</label>
                      <input type="text" name="username" value={form.username} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label>Bio</label>
                      <textarea name="bio" value={form.bio} onChange={handleChange} rows="3" />
                    </div>
                    <div className="form-group">
                      <label>Birthday</label>
                      <input type="date" name="birthday" value={form.birthday?.split('T')[0]} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label>Gender</label>
                      <select name="gender" value={form.gender} onChange={handleChange}>
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Role</label>
                      <select name="role" value={form.role} onChange={handleChange}>
                        <option value="Skill Learner">Skill Learner</option>
                        <option value="Skill Sharer">Skill Sharer</option>
                        <option value="Skill Sharer & Learner">Skill Sharer & Learner</option>
                      </select>
                    </div>

                    {(form.role !== 'Skill Learner') && (
                      <div className="form-group">
                        <label>Subjects</label>
                        <select name="subject" onChange={handleSubjectSelect}>
                          <option value="">Select Subject</option>
                          {subjectCategories.map(category => (
                            <optgroup key={category.id} label={category.name}>
                              {category.subjects.map(subject => (
                                !selectedSubjects.includes(subject.name) && (
                                  <option key={subject.id} value={subject.name}>{subject.name}</option>
                                )
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <div className="selected-subjects">
                          {selectedSubjects.map((subject, i) => (
                            <span key={i} className="subject-tag">
                              {subject}
                              <button onClick={() => removeSubject(subject)} className="remove-subject">×</button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="form-group">
                      <label>Year Level</label>
                      <select name="year_level" value={form.year_level} onChange={handleChange}>
                        <option value="">Select Year Level</option>
                        {yearLevels.map((level, index) => (
                          <option key={index} value={level}>{level}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">Username</span>
                      <span className="info-value">{profile.username}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Bio</span>
                      <span className="info-value">{profile.bio || 'No bio yet'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Birthday</span>
                      <span className="info-value">{profile.birthday?.split('T')[0] || 'Not specified'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Gender</span>
                      <span className="info-value">{profile.gender || 'Not specified'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Role</span>
                      <span className="info-value">{profile.role}</span>
                    </div>
                    {(profile.role !== 'Skill Learner') && (
                      <div className="info-item">
                        <span className="info-label">Subjects</span>
                        <div className="info-value">
                          {profile.subject ? profile.subject.split(',').map((subj, i) => (
                            <span key={i} className="subject-tag">{subj.trim()}</span>
                          )) : 'Not specified'}
                        </div>
                      </div>
                    )}
                    <div className="info-item">
                      <span className="info-label">Year Level</span>
                      <span className="info-value">{profile.year_level || 'Not specified'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Schedule Availability Section */}
              {(form.role !== 'Skill Learner' || profile.role !== 'Skill Learner') && (
                <div className="profile-section">
                  <h3><FiClock /> Schedule Availability</h3>
                  {editMode ? (
                    <AvailabilityEditor 
                      availability={availability} 
                      onUpdate={updateAvailability} 
                    />
                  ) : (
                    <AvailabilityDisplay availability={availability} />
                  )}
                </div>
              )}
              
              {/* Contact Section */}
              <div className="profile-section">
                <h3><FiLink /> Contact Information</h3>
                {editMode ? (
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Social Links (one per line)</label>
                      <textarea
                        name="social_links"
                        value={form.social_links}
                        onChange={handleChange}
                        rows="3"
                      />
                    </div>
                    <div className="form-group">
                      <label><FiPhone /> Contact Number</label>
                      <input
                        type="text"
                        name="contact_number"
                        value={form.contact_number}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">Social Links</span>
                      <div className="info-value">
                        {profile.social_links ? (
                          profile.social_links.split('\n').map((link, i) => (
                            <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="social-link">
                              {link}
                            </a>
                          ))
                        ) : 'No links provided'}
                      </div>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Contact Number</span>
                      <span className="info-value">{profile.contact_number || 'Not specified'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View As Public Modal */}
      {viewAs && profile && (
        <div className="modal-overlay" onClick={() => setViewAs(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setViewAs(false)}>×</button>

            <div className="modal-avatar-container">
              {profile.avatar && (
                <img
                  src={`http://localhost:5000/uploads/${profile.avatar}`}
                  alt="Avatar"
                  className="modal-avatar"
                />
              )}
              <div className="modal-rating">⭐ {profile.rating || 'N/A'}</div>
            </div>

            <div className="modal-main">
              <h3>{profile.username}</h3>
              <p className="modal-role">{profile.role || 'N/A'}</p>
              <p className="modal-bio">{profile.bio || 'No bio yet'}</p>

              <div className="modal-section">
                <h4>Subject Expertise</h4>
                {profile.subject && profile.role !== 'Skill Learner' ? (
                  <div className="subject-tags">
                    {profile.subject.split(',').map((subject, i) => (
                      <span key={i} className="subject-tag">{subject.trim()}</span>
                    ))}
                  </div>
                ) : <p>N/A</p>}
              </div>

              <div className="modal-section">
                <h4>Year Level</h4>
                <p>{profile.year_level || 'N/A'}</p>
              </div>

              {/* Availability in Public View - Use the state availability */}
              {profile.role !== 'Skill Learner' && availability && availability.length > 0 && (
                <div className="modal-section">
                  <h4>📅 Available Times</h4>
                  <AvailabilityDisplay availability={availability} />
                </div>
              )}

              {profile.social_links && (
                <div className="modal-section">
                  <h4>Social Links</h4>
                  <div className="modal-social-links">
                    {profile.social_links.split('\n').map((link, i) => (
                      <a
                        key={i}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="modal-social-link"
                      >
                        <span className="link-icon">🔗</span>
                        <span className="link-text">{link}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="modal-section">
                <h4>Contact</h4>
                <p className="contact-info">
                  {profile.contact_number ? (
                    <a href={`tel:${profile.contact_number}`} className="contact-link">
                      📞 {profile.contact_number}
                    </a>
                  ) : 'Not provided'}
                </p>
              </div>

              <div className="modal-actions">
                <button className="schedule-btn">📅 Request Session</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
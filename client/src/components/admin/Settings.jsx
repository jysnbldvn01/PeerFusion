import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FiShield, FiUsers, FiKey, FiMail, FiUser, FiCalendar, 
  FiTrash2, FiAlertCircle, FiCheckCircle, FiEdit2, 
  FiSave, FiX, FiEye, FiEyeOff, FiRefreshCw 
} from 'react-icons/fi';
import '../../css/settings.css';
const API_BASE_URL = process.env.REACT_APP_API_URL;

export default function Settings() {
  const [activeTab, setActiveTab] = useState('moderators');
  const [changePassword, setChangePassword] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [newModerator, setNewModerator] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [moderators, setModerators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editingModerator, setEditingModerator] = useState(null);
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  

  useEffect(() => {
    if (activeTab === 'moderators') {
      fetchModerators();
    }
  }, [activeTab]);

  const fetchModerators = async () => {
    const token = localStorage.getItem('token');
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/admin/moderators`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setModerators(response.data);
    } catch (err) {
      console.error('Error fetching moderators:', err);
      setError('Failed to load moderators');
    } finally {
      setLoading(false);
    }
  };

  const generateSecurePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const handleGeneratePassword = (isEdit = false) => {
    const newPassword = generateSecurePassword();
    if (isEdit) {
      setEditForm({ ...editForm, password: newPassword });
    } else {
      setNewModerator({ ...newModerator, password: newPassword });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (changePassword.newPassword !== changePassword.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (changePassword.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      await axios.put(`${API_BASE_URL}/api/admin/change-password`, 
        {
          currentPassword: changePassword.currentPassword,
          newPassword: changePassword.newPassword
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setMessage('Password changed successfully');
      setChangePassword({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      console.error('Error changing password:', err);
      setError(err.response?.data?.error || 'Failed to change password');
    }
  };

  const handleCreateModerator = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!newModerator.username || !newModerator.email || !newModerator.password) {
      setError('All fields are required');
      return;
    }

    if (newModerator.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      await axios.post(`${API_BASE_URL}/api/admin/moderators`, 
        newModerator,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setMessage('Moderator account created successfully');
      setNewModerator({
        username: '',
        email: '',
        password: ''
      });
      fetchModerators();
    } catch (err) {
      console.error('Error creating moderator:', err);
      setError(err.response?.data?.error || 'Failed to create moderator account');
    }
  };

  const handleDeleteModerator = async (moderatorId) => {
    if (!window.confirm('Are you sure you want to permanently delete this moderator? This action cannot be undone.')) {
      return;
    }

    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API_BASE_URL}/api/admin/moderators/${moderatorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage('Moderator permanently deleted successfully');
      fetchModerators();
    } catch (err) {
      console.error('Error deleting moderator:', err);
      setError(err.response?.data?.error || 'Failed to delete moderator');
    }
  };

  const handleEditModerator = (moderator) => {
    setEditingModerator(moderator.id);
    setEditForm({
      username: moderator.username || moderator.name || '',
      email: moderator.email || '',
      password: '' // Don't pre-fill password for security
    });
    setShowEditPassword(false);
  };

  const handleCancelEdit = () => {
    setEditingModerator(null);
    setEditForm({ username: '', email: '', password: '' });
  };

  const handleUpdateModerator = async (moderatorId) => {
    setError('');
    setMessage('');

    if (!editForm.username || !editForm.email) {
      setError('Username and email are required');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      await axios.put(`${API_BASE_URL}/api/admin/moderators/${moderatorId}`, 
        editForm,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setMessage(editForm.password ? 
        'Moderator account updated with new password' : 
        'Moderator account updated successfully'
      );
      setEditingModerator(null);
      setEditForm({ username: '', email: '', password: '' });
      fetchModerators();
    } catch (err) {
      console.error('Error updating moderator:', err);
      setError(err.response?.data?.error || 'Failed to update moderator account');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="st-container">
      {/* Header */}
      <div className="st-header">
        <div className="st-header-content">
          <div className="st-title-section">
            <div className="st-header-icon">
              <FiShield />
            </div>
            <div>
              <h1 className="st-main-title">Admin Settings</h1>
              <p className="st-subtitle">Manage moderator accounts and your admin security settings</p>
            </div>
          </div>
          <div className="st-stats">
            <div className="st-stat-card">
              <FiUsers className="st-stat-icon" />
              <span className="st-stat-number">{moderators.length}</span>
              <span className="st-stat-label">Moderators</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="st-tabs">
        <button 
          className={`st-tab ${activeTab === 'moderators' ? 'st-tab-active' : ''}`}
          onClick={() => setActiveTab('moderators')}
        >
          <FiUsers className="st-tab-icon" />
          Manage Moderators
        </button>
        <button 
          className={`st-tab ${activeTab === 'security' ? 'st-tab-active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <FiKey className="st-tab-icon" />
          Admin Security
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div className="st-message-banner st-message-success">
          <FiCheckCircle className="st-message-icon" />
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="st-message-close">
            ×
          </button>
        </div>
      )}
      {error && (
        <div className="st-message-banner st-message-error">
          <FiAlertCircle className="st-message-icon" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="st-message-close">
            ×
          </button>
        </div>
      )}

      {/* Moderators Tab */}
      {activeTab === 'moderators' && (
        <div className="st-content">
          {/* Create Moderator Card */}
          <div className="st-card">
            <div className="st-card-header">
              <h2 className="st-card-title">Create New Moderator</h2>
              <div className="st-card-badge">Step 1</div>
            </div>
            <p className="st-card-description">
              Create a new moderator account. You can set the password manually or generate a secure one.
            </p>
            
            <form onSubmit={handleCreateModerator} className="st-form">
              <div className="st-form-group">
                <div className="st-input-group">
                  <FiUser className="st-input-icon" />
                  <input
                    type="text"
                    value={newModerator.username}
                    onChange={(e) => setNewModerator({...newModerator, username: e.target.value})}
                    required
                    placeholder="Enter username"
                    className="st-form-input"
                  />
                </div>
                <label className="st-form-label">Username *</label>
              </div>
              
              <div className="st-form-group">
                <div className="st-input-group">
                  <FiMail className="st-input-icon" />
                  <input
                    type="email"
                    value={newModerator.email}
                    onChange={(e) => setNewModerator({...newModerator, email: e.target.value})}
                    required
                    placeholder="Enter email address"
                    className="st-form-input"
                  />
                </div>
                <label className="st-form-label">Email *</label>
              </div>
              
              <div className="st-form-group">
                <div className="st-input-group st-password-input-group-new">
                  <FiKey className="st-input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newModerator.password}
                    onChange={(e) => setNewModerator({...newModerator, password: e.target.value})}
                    required
                    minLength="6"
                    placeholder="Set password (min. 6 characters)"
                    className="st-form-input"
                  />
                  <div className="st-password-controls-new">
                    <button
                      type="button"
                      className="st-password-toggle-new"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                    <button
                      type="button"
                      className="st-generate-password-new"
                      onClick={() => handleGeneratePassword(false)}
                      title="Generate secure password"
                    >
                      <FiRefreshCw />
                    </button>
                  </div>
                </div>
                <label className="st-form-label">Password *</label>
                {newModerator.password && (
                  <div className="st-password-strength-new">
                    Password strength: {newModerator.password.length >= 8 ? 'Strong' : newModerator.password.length >= 6 ? 'Good' : 'Weak'}
                  </div>
                )}
              </div>
              
              <button 
                type="submit" 
                className="st-btn st-btn-primary"
                disabled={!newModerator.username || !newModerator.email || !newModerator.password}
              >
                <FiUsers className="st-btn-icon" />
                Create Moderator Account
              </button>
            </form>
          </div>

          {/* Current Moderators Card */}
          <div className="st-card">
            <div className="st-card-header">
              <h2 className="st-card-title">Current Moderators</h2>
              <div className="st-card-badge">{moderators.length} accounts</div>
            </div>
            
            {loading ? (
              <div className="st-loading">
                <div className="st-loading-spinner"></div>
                <p>Loading moderators...</p>
              </div>
            ) : moderators.length === 0 ? (
              <div className="st-empty-state">
                <FiUsers className="st-empty-icon" />
                <h3>No moderators found</h3>
                <p>Create your first moderator account to get started with team management.</p>
              </div>
            ) : (
              <div className="st-moderators-list">
                <div className="st-table-container">
                  <table className="st-moderators-table">
                    <thead>
                      <tr>
                        <th className="st-col-user">User</th>
                        <th className="st-col-email">Email</th>
                        <th className="st-col-joined">Joined</th>
                        <th className="st-col-status">Status</th>
                        <th className="st-col-actions">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {moderators.map((moderator) => (
                        <tr key={moderator.id} className="st-moderator-row">
                          <td className="st-col-user">
                            {editingModerator === moderator.id ? (
                              <div className="st-edit-form">
                                <div className="st-input-group">
                                  <FiUser className="st-input-icon" />
                                  <input
                                    type="text"
                                    value={editForm.username}
                                    onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                                    required
                                    placeholder="Username"
                                    className="st-form-input st-form-input-small"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="st-user-info">
                                <div className="st-user-avatar">
                                  {moderator.username?.charAt(0)?.toUpperCase() || moderator.name?.charAt(0)?.toUpperCase() || 'M'}
                                </div>
                                <div className="st-user-details">
                                  <div className="st-username">{moderator.username || moderator.name}</div>
                                  <div className="st-user-id">ID: {moderator.id}</div>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="st-col-email">
                            {editingModerator === moderator.id ? (
                              <div className="st-edit-form">
                                <div className="st-input-group">
                                  <FiMail className="st-input-icon" />
                                  <input
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                                    required
                                    placeholder="Email"
                                    className="st-form-input st-form-input-small"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="st-email-cell">
                                <FiMail className="st-email-icon" />
                                <span>{moderator.email}</span>
                              </div>
                            )}
                          </td>
                          <td className="st-col-joined">
                            <div className="st-date-cell">
                              <FiCalendar className="st-date-icon" />
                              <span>{formatDate(moderator.created_at)}</span>
                            </div>
                          </td>
                          <td className="st-col-status">
                            <span className={`st-status-badge st-status-${moderator.status || 'active'}`}>
                              {moderator.status || 'active'}
                            </span>
                          </td>
                          <td className="st-col-actions">
                            {editingModerator === moderator.id ? (
                              <div className="st-edit-actions">
                                <button
                                  onClick={() => handleUpdateModerator(moderator.id)}
                                  className="st-btn st-btn-success st-btn-small"
                                  title="Save Changes"
                                >
                                  <FiSave className="st-btn-icon" />
                                  Save
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="st-btn st-btn-secondary st-btn-small"
                                  title="Cancel"
                                >
                                  <FiX className="st-btn-icon" />
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="st-action-buttons">
                                <button
                                  onClick={() => handleEditModerator(moderator)}
                                  className="st-btn st-btn-warning st-btn-small"
                                  title="Edit Moderator"
                                >
                                  <FiEdit2 className="st-btn-icon" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteModerator(moderator.id)}
                                  className="st-btn st-btn-danger st-btn-small"
                                  title="Delete Moderator"
                                >
                                  <FiTrash2 className="st-btn-icon" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Password Update Section for Editing */}
          {editingModerator && (
            <div className="st-card">
              <div className="st-card-header">
                <h2 className="st-card-title">Update Password</h2>
                <div className="st-card-badge">Optional</div>
              </div>
              <p className="st-card-description">
                Set a new password for this moderator. Leave blank to keep the current password.
              </p>
                <div className="st-form-group">
                  <div className="st-input-group st-password-input-group-edit">
                    <FiKey className="st-input-icon" />
                    <input
                      type={showEditPassword ? "text" : "password"}
                      value={editForm.password}
                      onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                      placeholder="Enter new password (leave blank to keep current)"
                      className="st-form-input"
                    />
                    <div className="st-password-controls-edit">
                      <button
                        type="button"
                        className="st-password-toggle-edit"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        title={showEditPassword ? "Hide password" : "Show password"}
                      >
                        {showEditPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                      <button
                        type="button"
                        className="st-generate-password-edit"
                        onClick={() => handleGeneratePassword(true)}
                        title="Generate secure password"
                      >
                        <FiRefreshCw />
                      </button>
                    </div>
                  </div>
                  <label className="st-form-label">New Password (Optional)</label>
                  {editForm.password && (
                    <div className="st-password-strength-edit">
                      Password strength: {editForm.password.length >= 8 ? 'Strong' : editForm.password.length >= 6 ? 'Good' : 'Weak'}
                    </div>
                  )}
                </div>
            </div>
          )}

          {/* Permissions Card */}
          <div className="st-card">
            <div className="st-card-header">
              <h2 className="st-card-title">Moderator Permissions</h2>
              <div className="st-card-badge">Access Levels</div>
            </div>
            <div className="st-permissions-grid">
              <div className="st-permissions-section">
                <div className="st-permissions-header">
                  <FiCheckCircle className="st-permissions-icon st-permissions-allowed" />
                  <h3>Moderators Can:</h3>
                </div>
                <ul className="st-permissions-list">
                  <li className="st-permission-item st-permission-allowed">View and manage user reports</li>
                  <li className="st-permission-item st-permission-allowed">Handle content flags</li>
                  <li className="st-permission-item st-permission-allowed">View all user accounts</li>
                  <li className="st-permission-item st-permission-allowed">Deactivate problematic users</li>
                  <li className="st-permission-item st-permission-allowed">Manage content categories</li>
                  <li className="st-permission-item st-permission-allowed">View system analytics</li>
                </ul>
              </div>
              
              <div className="st-permissions-section">
                <div className="st-permissions-header">
                  <FiAlertCircle className="st-permissions-icon st-permissions-denied" />
                  <h3>Moderators Cannot:</h3>
                </div>
                <ul className="st-permissions-list">
                  <li className="st-permission-item st-permission-denied">Create other moderators or admins</li>
                  <li className="st-permission-item st-permission-denied">Access admin settings</li>
                  <li className="st-permission-item st-permission-denied">Delete the system</li>
                  <li className="st-permission-item st-permission-denied">Change system-wide configurations</li>
                  <li className="st-permission-item st-permission-denied">View admin activity logs</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="st-content">
          {/* Change Password Card */}
          <div className="st-card">
            <div className="st-card-header">
              <h2 className="st-card-title">Change Admin Password</h2>
              <div className="st-card-badge">Security</div>
            </div>
            <p className="st-card-description">
              Update your admin account password. Use a strong, unique password for maximum security.
            </p>
            
            <form onSubmit={handleChangePassword} className="st-form">
              <div className="st-form-group">
                <div className="st-input-group">
                  <FiKey className="st-input-icon" />
                  <input
                    type="password"
                    value={changePassword.currentPassword}
                    onChange={(e) => setChangePassword({...changePassword, currentPassword: e.target.value})}
                    required
                    placeholder="Enter current password"
                    className="st-form-input"
                  />
                </div>
                <label className="st-form-label">Current Password *</label>
              </div>
              
              <div className="st-form-group">
                <div className="st-input-group">
                  <FiKey className="st-input-icon" />
                  <input
                    type="password"
                    value={changePassword.newPassword}
                    onChange={(e) => setChangePassword({...changePassword, newPassword: e.target.value})}
                    required
                    minLength="6"
                    placeholder="Enter new password (min. 6 characters)"
                    className="st-form-input"
                  />
                </div>
                <label className="st-form-label">New Password *</label>
              </div>
              
              <div className="st-form-group">
                <div className="st-input-group">
                  <FiKey className="st-input-icon" />
                  <input
                    type="password"
                    value={changePassword.confirmPassword}
                    onChange={(e) => setChangePassword({...changePassword, confirmPassword: e.target.value})}
                    required
                    minLength="6"
                    placeholder="Confirm new password"
                    className="st-form-input"
                  />
                </div>
                <label className="st-form-label">Confirm New Password *</label>
              </div>
              
              <button 
                type="submit" 
                className="st-btn st-btn-primary"
                disabled={!changePassword.currentPassword || !changePassword.newPassword || !changePassword.confirmPassword}
              >
                <FiKey className="st-btn-icon" />
                Change Password
              </button>
            </form>
          </div>

          {/* Security Info Card */}
          <div className="st-card">
            <div className="st-card-header">
              <h2 className="st-card-title">Admin Security Information</h2>
              <div className="st-card-badge">Overview</div>
            </div>
            <div className="st-security-info">
              <div className="st-info-item">
                <div className="st-info-label">Account Type:</div>
                <div className="st-info-value">
                  <span className="st-role-badge st-role-admin">Administrator</span>
                </div>
              </div>
              <div className="st-info-item">
                <div className="st-info-label">Permissions Level:</div>
                <div className="st-info-value">Full System Access</div>
              </div>
              <div className="st-info-item">
                <div className="st-info-label">Can Create:</div>
                <div className="st-info-value">Moderator Accounts</div>
              </div>
              <div className="st-info-item">
                <div className="st-info-label">Security Level:</div>
                <div className="st-info-value">
                  <span className="st-security-badge st-security-high">High Security</span>
                </div>
              </div>
              <div className="st-info-item">
                <div className="st-info-label">Last Activity:</div>
                <div className="st-info-value">Just now</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
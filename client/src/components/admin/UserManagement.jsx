import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../../css/usermanagement.css';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [suspendConfirm, setSuspendConfirm] = useState(null);
  const [newRole, setNewRole] = useState('');

  // Get current user role to determine permissions
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const isModerator = currentUser?.role === 'moderator';
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get('http://localhost:5000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
      setError('');
    } catch (err) {
      console.error('Error fetching users:', err);
      const msg = err.response?.data?.message || 'Failed to load users.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Get avatar URL - handle both full URLs and relative paths
  const getAvatarUrl = (avatar) => {
    if (!avatar) return null;
    
    if (avatar.startsWith('http')) return avatar;
    if (avatar.startsWith('/')) {
      return `http://localhost:5000${avatar}`;
    }
    return `http://localhost:5000/uploads/${avatar}`;
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle bulk selection
  const toggleUserSelection = (userId) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length && filteredUsers.length > 0) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(user => user.id)));
    }
  };

  // Bulk actions
  const handleBulkAction = async () => {
    if (!bulkAction || selectedUsers.size === 0) return;

    const token = localStorage.getItem('token');
    const userIds = Array.from(selectedUsers);

    try {
      if (bulkAction === 'delete') {
        if (!window.confirm(`Are you sure you want to delete ${userIds.length} users?`)) {
          return;
        }
        
        for (const userId of userIds) {
          await axios.delete(`http://localhost:5000/api/admin/users/${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
        
        setUsers(prevUsers => prevUsers.filter(user => !userIds.includes(user.id)));
        setSelectedUsers(new Set());
        alert(`${userIds.length} users deleted successfully`);
        
      } else if (bulkAction.startsWith('role:')) {
        const role = bulkAction.split(':')[1];
        
        for (const userId of userIds) {
          await axios.put(`http://localhost:5000/api/admin/users/${userId}/role`, 
            { role: role },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
        
        setUsers(prevUsers => 
          prevUsers.map(user => 
            userIds.includes(user.id) ? { ...user, role: role } : user
          )
        );
        setSelectedUsers(new Set());
        alert(`${userIds.length} users updated to ${role}`);
        
      } else if (bulkAction === 'suspend') {
        for (const userId of userIds) {
          await axios.patch(`http://localhost:5000/api/admin/users/${userId}/deactivate`, 
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
        
        setUsers(prevUsers => 
          prevUsers.map(user => 
            userIds.includes(user.id) ? { ...user, status: 'inactive' } : user
          )
        );
        setSelectedUsers(new Set());
        alert(`${userIds.length} users suspended successfully`);
        
      } else if (bulkAction === 'activate') {
        for (const userId of userIds) {
          await axios.patch(`http://localhost:5000/api/admin/users/${userId}/reactivate`, 
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
        
        setUsers(prevUsers => 
          prevUsers.map(user => 
            userIds.includes(user.id) ? { ...user, status: 'active' } : user
          )
        );
        setSelectedUsers(new Set());
        alert(`${userIds.length} users activated successfully`);
      }
      
      setBulkAction('');
    } catch (err) {
      console.error('Bulk action error:', err);
      const msg = err.response?.data?.message || 'Failed to perform bulk action.';
      alert(msg);
    }
  };

  // Single user actions
  const handleEditRole = async (user) => {
    if (!newRole.trim()) {
      alert('Please select a role');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      await axios.put(`http://localhost:5000/api/admin/users/${user.id}/role`, 
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === user.id ? { ...u, role: newRole } : u
        )
      );
      setEditingUser(null);
      setNewRole('');
      alert('User role updated successfully');
    } catch (err) {
      console.error('Error updating user:', err);
      const msg = err.response?.data?.message || 'Failed to update user.';
      alert(msg);
    }
  };

  const handleDeleteUser = async (user) => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`http://localhost:5000/api/admin/users/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setUsers(prevUsers => prevUsers.filter(u => u.id !== user.id));
      setDeleteConfirm(null);
      alert('User permanently deleted successfully');
    } catch (err) {
      console.error('Error deleting user:', err);
      const msg = err.response?.data?.error || 'Failed to delete user.';
      alert(msg);
    }
  };

  const handleSuspendUser = async (user) => {
    const token = localStorage.getItem('token');
    try {
      if (user.status === 'active') {
        // Suspend user
        await axios.patch(`http://localhost:5000/api/admin/users/${user.id}/deactivate`, 
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        setUsers(prevUsers => 
          prevUsers.map(u => 
            u.id === user.id ? { ...u, status: 'inactive' } : u
          )
        );
        setSuspendConfirm(null);
        alert('User suspended successfully');
      } else {
        // Activate user
        await axios.patch(`http://localhost:5000/api/admin/users/${user.id}/reactivate`, 
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        setUsers(prevUsers => 
          prevUsers.map(u => 
            u.id === user.id ? { ...u, status: 'active' } : u
          )
        );
        setSuspendConfirm(null);
        alert('User activated successfully');
      }
    } catch (err) {
      console.error('Error updating user status:', err);
      const msg = err.response?.data?.message || 'Failed to update user status.';
      alert(msg);
    }
  };

  // Role configuration
  const getRoleBadge = (role) => {
    const roleConfig = {
      'Skill Sharer': { class: 'um-role-skill-sharer', label: 'Skill Sharer', icon: '' },
      'Skill Learner': { class: 'um-role-skill-learner', label: 'Skill Learner', icon: '' },
      'Skill Learner & Sharer': { class: 'um-role-both', label: 'Skill Learner & Sharer', icon: '' },
    };
    
    return roleConfig[role] || { class: 'um-role-default', label: role || 'Not set', icon: '' };
  };

  // Status configuration
  const getStatusBadge = (status) => {
    const statusConfig = {
      'active': { class: 'um-status-active', label: 'Active', icon: '✓' },
      'inactive': { class: 'um-status-suspended', label: 'Suspended', icon: '⏸' },
    };
    
    return statusConfig[status] || { class: 'um-status-default', label: status || 'Unknown', icon: '?' };
  };

  if (loading) {
    return (
      <div className="um-loading-container">
        <div className="um-loading-spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="user-management-container">
      {/* Header */}
      <div className="um-header">
        <div className="um-header-content">
          <div className="um-title-section">
            <div className="um-header-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div>
              <h1 className="um-main-title">User Management</h1>
              <p className="um-subtitle">
                {isModerator 
                  ? 'View and manage user accounts (Limited Access)' 
                  : 'Manage user accounts and permissions'
                }
              </p>
              {isModerator && (
                <div className="um-permission-notice">
                  <span className="um-permission-badge">Moderator Access</span>
                  <span className="um-permission-text">Delete functionality disabled</span>
                </div>
              )}
            </div>
          </div>
          <div className="um-stats-section">
            <div className="um-stat-card">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2"/>
                <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="2"/>
                <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2"/>
                <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <span className="um-stat-number">{filteredUsers.length}</span>
              <span className="um-stat-label">Total Users</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedUsers.size > 0 && (
        <div className="um-bulk-actions-bar">
          <div className="um-bulk-content">
            <div className="um-selection-info">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 11L12 14L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <span>{selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected</span>
            </div>
            <div className="um-bulk-controls">
              <select 
                value={bulkAction} 
                onChange={(e) => setBulkAction(e.target.value)}
                className="um-bulk-select"
              >
                <option value="">Bulk Actions</option>
                <option value="role:Skill Sharer">Set as Skill Sharer</option>
                <option value="role:Skill Learner">Set as Skill Learner</option>
                <option value="role:Skill Learner & Sharer">Set as Both</option>
                <option value="suspend">Suspend Users</option>
                <option value="activate">Activate Users</option>
                {/* Hide delete option for moderators */}
                {!isModerator && (
                  <option value="delete">Delete Users</option>
                )}
              </select>
              <button 
                onClick={handleBulkAction}
                disabled={!bulkAction}
                className="um-btn-bulk-apply"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Apply
              </button>
              <button 
                onClick={() => setSelectedUsers(new Set())}
                className="um-btn-clear"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="um-toolbar">
        <div className="um-search-container">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="um-search-icon">
            <path d="M21 21L16.514 16.506L21 21ZM19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search users by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="um-search-input"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="um-search-clear"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="um-error-banner">
          <div className="um-error-content">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9V11M12 15H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0377 2.66667 10.2679 4L3.33975 16C2.56995 17.3333 3.53223 19 5.07183 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <strong>Error:</strong> {error}
            </div>
          </div>
          <button onClick={() => setError('')} className="um-error-close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}

      {/* Users Table */}
      <div className="um-table-wrapper">
        <div className="um-table-container">
          <table className="um-users-table">
            <thead>
              <tr>
                <th className="um-col-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                    onChange={toggleSelectAll}
                    className="um-checkbox"
                  />
                </th>
                <th className="um-col-user">User</th>
                <th className="um-col-email">Email</th>
                <th className="um-col-joined">Joined</th>
                <th className="um-col-status">Status</th>
                <th className="um-col-role">Role</th>
                <th className="um-col-rating">Rating</th>
                <th className="um-col-reviews">Reviews</th>
                <th className="um-col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="um-empty-state">
                    <div className="um-empty-content">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 21L16.514 16.506L21 21ZM19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <h3>No users found</h3>
                      {searchTerm && <p>Try adjusting your search terms</p>}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const role = getRoleBadge(user.role);
                  const status = getStatusBadge(user.status);
                  const isSelected = selectedUsers.has(user.id);
                  const avatarUrl = getAvatarUrl(user.avatar);
                  
                  return (
                    <tr key={user.id} className={isSelected ? 'um-row-selected' : ''}>
                      {/* Checkbox */}
                      <td className="um-col-checkbox">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleUserSelection(user.id)}
                          className="um-checkbox"
                        />
                      </td>

                      {/* User Info */}
                      <td className="um-col-user">
                        <div className="um-user-card">
                          <div className="um-user-avatar">
                            {avatarUrl ? (
                              <img 
                                src={avatarUrl} 
                                alt={user.username}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  const fallback = e.target.nextSibling;
                                  if (fallback) fallback.style.display = 'flex';
                                }} 
                              />
                            ) : null}
                            <div 
                              className="um-avatar-placeholder"
                              style={{ display: avatarUrl ? 'none' : 'flex' }}
                            >
                              {user.username?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                          </div>
                          <div className="um-user-info">
                            <div className="um-user-name">{user.username || 'Unnamed User'}</div>
                            <div className="um-user-id">ID: {user.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="um-col-email">
                        <div className="um-email-cell">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="2"/>
                            <path d="M22 6L12 13L2 6" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          <span className="um-email-text">{user.email}</span>
                        </div>
                      </td>

                      {/* Joined Date */}
                      <td className="um-col-joined">
                        <div className="um-date-cell">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 7V3M16 7V3M7 11H17M5 21H19C20.1046 21 21 20.1046 21 19V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V19C3 20.1046 3.89543 21 5 21Z" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          <span>{formatDate(user.created_at)}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="um-col-status">
                        <span className={`um-status-badge ${status.class}`}>
                          <span className="um-status-icon">{status.icon}</span>
                          {status.label}
                        </span>
                      </td>

                      {/* Role */}
                      <td className="um-col-role">
                        <span className={`um-role-badge ${role.class}`}>
                          <span className="um-role-icon">{role.icon}</span>
                          {role.label}
                        </span>
                      </td>

                      {/* Rating */}
                      <td className="um-col-rating">
                        <div className="um-rating-cell">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span className="um-rating-value">{user.rating || 0}</span>
                        </div>
                      </td>

                      {/* Reviews */}
                      <td className="um-col-reviews">
                        <div className="um-reviews-cell">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          <span className="um-reviews-count">{user.total_reviews || 0}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="um-col-actions">
                        <div className="um-action-buttons">
                          <button
                            onClick={() => {
                              setEditingUser(user);
                              setNewRole(user.role || '');
                            }}
                            className="um-btn-edit"
                            title="Edit Role"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2"/>
                              <path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2"/>
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => setSuspendConfirm(user)}
                            className={user.status === 'active' ? 'um-btn-suspend' : 'um-btn-activate'}
                            title={user.status === 'active' ? 'Suspend User' : 'Activate User'}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              {user.status === 'active' ? (
                                <path d="M6 10C6 9.46957 6.21071 8.96086 6.58579 8.58579C6.96086 8.21071 7.46957 8 8 8H16C16.5304 8 17.0391 8.21071 17.4142 8.58579C17.7893 8.96086 18 9.46957 18 10V14C18 14.5304 17.7893 15.0391 17.4142 15.4142C17.0391 15.7893 16.5304 16 16 16H8C7.46957 16 6.96086 15.7893 6.58579 15.4142C6.21071 15.0391 6 14.5304 6 14V10Z" stroke="currentColor" strokeWidth="2"/>
                              ) : (
                                <path d="M14.8284 14.8284C13.2663 16.3905 10.7337 16.3905 9.17157 14.8284C7.60948 13.2663 7.60948 10.7337 9.17157 9.17157C10.7337 7.60948 13.2663 7.60948 14.8284 9.17157M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12Z" stroke="currentColor" strokeWidth="2"/>
                              )}
                            </svg>
                            {user.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                          {/* Hide delete button for moderators */}
                          {!isModerator && (
                            <button
                              onClick={() => setDeleteConfirm(user)}
                              className="um-btn-delete"
                              title="Delete User"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2"/>
                                <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2"/>
                              </svg>
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="um-modal-overlay">
          <div className="um-modal">
            <div className="um-modal-header">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z" stroke="currentColor" strokeWidth="2"/>
                <path d="M6 20C6 17.7909 7.79086 16 10 16H14C16.2091 16 18 17.7909 18 20" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <h3>Edit User Role</h3>
              <button onClick={() => setEditingUser(null)} className="um-modal-close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className="um-modal-body">
              <div className="um-user-preview">
                <div className="um-user-avatar-small">
                  {getAvatarUrl(editingUser.avatar) ? (
                    <img 
                      src={getAvatarUrl(editingUser.avatar)} 
                      alt={editingUser.username}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const fallback = e.target.nextSibling;
                        if (fallback) fallback.style.display = 'flex';
                      }} 
                    />
                  ) : null}
                  <div 
                    className="um-avatar-placeholder-small"
                    style={{ display: getAvatarUrl(editingUser.avatar) ? 'none' : 'flex' }}
                  >
                    {editingUser.username?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                </div>
                <div className="um-user-details">
                  <div className="um-user-name">{editingUser.username}</div>
                  <div className="um-user-email">{editingUser.email}</div>
                </div>
              </div>
              <div className="um-form-group">
                <label className="um-form-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M19.4 15C19.2669 15.3031 19.1337 15.6062 19.0006 15.9094C18.5297 16.9078 18.0587 17.9062 17.5878 18.9047C17.3309 19.4516 16.9453 19.8687 16.5078 20.2187C16.0703 20.5687 15.5812 20.8516 15.0641 21.0547C14.5469 21.2578 13.9984 21.3781 13.4422 21.4109C12.8859 21.4437 12.3281 21.3875 11.7922 21.2453C11.2562 21.1031 10.7484 20.8766 10.2922 20.5766C9.83594 20.2766 9.4375 19.9078 9.11406 19.4875" stroke="currentColor" strokeWidth="2"/>
                    <path d="M4.6 15C4.73312 15.3031 4.86625 15.6062 4.99937 15.9094C5.47031 16.9078 5.94125 17.9062 6.41219 18.9047C6.66906 19.4516 7.05469 19.8687 7.49219 20.2187C7.92969 20.5687 8.41875 20.8516 8.93594 21.0547C9.45312 21.2578 10.0016 21.3781 10.5578 21.4109C11.1141 21.4437 11.6719 21.3875 12.2078 21.2453C12.7438 21.1031 13.2516 20.8766 13.7078 20.5766C14.1641 20.2766 14.5625 19.9078 14.8859 19.4875" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Select Role:
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="um-role-select"
                >
                  <option value="">Select a role</option>
                  <option value="Skill Sharer">Skill Sharer</option>
                  <option value="Skill Learner">Skill Learner</option>
                  <option value="Skill Learner & Sharer">Skill Learner & Sharer</option>
                </select>
              </div>
            </div>
            <div className="um-modal-footer">
              <button 
                onClick={() => setEditingUser(null)}
                className="um-btn-cancel"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleEditRole(editingUser)}
                className="um-btn-save"
                disabled={!newRole}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16L21 8V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M17 21V13H7V21" stroke="currentColor" strokeWidth="2"/>
                  <path d="M7 3V8H15" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend/Activate Confirmation Modal */}
      {suspendConfirm && (
        <div className="um-modal-overlay">
          <div className="um-modal um-modal-warning">
            <div className="um-modal-header">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 9V11M12 15H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0377 2.66667 10.2679 4L3.33975 16C2.56995 17.3333 3.53223 19 5.07183 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h3>{suspendConfirm.status === 'active' ? 'Suspend User' : 'Activate User'}</h3>
              <button onClick={() => setSuspendConfirm(null)} className="um-modal-close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className="um-modal-body">
              <div className="um-warning-alert">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 9V11M12 15H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0377 2.66667 10.2679 4L3.33975 16C2.56995 17.3333 3.53223 19 5.07183 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div>
                  <p>Are you sure you want to {suspendConfirm.status === 'active' ? 'suspend' : 'activate'} user <strong>"{suspendConfirm.username}"</strong>?</p>
                  {suspendConfirm.status === 'active' ? (
                    <p className="um-warning-text">Suspended users will not be able to access their account until reactivated.</p>
                  ) : (
                    <p className="um-warning-text">This will restore the user's access to the platform.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="um-modal-footer">
              <button 
                onClick={() => setSuspendConfirm(null)}
                className="um-btn-cancel"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleSuspendUser(suspendConfirm)}
                className={suspendConfirm.status === 'active' ? 'um-btn-suspend-confirm' : 'um-btn-activate-confirm'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {suspendConfirm.status === 'active' ? (
                    <path d="M6 10C6 9.46957 6.21071 8.96086 6.58579 8.58579C6.96086 8.21071 7.46957 8 8 8H16C16.5304 8 17.0391 8.21071 17.4142 8.58579C17.7893 8.96086 18 9.46957 18 10V14C18 14.5304 17.7893 15.0391 17.4142 15.4142C17.0391 15.7893 16.5304 16 16 16H8C7.46957 16 6.96086 15.7893 6.58579 15.4142C6.21071 15.0391 6 14.5304 6 14V10Z" stroke="currentColor" strokeWidth="2"/>
                  ) : (
                    <path d="M14.8284 14.8284C13.2663 16.3905 10.7337 16.3905 9.17157 14.8284C7.60948 13.2663 7.60948 10.7337 9.17157 9.17157C10.7337 7.60948 13.2663 7.60948 14.8284 9.17157M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12Z" stroke="currentColor" strokeWidth="2"/>
                  )}
                </svg>
                {suspendConfirm.status === 'active' ? 'Suspend User' : 'Activate User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal - Only show for admins */}
      {deleteConfirm && !isModerator && (
        <div className="um-modal-overlay">
          <div className="um-modal um-modal-danger">
            <div className="um-modal-header">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 9V11M12 15H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0377 2.66667 10.2679 4L3.33975 16C2.56995 17.3333 3.53223 19 5.07183 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h3>Delete User</h3>
              <button onClick={() => setDeleteConfirm(null)} className="um-modal-close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className="um-modal-body">
              <div className="um-warning-alert">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 9V11M12 15H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0377 2.66667 10.2679 4L3.33975 16C2.56995 17.3333 3.53223 19 5.07183 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div>
                  <p>Are you sure you want to delete user <strong>"{deleteConfirm.username}"</strong>?</p>
                  <p className="um-warning-text">This action cannot be undone and will permanently delete all user data.</p>
                </div>
              </div>
            </div>
            <div className="um-modal-footer">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="um-btn-cancel"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteUser(deleteConfirm)}
                className="um-btn-delete-confirm"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2"/>
                  <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import '../../css/usermanagement.css';

const UserIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const UsersIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const WarningIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 9V11M12 15H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0377 2.66667 10.2679 4L3.33975 16C2.56995 17.3333 3.53223 19 5.07183 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const AlertTriangleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 21L16.514 16.506M19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const MoreVerticalIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 13C12.5523 13 13 12.5523 13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 6C12.5523 6 13 5.55228 13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 20C12.5523 20 13 19.5523 13 19C13 18.4477 12.5523 18 12 18C11.4477 18 11 18.4477 11 19C11 19.5523 11.4477 20 12 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ChartIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 20V10M12 20V4M6 20V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const BanIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.364 18.364C21.8787 14.8492 21.8787 9.15076 18.364 5.63604C14.8492 2.12132 9.15076 2.12132 5.63604 5.63604C2.12132 9.15076 2.12132 14.8492 5.63604 18.364C9.15076 21.8787 14.8492 21.8787 18.364 18.364Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4.93 4.93L19.07 19.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const KeyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 7C16.1046 7 17 7.89543 17 9C17 10.1046 16.1046 11 15 11C13.8954 11 13 10.1046 13 9C13 7.89543 13.8954 7 15 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 13C21 11.8954 20.1046 11 19 11C17.8954 11 17 11.8954 17 13V16C17 17.1046 17.8954 18 19 18H21V20C21 20.5523 20.5523 21 20 21H19C18.4477 21 18 20.5523 18 20V18C18 17.4477 17.5523 17 17 17C16.4477 17 16 17.4477 16 18V20C16 20.5523 15.5523 21 15 21H14C13.4477 21 13 20.5523 13 20V18.2C13 17.4239 12.7761 16.6622 12.3536 16.0077L9 11V9C9 7.89543 8.10457 7 7 7H4C2.89543 7 2 7.89543 2 9V11C2 12.1046 2.89543 13 4 13H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M23 4V10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M1 20V14H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3.51 9C4.01717 7.56678 4.87913 6.2854 6.01547 5.27542C7.1518 4.26543 8.52547 3.55976 10.0083 3.22426C11.4911 2.88875 13.0348 2.93434 14.4952 3.35677C15.9556 3.7792 17.2853 4.56471 18.36 5.64L23 10M1 14L5.64 18.36C6.71475 19.4353 8.04437 20.2208 9.50481 20.6432C10.9652 21.0657 12.5089 21.1113 13.9917 20.7757C15.4745 20.4402 16.8482 19.7346 17.9845 18.7246C19.1209 17.7146 19.9828 16.4332 20.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PauseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 4H6V20H10V4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 4H14V20H18V4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ChevronLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const UserManagementSkeleton = () => {
  return (
    <div className="um-container um-skeleton">
      {/* Header Skeleton */}
      <div className="um-header">
        <div className="um-header-content">
          <div className="um-title-section">
            <div className="um-skeleton-icon um-header-icon"></div>
            <div>
              <div className="um-skeleton-line um-skeleton-main-title"></div>
              <div className="um-skeleton-line um-skeleton-subtitle"></div>
            </div>
          </div>
          <div className="um-stats-section">
            {[1, 2, 3].map((item) => (
              <div key={item} className="um-stat-card">
                <div className="um-skeleton-icon"></div>
                <div className="um-stat-info">
                  <div className="um-skeleton-stat"></div>
                  <div className="um-skeleton-label"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toolbar Skeleton */}
      <div className="um-toolbar">
        <div className="um-skeleton-search"></div>
        <div className="um-skeleton-tabs"></div>
      </div>

      {/* Table Skeleton */}
      <div className="um-table-wrapper">
        <div className="um-table-container">
          <table className="um-users-table">
            <thead>
              <tr>
                <th className="um-col-checkbox">
                  <div className="um-skeleton-checkbox"></div>
                </th>
                <th className="um-col-user">User</th>
                <th className="um-col-email">Email</th>
                <th className="um-col-joined">Joined</th>
                <th className="um-col-status">Status</th>
                <th className="um-col-strikes">Strikes</th>
                <th className="um-col-reports">Reports</th>
                <th className="um-col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((row) => (
                <tr key={row} className="um-skeleton-row">
                  <td className="um-col-checkbox">
                    <div className="um-skeleton-checkbox"></div>
                  </td>
                  <td className="um-col-user">
                    <div className="um-user-card">
                      <div className="um-skeleton-avatar"></div>
                      <div className="um-user-info">
                        <div className="um-skeleton-line um-skeleton-name"></div>
                        <div className="um-skeleton-line um-skeleton-role"></div>
                      </div>
                    </div>
                  </td>
                  <td className="um-col-email">
                    <div className="um-skeleton-line um-skeleton-email"></div>
                  </td>
                  <td className="um-col-joined">
                    <div className="um-skeleton-line um-skeleton-date"></div>
                  </td>
                  <td className="um-col-status">
                    <div className="um-skeleton-badge"></div>
                  </td>
                  <td className="um-col-strikes">
                    <div className="um-skeleton-strikes"></div>
                  </td>
                  <td className="um-col-reports">
                    <div className="um-skeleton-reports"></div>
                  </td>
                  <td className="um-col-actions">
                    <div className="um-skeleton-actions"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Skeleton */}
      <div className="um-pagination skeleton">
        <div className="um-pagination-info skeleton-text skeleton-pulse"></div>
        <div className="um-pagination-controls">
          <div className="um-pagination-btn skeleton-pulse"></div>
          <div className="um-pagination-numbers">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="um-page-number skeleton-pulse"></div>
            ))}
          </div>
          <div className="um-pagination-btn skeleton-pulse"></div>
        </div>
      </div>
    </div>
  );
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [actionConfirm, setActionConfirm] = useState(null);
  const [userReports, setUserReports] = useState({});
  const [viewingReports, setViewingReports] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const dropdownRefs = useRef({});
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Enhanced Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const currentUser = JSON.parse(localStorage.getItem('user'));
  const isModerator = currentUser?.role === 'moderator';
  const isAdmin = currentUser?.role === 'admin';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isOutside = Object.values(dropdownRefs.current).every((ref) => {
        return ref && !ref.contains(event.target);
      });

      if (isOutside) {
        setDropdownOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Enhanced fetchUsers with search and filter parameters
  const fetchUsers = async (page = 1, search = searchTerm, filter = activeFilter) => {
    const token = localStorage.getItem('token');
    setLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString()
      });

      // Add search term if provided
      if (search) {
        params.append('search', search);
      }

      // Add status filter if not 'all'
      if (filter !== 'all') {
        params.append('status', filter);
      }

      const res = await axios.get(`http://localhost:5000/api/admin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Handle paginated response
      if (res.data.users) {
        setUsers(res.data.users);
        setTotalUsers(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
        setCurrentPage(res.data.page || 1);
      } else {
        // Fallback for non-paginated response
        setUsers(Array.isArray(res.data) ? res.data : []);
        setTotalUsers(Array.isArray(res.data) ? res.data.length : 0);
        setTotalPages(1);
      }
      setError('');
    } catch (err) {
      console.error('Error fetching users:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to load users.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users when page, search term, or filter changes
  useEffect(() => {
    fetchUsers(currentPage, searchTerm, activeFilter);
  }, [currentPage, searchTerm, activeFilter]);

  const fetchUserReports = async (userId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`http://localhost:5000/api/admin/users/${userId}/reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserReports(prev => ({
        ...prev,
        [userId]: res.data.reports
      }));
    } catch (err) {
      console.error('Error fetching user reports:', err);
    }
  };

  const getAvatarUrl = (avatar) => {
    if (!avatar) return null;
    if (avatar.startsWith('http')) return avatar;
    if (avatar.startsWith('/')) {
      return `http://localhost:5000${avatar}`;
    }
    return `http://localhost:5000/uploads/${avatar}`;
  };

  // Remove client-side filtering since it's now server-side
  const displayedUsers = users;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

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
    if (selectedUsers.size === displayedUsers.length && displayedUsers.length > 0) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(displayedUsers.map(user => user.id)));
    }
  };

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
        
        // Refresh the current page
        fetchUsers(currentPage, searchTerm, activeFilter);
        setSelectedUsers(new Set());
        alert(`${userIds.length} users deleted successfully`);
        
      } else if (bulkAction === 'reactivate') {
        for (const userId of userIds) {
          await axios.patch(`http://localhost:5000/api/admin/users/${userId}/reactivate`, 
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
        
        // Refresh users to get updated statuses
        fetchUsers(currentPage, searchTerm, activeFilter);
        setSelectedUsers(new Set());
        alert(`${userIds.length} users reactivated successfully`);
      }
      
      setBulkAction('');
    } catch (err) {
      console.error('Bulk action error:', err);
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to perform bulk action.';
      alert(msg);
    }
  };

  const handleDeleteUser = async (user) => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`http://localhost:5000/api/admin/users/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Refresh the current page instead of client-side filtering
      fetchUsers(currentPage, searchTerm, activeFilter);
      setDeleteConfirm(null);
      alert('User permanently deleted successfully');
    } catch (err) {
      console.error('Error deleting user:', err);
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to delete user.';
      alert(msg);
    }
  };

  const handleBanUser = async (user) => {
    const reason = prompt('Enter ban reason:');
    if (!reason) return;
    
    if (!window.confirm(`Are you sure you want to permanently ban ${user.username}? This action cannot be undone.`)) {
      return;
    }
    
    const token = localStorage.getItem('token');
    try {
      const response = await axios.patch(`http://localhost:5000/api/admin/users/${user.id}/ban`, 
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const result = response.data;
      
      // Refresh the current page
      fetchUsers(currentPage, searchTerm, activeFilter);
      setActionConfirm(null);
      
      // Show success message
      alert('User permanently banned and notification sent');
    } catch (err) {
      console.error('Error banning user:', err);
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to ban user.';
      alert(msg);
    }
  };

  const handleReactivateUser = async (user) => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.patch(`http://localhost:5000/api/admin/users/${user.id}/reactivate`, 
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const result = response.data;
      
      // Refresh the current page
      fetchUsers(currentPage, searchTerm, activeFilter);
      setActionConfirm(null);
      
      // Show success message
      alert('User reactivated successfully and notification sent');
    } catch (err) {
      console.error('Error reactivating user:', err);
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to reactivate user.';
      alert(msg);
    }
  };

  const handleResetPassword = async (user) => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.post(`http://localhost:5000/api/admin/users/${user.id}/reset-password`, 
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Password reset successfully. Temporary password: ${res.data.temporaryPassword}`);
      console.log(`Password reset for ${user.email}. Temporary password: ${res.data.temporaryPassword}`);
      
    } catch (err) {
      console.error('Error resetting password:', err);
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to reset password.';
      alert(msg);
    }
  };

  // Enhanced Status Badge Component with automatic status based on strikes
  const StatusBadge = ({ user }) => {
    const getEffectiveStatus = (user) => {
      const strikeCount = user.strike_count || 0;
      
      if (strikeCount === 0 && user.status !== 'active') {
        return 'active';
      } else if (strikeCount >= 1 && strikeCount <= 2 && user.status !== 'warning' && user.status !== 'suspended' && user.status !== 'banned') {
        return 'warning';
      } else if (strikeCount >= 3 && user.status !== 'banned') {
        return 'suspended';
      }
      return user.status;
    };

    const effectiveStatus = getEffectiveStatus(user);
    
    const statusConfig = {
      'active': { 
        class: 'um-status-active', 
        label: 'Active', 
        icon: <CheckIcon />,
        description: 'Account in good standing'
      },
      'warning': { 
        class: 'um-status-warning', 
        label: `Warning (${user.strike_count || 0}/3)`, 
        icon: <WarningIcon />,
        description: 'Account has active warnings'
      },
      'suspended': { 
        class: 'um-status-suspended', 
        label: user.suspended_until 
          ? `Suspended until ${new Date(user.suspended_until).toLocaleDateString()}`
          : `Suspended (${user.strike_count || 0}/3)`,
        icon: <PauseIcon />,
        description: 'Account temporarily suspended'
      },
      'banned': { 
        class: 'um-status-banned', 
        label: 'Banned', 
        icon: <BanIcon />,
        description: 'Account permanently banned'
      },
    };
    
    const config = statusConfig[effectiveStatus] || { 
      class: 'um-status-default', 
      label: 'Unknown', 
      icon: '?',
      description: 'Unknown status'
    };
    
    return (
      <div className={`um-status-badge ${config.class}`} title={config.description}>
        <span className="um-status-icon">{config.icon}</span>
        <span className="um-status-label">{config.label}</span>
      </div>
    );
  };

  const StrikeIndicator = ({ user }) => {
    const getStrikeConfig = () => {
      const strikeCount = user.strike_count || 0;
      
      let status = user.status;
      if (strikeCount === 0) {
        status = 'active';
      } else if (strikeCount >= 1 && strikeCount <= 2) {
        status = 'warning';
      } else if (strikeCount >= 3 && status !== 'banned') {
        status = 'suspended';
      }

      if (status === 'banned') {
        return {
          class: 'um-strikes-critical',
          label: 'BANNED',
          icon: <BanIcon />,
          nextAction: 'Permanently restricted'
        };
      }

      if (status === 'suspended') {
        return {
          class: 'um-strikes-critical',
          label: 'SUSPENDED',
          icon: <PauseIcon />,
          nextAction: 'Account suspended'
        };
      }

      const configs = [
        { 
          class: 'um-strikes-clean', 
          label: 'CLEAN', 
          icon: <CheckIcon />,
          nextAction: 'Next: Warning at 1 strike' 
        },
        { 
          class: 'um-strikes-warning', 
          label: 'LOW', 
          icon: <WarningIcon />,
          nextAction: 'Next: Suspension at 3 strikes' 
        },
        { 
          class: 'um-strikes-danger', 
          label: 'HIGH', 
          icon: <AlertTriangleIcon />,
          nextAction: 'Next: Suspension at 3 strikes' 
        },
        { 
          class: 'um-strikes-critical', 
          label: 'MAX', 
          icon: <BanIcon />,
          nextAction: 'Auto-suspension' 
        }
      ];

      return configs[Math.min(strikeCount, 3)];
    };

    const config = getStrikeConfig();
    const strikeCount = user.strike_count || 0;

    return (
      <div className="um-strikes-cell">
        <div className="um-strike-main">
          <div 
            className={`um-strike-badge ${config.class}`}
            title={config.nextAction}
          >
            <span className="um-strike-icon">
              {config.icon}
            </span>
            <span className="um-strike-text">
              {strikeCount}/3
            </span>
          </div>
        </div>
        <div className="um-strike-details">
          <div className={`um-strike-level ${config.class}`}>
            {config.label}
          </div>
          <div className="um-strike-progression">
            {[1, 2, 3].map((level) => (
              <div
                key={level}
                className={`um-strike-dot ${strikeCount >= level ? 'active' : ''} ${
                  strikeCount >= level 
                    ? level === 3 ? 'critical' : level === 2 ? 'danger' : 'warning'
                    : ''
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  const getAvailableActions = (user) => {
    const actions = [];
    
    // Status management actions - ONLY KEEP REACTIVATE AND BAN
    if (user.status === 'active') {
      // Only show ban option for active users
      if (isAdmin) {
        actions.push({ 
          label: 'Ban User', 
          action: 'ban', 
          class: 'um-dropdown-ban',
          icon: <BanIcon />
        });
      }
    } else if (user.status === 'warning') {
      actions.push({ 
        label: 'Reactivate', 
        action: 'reactivate', 
        class: 'um-dropdown-activate',
        icon: <RefreshIcon />
      });
      if (isAdmin) {
        actions.push({ 
          label: 'Ban User', 
          action: 'ban', 
          class: 'um-dropdown-ban',
          icon: <BanIcon />
        });
      }
    } else if (user.status === 'suspended') {
      actions.push({ 
        label: 'Reactivate', 
        action: 'reactivate', 
        class: 'um-dropdown-activate',
        icon: <RefreshIcon />
      });
      if (isAdmin) {
        actions.push({ 
          label: 'Ban User', 
          action: 'ban', 
          class: 'um-dropdown-ban',
          icon: <BanIcon />
        });
      }
    } else if (user.status === 'banned') {
      actions.push({ 
        label: 'Reactivate', 
        action: 'reactivate', 
        class: 'um-dropdown-activate',
        icon: <RefreshIcon />
      });
    }
    
    // Reset Password - Admin only
    if (isAdmin) {
      actions.push({ 
        label: 'Reset Password', 
        action: 'reset-password', 
        class: 'um-dropdown-reset',
        icon: <KeyIcon />
      });
    }
    
    // View Reports - Available for all
    actions.push({ 
      label: 'View Reports', 
      action: 'view-reports', 
      class: 'um-dropdown-reports',
      icon: <ChartIcon />
    });
    

    if (isAdmin && user.role !== 'moderator' && user.role !== 'admin') {
      actions.push({ 
        label: 'Delete User', 
        action: 'delete', 
        class: 'um-dropdown-delete',
        icon: <TrashIcon />
      });
    }
    
    return actions;
  };

  const handleDropdownAction = (user, action) => {
    setDropdownOpen(null);
    
    switch (action) {
      case 'ban':
        setActionConfirm({ user, action: 'ban' });
        break;
      case 'reactivate':
        setActionConfirm({ user, action: 'reactivate' });
        break;
      case 'reset-password':
        setResetPasswordConfirm(user);
        break;
      case 'view-reports':
        setViewingReports(user);
        fetchUserReports(user.id);
        break;
      case 'delete':
        setDeleteConfirm(user);
        break;
      default:
        break;
    }
  };

  const toggleDropdown = (userId, event) => {
    event.stopPropagation();
    setDropdownOpen(dropdownOpen === userId ? null : userId);
  };

  // Stats calculation - now based on total data from server
  const stats = {
    total: totalUsers,
    // Note: For detailed stats by status, you might want to add a separate API endpoint
    // For now, we'll calculate from current page data (this is approximate)
    active: users.filter(u => u.status === 'active').length,
    warned: users.filter(u => u.status === 'warning').length,
    suspended: users.filter(u => u.status === 'suspended').length,
    banned: users.filter(u => u.status === 'banned').length
  };

  // Enhanced Pagination handlers - same as ReportManagement
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Enhanced Pagination component - same as ReportManagement
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="um-pagination">
        <div className="um-pagination-info">
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalUsers)} of {totalUsers} users
        </div>
        <div className="um-pagination-controls">
          <button
            className={`um-pagination-btn ${currentPage === 1 ? 'disabled' : ''}`}
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeftIcon /> Previous
          </button>
          
          <div className="um-pagination-numbers">
            {startPage > 1 && (
              <>
                <button
                  className={`um-page-number ${1 === currentPage ? 'active' : ''}`}
                  onClick={() => handlePageChange(1)}
                >
                  1
                </button>
                {startPage > 2 && <span className="um-page-ellipsis">...</span>}
              </>
            )}
            
            {pageNumbers.map(page => (
              <button
                key={page}
                className={`um-page-number ${page === currentPage ? 'active' : ''}`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            ))}
            
            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && <span className="um-page-ellipsis">...</span>}
                <button
                  className={`um-page-number ${totalPages === currentPage ? 'active' : ''}`}
                  onClick={() => handlePageChange(totalPages)}
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>
          
          <button
            className={`um-pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`}
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next <ChevronRightIcon />
          </button>
        </div>
      </div>
    );
  };

  // Clear filters and search
  const clearFilters = () => {
    setSearchTerm('');
    setActiveFilter('all');
    setCurrentPage(1);
  };

  // Show skeleton loading
  if (loading && users.length === 0) {
    return <UserManagementSkeleton />;
  }

  return (
    <div className="um-container">
      {/* Header */}
      <div className="um-header">
        <div className="um-header-content">
          <div className="um-title-section">
            <div className="um-header-icon">
              <UserIcon />
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
                  <span className="um-permission-text">Delete and Ban functionality disabled</span>
                </div>
              )}
            </div>
          </div>
          <div className="um-stats-section">
            <div className="um-stat-card">
              <div className="um-stat-icon"><UsersIcon /></div>
              <div className="um-stat-info">
                <div className="um-stat-number">{stats.total}</div>
                <div className="um-stat-label">Total Users</div>
              </div>
            </div>
            <div className="um-stat-card">
              <div className="um-stat-icon"><CheckIcon /></div>
              <div className="um-stat-info">
                <div className="um-stat-number">{stats.active}</div>
                <div className="um-stat-label">Active</div>
              </div>
            </div>
            <div className="um-stat-card">
              <div className="um-stat-icon"><AlertTriangleIcon /></div>
              <div className="um-stat-info">
                <div className="um-stat-number">{stats.warned + stats.suspended + stats.banned}</div>
                <div className="um-stat-label">Restricted</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedUsers.size > 0 && (
        <div className="um-bulk-actions-bar">
          <div className="um-bulk-content">
            <div className="um-selection-info">
              <span className="um-selection-count">{selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected</span>
            </div>
            <div className="um-bulk-controls">
              <select 
                value={bulkAction} 
                onChange={(e) => setBulkAction(e.target.value)}
                className="um-bulk-select"
              >
                <option value="">Bulk Actions</option>
                <option value="reactivate">Reactivate Users</option>
                {!isModerator && (
                  <option value="delete">Delete Users</option>
                )}
              </select>
              <button 
                onClick={handleBulkAction}
                disabled={!bulkAction}
                className="um-btn-bulk-apply"
              >
                Apply
              </button>
              <button 
                onClick={() => setSelectedUsers(new Set())}
                className="um-btn-clear"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="um-toolbar">
        <div className="um-search-container">
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="um-search-input"
          />
          <div className="um-search-icon"><SearchIcon /></div>
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="um-search-clear"
            >
              <CloseIcon />
            </button>
          )}
        </div>
        
        <div className="um-filter-tabs">
          <button 
            className={`um-filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All ({stats.total})
          </button>
          <button 
            className={`um-filter-tab ${activeFilter === 'active' ? 'active' : ''}`}
            onClick={() => setActiveFilter('active')}
          >
            Active ({stats.active})
          </button>
          <button 
            className={`um-filter-tab ${activeFilter === 'warning' ? 'active' : ''}`}
            onClick={() => setActiveFilter('warning')}
          >
            Warning ({stats.warned})
          </button>
          <button 
            className={`um-filter-tab ${activeFilter === 'suspended' ? 'active' : ''}`}
            onClick={() => setActiveFilter('suspended')}
          >
            Suspended ({stats.suspended})
          </button>
          <button 
            className={`um-filter-tab ${activeFilter === 'banned' ? 'active' : ''}`}
            onClick={() => setActiveFilter('banned')}
          >
            Banned ({stats.banned})
          </button>
        </div>

        {(searchTerm || activeFilter !== 'all') && (
          <button 
            className="um-clear-filters"
            onClick={clearFilters}
            title="Clear all filters"
          >
            <CloseIcon /> Clear Filters
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="um-error-banner">
          <div className="um-error-content">
            <span className="um-error-icon"><AlertTriangleIcon /></span>
            <div>
              <strong>Error:</strong> {error}
            </div>
          </div>
          <button onClick={() => setError('')} className="um-error-close">
            <CloseIcon />
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
                    checked={selectedUsers.size === displayedUsers.length && displayedUsers.length > 0}
                    onChange={toggleSelectAll}
                    className="um-checkbox"
                  />
                </th>
                <th className="um-col-user">User</th>
                <th className="um-col-email">Email</th>
                <th className="um-col-joined">Joined</th>
                <th className="um-col-status">Status</th>
                <th className="um-col-strikes">Strikes</th>
                <th className="um-col-reports">Reports</th>
                <th className="um-col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // Loading rows
                [1, 2, 3, 4, 5].map((row) => (
                  <tr key={row} className="um-skeleton-row">
                    <td className="um-col-checkbox">
                      <div className="um-skeleton-checkbox"></div>
                    </td>
                    <td className="um-col-user">
                      <div className="um-user-card">
                        <div className="um-skeleton-avatar"></div>
                        <div className="um-user-info">
                          <div className="um-skeleton-line um-skeleton-name"></div>
                          <div className="um-skeleton-line um-skeleton-role"></div>
                        </div>
                      </div>
                    </td>
                    <td className="um-col-email">
                      <div className="um-skeleton-line um-skeleton-email"></div>
                    </td>
                    <td className="um-col-joined">
                      <div className="um-skeleton-line um-skeleton-date"></div>
                    </td>
                    <td className="um-col-status">
                      <div className="um-skeleton-badge"></div>
                    </td>
                    <td className="um-col-strikes">
                      <div className="um-skeleton-strikes"></div>
                    </td>
                    <td className="um-col-reports">
                      <div className="um-skeleton-reports"></div>
                    </td>
                    <td className="um-col-actions">
                      <div className="um-skeleton-actions"></div>
                    </td>
                  </tr>
                ))
              ) : displayedUsers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="um-empty-state">
                    <div className="um-empty-content">
                      <div className="um-empty-icon"><UsersIcon /></div>
                      <h3>No users found</h3>
                      {searchTerm && <p>Try adjusting your search terms</p>}
                    </div>
                  </td>
                </tr>
              ) : (
                displayedUsers.map((user) => {
                  const isSelected = selectedUsers.has(user.id);
                  const avatarUrl = getAvatarUrl(user.avatar);
                  const availableActions = getAvailableActions(user);
                  
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
                            <div className="um-user-role">{user.role}</div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="um-col-email">
                        <div className="um-email-cell">
                          {user.email}
                        </div>
                      </td>

                      {/* Joined Date */}
                      <td className="um-col-joined">
                        <div className="um-date-cell">
                          {formatDate(user.created_at)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="um-col-status">
                        <StatusBadge user={user} />
                      </td>

                      {/* Strikes */}
                      <td className="um-col-strikes">
                        <StrikeIndicator user={user} />
                      </td>

                      {/* Reports */}
                      <td className="um-col-reports">
                        <button
                          onClick={() => {
                            setViewingReports(user);
                            fetchUserReports(user.id);
                          }}
                          className="um-btn-reports"
                          title="View user reports"
                        >
                          <span className="um-reports-count">{user.total_reports || 0}</span>
                          <span className="um-reports-icon"><ChartIcon /></span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="um-col-actions">
                        <div className="um-actions-dropdown-container" ref={(el) => (dropdownRefs.current[user.id] = el)}>
                          <button
                            onClick={(e) => toggleDropdown(user.id, e)}
                            className="um-dropdown-toggle"
                            title="Actions"
                          >
                            <MoreVerticalIcon />
                          </button>

                          {dropdownOpen === user.id && (
                            <div className="um-dropdown-menu">
                              {availableActions.map((action, index) => (
                                <button
                                  key={index}
                                  onClick={() => handleDropdownAction(user, action.action)}
                                  className={`um-dropdown-item ${action.class}`}
                                >
                                  <span className="um-dropdown-icon">{action.icon}</span>
                                  <span className="um-dropdown-text">{action.label}</span>
                                </button>
                              ))}
                            </div>
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

      {/* Pagination */}
      {!loading && totalUsers > 0 && (
        <div className="um-pagination">
          <div className="um-pagination-info">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalUsers)} of {totalUsers} users
          </div>
          <div className="um-pagination-controls">
            <button
              className={`um-pagination-btn ${currentPage === 1 ? 'disabled' : ''}`}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeftIcon /> Previous
            </button>
            
            <div className="um-pagination-numbers">
              {(() => {
                const pageNumbers = [];
                const maxVisiblePages = 5;
                
                let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                
                if (endPage - startPage + 1 < maxVisiblePages) {
                  startPage = Math.max(1, endPage - maxVisiblePages + 1);
                }

                if (startPage > 1) {
                  pageNumbers.push(
                    <button
                      key={1}
                      className={`um-page-number ${1 === currentPage ? 'active' : ''}`}
                      onClick={() => handlePageChange(1)}
                    >
                      1
                    </button>
                  );
                  if (startPage > 2) {
                    pageNumbers.push(<span key="ellipsis1" className="um-page-ellipsis">...</span>);
                  }
                }
                
                for (let i = startPage; i <= endPage; i++) {
                  pageNumbers.push(
                    <button
                      key={i}
                      className={`um-page-number ${i === currentPage ? 'active' : ''}`}
                      onClick={() => handlePageChange(i)}
                    >
                      {i}
                    </button>
                  );
                }
                
                if (endPage < totalPages) {
                  if (endPage < totalPages - 1) {
                    pageNumbers.push(<span key="ellipsis2" className="um-page-ellipsis">...</span>);
                  }
                  pageNumbers.push(
                    <button
                      key={totalPages}
                      className={`um-page-number ${totalPages === currentPage ? 'active' : ''}`}
                      onClick={() => handlePageChange(totalPages)}
                    >
                      {totalPages}
                    </button>
                  );
                }
                
                return pageNumbers;
              })()}
            </div>
            
            <button
              className={`um-pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next <ChevronRightIcon />
            </button>
          </div>
        </div>
      )}

      {/* Action Confirmation Modal */}
      {actionConfirm && (
        <div className="um-modal-overlay">
          <div className="um-modal um-modal-warning">
            <div className="um-modal-header">
              <h3>
                {actionConfirm.action === 'ban' && <><BanIcon /> Ban User</>}
                {actionConfirm.action === 'reactivate' && <><RefreshIcon /> Reactivate User</>}
              </h3>
              <button onClick={() => setActionConfirm(null)} className="um-modal-close">
                <CloseIcon />
              </button>
            </div>
            <div className="um-modal-body">
              <div className="um-warning-alert">
                <div className="um-warning-icon"><AlertTriangleIcon /></div>
                <div>
                  <p>Are you sure you want to {actionConfirm.action} user <strong>"{actionConfirm.user.username}"</strong>?</p>
                  {actionConfirm.action === 'ban' && (
                    <div className="um-penalty-preview">
                      <p className="um-warning-text">
                        <strong>This action cannot be undone.</strong><br/>
                        The user will be permanently banned from the platform.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="um-modal-footer">
              <button 
                onClick={() => setActionConfirm(null)}
                className="um-btn-cancel"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (actionConfirm.action === 'ban') handleBanUser(actionConfirm.user);
                  else if (actionConfirm.action === 'reactivate') handleReactivateUser(actionConfirm.user);
                }}
                className={
                  actionConfirm.action === 'ban' ? 'um-btn-ban-confirm' :
                  'um-btn-activate-confirm'
                }
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && !isModerator && (
        <div className="um-modal-overlay">
          <div className="um-modal um-modal-danger">
            <div className="um-modal-header">
              <h3><TrashIcon /> Delete User</h3>
              <button onClick={() => setDeleteConfirm(null)} className="um-modal-close">
                <CloseIcon />
              </button>
            </div>
            <div className="um-modal-body">
              <div className="um-warning-alert">
                <div className="um-warning-icon"><AlertTriangleIcon /></div>
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
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Reports Modal */}
      {viewingReports && (
        <div className="um-modal-overlay">
          <div className="um-modal um-modal-large">
            <div className="um-modal-header">
              <h3><ChartIcon /> Reports for {viewingReports.username}</h3>
              <button onClick={() => setViewingReports(null)} className="um-modal-close">
                <CloseIcon />
              </button>
            </div>
            <div className="um-modal-body">
              <div className="um-reports-list">
                {userReports[viewingReports.id]?.length > 0 ? (
                  userReports[viewingReports.id].map((report) => (
                    <div key={report.id} className="um-report-item">
                      <div className="um-report-header">
                        <span className="um-report-type">{report.report_type}</span>
                        <span className={`um-report-status um-status-${report.status}`}>
                          {report.status}
                        </span>
                      </div>
                      <div className="um-report-description">
                        {report.description}
                      </div>
                      <div className="um-report-meta">
                        <span>By: {report.reporter_username}</span>
                        <span>Date: {formatDate(report.created_at)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="um-empty-reports">
                    <p>No reports found for this user.</p>
                  </div>
                )}
              </div>
            </div>
            <div className="um-modal-footer">
              <button 
                onClick={() => setViewingReports(null)}
                className="um-btn-cancel"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Confirmation Modal */}
      {resetPasswordConfirm && (
        <div className="um-modal-overlay">
          <div className="um-modal um-modal-warning">
            <div className="um-modal-header">
              <h3><KeyIcon /> Reset Password</h3>
              <button onClick={() => setResetPasswordConfirm(null)} className="um-modal-close">
                <CloseIcon />
              </button>
            </div>
            <div className="um-modal-body">
              <div className="um-warning-alert">
                <div className="um-warning-icon"><AlertTriangleIcon /></div>
                <div>
                  <p>Are you sure you want to reset the password for user <strong>"{resetPasswordConfirm.username}"</strong>?</p>
                  <div className="um-penalty-preview">
                    <p className="um-warning-text">
                      <strong>This will:</strong><br/>
                      • Generate a new temporary password<br/>
                      • Invalidate the user's current password<br/>
                      • Require the user to set a new password on next login
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="um-modal-footer">
              <button 
                onClick={() => setResetPasswordConfirm(null)}
                className="um-btn-cancel"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  handleResetPassword(resetPasswordConfirm);
                  setResetPasswordConfirm(null);
                }}
                className="um-btn-reset-confirm"
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
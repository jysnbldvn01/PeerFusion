import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaHistory, 
  FaFilter, 
  FaSearch, 
  FaUser, 
  FaCog, 
  FaTrash, 
  FaLock, 
  FaUserSlash, 
  FaUserCheck,
  FaFlag,
  FaStar,
  FaCalendar,
  FaEye,
  FaTimes,
  FaBook,
  FaKey,
  FaShieldAlt,
  FaEnvelope,
  FaIdCard,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaGavel,
  FaClipboardCheck,
  FaTimesCircle
} from 'react-icons/fa';
import '../../css/activitylogs.css';

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    action: 'all',
    timeframe: 'all'
  });
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, filters, searchTerm]);

  const fetchLogs = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get('http://localhost:5000/api/admin/logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(response.data.logs || []);
      setError('');
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      setError('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    if (filters.action !== 'all') {
      filtered = filtered.filter(log => log.action === filters.action);
    }

    if (filters.timeframe !== 'all') {
      const now = new Date();
      let cutoffDate = new Date();

      switch (filters.timeframe) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          break;
      }

      filtered = filtered.filter(log => new Date(log.timestamp) >= cutoffDate);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        (log.admin_email && log.admin_email.toLowerCase().includes(searchLower)) ||
        (log.target_username && log.target_username.toLowerCase().includes(searchLower)) ||
        (log.target_user_email && log.target_user_email.toLowerCase().includes(searchLower)) ||
        (log.action && log.action.toLowerCase().includes(searchLower)) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(searchLower))
      );
    }

    setFilteredLogs(filtered);
  };

  const getActionIcon = (action) => {
    const iconConfig = {
      'USER_DEACTIVATED': <FaUserSlash className="al-icon deactivated" />,
      'USER_REACTIVATED': <FaUserCheck className="al-icon reactivated" />,
      'USER_DELETED': <FaTrash className="al-icon deleted" />,
      'ROLE_CHANGED': <FaUser className="al-icon role-changed" />,
      'PASSWORD_RESET': <FaKey className="al-icon password-reset" />,
      'MODERATOR_CREATED': <FaUser className="al-icon moderator-created" />,
      'MODERATOR_UPDATED': <FaCog className="al-icon moderator-updated" />,
      'MODERATOR_DELETED': <FaTrash className="al-icon moderator-deleted" />,
      'MODERATOR_PASSWORD_RESET': <FaKey className="al-icon password-reset" />,
      'REPORT_RESOLVED': <FaFlag className="al-icon report-resolved" />,
      'ADMIN_PASSWORD_CHANGED': <FaShieldAlt className="al-icon admin-password" />,
      'CATEGORY_CREATED': <FaBook className="al-icon category-created" />,
      'CATEGORY_UPDATED': <FaBook className="al-icon category-updated" />,
      'CATEGORY_DELETED': <FaBook className="al-icon category-deleted" />,
      'SUBJECT_CREATED': <FaStar className="al-icon subject-created" />,
      'SUBJECT_DELETED': <FaStar className="al-icon subject-deleted" />,
      'APPEAL_REVIEWED': <FaGavel className="al-icon appeal-reviewed" />,
      'USER_WARNED': <FaExclamationTriangle className="al-icon user-warned" />,
      'USER_SUSPENDED': <FaUserSlash className="al-icon user-suspended" />,
      'USER_BANNED': <FaTimesCircle className="al-icon user-banned" />
    };

    return iconConfig[action] || <FaHistory className="al-icon default" />;
  };

  const getActionColor = (action) => {
    const colorConfig = {
      'USER_DEACTIVATED': 'pending',
      'USER_REACTIVATED': 'resolved',
      'USER_DELETED': 'dismissed',
      'ROLE_CHANGED': 'reviewed',
      'PASSWORD_RESET': 'reviewed',
      'MODERATOR_CREATED': 'resolved',
      'MODERATOR_UPDATED': 'reviewed',
      'MODERATOR_DELETED': 'dismissed',
      'MODERATOR_PASSWORD_RESET': 'reviewed',
      'REPORT_RESOLVED': 'resolved',
      'ADMIN_PASSWORD_CHANGED': 'reviewed',
      'CATEGORY_CREATED': 'resolved',
      'CATEGORY_UPDATED': 'reviewed',
      'CATEGORY_DELETED': 'dismissed',
      'SUBJECT_CREATED': 'resolved',
      'SUBJECT_DELETED': 'dismissed',
      'APPEAL_REVIEWED': 'reviewed',
      'USER_WARNED': 'pending',
      'USER_SUSPENDED': 'dismissed',
      'USER_BANNED': 'dismissed'
    };

    return colorConfig[action] || 'pending';
  };

  const getActionLabel = (action) => {
    const labelConfig = {
      'USER_DEACTIVATED': 'User Deactivated',
      'USER_REACTIVATED': 'User Reactivated',
      'USER_DELETED': 'User Deleted',
      'ROLE_CHANGED': 'Role Changed',
      'PASSWORD_RESET': 'Password Reset',
      'MODERATOR_CREATED': 'Moderator Created',
      'MODERATOR_UPDATED': 'Moderator Updated',
      'MODERATOR_DELETED': 'Moderator Deleted',
      'MODERATOR_PASSWORD_RESET': 'Moderator Password Reset',
      'REPORT_RESOLVED': 'Report Resolved',
      'ADMIN_PASSWORD_CHANGED': 'Admin Password Changed',
      'CATEGORY_CREATED': 'Category Created',
      'CATEGORY_UPDATED': 'Category Updated',
      'CATEGORY_DELETED': 'Category Deleted',
      'SUBJECT_CREATED': 'Subject Created',
      'SUBJECT_DELETED': 'Subject Deleted',
      'APPEAL_REVIEWED': 'Appeal Reviewed',
      'USER_WARNED': 'User Warned',
      'USER_SUSPENDED': 'User Suspended',
      'USER_BANNED': 'User Banned'
    };

    return labelConfig[action] || action;
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDetailedTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getUniqueActions = () => {
    const actions = [...new Set(logs.map(log => log.action))];
    return actions.filter(action => action).sort();
  };

  const parseDetails = (details) => {
    try {
      if (typeof details === 'string') {
        return JSON.parse(details);
      }
      return details || {};
    } catch (e) {
      return { raw: details };
    }
  };

  const renderActionDetails = (action, details) => {
    const parsedDetails = parseDetails(details);
    
    switch (action) {
      case 'USER_DEACTIVATED':
      case 'USER_REACTIVATED':
        return (
          <div className="al-action-details">
            <div className="al-detail-item">
              <FaInfoCircle className="al-detail-item-icon" />
              <div className="al-detail-item-content">
                <span className="al-detail-item-label">Status Change</span>
                <span className="al-detail-item-value">
                  User was {action === 'USER_DEACTIVATED' ? 'deactivated' : 'reactivated'}
                </span>
              </div>
            </div>
            {parsedDetails.reason && (
              <div className="al-detail-item">
                <FaExclamationTriangle className="al-detail-item-icon" />
                <div className="al-detail-item-content">
                  <span className="al-detail-item-label">Reason</span>
                  <span className="al-detail-item-value">{parsedDetails.reason}</span>
                </div>
              </div>
            )}
          </div>
        );

      case 'USER_DELETED':
        return (
          <div className="al-action-details">
            <div className="al-detail-item">
              <FaExclamationTriangle className="al-detail-item-icon warning" />
              <div className="al-detail-item-content">
                <span className="al-detail-item-label">Permanent Action</span>
                <span className="al-detail-item-value">User account was permanently removed from the system</span>
              </div>
            </div>
            {parsedDetails.username && (
              <div className="al-detail-item">
                <FaUser className="al-detail-item-icon" />
                <div className="al-detail-item-content">
                  <span className="al-detail-item-label">Username</span>
                  <span className="al-detail-item-value">{parsedDetails.username}</span>
                </div>
              </div>
            )}
            {parsedDetails.email && (
              <div className="al-detail-item">
                <FaEnvelope className="al-detail-item-icon" />
                <div className="al-detail-item-content">
                  <span className="al-detail-item-label">Email</span>
                  <span className="al-detail-item-value">{parsedDetails.email}</span>
                </div>
              </div>
            )}
          </div>
        );

      case 'ROLE_CHANGED':
        return (
          <div className="al-action-details">
            <div className="al-detail-item">
              <FaUser className="al-detail-item-icon" />
              <div className="al-detail-item-content">
                <span className="al-detail-item-label">New Role</span>
                <span className="al-detail-item-value al-role-badge">{parsedDetails.newRole}</span>
              </div>
            </div>
          </div>
        );

      case 'PASSWORD_RESET':
      case 'MODERATOR_PASSWORD_RESET':
        return (
          <div className="al-action-details">
            <div className="al-detail-item">
              <FaLock className="al-detail-item-icon" />
              <div className="al-detail-item-content">
                <span className="al-detail-item-label">Security Action</span>
                <span className="al-detail-item-value">Password was reset by administrator</span>
              </div>
            </div>
            {parsedDetails.method && (
              <div className="al-detail-item">
                <FaCog className="al-detail-item-icon" />
                <div className="al-detail-item-content">
                  <span className="al-detail-item-label">Reset Method</span>
                  <span className="al-detail-item-value">{parsedDetails.method}</span>
                </div>
              </div>
            )}
            {parsedDetails.temporaryPassword && (
              <div className="al-detail-item">
                <FaKey className="al-detail-item-icon" />
                <div className="al-detail-item-content">
                  <span className="al-detail-item-label">Temporary Password</span>
                  <span className="al-detail-item-value al-temporary-password">
                    {parsedDetails.temporaryPassword}
                  </span>
                </div>
              </div>
            )}
          </div>
        );

      case 'MODERATOR_CREATED':
        return (
          <div className="al-action-details">
            <div className="al-detail-item">
              <FaUser className="al-detail-item-icon" />
              <div className="al-detail-item-content">
                <span className="al-detail-item-label">New Moderator</span>
                <span className="al-detail-item-value">New moderator account was created</span>
              </div>
            </div>
            {parsedDetails.username && (
              <div className="al-detail-item">
                <FaUser className="al-detail-item-icon" />
                <div className="al-detail-item-content">
                  <span className="al-detail-item-label">Username</span>
                  <span className="al-detail-item-value">{parsedDetails.username}</span>
                </div>
              </div>
            )}
            {parsedDetails.email && (
              <div className="al-detail-item">
                <FaEnvelope className="al-detail-item-icon" />
                <div className="al-detail-item-content">
                  <span className="al-detail-item-label">Email</span>
                  <span className="al-detail-item-value">{parsedDetails.email}</span>
                </div>
              </div>
            )}
          </div>
        );

      case 'MODERATOR_UPDATED':
        return (
          <div className="al-action-details">
            <div className="al-detail-item">
              <FaCog className="al-detail-item-icon" />
              <div className="al-detail-item-content">
                <span className="al-detail-item-label">Account Updated</span>
                <span className="al-detail-item-value">Moderator account details were modified</span>
              </div>
            </div>
            {parsedDetails.username && (
              <div className="al-detail-item">
                <FaUser className="al-detail-item-icon" />
                <div className="al-detail-item-content">
                  <span className="al-detail-item-label">Username</span>
                  <span className="al-detail-item-value">{parsedDetails.username}</span>
                </div>
              </div>
            )}
            {parsedDetails.email && (
              <div className="al-detail-item">
                <FaEnvelope className="al-detail-item-icon" />
                <div className="al-detail-item-content">
                  <span className="al-detail-item-label">Email</span>
                  <span className="al-detail-item-value">{parsedDetails.email}</span>
                </div>
              </div>
            )}
            {parsedDetails.password_changed && (
              <div className="al-detail-item">
                <FaCheckCircle className="al-detail-item-icon success" />
                <div className="al-detail-item-content">
                  <span className="al-detail-item-label">Password Change</span>
                  <span className="al-detail-item-value">Password was updated</span>
                </div>
              </div>
            )}
          </div>
        );

      case 'REPORT_RESOLVED':
        return (
          <div className="al-action-details">
            <div className="al-detail-item">
              <FaFlag className="al-detail-item-icon" />
              <div className="al-detail-item-content">
                <span className="al-detail-item-label">Report Action</span>
                <span className="al-detail-item-value">User report was reviewed and resolved</span>
              </div>
            </div>
            {parsedDetails.status && (
              <div className="al-detail-item">
                <FaInfoCircle className="al-detail-item-icon" />
                <div className="al-detail-item-content">
                  <span className="al-detail-item-label">Resolution Status</span>
                  <span className="al-detail-item-value al-status-badge al-status-resolved">
                    {parsedDetails.status}
                  </span>
                </div>
              </div>
            )}
            {parsedDetails.resolution_notes && (
              <div className="al-detail-item">
                <FaInfoCircle className="al-detail-item-icon" />
                <div className="al-detail-item-content">
                  <span className="al-detail-item-label">Resolution Notes</span>
                  <span className="al-detail-item-value">{parsedDetails.resolution_notes}</span>
                </div>
              </div>
            )}
          </div>
        );

      case 'APPEAL_REVIEWED':
        return (
          <div className="al-action-details">
            <div className="al-detail-item">
              <FaGavel className="al-detail-item-icon" />
              <div className="al-detail-item-content">
                <span className="al-detail-item-label">Appeal Review</span>
                <span className="al-detail-item-value">User appeal was reviewed and processed</span>
              </div>
            </div>
            {parsedDetails.appeal_type && (
              <div className="al-detail-item">
                <FaClipboardCheck className="al-detail-item-icon" />
                <div className="al-detail-item-content">
                  <span className="al-detail-item-label">Appeal Type</span>
                  <span className="al-detail-item-value al-appeal-type">
                    {parsedDetails.appeal_type.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
            )}
            {parsedDetails.status && (
              <div className="al-detail-item">
                <FaInfoCircle className="al-detail-item-icon" />
                <div className="al-detail-item-content">
                  <span className="al-detail-item-label">Appeal Status</span>
                  <span className={`al-detail-item-value al-status-badge al-status-${parsedDetails.status === 'approved' ? 'resolved' : 'dismissed'}`}>
                    {parsedDetails.status.toUpperCase()}
                  </span>
                </div>
              </div>
            )}
            {parsedDetails.resolution_notes && (
              <div className="al-detail-item">
                <FaInfoCircle className="al-detail-item-icon" />
                <div className="al-detail-item-content">
                  <span className="al-detail-item-label">Resolution Notes</span>
                  <span className="al-detail-item-value">{parsedDetails.resolution_notes}</span>
                </div>
              </div>
            )}
            {parsedDetails.user_action_applied && (
              <div className="al-detail-item">
                <FaCheckCircle className="al-detail-item-icon success" />
                <div className="al-detail-item-content">
                  <span className="al-detail-item-label">User Action Applied</span>
                  <span className="al-detail-item-value">Yes - User account was modified based on appeal decision</span>
                </div>
              </div>
            )}
            {parsedDetails.user_action_details && (
              <div className="al-detail-item">
                <FaCog className="al-detail-item-icon" />
                <div className="al-detail-item-content">
                  <span className="al-detail-item-label">Action Details</span>
                  <span className="al-detail-item-value">{parsedDetails.user_action_details.details}</span>
                </div>
              </div>
            )}
          </div>
        );

      case 'USER_WARNED':
      case 'USER_SUSPENDED':
      case 'USER_BANNED':
        return (
          <div className="al-action-details">
            <div className="al-detail-item">
              <FaExclamationTriangle className="al-detail-item-icon warning" />
              <div className="al-detail-item-content">
                <span className="al-detail-item-label">Penalty Applied</span>
                <span className="al-detail-item-value">
                  {action === 'USER_WARNED' ? 'Warning issued' : 
                   action === 'USER_SUSPENDED' ? 'Account suspended' : 
                   'Account permanently banned'}
                </span>
              </div>
            </div>
            {parsedDetails.report_type && (
              <div className="al-detail-item">
                <FaFlag className="al-detail-item-icon" />
                <div className="al-detail-item-content">
                  <span className="al-detail-item-label">Report Type</span>
                  <span className="al-detail-item-value">{parsedDetails.report_type}</span>
                </div>
              </div>
            )}
            {parsedDetails.severity && (
              <div className="al-detail-item">
                <FaInfoCircle className="al-detail-item-icon" />
                <div className="al-detail-item-content">
                  <span className="al-detail-item-label">Severity</span>
                  <span className="al-detail-item-value al-severity-badge">{parsedDetails.severity}</span>
                </div>
              </div>
            )}
            {parsedDetails.previous_strikes !== undefined && (
              <div className="al-detail-item">
                <FaInfoCircle className="al-detail-item-icon" />
                <div className="al-detail-item-content">
                  <span className="al-detail-item-label">Strike Progression</span>
                  <span className="al-detail-item-value">
                    {parsedDetails.previous_strikes} → {parsedDetails.new_strikes}
                  </span>
                </div>
              </div>
            )}
            {parsedDetails.suspended_until && (
              <div className="al-detail-item">
                <FaCalendar className="al-detail-item-icon" />
                <div className="al-detail-item-content">
                  <span className="al-detail-item-label">Suspended Until</span>
                  <span className="al-detail-item-value">
                    {new Date(parsedDetails.suspended_until).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        );

      case 'CATEGORY_CREATED':
      case 'CATEGORY_UPDATED':
      case 'CATEGORY_DELETED':
      case 'SUBJECT_CREATED':
      case 'SUBJECT_DELETED':
        const actionType = action.includes('CATEGORY') ? 'Category' : 'Subject';
        const actionVerb = action.includes('CREATED') ? 'created' : action.includes('UPDATED') ? 'updated' : 'deleted';
        
        return (
          <div className="al-action-details">
            <div className="al-detail-item">
              <FaBook className="al-detail-item-icon" />
              <div className="al-detail-item-content">
                <span className="al-detail-item-label">Content Management</span>
                <span className="al-detail-item-value">{actionType} was {actionVerb}</span>
              </div>
            </div>
            {parsedDetails.name && (
              <div className="al-detail-item">
                <FaInfoCircle className="al-detail-item-icon" />
                <div className="al-detail-item-content">
                  <span className="al-detail-item-label">{actionType} Name</span>
                  <span className="al-detail-item-value">{parsedDetails.name}</span>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="al-action-details">
            <div className="al-detail-item">
              <FaInfoCircle className="al-detail-item-icon" />
              <div className="al-detail-item-content">
                <span className="al-detail-item-label">Action Details</span>
                <span className="al-detail-item-value">
                  {Object.keys(parsedDetails).length > 0 ? (
                    <pre className="al-details-json-fallback">
                      {JSON.stringify(parsedDetails, null, 2)}
                    </pre>
                  ) : (
                    'No additional details available'
                  )}
                </span>
              </div>
            </div>
          </div>
        );
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      action: 'all',
      timeframe: 'all'
    });
  };

  if (loading) {
    return (
      <div className="activity-logs">
        <div className="al-loading">
          <div className="al-loading-spinner"></div>
          <p>Loading activity logs...</p>
        </div>
      </div>
    );
  }

  const totalLogs = logs.length;
  const uniqueAdmins = [...new Set(logs.map(log => log.admin_id))].length;

  return (
    <div className="activity-logs">
      {/* Header */}
      <div className="al-header">
        <div className="al-header-content">
          <div className="al-title-section">
            <div className="al-header-icon">
              <FaHistory />
            </div>
            <div>
              <h1 className="al-main-title">Activity Logs</h1>
              <p className="al-subtitle">Track all administrative actions and system changes</p>
            </div>
          </div>
          <div className="al-stats">
            <div className="al-stat-card">
              <FaHistory className="al-stat-icon total" />
              <span className="al-stat-number total">{totalLogs}</span>
              <span className="al-stat-label">Total Actions</span>
            </div>
            <div className="al-stat-card">
              <FaUser className="al-stat-icon resolved" />
              <span className="al-stat-number resolved">{uniqueAdmins}</span>
              <span className="al-stat-label">Admins</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="al-toolbar">
        <div className="al-filters-container">
          <div className="al-filter-group">
            <label>
              <FaFilter /> Action Type:
            </label>
            <select 
              className="al-filter-select"
              value={filters.action} 
              onChange={(e) => setFilters({...filters, action: e.target.value})}
            >
              <option value="all">All Actions ({totalLogs})</option>
              {getUniqueActions().map(action => {
                const count = logs.filter(log => log.action === action).length;
                return (
                  <option key={action} value={action}>
                    {getActionLabel(action)} ({count})
                  </option>
                );
              })}
            </select>
          </div>
          
          <div className="al-filter-group">
            <label>
              <FaCalendar /> Timeframe:
            </label>
            <select 
              className="al-filter-select"
              value={filters.timeframe} 
              onChange={(e) => setFilters({...filters, timeframe: e.target.value})}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
              <option value="year">Past Year</option>
            </select>
          </div>
        </div>

        <div className="al-search-container">
          <FaSearch className="al-search-icon" />
          <input
            type="text"
            className="al-search-input"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              className="al-search-clear"
              onClick={clearFilters}
              title="Clear search"
            >
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      {/* Activity Logs Table */}
      <div className="al-table-container">
        {filteredLogs.length > 0 ? (
          <table className="al-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Action</th>
                <th>Admin</th>
                <th>Target User</th>
                <th>Details</th>
                <th>Timestamp</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => {
                const details = parseDetails(log.details);
                const actionColor = getActionColor(log.action);
                
                return (
                  <tr key={log.id}>
                    <td>
                      #{log.id}
                    </td>
                    <td>
                      <div className="al-action-cell">
                        {getActionIcon(log.action)}
                        <span className={`al-status-badge al-status-${actionColor}`}>
                          {getActionLabel(log.action)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="al-user-info">
                        <span className="al-user-name">
                          <FaUser /> {log.admin_email}
                        </span>
                        <span className="al-user-id">
                          ID: {log.admin_id}
                        </span>
                      </div>
                    </td>
                    <td>
                      {log.target_username ? (
                        <div className="al-user-info">
                          <span className="al-user-name">
                            <FaUser /> {log.target_username}
                          </span>
                          <span className="al-user-email">
                            <FaEnvelope /> {log.target_user_email || 'No email'}
                          </span>
                        </div>
                      ) : (
                        <span className="al-no-target">N/A</span>
                      )}
                    </td>
                    <td className="al-description-cell">
                      <div className="al-description-truncated">
                        {log.action === 'APPEAL_REVIEWED' && details.status ? 
                          `Appeal ${details.status}` : 
                          Object.keys(details).length > 0 ? 
                          'View details for more information' : 'No details'
                        }
                      </div>
                    </td>
                    <td>
                      <div className="al-user-info">
                        <span className="al-user-name">
                          <FaCalendar /> {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="al-action-buttons">
                        <button 
                          className="al-btn-view"
                          title="View details"
                          onClick={() => setSelectedLog(log)}
                        >
                          <FaEye /> View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="al-no-data">
            <FaHistory className="al-no-data-icon" />
            <h3>No Activity Logs Found</h3>
            <p>
              {logs.length === 0 
                ? "There are no activity logs recorded yet." 
                : "No logs match your current filters. Try adjusting your search criteria."
              }
            </p>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="al-error-banner">
          <div className="al-error-content">
            <FaTimes className="al-error-icon" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="al-error-close">
            <FaTimes />
          </button>
        </div>
      )}

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="al-modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="al-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="al-modal-header">
              <div className="al-modal-title-section">
                {getActionIcon(selectedLog.action)}
                <div>
                  <h2 className="al-modal-title">Activity Log Details</h2>
                  <p className="al-modal-subtitle">Complete information for log entry #{selectedLog.id}</p>
                </div>
              </div>
              <button 
                className="al-modal-close"
                onClick={() => setSelectedLog(null)}
                title="Close modal"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="al-modal-body">
              <div className="al-log-details-grid">
                <div className="al-detail-section">
                  <h3 className="al-detail-section-title">Basic Information</h3>
                  <div className="al-detail-row">
                    <div className="al-detail-label">Log ID</div>
                    <div className="al-detail-value">#{selectedLog.id}</div>
                  </div>
                  <div className="al-detail-row">
                    <div className="al-detail-label">Action Type</div>
                    <div className="al-detail-value">
                      <span className={`al-status-badge al-status-${getActionColor(selectedLog.action)}`}>
                        {getActionLabel(selectedLog.action)}
                      </span>
                    </div>
                  </div>
                  <div className="al-detail-row">
                    <div className="al-detail-label">Timestamp</div>
                    <div className="al-detail-value">
                      <FaCalendar className="al-detail-icon" />
                      {formatDetailedTimestamp(selectedLog.timestamp)}
                    </div>
                  </div>
                </div>

                <div className="al-detail-section">
                  <h3 className="al-detail-section-title">Admin Information</h3>
                  <div className="al-detail-row">
                    <div className="al-detail-label">Admin Email</div>
                    <div className="al-detail-value">
                      <FaEnvelope className="al-detail-icon" />
                      {selectedLog.admin_email}
                    </div>
                  </div>
                  <div className="al-detail-row">
                    <div className="al-detail-label">Admin ID</div>
                    <div className="al-detail-value">
                      <FaIdCard className="al-detail-icon" />
                      {selectedLog.admin_id}
                    </div>
                  </div>
                </div>

                {selectedLog.target_username && (
                  <div className="al-detail-section">
                    <h3 className="al-detail-section-title">Target User</h3>
                    <div className="al-detail-row">
                      <div className="al-detail-label">Username</div>
                      <div className="al-detail-value">
                        <FaUser className="al-detail-icon" />
                        {selectedLog.target_username}
                      </div>
                    </div>
                    <div className="al-detail-row">
                      <div className="al-detail-label">Email</div>
                      <div className="al-detail-value">
                        <FaEnvelope className="al-detail-icon" />
                        {selectedLog.target_user_email || 'No email provided'}
                      </div>
                    </div>
                    <div className="al-detail-row">
                      <div className="al-detail-label">User ID</div>
                      <div className="al-detail-value">
                        <FaIdCard className="al-detail-icon" />
                        {selectedLog.target_user_id}
                      </div>
                    </div>
                  </div>
                )}

                <div className="al-detail-section al-detail-section-full">
                  <h3 className="al-detail-section-title">Action Information</h3>
                  {renderActionDetails(selectedLog.action, selectedLog.details)}
                </div>
              </div>
            </div>

            <div className="al-modal-footer">
              <button 
                onClick={() => setSelectedLog(null)}
                className="al-btn al-btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
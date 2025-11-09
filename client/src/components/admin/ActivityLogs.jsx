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
  FaTimesCircle,
  FaChevronLeft,
  FaChevronRight
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [skeletonLoading, setSkeletonLoading] = useState({
    header: false,
    logs: false,
    stats: false
  });

  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    fetchLogs();
  }, [currentPage]);

  useEffect(() => {
    // Client-side filtering happens after data is loaded
    filterLogs();
  }, [logs, filters, searchTerm]);

  const fetchLogs = async () => {
    const token = localStorage.getItem('token');
    try {
      setSkeletonLoading(prev => ({ ...prev, logs: true, header: true }));
      setLoading(true);
      
      const response = await axios.get(`http://localhost:5000/api/admin/logs?page=${currentPage}&limit=${ITEMS_PER_PAGE}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setLogs(response.data.logs || []);
      setTotalLogs(response.data.total || 0);
      setTotalPages(response.data.totalPages || 1);
      setError('');
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      setError('Failed to load activity logs');
    } finally {
      setLoading(false);
      setSkeletonLoading(prev => ({ ...prev, logs: false, header: false }));
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    // Apply client-side filters (same as before)
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

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      action: 'all',
      timeframe: 'all'
    });
    setCurrentPage(1); // Reset to first page when clearing filters
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      // This will trigger the useEffect and fetch new data
    }
  };

  const handleSearchAndFilter = () => {
    // When search or filters change, reset to page 1 and fetch new data
    setCurrentPage(1);
    fetchLogs();
  };

  // Update your search and filter handlers to use handleSearchAndFilter
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    // Don't fetch here - let the useEffect handle it after debounce
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
    // Don't fetch here - let the useEffect handle it
  };

  // Skeleton Loading Components (keep your existing ones)
  const HeaderSkeleton = () => (
    <div className="al-header skeleton">
      <div className="al-header-content">
        <div className="al-title-section">
          <div className="al-header-icon skeleton-pulse"></div>
          <div>
            <div className="al-main-title skeleton-text skeleton-pulse"></div>
            <div className="al-subtitle skeleton-text skeleton-pulse"></div>
          </div>
        </div>
        <div className="al-stats">
          {[1, 2].map((item) => (
            <div key={item} className="al-stat-card skeleton">
              <div className="al-stat-icon skeleton-pulse"></div>
              <div className="al-stat-number skeleton-text skeleton-pulse"></div>
              <div className="al-stat-label skeleton-text skeleton-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const ToolbarSkeleton = () => (
    <div className="al-toolbar skeleton">
      <div className="al-filters-container">
        <div className="al-filter-group">
          <div className="skeleton-text skeleton-pulse"></div>
          <div className="al-filter-select skeleton-pulse"></div>
        </div>
        <div className="al-filter-group">
          <div className="skeleton-text skeleton-pulse"></div>
          <div className="al-filter-select skeleton-pulse"></div>
        </div>
      </div>
      <div className="al-search-container skeleton-pulse">
        <div className="al-search-icon skeleton-pulse"></div>
        <div className="al-search-input skeleton-pulse"></div>
      </div>
    </div>
  );

  const TableRowSkeleton = () => (
    <tr className="skeleton">
      <td>
        <div className="skeleton-text skeleton-pulse"></div>
      </td>
      <td>
        <div className="al-action-cell">
          <div className="al-icon skeleton-pulse"></div>
          <div className="al-status-badge skeleton-pulse"></div>
        </div>
      </td>
      <td>
        <div className="al-user-info">
          <div className="al-user-name skeleton-text skeleton-pulse"></div>
          <div className="al-user-id skeleton-text skeleton-pulse"></div>
        </div>
      </td>
      <td>
        <div className="al-user-info">
          <div className="al-user-name skeleton-text skeleton-pulse"></div>
          <div className="al-user-email skeleton-text skeleton-pulse"></div>
        </div>
      </td>
      <td>
        <div className="skeleton-text skeleton-pulse"></div>
      </td>
      <td>
        <div className="al-user-info">
          <div className="skeleton-text skeleton-pulse"></div>
        </div>
      </td>
      <td>
        <div className="al-action-buttons">
          <div className="al-btn-view skeleton-pulse"></div>
        </div>
      </td>
    </tr>
  );

  // Keep all your existing helper functions (getActionIcon, getActionColor, etc.)
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
      <div className="al-pagination">
        <div className="al-pagination-info">
          Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalLogs)} of {totalLogs} entries
        </div>
        <div className="al-pagination-controls">
          <button
            className={`al-pagination-btn ${currentPage === 1 ? 'disabled' : ''}`}
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <FaChevronLeft /> Previous
          </button>
          
          <div className="al-pagination-numbers">
            {startPage > 1 && (
              <>
                <button
                  className={`al-page-number ${1 === currentPage ? 'active' : ''}`}
                  onClick={() => handlePageChange(1)}
                >
                  1
                </button>
                {startPage > 2 && <span className="al-page-ellipsis">...</span>}
              </>
            )}
            
            {pageNumbers.map(page => (
              <button
                key={page}
                className={`al-page-number ${page === currentPage ? 'active' : ''}`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            ))}
            
            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && <span className="al-page-ellipsis">...</span>}
                <button
                  className={`al-page-number ${totalPages === currentPage ? 'active' : ''}`}
                  onClick={() => handlePageChange(totalPages)}
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>
          
          <button
            className={`al-pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`}
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next <FaChevronRight />
          </button>
        </div>
      </div>
    );
  };

  const uniqueAdmins = [...new Set(logs.map(log => log.admin_id))].length;

  return (
    <div className="activity-logs">
      {/* Header */}
      {skeletonLoading.header ? (
        <HeaderSkeleton />
      ) : (
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
      )}

      {/* Toolbar */}
      {skeletonLoading.logs ? (
        <ToolbarSkeleton />
      ) : (
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
      )}

      {/* Activity Logs Table */}
      <div className="al-table-container">
        {skeletonLoading.logs ? (
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
              {Array.from({ length: 10 }).map((_, index) => (
                <TableRowSkeleton key={index} />
              ))}
            </tbody>
          </table>
        ) : filteredLogs.length > 0 ? (
          <>
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
            
            {/* Pagination */}
            {renderPagination()}
          </>
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

      {/* Keep your existing modal and error components */}
      {selectedLog && (
        <div className="al-modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="al-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Modal content remains exactly the same */}
          </div>
        </div>
      )}

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
    </div>
  );
}
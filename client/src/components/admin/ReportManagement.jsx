import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaEye, 
  FaCheck, 
  FaTimes, 
  FaClock, 
  FaFilter, 
  FaExclamationTriangle,
  FaSearch,
  FaFlag,
  FaUser,
  FaEnvelope,
  FaCalendar,
  FaFileAlt,
  FaDownload,
  FaImage,
  FaVideo,
  FaFile,
  FaShieldAlt,
  FaBan,
  FaComment,
  FaComments,
  FaVideo as FaVideoCall,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import '../../css/reportmanagement.css';

// Skeleton Loading Components
const HeaderSkeleton = () => (
  <div className="rm-header skeleton">
    <div className="rm-header-content">
      <div className="rm-title-section">
        <div className="rm-header-icon skeleton-pulse"></div>
        <div>
          <div className="rm-main-title skeleton-text skeleton-pulse"></div>
          <div className="rm-subtitle skeleton-text skeleton-pulse"></div>
        </div>
      </div>
      <div className="rm-stats">
        {[1, 2, 3].map((item) => (
          <div key={item} className="rm-stat-card skeleton">
            <div className="rm-stat-icon skeleton-pulse"></div>
            <div className="rm-stat-info">
              <div className="rm-stat-number skeleton-text skeleton-pulse"></div>
              <div className="rm-stat-label skeleton-text skeleton-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ToolbarSkeleton = () => (
  <div className="rm-toolbar skeleton">
    <div className="rm-filters-container">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="rm-filter-group">
          <div className="skeleton-text skeleton-pulse"></div>
          <div className="rm-filter-select skeleton-pulse"></div>
        </div>
      ))}
    </div>
    <div className="rm-search-container skeleton-pulse">
      <div className="rm-search-icon skeleton-pulse"></div>
      <div className="rm-search-input skeleton-pulse"></div>
    </div>
  </div>
);

const TableRowSkeleton = () => (
  <tr className="skeleton">
    <td>
      <div className="skeleton-text skeleton-pulse"></div>
    </td>
    <td>
      <div className="rm-user-info">
        <div className="rm-user-name skeleton-text skeleton-pulse"></div>
        <div className="rm-user-email skeleton-text skeleton-pulse"></div>
      </div>
    </td>
    <td>
      <div className="rm-user-info">
        <div className="rm-user-name skeleton-text skeleton-pulse"></div>
        <div className="rm-user-email skeleton-text skeleton-pulse"></div>
      </div>
    </td>
    <td>
      <div className="skeleton-text skeleton-pulse"></div>
    </td>
    <td>
      <div className="skeleton-text skeleton-pulse" style={{ width: '80px', height: '24px' }}></div>
    </td>
    <td>
      <div className="skeleton-text skeleton-pulse"></div>
    </td>
    <td>
      <div className="skeleton-text skeleton-pulse" style={{ width: '60px' }}></div>
    </td>
    <td>
      <div className="skeleton-text skeleton-pulse" style={{ width: '80px', height: '24px' }}></div>
    </td>
    <td>
      <div className="skeleton-text skeleton-pulse" style={{ width: '100px', height: '24px' }}></div>
    </td>
    <td>
      <div className="rm-user-info">
        <div className="skeleton-text skeleton-pulse"></div>
      </div>
    </td>
    <td>
      <div className="rm-action-buttons">
        <div className="rm-btn-view skeleton-pulse"></div>
      </div>
    </td>
  </tr>
);

const PaginationSkeleton = () => (
  <div className="rm-pagination skeleton">
    <div className="rm-pagination-info skeleton-text skeleton-pulse"></div>
    <div className="rm-pagination-controls">
      <div className="rm-pagination-btn skeleton-pulse"></div>
      <div className="rm-pagination-numbers">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="rm-page-number skeleton-pulse"></div>
        ))}
      </div>
      <div className="rm-pagination-btn skeleton-pulse"></div>
    </div>
  </div>
);

const ReportManagement = () => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [applyPenalty, setApplyPenalty] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [filters, setFilters] = useState({
    status: 'all',
    reportType: 'all',
    severity: 'all',
    source: 'all'
  });

  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReports, setTotalReports] = useState(0);
  const ITEMS_PER_PAGE = 50;

  // Skeleton loading state
  const [skeletonLoading, setSkeletonLoading] = useState({
    header: true,
    toolbar: true,
    table: true,
    pagination: true
  });

  const API_BASE_URL = process.env.REACT_APP_API_URL;

  const getExpectedConsequence = (currentStrikes, reportType, severity) => {
    const zeroToleranceTypes = ['Hate Speech', 'Sexual Content', 'Violence or Threats', 'Self-harm'];
    
    if (zeroToleranceTypes.includes(reportType)) {
      return 'IMMEDIATE PERMANENT BAN - Zero-tolerance violation';
    }
    
    if (severity === 'high') {
      if (currentStrikes <= 1) return `Strike ${currentStrikes + 1}/3 - Account Warning`;
      if (currentStrikes === 2) return 'Strike 3/3 - 30-day suspension';
      return 'Additional suspension or permanent ban';
    }
    
    // Standard violations
    if (currentStrikes === 0) return 'Strike 1/3 - First warning';
    if (currentStrikes === 1) return 'Strike 2/3 - Final warning';
    if (currentStrikes === 2) return 'Strike 3/3 - 7-day suspension';
    if (currentStrikes === 3) return 'Strike 4/5 - 30-day suspension';
    if (currentStrikes >= 4) return 'Strike 5/5 - Permanent ban';
    
    return 'Warning issued';
  };

  // Evidence viewer state
  const [evidenceViewer, setEvidenceViewer] = useState({
    isOpen: false,
    evidence: [],
    currentIndex: 0
  });

  useEffect(() => {
    fetchReports();
  }, [currentPage]);

  useEffect(() => {
    filterAndSortReports();
  }, [reports, filters, searchTerm, sortConfig]);

  const fetchReports = async () => {
    setSkeletonLoading({
      header: true,
      toolbar: true,
      table: true,
      pagination: true
    });
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/admin/reports?page=${currentPage}&limit=${ITEMS_PER_PAGE}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let reportsData = [];
      let totalCount = 0;

      // Handle both array response and paginated response
      if (Array.isArray(response.data)) {
        reportsData = response.data;
        totalCount = response.data.length;
      } else if (response.data.reports) {
        // Paginated response
        reportsData = response.data.reports;
        totalCount = response.data.total || response.data.reports.length;
      } else if (response.data.success && response.data.reports) {
        reportsData = response.data.reports;
        totalCount = response.data.total || response.data.reports.length;
      } else {
        reportsData = response.data;
        totalCount = response.data.length;
      }
      
      // Sort reports by created_at in descending order (newest first)
      const sortedReports = reportsData.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      
      setReports(sortedReports);
      setTotalReports(totalCount);
      setTotalPages(Math.ceil(totalCount / ITEMS_PER_PAGE));
    } catch (error) {
      console.error('Error fetching reports:', error);
      window.pfToast?.error?.('Failed to load reports: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
      setSkeletonLoading({
        header: false,
        toolbar: false,
        table: false,
        pagination: false
      });
    }
  };

const filterAndSortReports = () => {
  let filtered = reports;

  // Apply status filter
  if (filters.status !== 'all') {
    filtered = filtered.filter(report => report.status === filters.status);
  }

  // Apply report type filter
  if (filters.reportType !== 'all') {
    filtered = filtered.filter(report => report.report_type === filters.reportType);
  }

  // Apply severity filter
  if (filters.severity !== 'all') {
    filtered = filtered.filter(report => report.severity === filters.severity);
  }

  // Apply source filter
  if (filters.source !== 'all') {
    filtered = filtered.filter(report => report.source === filters.source);
  }

  // Apply search filter
  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    filtered = filtered.filter(report => 
      (report.reporter_username && report.reporter_username.toLowerCase().includes(searchLower)) ||
      (report.reported_username && report.reported_username.toLowerCase().includes(searchLower)) ||
      (report.report_type && report.report_type.toLowerCase().includes(searchLower)) ||
      (report.description && report.description.toLowerCase().includes(searchLower)) ||
      (report.source && report.source.toLowerCase().includes(searchLower))
    );
  }

  // No need for client-side sorting - backend already returns newest first
  setFilteredReports(filtered);
};

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort />;
    return sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  const updateReportStatus = async (reportId, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE_URL}/api/admin/reports/${reportId}/status`, 
        { 
          status, 
          resolution_notes: resolutionNotes,
          apply_penalty: applyPenalty
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSelectedReport(null);
      setResolutionNotes('');
      setApplyPenalty(false);
      fetchReports();
      
      let message = `Report marked as ${status} successfully`;
      if (applyPenalty && status === 'resolved') {
        message += ' and penalty applied';
      }
      
      window.pfToast?.success?.(message);
    } catch (error) {
      console.error('Error updating report:', error);
      window.pfToast?.error?.('Failed to update report: ' + (error.response?.data?.error || error.message));
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { 
        color: 'rm-status-pending', 
        icon: <FaClock className="rm-status-icon" />,
        label: 'Pending'
      },
      reviewed: { 
        color: 'rm-status-reviewed', 
        icon: <FaEye className="rm-status-icon" />,
        label: 'Reviewed'
      },
      resolved: { 
        color: 'rm-status-resolved', 
        icon: <FaCheck className="rm-status-icon" />,
        label: 'Resolved'
      },
      dismissed: { 
        color: 'rm-status-dismissed', 
        icon: <FaTimes className="rm-status-icon" />,
        label: 'Dismissed'
      }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <span className={`rm-status-badge ${config.color}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  const getSeverityBadge = (severity) => {
    const severityConfig = {
      high: { 
        color: 'rm-severity-high', 
        icon: <FaExclamationTriangle className="rm-severity-icon" />,
        label: 'High'
      },
      medium: { 
        color: 'rm-severity-medium', 
        icon: <FaExclamationTriangle className="rm-severity-icon" />,
        label: 'Medium'
      },
      low: { 
        color: 'rm-severity-low', 
        icon: <FaFlag className="rm-severity-icon" />,
        label: 'Low'
      }
    };
    
    const config = severityConfig[severity] || severityConfig.low;
    
    return (
      <span className={`rm-severity-badge ${config.color}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  const getSourceBadge = (source) => {
    const sourceConfig = {
      chat_page: { 
        color: 'rm-source-chat', 
        icon: <FaComments className="rm-source-icon" />,
        label: '  Chat Page'
      },
      chat_message: { 
        color: 'rm-source-message', 
        icon: <FaComment className="rm-source-icon" />,
        label: '  Message'
      },
      video_call: { 
        color: 'rm-source-video', 
        icon: <FaVideoCall className="rm-source-icon" />,
        label: '  Video Call'
      }
    };
    
    const config = sourceConfig[source] || { 
      color: 'rm-source-unknown', 
      icon: <FaFileAlt className="rm-source-icon" />,
      label: source || '  Unknown'
    };
    
    return (
      <span className={`rm-source-badge ${config.color}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  const getReportTypes = () => {
    const types = [...new Set(reports.map(report => report.report_type))];
    return types.filter(type => type).sort();
  };

  const getSeverityTypes = () => {
    return ['high', 'medium', 'low'];
  };

  const getSourceTypes = () => {
    const sources = [...new Set(reports.map(report => report.source))];
    return sources.filter(source => source).sort();
  };

  const getStatusCounts = () => {
    return {
      total: totalReports,
      pending: reports.filter(r => r.status === 'pending').length,
      reviewed: reports.filter(r => r.status === 'reviewed').length,
      resolved: reports.filter(r => r.status === 'resolved').length,
      dismissed: reports.filter(r => r.status === 'dismissed').length
    };
  };

  const getSourceCounts = () => {
    return {
      chat_page: reports.filter(r => r.source === 'chat_page').length,
      chat_message: reports.filter(r => r.source === 'chat_message').length,
      video_call: reports.filter(r => r.source === 'video_call').length
    };
  };

  const getEvidenceIcon = (evidenceType) => {
    switch (evidenceType) {
      case 'image':
        return <FaImage className="rm-evidence-icon" />;
      case 'video':
        return <FaVideo className="rm-evidence-icon" />;
      case 'document':
        return <FaFile className="rm-evidence-icon" />;
      default:
        return <FaFileAlt className="rm-evidence-icon" />;
    }
  };

  const openEvidenceViewer = (evidence, startIndex = 0) => {
    setEvidenceViewer({
      isOpen: true,
      evidence: evidence,
      currentIndex: startIndex
    });
  };

  const closeEvidenceViewer = () => {
    setEvidenceViewer({
      isOpen: false,
      evidence: [],
      currentIndex: 0
    });
  };

  const nextEvidence = () => {
    setEvidenceViewer(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % prev.evidence.length
    }));
  };

  const prevEvidence = () => {
    setEvidenceViewer(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex - 1 + prev.evidence.length) % prev.evidence.length
    }));
  };

  const downloadEvidence = async (evidence) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/reports/evidence/${evidence.filename}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = evidence.originalname;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading evidence:', error);
      window.pfToast?.error?.('Failed to download evidence');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return formatDate(dateString);
  };

  // Pagination functions
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
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
      <div className="rm-pagination">
        <div className="rm-pagination-info">
          Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalReports)} of {totalReports} reports
        </div>
        <div className="rm-pagination-controls">
          <button
            className={`rm-pagination-btn ${currentPage === 1 ? 'disabled' : ''}`}
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <FaChevronLeft /> Previous
          </button>
          
          <div className="rm-pagination-numbers">
            {startPage > 1 && (
              <>
                <button
                  className={`rm-page-number ${1 === currentPage ? 'active' : ''}`}
                  onClick={() => handlePageChange(1)}
                >
                  1
                </button>
                {startPage > 2 && <span className="rm-page-ellipsis">...</span>}
              </>
            )}
            
            {pageNumbers.map(page => (
              <button
                key={page}
                className={`rm-page-number ${page === currentPage ? 'active' : ''}`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            ))}
            
            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && <span className="rm-page-ellipsis">...</span>}
                <button
                  className={`rm-page-number ${totalPages === currentPage ? 'active' : ''}`}
                  onClick={() => handlePageChange(totalPages)}
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>
          
          <button
            className={`rm-pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`}
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next <FaChevronRight />
          </button>
        </div>
      </div>
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      status: 'all',
      reportType: 'all',
      severity: 'all',
      source: 'all'
    });
    setCurrentPage(1);
  };

  const statusCounts = getStatusCounts();
  const sourceCounts = getSourceCounts();

  return (
    <div className="report-management">
      {/* Header Section */}
      {skeletonLoading.header ? (
        <HeaderSkeleton />
      ) : (
        <div className="rm-header">
          <div className="rm-header-content">
            <div className="rm-title-section">
              <FaFlag className="rm-header-icon" />
              <div>
                <h1 className="rm-main-title">Report Management</h1>
                <p className="rm-subtitle">Manage and resolve user reports with evidence</p>
              </div>
            </div>
            
            <div className="rm-stats">
              <div className="rm-stat-card">
                <FaFlag className="rm-stat-icon total" />
                <span className="rm-stat-number total">{statusCounts.total}</span>
                <span className="rm-stat-label">Total Reports</span>
              </div>
              <div className="rm-stat-card">
                <FaClock className="rm-stat-icon pending" />
                <span className="rm-stat-number pending">{statusCounts.pending}</span>
                <span className="rm-stat-label">Pending</span>
              </div>
              <div className="rm-stat-card">
                <FaExclamationTriangle className="rm-stat-icon high" />
                <span className="rm-stat-number high">
                  {reports.filter(r => r.severity === 'high').length}
                </span>
                <span className="rm-stat-label">High Severity</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar Section */}
      {skeletonLoading.toolbar ? (
        <ToolbarSkeleton />
      ) : (
        <div className="rm-toolbar">
          <div className="rm-filters-container">
            <div className="rm-filter-group">
              <label>
                <FaFilter /> Status:
              </label>
              <select 
                className="rm-filter-select"
                value={filters.status} 
                onChange={(e) => setFilters({...filters, status: e.target.value})}
              >
                <option value="all">All Status ({statusCounts.total})</option>
                <option value="pending">Pending ({statusCounts.pending})</option>
                <option value="reviewed">Reviewed ({statusCounts.reviewed})</option>
                <option value="resolved">Resolved ({statusCounts.resolved})</option>
                <option value="dismissed">Dismissed ({statusCounts.dismissed})</option>
              </select>
            </div>
            
            <div className="rm-filter-group">
              <label>
                <FaFilter /> Report Type:
              </label>
              <select 
                className="rm-filter-select"
                value={filters.reportType} 
                onChange={(e) => setFilters({...filters, reportType: e.target.value})}
              >
                <option value="all">All Types</option>
                {getReportTypes().map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="rm-filter-group">
              <label>
                <FaFilter /> Severity:
              </label>
              <select 
                className="rm-filter-select"
                value={filters.severity} 
                onChange={(e) => setFilters({...filters, severity: e.target.value})}
              >
                <option value="all">All Severity</option>
                {getSeverityTypes().map(severity => (
                  <option key={severity} value={severity}>
                    {severity.charAt(0).toUpperCase() + severity.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="rm-filter-group">
              <label>
                <FaFilter /> Source:
              </label>
              <select 
                className="rm-filter-select"
                value={filters.source} 
                onChange={(e) => setFilters({...filters, source: e.target.value})}
              >
                <option value="all">All Sources</option>
                <option value="chat_page">Chat Page ({sourceCounts.chat_page})</option>
                <option value="chat_message">Messages ({sourceCounts.chat_message})</option>
                <option value="video_call">Video Calls ({sourceCounts.video_call})</option>
              </select>
            </div>
          </div>

          <div className="rm-search-container">
            <FaSearch className="rm-search-icon" />
            <input
              type="text"
              className="rm-search-input"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                className="rm-search-clear"
                onClick={clearSearch}
                title="Clear search"
              >
                <FaTimes />
              </button>
            )}
          </div>

          {(searchTerm || filters.status !== 'all' || filters.reportType !== 'all' || filters.severity !== 'all' || filters.source !== 'all') && (
            <button 
              className="rm-clear-filters"
              onClick={clearFilters}
              title="Clear all filters"
            >
              <FaTimes /> Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Reports Table */}
      <div className="rm-table-container">
        {skeletonLoading.table ? (
          <table className="rm-table">
            <thead>
              <tr>
                {['ID', 'Reporter', 'Reported', 'Type', 'Severity', 'Description', 'Evidence', 'Source', 'Status', 'Date', 'Actions'].map((header) => (
                  <th key={header}>
                    <div className="skeleton-text skeleton-pulse"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, index) => (
                <TableRowSkeleton key={index} />
              ))}
            </tbody>
          </table>
        ) : filteredReports.length > 0 ? (
          <>
            <table className="rm-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('id')} className="rm-sortable-header">
                    <span>ID {getSortIcon('id')}</span>
                  </th>
                  <th>Reporter</th>
                  <th>Reported User</th>
                  <th>Type</th>
                  <th onClick={() => handleSort('severity')} className="rm-sortable-header">
                    <span>Severity {getSortIcon('severity')}</span>
                  </th>
                  <th>Description</th>
                  <th>Evidence</th>
                  <th>Source</th>
                  <th onClick={() => handleSort('status')} className="rm-sortable-header">
                    <span>Status {getSortIcon('status')}</span>
                  </th>
                  <th onClick={() => handleSort('created_at')} className="rm-sortable-header">
                    <span>Date Reported {getSortIcon('created_at')}</span>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map(report => (
                  <tr 
                    key={report.id} 
                    className={`${report.status === 'pending' ? 'rm-urgent-row' : ''} ${report.severity === 'high' ? 'rm-high-severity' : ''}`}
                  >
                    <td>
                      {report.status === 'pending' && (
                        <FaExclamationTriangle className="rm-urgent-indicator" />
                      )}
                      #{report.id}
                    </td>
                    <td>
                      <div className="rm-user-info">
                        <span className="rm-user-name">
                          <FaUser /> {report.reporter_username || `User ${report.reporter_id}`}
                        </span>
                        <span className="rm-user-email">
                          <FaEnvelope /> {report.reporter_email || 'No email'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="rm-user-info">
                        <span className="rm-user-name">
                          <FaUser /> {report.reported_username || `User ${report.reported_user_id}`}
                        </span>
                        <span className="rm-user-email">
                          <FaEnvelope /> {report.reported_email || 'No email'}
                        </span>
                        {report.reported_user_strikes > 0 && (
                          <span className="rm-user-strikes">
                            <FaBan /> {report.reported_user_strikes} strikes
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{report.report_type}</td>
                    <td>{getSeverityBadge(report.severity)}</td>
                    <td className="rm-description-cell">
                      <div className="rm-description-truncated">
                        {report.description || 'No description provided'}
                      </div>
                    </td>
                    <td>
                      {report.evidence && report.evidence.length > 0 ? (
                        <div className="rm-evidence-preview">
                          {getEvidenceIcon(report.evidence_type)}
                          <span className="rm-evidence-count">
                            {report.evidence.length} file{report.evidence.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      ) : (
                        <span className="rm-no-evidence">No evidence</span>
                      )}
                    </td>
                    <td>{getSourceBadge(report.source)}</td>
                    <td>{getStatusBadge(report.status)}</td>
                    <td>
                      <div className="rm-user-info">
                        <span className="rm-user-name">
                          <FaCalendar /> {formatDate(report.created_at)}
                        </span>
                        <span className="rm-time-ago">
                          {getTimeAgo(report.created_at)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="rm-action-buttons">
                        <button 
                          onClick={() => setSelectedReport(report)}
                          className="rm-btn-view"
                          title="View report details"
                        >
                          <FaEye /> View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div className="rm-no-data">
            <FaFileAlt className="rm-no-data-icon" />
            <h3>No Reports Found</h3>
            <p>
              {reports.length === 0 
                ? "There are no reports in the system yet."
                : "No reports match your current filters. Try adjusting your search criteria."
              }
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {skeletonLoading.pagination ? (
        <PaginationSkeleton />
      ) : (
        renderPagination()
      )}

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="rm-modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="rm-modal-content rm-modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="rm-modal-header">
              <h2 className="rm-modal-title">
                <FaFlag /> Report Details #{selectedReport.id}
                {selectedReport.severity === 'high' && (
                  <span className="rm-modal-high-severity-tag">HIGH SEVERITY</span>
                )}
              </h2>
              <button 
                className="rm-modal-close"
                onClick={() => setSelectedReport(null)}
                title="Close modal"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="rm-modal-body">
              <div className="rm-report-details-grid">
                <div className="rm-detail-section">
                  <h3 className="rm-detail-section-title">Report Information</h3>
                  <div className="rm-detail-row">
                    <span className="rm-detail-label">Report Type:</span>
                    <span className="rm-detail-value">
                      <strong>{selectedReport.report_type}</strong>
                    </span>
                  </div>
                  <div className="rm-detail-row">
                    <span className="rm-detail-label">Severity:</span>
                    <span className="rm-detail-value">
                      {getSeverityBadge(selectedReport.severity)}
                    </span>
                  </div>
                  <div className="rm-detail-row">
                    <span className="rm-detail-label">Status:</span>
                    <span className="rm-detail-value">
                      {getStatusBadge(selectedReport.status)}
                    </span>
                  </div>
                  <div className="rm-detail-row">
                    <span className="rm-detail-label">Source:</span>
                    <span className="rm-detail-value">
                      {getSourceBadge(selectedReport.source)}
                    </span>
                  </div>
                  <div className="rm-detail-row">
                    <span className="rm-detail-label">Date Reported:</span>
                    <span className="rm-detail-value">
                      {formatDate(selectedReport.created_at)}
                    </span>
                  </div>
                </div>

                <div className="rm-detail-section">
                  <h3 className="rm-detail-section-title">User Information</h3>
                  <div className="rm-detail-row">
                    <span className="rm-detail-label">Reporter:</span>
                    <span className="rm-detail-value">
                      <strong>{selectedReport.reporter_username || `User ${selectedReport.reporter_id}`}</strong>
                      <br />
                      <small>{selectedReport.reporter_email || 'No email provided'}</small>
                    </span>
                  </div>

                  <div className="rm-detail-row">
                    <span className="rm-detail-label">Reported User:</span>
                    <span className="rm-detail-value">
                      <strong>{selectedReport.reported_username || `User ${selectedReport.reported_user_id}`}</strong>
                      <br />
                      <small>{selectedReport.reported_email || 'No email provided'}</small>
                      {selectedReport.reported_user_strikes > 0 && (
                        <div className="rm-user-strike-info">
                          <FaBan /> {selectedReport.reported_user_strikes} current strikes
                          <br />
                          Status: <span className={`rm-user-status ${selectedReport.reported_user_status}`}>
                            {selectedReport.reported_user_status}
                          </span>
                        </div>
                      )}
                    </span>
                  </div>
                </div>

                <div className="rm-detail-section full-width">
                  <h3 className="rm-detail-section-title">Description</h3>
                  <div className="rm-description-box">
                    {selectedReport.description || 'No description provided'}
                  </div>
                </div>

                {/* Evidence Section */}
                {selectedReport.evidence && selectedReport.evidence.length > 0 && (
                  <div className="rm-detail-section full-width">
                    <h3 className="rm-detail-section-title">
                      Evidence ({selectedReport.evidence.length} file{selectedReport.evidence.length !== 1 ? 's' : ''})
                    </h3>
                    <div className="rm-evidence-grid">
                      {selectedReport.evidence_urls.map((evidence, index) => (
                        <div key={index} className="rm-evidence-item">
                          <div className="rm-evidence-preview" onClick={() => openEvidenceViewer(selectedReport.evidence_urls, index)}>
                            {evidence.mimetype.startsWith('image/') ? (
                              <img src={evidence.url} alt="Evidence" />
                            ) : evidence.mimetype.startsWith('video/') ? (
                              <div className="rm-video-preview">
                                <FaVideo />
                                <span>Video File</span>
                              </div>
                            ) : (
                              <div className="rm-document-preview">
                                <FaFile />
                                <span>Document</span>
                              </div>
                            )}
                          </div>
                          <div className="rm-evidence-info">
                            <div className="rm-evidence-name">{evidence.originalname}</div>
                            <div className="rm-evidence-meta">
                              {formatFileSize(evidence.size)} • {evidence.mimetype}
                            </div>
                            <button 
                              onClick={() => downloadEvidence(evidence)}
                              className="rm-download-btn"
                              title="Download evidence"
                            >
                              <FaDownload /> Download
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedReport.resolution_notes && (
                  <div className="rm-detail-section full-width">
                    <span className="rm-detail-label">Resolution Notes:</span>
                    <div className="rm-resolution-notes">
                      {selectedReport.resolution_notes}
                    </div>
                  </div>
                )}

                {selectedReport.resolved_at && (
                  <div className="rm-detail-section">
                    <div className="rm-detail-row">
                      <span className="rm-detail-label">Resolved At:</span>
                      <span className="rm-detail-value">
                        {formatDate(selectedReport.resolved_at)}
                      </span>
                    </div>
                    {selectedReport.resolved_by_username && (
                      <div className="rm-detail-row">
                        <span className="rm-detail-label">Resolved By:</span>
                        <span className="rm-detail-value">
                          {selectedReport.resolved_by_username}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Resolution Section - Only show for pending reports */}
              {selectedReport.status === 'pending' && (
                <div className="rm-resolution-section">
                  <h3 className="rm-resolution-title">Resolve Report</h3>
                  
                  {/* Current User Status */}
                  <div className="rm-penalty-info-section">
                    <h4>Current User Status</h4>
                    <div className="rm-penalty-current-status">
                      <div className="rm-penalty-stat">
                        <div className={`rm-penalty-stat-value strike-${selectedReport.reported_user_strikes || 0}`}>
                          {selectedReport.reported_user_strikes || 0}
                        </div>
                        <div className="rm-penalty-stat-label">Current Strikes</div>
                      </div>
                      <div className="rm-penalty-stat">
                        <div className="rm-penalty-stat-value">
                          {selectedReport.reported_user_status || 'active'}
                        </div>
                        <div className="rm-penalty-stat-label">Account Status</div>
                      </div>
                      <div className="rm-penalty-stat">
                        <div className="rm-penalty-stat-value">
                          {selectedReport.severity}
                        </div>
                        <div className="rm-penalty-stat-label">Report Severity</div>
                      </div>
                    </div>

                    {/* Strike Progression Visualization */}
                    <div className="rm-strike-progression">
                      {[0, 1, 2, 3, 4, 5].map(strike => (
                        <div key={strike} className="rm-strike-step">
                          <div className={`rm-strike-indicator ${
                            strike === (selectedReport.reported_user_strikes || 0) ? 'active' : ''
                          } ${
                            strike < (selectedReport.reported_user_strikes || 0) ? 'warning' : ''
                          }`}>
                            {strike}
                          </div>
                          <div className="rm-strike-label">
                            {strike === 0 ? 'Clean' : 
                            strike === 1 ? 'Warning' : 
                            strike === 2 ? 'Warning' : 
                            strike === 3 ? 'Suspended' : 
                            strike === 4 ? 'Suspended' : 'Banned'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Penalty Option */}
                  <div className="rm-penalty-option">
                    <label className="rm-penalty-checkbox">
                      <input
                        type="checkbox"
                        checked={applyPenalty}
                        onChange={(e) => setApplyPenalty(e.target.checked)}
                      />
                      <span className="rm-checkmark"></span>
                      <FaShieldAlt className="rm-penalty-icon" />
                      Apply strike penalty according to PeerFusion Strike Policy
                    </label>
                    
                    {applyPenalty && (
                      <div className="rm-penalty-preview">
                        <h4 className="rm-penalty-preview-title">Penalty Preview</h4>
                        <div className="rm-penalty-details">
                          <div className="rm-penalty-detail-item">
                            <span className="rm-penalty-detail-label">Current Strikes:</span>
                            <span className="rm-penalty-detail-value">{selectedReport.reported_user_strikes || 0}</span>
                          </div>
                          <div className="rm-penalty-detail-item">
                            <span className="rm-penalty-detail-label">Report Type:</span>
                            <span className="rm-penalty-detail-value">{selectedReport.report_type}</span>
                          </div>
                          <div className="rm-penalty-detail-item">
                            <span className="rm-penalty-detail-label">Severity:</span>
                            <span className="rm-penalty-detail-value">{selectedReport.severity}</span>
                          </div>
                          <div className="rm-penalty-detail-item">
                            <span className="rm-penalty-detail-label">Category:</span>
                            <span className="rm-penalty-detail-value">
                              {['Hate Speech', 'Sexual Content', 'Violence or Threats', 'Self-harm'].includes(selectedReport.report_type) 
                                ? 'Zero-Tolerance (Immediate Ban)' 
                                : selectedReport.severity === 'high' 
                                  ? 'High-Severity' 
                                  : 'Standard Violation'}
                            </span>
                          </div>
                        </div>

                        {/* Consequence Preview */}
                        <div className="rm-penalty-consequence">
                          <h5>Expected Consequence:</h5>
                          <p className="rm-consequence-text">
                            {getExpectedConsequence(
                              selectedReport.reported_user_strikes || 0,
                              selectedReport.report_type,
                              selectedReport.severity
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Resolution Notes */}
                  <label className="rm-resolution-label">Resolution Notes:</label>
                  <textarea
                    className="rm-resolution-textarea"
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Add notes about how this report was resolved. This will be visible in the report history..."
                    rows={4}
                  />
                  
                  {/* Resolution Actions */}
                  <div className="rm-resolution-actions">
                    <button 
                      onClick={() => updateReportStatus(selectedReport.id, 'dismissed')}
                      className="rm-btn-dismiss"
                      disabled={!resolutionNotes.trim()}
                    >
                      <FaTimes /> Dismiss Report
                    </button>
                    <button 
                      onClick={() => updateReportStatus(selectedReport.id, 'resolved')}
                      className="rm-btn-resolve"
                      disabled={!resolutionNotes.trim()}
                    >
                      <FaCheck /> {applyPenalty ? 'Resolve & Apply Penalty' : 'Mark as Resolved'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Evidence Viewer Modal */}
      {evidenceViewer.isOpen && (
        <div className="rm-evidence-viewer-overlay" onClick={closeEvidenceViewer}>
          <div className="rm-evidence-viewer-content" onClick={(e) => e.stopPropagation()}>
            <button className="rm-evidence-close" onClick={closeEvidenceViewer}>
              <FaTimes />
            </button>
            
            {evidenceViewer.evidence.length > 1 && (
              <>
                <button className="rm-evidence-nav rm-evidence-prev" onClick={prevEvidence}>
                  ‹
                </button>
                <button className="rm-evidence-nav rm-evidence-next" onClick={nextEvidence}>
                  ›
                </button>
                <div className="rm-evidence-counter">
                  {evidenceViewer.currentIndex + 1} / {evidenceViewer.evidence.length}
                </div>
              </>
            )}

            <div className="rm-evidence-display">
              {evidenceViewer.evidence[evidenceViewer.currentIndex]?.mimetype.startsWith('image/') ? (
                <img 
                  src={evidenceViewer.evidence[evidenceViewer.currentIndex].url} 
                  alt="Evidence" 
                />
              ) : evidenceViewer.evidence[evidenceViewer.currentIndex]?.mimetype.startsWith('video/') ? (
                <video controls>
                  <source src={evidenceViewer.evidence[evidenceViewer.currentIndex].url} />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="rm-evidence-document">
                  <FaFile className="rm-document-icon" />
                  <p>Document: {evidenceViewer.evidence[evidenceViewer.currentIndex]?.originalname}</p>
                  <button 
                    onClick={() => downloadEvidence(evidenceViewer.evidence[evidenceViewer.currentIndex])}
                    className="rm-download-btn-large"
                  >
                    <FaDownload /> Download Document
                  </button>
                </div>
              )}
            </div>

            <div className="rm-evidence-info-panel">
              <h4>{evidenceViewer.evidence[evidenceViewer.currentIndex]?.originalname}</h4>
              <p>Type: {evidenceViewer.evidence[evidenceViewer.currentIndex]?.mimetype}</p>
              <p>Size: {formatFileSize(evidenceViewer.evidence[evidenceViewer.currentIndex]?.size)}</p>
              <button 
                onClick={() => downloadEvidence(evidenceViewer.evidence[evidenceViewer.currentIndex])}
                className="rm-download-btn"
              >
                <FaDownload /> Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportManagement;
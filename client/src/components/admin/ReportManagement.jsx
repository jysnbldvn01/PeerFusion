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
  FaFileAlt
} from 'react-icons/fa';
import '../../css/reportmanagement.css';

const ReportManagement = () => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    reportType: 'all'
  });

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, filters, searchTerm]);

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/admin/reports', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(response.data.reports || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      alert('Failed to load reports: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = reports;

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(report => report.status === filters.status);
    }

    // Apply report type filter
    if (filters.reportType !== 'all') {
      filtered = filtered.filter(report => report.report_type === filters.reportType);
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(report => 
        (report.reporter_username && report.reporter_username.toLowerCase().includes(searchLower)) ||
        (report.reported_username && report.reported_username.toLowerCase().includes(searchLower)) ||
        (report.report_type && report.report_type.toLowerCase().includes(searchLower)) ||
        (report.description && report.description.toLowerCase().includes(searchLower))
      );
    }

    setFilteredReports(filtered);
  };

  const updateReportStatus = async (reportId, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:5000/api/admin/reports/${reportId}/status`, 
        { 
          status, 
          resolution_notes: resolutionNotes 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSelectedReport(null);
      setResolutionNotes('');
      fetchReports();
      alert(`Report marked as ${status} successfully`);
    } catch (error) {
      console.error('Error updating report:', error);
      alert('Failed to update report: ' + (error.response?.data?.error || error.message));
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

  const getReportTypes = () => {
    const types = [...new Set(reports.map(report => report.report_type))];
    return types.filter(type => type).sort();
  };

  const getStatusCounts = () => {
    return {
      total: reports.length,
      pending: reports.filter(r => r.status === 'pending').length,
      reviewed: reports.filter(r => r.status === 'reviewed').length,
      resolved: reports.filter(r => r.status === 'resolved').length,
      dismissed: reports.filter(r => r.status === 'dismissed').length
    };
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

  if (loading) {
    return (
      <div className="report-management">
        <div className="report-management-loading">
          <div className="rm-loading-spinner"></div>
          <p>Loading reports...</p>
        </div>
      </div>
    );
  }

  const statusCounts = getStatusCounts();

  return (
    <div className="report-management">
      {/* Header Section */}
      <div className="rm-header">
        <div className="rm-header-content">
          <div className="rm-title-section">
            <FaFlag className="rm-header-icon" />
            <div>
              <h1 className="rm-main-title">Report Management</h1>
              <p className="rm-subtitle">Manage and resolve user reports and complaints</p>
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
              <FaCheck className="rm-stat-icon resolved" />
              <span className="rm-stat-number resolved">{statusCounts.resolved}</span>
              <span className="rm-stat-label">Resolved</span>
            </div>
            <div className="rm-stat-card">
              <FaTimes className="rm-stat-icon dismissed" />
              <span className="rm-stat-number dismissed">{statusCounts.dismissed}</span>
              <span className="rm-stat-label">Dismissed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar Section */}
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
      </div>

      {/* Reports Table */}
      <div className="rm-table-container">
        {filteredReports.length > 0 ? (
          <table className="rm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Reporter</th>
                <th>Reported User</th>
                <th>Report Type</th>
                <th>Description</th>
                <th>Status</th>
                <th>Date Reported</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map(report => (
                <tr 
                  key={report.id} 
                  className={report.status === 'pending' ? 'rm-urgent-row' : ''}
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
                    </div>
                  </td>
                  <td>{report.report_type}</td>
                  <td className="rm-description-cell">
                    <div className="rm-description-truncated">
                      {report.description || 'No description provided'}
                    </div>
                  </td>
                  <td>{getStatusBadge(report.status)}</td>
                  <td>
                    <div className="rm-user-info">
                      <span className="rm-user-name">
                        <FaCalendar /> {formatDate(report.created_at)}
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

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="rm-modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="rm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="rm-modal-header">
              <h2 className="rm-modal-title">
                <FaFlag /> Report Details #{selectedReport.id}
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
              <div className="rm-report-details">
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
                  </span>
                </div>

                <div className="rm-detail-row">
                  <span className="rm-detail-label">Report Type:</span>
                  <span className="rm-detail-value">
                    <strong>{selectedReport.report_type}</strong>
                  </span>
                </div>

                <div className="rm-detail-row">
                  <span className="rm-detail-label">Status:</span>
                  <span className="rm-detail-value">
                    {getStatusBadge(selectedReport.status)}
                  </span>
                </div>

                <div className="rm-detail-row">
                  <span className="rm-detail-label">Date Reported:</span>
                  <span className="rm-detail-value">
                    {formatDate(selectedReport.created_at)}
                  </span>
                </div>

                <div className="rm-detail-row full-width">
                  <span className="rm-detail-label">Description:</span>
                  <div className="rm-description-box">
                    {selectedReport.description || 'No description provided'}
                  </div>
                </div>
                
                {selectedReport.resolution_notes && (
                  <div className="rm-detail-row full-width">
                    <span className="rm-detail-label">Resolution Notes:</span>
                    <div className="rm-resolution-notes">
                      {selectedReport.resolution_notes}
                    </div>
                  </div>
                )}

                {selectedReport.resolved_at && (
                  <div className="rm-detail-row">
                    <span className="rm-detail-label">Resolved At:</span>
                    <span className="rm-detail-value">
                      {formatDate(selectedReport.resolved_at)}
                    </span>
                  </div>
                )}

                {selectedReport.resolved_by_username && (
                  <div className="rm-detail-row">
                    <span className="rm-detail-label">Resolved By:</span>
                    <span className="rm-detail-value">
                      {selectedReport.resolved_by_username}
                    </span>
                  </div>
                )}
              </div>

              {selectedReport.status === 'pending' && (
                <div className="rm-resolution-section">
                  <h3 className="rm-resolution-title">Resolve Report</h3>
                  <label className="rm-resolution-label">Resolution Notes:</label>
                  <textarea
                    className="rm-resolution-textarea"
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Add notes about how this report was resolved. This will be visible in the report history..."
                    rows={4}
                  />
                  
                  <div className="rm-resolution-actions">
                    <button 
                      onClick={() => updateReportStatus(selectedReport.id, 'resolved')}
                      className="rm-btn-resolve"
                      disabled={!resolutionNotes.trim()}
                    >
                      <FaCheck /> Mark as Resolved
                    </button>
                    <button 
                      onClick={() => updateReportStatus(selectedReport.id, 'dismissed')}
                      className="rm-btn-dismiss"
                      disabled={!resolutionNotes.trim()}
                    >
                      <FaTimes /> Dismiss Report
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportManagement;
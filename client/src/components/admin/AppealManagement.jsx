import React, { useState, useEffect, useRef } from 'react';
import { FaGavel, FaSearch, FaCheck, FaTimes, FaEye, FaClock, FaUserCheck, FaExclamationTriangle, FaFilter, FaDownload, FaImage, FaFilePdf, FaVideo, FaUser, FaGlobe, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import '../../css/appealmanagement.css';

// Professional SVG Icons
const GavelIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 7L9 12L11 14L16 9M5 20H19C19.5523 20 20 19.5523 20 19V15C20 14.4477 19.5523 14 19 14H5C4.44772 14 4 14.4477 4 15V19C4 19.5523 4.44772 20 5 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 14V5C7 4.44772 7.44772 4 8 4H10C10.5523 4 11 4.44772 11 5V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const UserCheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8.5 11C10.7091 11 12.5 9.20914 12.5 7C12.5 4.79086 10.7091 3 8.5 3C6.29086 3 4.5 4.79086 4.5 7C4.5 9.20914 6.29086 11 8.5 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 11L19 13L23 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const AlertTriangleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 9V11M12 15H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0377 2.66667 10.2679 4L3.33975 16C2.56995 17.3333 3.53223 19 5.07183 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const BanIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.364 18.364C21.8787 14.8492 21.8787 9.15076 18.364 5.63604C14.8492 2.12132 9.15076 2.12132 5.63604 5.63604C2.12132 9.15076 2.12132 14.8492 5.63604 18.364C9.15076 21.8787 14.8492 21.8787 18.364 18.364Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4.93 4.93L19.07 19.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const GlobeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Skeleton Loading Components
const HeaderSkeleton = () => (
  <div className="am-header skeleton">
    <div className="am-header-content">
      <div className="am-title-section">
        <div className="wam-header-icon skeleton-pulse"></div>
        <div>
          <div className="am-main-title skeleton-text skeleton-pulse"></div>
          <div className="am-subtitle skeleton-text skeleton-pulse"></div>
        </div>
      </div>
      <div className="am-stats-section">
        <div className="am-stat-card skeleton">
          <div className="wam-stat-icon skeleton-pulse"></div>
          <div className="am-stat-info">
            <div className="am-stat-number skeleton-text skeleton-pulse"></div>
            <div className="am-stat-label skeleton-text skeleton-pulse"></div>
          </div>
        </div>
        <div className="am-stat-card skeleton">
          <div className="wam-stat-icon skeleton-pulse"></div>
          <div className="am-stat-info">
            <div className="am-stat-number skeleton-text skeleton-pulse"></div>
            <div className="am-stat-label skeleton-text skeleton-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ToolbarSkeleton = () => (
  <div className="am-toolbar skeleton">
    <div className="am-search-container skeleton-pulse">
      <div className="am-search-icon skeleton-pulse"></div>
      <div className="am-search-input skeleton-pulse"></div>
    </div>
    <div className="am-filter-tabs">
      {[1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="am-filter-tab skeleton-pulse"></div>
      ))}
    </div>
    <div className="am-search-input skeleton-pulse" style={{ width: '160px' }}></div>
    <div className="am-search-input skeleton-pulse" style={{ width: '140px' }}></div>
  </div>
);

const TableRowSkeleton = () => (
  <tr className="skeleton">
    <td>
      <div className="am-user-card">
        <div className="am-user-avatar skeleton-pulse"></div>
        <div className="am-user-info">
          <div className="am-user-name skeleton-text skeleton-pulse"></div>
          <div className="am-user-email skeleton-text skeleton-pulse"></div>
          <div className="am-user-role skeleton-text skeleton-pulse"></div>
        </div>
      </div>
    </td>
    <td>
      <div className="skeleton-text skeleton-pulse" style={{ width: '80px', height: '24px' }}></div>
    </td>
    <td>
      <div className="skeleton-text skeleton-pulse" style={{ width: '120px', height: '24px' }}></div>
    </td>
    <td>
      <div className="skeleton-text skeleton-pulse"></div>
    </td>
    <td>
      <div className="skeleton-text skeleton-pulse" style={{ width: '100px', height: '24px' }}></div>
    </td>
    <td>
      <div className="am-date-cell">
        <div className="skeleton-text skeleton-pulse" style={{ width: '80px' }}></div>
      </div>
    </td>
    <td>
      <div className="am-action-buttons">
        <div className="am-btn-view skeleton-pulse"></div>
        <div className="am-btn-approve skeleton-pulse"></div>
        <div className="am-btn-reject skeleton-pulse"></div>
      </div>
    </td>
  </tr>
);

const PaginationSkeleton = () => (
  <div className="am-pagination skeleton">
    <div className="am-pagination-info skeleton-text skeleton-pulse"></div>
    <div className="am-pagination-controls">
      <div className="am-pagination-btn skeleton-pulse"></div>
      <div className="am-pagination-numbers">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="am-page-number skeleton-pulse"></div>
        ))}
      </div>
      <div className="am-pagination-btn skeleton-pulse"></div>
    </div>
  </div>
);

const AppealManagement = () => {
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selectedAppeal, setSelectedAppeal] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [userProfiles, setUserProfiles] = useState({});
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAppeals, setTotalAppeals] = useState(0);
  const ITEMS_PER_PAGE = 50;

  // Skeleton loading state
  const [skeletonLoading, setSkeletonLoading] = useState({
    header: true,
    toolbar: true,
    table: true,
    pagination: true
  });

  const API_BASE = process.env.REACT_APP_API_URL || 'https://peerfusion-xh73.onrender.com/api';

  useEffect(() => {
    fetchAppeals();
    fetchStats();
  }, [currentPage]);

  useEffect(() => {
    filterAppeals();
  }, [appeals, statusFilter, typeFilter, sourceFilter, searchTerm]);

const fetchAppeals = async () => {
  try {
    setSkeletonLoading({
      header: true,
      toolbar: true,
      table: true,
      pagination: true
    });
    
    const token = localStorage.getItem('token');
    
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: ITEMS_PER_PAGE.toString()
    });

    if (searchTerm) params.append('search', searchTerm);
    if (statusFilter !== 'all') params.append('status', statusFilter);
    if (typeFilter !== 'all') params.append('type', typeFilter);
    if (sourceFilter !== 'all') params.append('source', sourceFilter);

    const response = await fetch(`${API_BASE}/api/admin/appeals?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    if (data.success) {
      setAppeals(data.appeals);
      setTotalAppeals(data.total || 0);
      setTotalPages(data.totalPages || 1);
      const userAppeals = data.appeals.filter(appeal => !appeal.is_public_appeal);
      fetchUserProfiles(userAppeals);
    }
  } catch (error) {
    console.error('Error fetching appeals:', error);
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

  const fetchUserProfiles = async (appealsData) => {
    const token = localStorage.getItem('token');
    const profiles = {};
    
    const userIds = [...new Set(appealsData.map(appeal => appeal.user_id))];
    
    for (const userId of userIds) {
      try {
        const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (data) {
          profiles[userId] = {
            username: data.username || data.name,
            email: data.email,
            avatar: data.avatar,
            status: data.status,
            strike_count: data.strike_count,
            suspended_until: data.suspended_until
          };
        }
      } catch (error) {
        console.error(`Error fetching profile for user ${userId}:`, error);
        const appeal = appealsData.find(a => a.user_id === userId);
        if (appeal) {
          profiles[userId] = {
            username: appeal.user_username,
            email: appeal.user_email,
            avatar: null,
            status: appeal.user_status,
            strike_count: appeal.strike_count,
            suspended_until: appeal.suspended_until
          };
        }
      }
    }
    
    setUserProfiles(profiles);
  };

  const fetchUserProfile = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching user profile ${userId}:`, error);
      return null;
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/admin/appeals/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleStatusUpdate = async (appealId, status, applyUserAction = false) => {
    setActionLoading(appealId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/admin/appeals/${appealId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status,
          apply_user_action: applyUserAction,
          resolution_notes: status === 'approved' ? 'Appeal approved by PeerFusion Team' : 'Appeal rejected after review'
        })
      });
      const data = await response.json();
      if (data.success) {
        window.dispatchEvent(new CustomEvent('peerfusion-toast', {
          detail: { 
            message: `Appeal ${status} successfully${data.is_public_appeal ? ' (Public Appeal)' : ''}`, 
            type: 'success' 
          }
        }));
        fetchAppeals();
        fetchStats();
        setShowDetailModal(false);
      }
    } catch (error) {
      console.error('Error updating appeal status:', error);
      window.dispatchEvent(new CustomEvent('peerfusion-toast', {
        detail: { message: 'Error updating appeal', type: 'error' }
      }));
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewEvidence = (evidenceItem) => {
    setSelectedEvidence(evidenceItem);
    setShowEvidenceModal(true);
  };

  const handleDownloadEvidence = async (evidenceItem) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/admin/appeals/evidence/${evidenceItem.filename}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = evidenceItem.originalname || evidenceItem.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading evidence:', error);
    }
  };

  const getFileIcon = (mimetype) => {
    if (mimetype?.startsWith('image/')) return <FaImage />;
    if (mimetype?.startsWith('video/')) return <FaVideo />;
    if (mimetype === 'application/pdf') return <FaFilePdf />;
    return <FaFilePdf />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const [filteredAppeals, setFilteredAppeals] = useState([]);

  const filterAppeals = () => {
    const filtered = appeals.filter(appeal => {
      const userProfile = userProfiles[appeal.user_id];
      const matchesSearch = appeal.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           appeal.display_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           appeal.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           userProfile?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           userProfile?.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || appeal.status === statusFilter;
      const matchesType = typeFilter === 'all' || appeal.appeal_type === typeFilter;
      const matchesSource = sourceFilter === 'all' || 
                           (sourceFilter === 'user' && !appeal.is_public_appeal) ||
                           (sourceFilter === 'public' && appeal.is_public_appeal);
      
      return matchesSearch && matchesStatus && matchesType && matchesSource;
    });
    
    setFilteredAppeals(filtered);
  };

  const getStatusBadge = (status) => {
    const statusLabels = {
      pending: 'Pending',
      under_review: 'Under Review',
      approved: 'Approved',
      rejected: 'Rejected'
    };

    const icons = {
      pending: <ClockIcon />,
      under_review: <EyeIcon />,
      approved: <CheckIcon />,
      rejected: <BanIcon />
    };

    return (
      <span className={`am-status-badge am-status-${status}`}>
        <span className="am-status-icon">{icons[status]}</span>
        {statusLabels[status]}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const typeLabels = {
      account_reactivation: 'Account Reactivation',
      strike_removal: 'Strike Removal',
      content_review: 'Content Review'
    };

    const icons = {
      account_reactivation: <UserCheckIcon />,
      strike_removal: <AlertTriangleIcon />,
      content_review: <EyeIcon />
    };

    return (
      <span className={`am-type-badge am-type-${type}`}>
        <span className="am-type-icon">{icons[type]}</span>
        {typeLabels[type]}
      </span>
    );
  };

  const getSourceBadge = (isPublic) => {
    return (
      <span className={`am-source-badge am-source-${isPublic ? 'public' : 'user'}`}>
        <span className="am-source-icon">
          {isPublic ? <GlobeIcon /> : <UserCheckIcon />}
        </span>
        {isPublic ? 'Public Appeal' : 'User Appeal'}
      </span>
    );
  };

  const getUserStatusBadge = (userStatus) => {
    const statusClass = `am-user-status-badge am-status-${userStatus}`;
    return (
      <span className={statusClass}>
        {userStatus}
      </span>
    );
  };

  const getAvatarUrl = (avatar) => {
    if (!avatar) return null;

    if (avatar.startsWith('http')) return avatar;
    if (avatar.startsWith('/')) {
      return `${API_BASE}${avatar}`;
    }
    return `${API_BASE}/uploads/${avatar}`;
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

  const handleViewAppeal = async (appeal) => {
    let userProfile = null;
    if (!appeal.is_public_appeal && appeal.user_id) {
      userProfile = await fetchUserProfile(appeal.user_id);
    }
    
    setSelectedAppeal({
      ...appeal,
      userProfile: userProfile || userProfiles[appeal.user_id]
    });
    setShowDetailModal(true);
  };

  // ==============================================
  // PAGINATION FUNCTIONS
  // ==============================================

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

const renderPagination = () => {
  if (totalAppeals === 0) return null;

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
    <div className="am-pagination">
      <div className="am-pagination-info">
        Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalAppeals)} of {totalAppeals} appeals
      </div>
      <div className="am-pagination-controls">
        <button
          className={`am-pagination-btn ${currentPage === 1 ? 'disabled' : ''}`}
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <FaChevronLeft /> Previous
        </button>
        
        <div className="am-pagination-numbers">
          {startPage > 1 && (
            <>
              <button
                className={`am-page-number ${1 === currentPage ? 'active' : ''}`}
                onClick={() => handlePageChange(1)}
              >
                1
              </button>
              {startPage > 2 && <span className="am-page-ellipsis">...</span>}
            </>
          )}
          
          {pageNumbers.map(page => (
            <button
              key={page}
              className={`am-page-number ${page === currentPage ? 'active' : ''}`}
              onClick={() => handlePageChange(page)}
            >
              {page}
            </button>
          ))}
          
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <span className="am-page-ellipsis">...</span>}
              <button
                className={`am-page-number ${totalPages === currentPage ? 'active' : ''}`}
                onClick={() => handlePageChange(totalPages)}
              >
                {totalPages}
              </button>
            </>
          )}
        </div>
        
        <button
          className={`am-pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`}
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
    setStatusFilter('all');
    setTypeFilter('all');
    setSourceFilter('all');
    setCurrentPage(1);
  };

  return (
    <div className="am-container">
      {/* Header */}
      {skeletonLoading.header ? (
        <HeaderSkeleton />
      ) : (
        <div className="am-header">
          <div className="am-header-content">
            <div className="am-title-section">
              <div className="wam-header-icon">
                <GavelIcon />
              </div>
              <div>
                <h1 className="am-main-title">Appeal Management</h1>
                <p className="am-subtitle">Review and manage user appeals & public submissions</p>
              </div>
            </div>
            <div className="am-stats-section">
              <div className="am-stat-card">
                <div className="wam-stat-icon"><GavelIcon /></div>
                <div className="am-stat-info">
                  <div className="am-stat-number">{totalAppeals || 0}</div>
                  <div className="am-stat-label">Total Appeals</div>
                </div>
              </div>
              <div className="am-stat-card pending">
                <div className="wam-stat-icon"><ClockIcon /></div>
                <div className="am-stat-info">
                  <div className="am-stat-number">{stats.byStatus?.pending || 0}</div>
                  <div className="am-stat-label">Pending</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      {skeletonLoading.toolbar ? (
        <ToolbarSkeleton />
      ) : (
        <div className="am-toolbar">
          <div className="am-search-container">
            <input
              type="text"
              placeholder="Search appeals by name, email, or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="am-search-input"
            />
            <div className="am-search-icon"><SearchIcon /></div>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="am-search-clear"
              >
                <CloseIcon />
              </button>
            )}
          </div>
          
          <div className="am-filter-tabs">
            <button 
              className={`am-filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All Status
            </button>
            <button 
              className={`am-filter-tab ${statusFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setStatusFilter('pending')}
            >
              Pending ({stats.byStatus?.pending || 0})
            </button>
            <button 
              className={`am-filter-tab ${statusFilter === 'under_review' ? 'active' : ''}`}
              onClick={() => setStatusFilter('under_review')}
            >
              Under Review ({stats.byStatus?.under_review || 0})
            </button>
            <button 
              className={`am-filter-tab ${statusFilter === 'approved' ? 'active' : ''}`}
              onClick={() => setStatusFilter('approved')}
            >
              Approved ({stats.byStatus?.approved || 0})
            </button>
            <button 
              className={`am-filter-tab ${statusFilter === 'rejected' ? 'active' : ''}`}
              onClick={() => setStatusFilter('rejected')}
            >
              Rejected ({stats.byStatus?.rejected || 0})
            </button>
          </div>

          <select 
            className="am-search-input" 
            style={{ width: 'auto', minWidth: '160px' }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="account_reactivation">Account Reactivation</option>
            <option value="strike_removal">Strike Removal</option>
            <option value="content_review">Content Review</option>
          </select>

          <select 
            className="am-search-input" 
            style={{ width: 'auto', minWidth: '140px' }}
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="all">All Sources</option>
            <option value="user">User Appeals</option>
            <option value="public">Public Appeals</option>
          </select>

          {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || sourceFilter !== 'all') && (
            <button 
              className="am-clear-filters"
              onClick={clearFilters}
              title="Clear all filters"
            >
              <FaTimes /> Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Appeals Table */}
      <div className="am-table-wrapper">
        <div className="am-table-container">
          <table className="am-appeals-table">
            <thead>
              <tr>
                <th className="am-col-user">Appellant</th>
                <th className="am-col-source">Source</th>
                <th className="am-col-type">Appeal Type</th>
                <th className="am-col-reason">Reason</th>
                <th className="am-col-status">Status</th>
                <th className="am-col-created">Created</th>
                <th className="am-col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {skeletonLoading.table ? (
                Array.from({ length: 10 }).map((_, index) => (
                  <TableRowSkeleton key={index} />
                ))
              ) : filteredAppeals.length === 0 ? (
                <tr>
                  <td colSpan="7" className="am-empty-state">
                    <div className="am-empty-content">
                      <div className="am-empty-icon"><GavelIcon /></div>
                      <h3>No appeals found</h3>
                      <p>No appeals match your current filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAppeals.map(appeal => {
                  const userProfile = userProfiles[appeal.user_id];
                  const avatarUrl = getAvatarUrl(userProfile?.avatar);
                  
                  return (
                    <tr key={appeal.id}>
                      <td className="am-col-user">
                        <div className="am-user-card">
                          <div className="am-user-avatar">
                            {!appeal.is_public_appeal && avatarUrl ? (
                              <img 
                                src={avatarUrl} 
                                alt={appeal.display_name}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  const fallback = e.target.nextSibling;
                                  if (fallback) fallback.style.display = 'flex';
                                }} 
                              />
                            ) : null}
                            <div 
                              className={`am-avatar-placeholder ${appeal.is_public_appeal ? 'am-avatar-public' : ''}`}
                              style={{ display: (!appeal.is_public_appeal && avatarUrl) ? 'none' : 'flex' }}
                            >
                              {appeal.is_public_appeal ? <GlobeIcon /> : appeal.display_name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                          </div>
                          <div className="am-user-info">
                            <div className="am-user-name">
                              {appeal.display_name}
                              {appeal.is_public_appeal && <span className="am-public-indicator"> (Public)</span>}
                            </div>
                            <div className="am-user-email">{appeal.display_email}</div>
                            <div className="am-user-role">{appeal.display_role}</div>
                            {!appeal.is_public_appeal && (
                              <div className="am-user-status">
                                {getUserStatusBadge(userProfile?.status || appeal.user_status)}
                                {(userProfile?.strike_count || appeal.strike_count) > 0 && (
                                  <span className="am-strike-count">
                                    Strikes: <strong>{userProfile?.strike_count || appeal.strike_count}</strong>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="am-col-source">
                        {getSourceBadge(appeal.is_public_appeal)}
                      </td>
                      <td className="am-col-type">
                        {getTypeBadge(appeal.appeal_type)}
                      </td>
                      <td className="am-col-reason">
                        <div className="am-reason-cell">
                          <div className="am-reason-text">
                            {appeal.reason}
                          </div>
                          {appeal.report_type && (
                            <div className="am-report-type">
                              <FaFilter size={10} />
                              Related to: {appeal.report_type}
                            </div>
                          )}
                          {appeal.evidence_urls && appeal.evidence_urls.length > 0 && (
                            <div className="am-evidence-badge">
                              <FaImage size={10} />
                              {appeal.evidence_urls.length} evidence file(s)
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="am-col-status">
                        {getStatusBadge(appeal.status)}
                      </td>
                      <td className="am-col-created">
                        <div className="am-date-cell">
                          <ClockIcon />
                          {formatDate(appeal.created_at)}
                        </div>
                      </td>
                      <td className="am-col-actions">
                        <div className="am-action-buttons">
                          <button
                            className="am-btn-view"
                            onClick={() => handleViewAppeal(appeal)}
                          >
                            <EyeIcon />
                            View
                          </button>
                          {appeal.status === 'pending' && (
                            <>
                              {!appeal.is_public_appeal ? (
                                <button
                                  className="am-btn-approve"
                                  onClick={() => handleStatusUpdate(appeal.id, 'approved', true)}
                                  disabled={actionLoading === appeal.id}
                                >
                                  {actionLoading === appeal.id ? '...' : <><CheckIcon />Approve & Apply</>}
                                </button>
                              ) : (
                                <button
                                  className="am-btn-approve"
                                  onClick={() => handleStatusUpdate(appeal.id, 'approved', false)}
                                  disabled={actionLoading === appeal.id}
                                >
                                  {actionLoading === appeal.id ? '...' : <><CheckIcon />Approve</>}
                                </button>
                              )}
                              <button
                                className="am-btn-reject"
                                onClick={() => handleStatusUpdate(appeal.id, 'rejected')}
                                disabled={actionLoading === appeal.id}
                              >
                                {actionLoading === appeal.id ? '...' : <><BanIcon />Reject</>}
                              </button>
                            </>
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

        {/* Pagination */}
        {skeletonLoading.pagination ? (
          <PaginationSkeleton />
        ) : (
          renderPagination()
        )}
      </div>

      {/* Appeal Detail Modal */}
      {showDetailModal && selectedAppeal && (
        <div className="am-modal-overlay">
          <div className="am-modal am-modal-large">
            <div className="am-modal-header">
              <h3>
                <GavelIcon />
                Appeal Details
                {selectedAppeal.is_public_appeal && (
                  <span className="am-modal-public-badge">Public Appeal</span>
                )}
              </h3>
              <button className="am-modal-close" onClick={() => setShowDetailModal(false)}>
                <CloseIcon />
              </button>
            </div>
            
            <div className="am-modal-body">
              {/* Appellant Information */}
              <div className="am-user-preview">
                <div className={`am-avatar-placeholder-small ${selectedAppeal.is_public_appeal ? 'am-avatar-public' : ''}`}>
                  {selectedAppeal.is_public_appeal ? <GlobeIcon /> : selectedAppeal.display_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="am-user-details">
                  <div className="am-user-name">
                    {selectedAppeal.display_name}
                    {selectedAppeal.is_public_appeal && <span className="am-public-indicator"> (Public Submission)</span>}
                  </div>
                  <div className="am-user-email">{selectedAppeal.display_email}</div>
                  <div className="am-user-role">
                    <strong>Role:</strong> {selectedAppeal.display_role}
                  </div>
                  {!selectedAppeal.is_public_appeal && (
                    <div className="am-user-status">
                      {getUserStatusBadge(selectedAppeal.userProfile?.status || selectedAppeal.user_status)}
                      {(selectedAppeal.userProfile?.strike_count || selectedAppeal.strike_count) > 0 && (
                        <span className="am-strike-count">
                          Strikes: <strong>{selectedAppeal.userProfile?.strike_count || selectedAppeal.strike_count}</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Appeal Source Information */}
              <div className="am-form-group">
                <label className="am-form-label">
                  <FaUser />
                  Appeal Source
                </label>
                <div>
                  {getSourceBadge(selectedAppeal.is_public_appeal)}
                  {selectedAppeal.is_public_appeal && (
                    <div className="am-public-appeal-note">
                      This appeal was submitted via the public appeal form. No user account is associated.
                    </div>
                  )}
                </div>
              </div>

              <div className="am-form-group">
                <label className="am-form-label">
                  <GavelIcon />
                  Appeal Type
                </label>
                <div>{getTypeBadge(selectedAppeal.appeal_type)}</div>
              </div>

              <div className="am-form-group">
                <label className="am-form-label">
                  <EyeIcon />
                  Reason
                </label>
                <div className="am-reason-box">
                  {selectedAppeal.reason}
                </div>
              </div>

              {/* Evidence Section */}
              {selectedAppeal.evidence_urls && selectedAppeal.evidence_urls.length > 0 && (
                <div className="am-form-group">
                  <label className="am-form-label">
                    <FaImage />
                    Evidence Files ({selectedAppeal.evidence_urls.length})
                  </label>
                  <div className="am-evidence-list">
                    {selectedAppeal.evidence_urls.map((evidence, index) => (
                      <div key={index} className="am-evidence-item">
                        <div className="am-evidence-preview">
                          {evidence.previewUrl ? (
                            <img 
                              src={evidence.previewUrl} 
                              alt={evidence.originalname}
                              className="am-evidence-image"
                              onClick={() => handleViewEvidence(evidence)}
                            />
                          ) : (
                            <div className="am-evidence-placeholder">
                              {getFileIcon(evidence.mimetype)}
                            </div>
                          )}
                        </div>
                        <div className="am-evidence-details">
                          <div className="am-evidence-name">{evidence.originalname}</div>
                          <div className="am-evidence-meta">
                            <span>{formatFileSize(evidence.size)}</span>
                            <span>{evidence.mimetype}</span>
                          </div>
                        </div>
                        <div className="am-evidence-actions">
                          <button
                            className="am-btn-view"
                            onClick={() => handleViewEvidence(evidence)}
                          >
                            <EyeIcon />
                          </button>
                          <button
                            className="am-btn-download"
                            onClick={() => handleDownloadEvidence(evidence)}
                          >
                            <FaDownload />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedAppeal.report_type && (
                <div className="am-form-group">
                  <label className="am-form-label">
                    Related Report
                  </label>
                  <div className="am-report-info">
                    Type: {selectedAppeal.report_type}
                    {selectedAppeal.report_severity && (
                      <span className={`am-severity-badge am-severity-${selectedAppeal.report_severity}`}>
                        {selectedAppeal.report_severity}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {selectedAppeal.resolution_notes && (
                <div className="am-form-group">
                  <label className="am-form-label">
                    Resolution Notes
                  </label>
                  <div className="am-resolution-notes">
                    {selectedAppeal.resolution_notes}
                  </div>
                </div>
              )}
            </div>

            <div className="am-modal-footer">
              {selectedAppeal.status === 'pending' && (
                <>
                  {!selectedAppeal.is_public_appeal ? (
                    // User appeal buttons
                    <>
                      <button
                        className="am-btn-approve-confirm"
                        onClick={() => handleStatusUpdate(selectedAppeal.id, 'approved', true)}
                        disabled={actionLoading === selectedAppeal.id}
                      >
                        {actionLoading === selectedAppeal.id ? 'Processing...' : (
                          <>
                            <CheckIcon />
                            Approve & Apply Action
                          </>
                        )}
                      </button>
                      <button
                        className="am-btn-reject-confirm"
                        onClick={() => handleStatusUpdate(selectedAppeal.id, 'rejected')}
                        disabled={actionLoading === selectedAppeal.id}
                      >
                        {actionLoading === selectedAppeal.id ? 'Processing...' : (
                          <>
                            <BanIcon />
                            Reject Appeal
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    // Public appeal buttons
                    <>
                      <button
                        className="am-btn-approve-confirm"
                        onClick={() => handleStatusUpdate(selectedAppeal.id, 'approved', false)}
                        disabled={actionLoading === selectedAppeal.id}
                      >
                        {actionLoading === selectedAppeal.id ? 'Processing...' : (
                          <>
                            <CheckIcon />
                            Approve Appeal
                          </>
                        )}
                      </button>
                      <button
                        className="am-btn-reject-confirm"
                        onClick={() => handleStatusUpdate(selectedAppeal.id, 'rejected')}
                        disabled={actionLoading === selectedAppeal.id}
                      >
                        {actionLoading === selectedAppeal.id ? 'Processing...' : (
                          <>
                            <BanIcon />
                            Reject Appeal
                          </>
                        )}
                      </button>
                    </>
                  )}
                </>
              )}
              <button className="am-btn-cancel" onClick={() => setShowDetailModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Preview Modal */}
      {showEvidenceModal && selectedEvidence && (
        <div className="am-modal-overlay">
          <div className="am-modal am-evidence-modal">
            <div className="am-modal-header">
              <h3>
                {getFileIcon(selectedEvidence.mimetype)}
                Evidence Preview
              </h3>
              <button className="am-modal-close" onClick={() => setShowEvidenceModal(false)}>
                <CloseIcon />
              </button>
            </div>
            
            <div className="am-modal-body">
              <div className="am-evidence-preview-large">
                {selectedEvidence.mimetype?.startsWith('image/') ? (
                  <img 
                    src={selectedEvidence.url} 
                    alt={selectedEvidence.originalname}
                    className="am-evidence-image-large"
                  />
                ) : selectedEvidence.mimetype?.startsWith('video/') ? (
                  <video controls className="am-evidence-video">
                    <source src={selectedEvidence.url} type={selectedEvidence.mimetype} />
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className="am-evidence-document">
                    <div className="am-evidence-document-icon">
                      {getFileIcon(selectedEvidence.mimetype)}
                    </div>
                    <div className="am-evidence-document-info">
                      <h4>{selectedEvidence.originalname}</h4>
                      <p>File type: {selectedEvidence.mimetype}</p>
                      <p>Size: {formatFileSize(selectedEvidence.size)}</p>
                      <button
                        className="am-btn-download"
                        onClick={() => handleDownloadEvidence(selectedEvidence)}
                      >
                        <FaDownload />
                        Download File
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="am-evidence-meta-large">
                <div><strong>File Name:</strong> {selectedEvidence.originalname}</div>
                <div><strong>Type:</strong> {selectedEvidence.mimetype}</div>
                <div><strong>Size:</strong> {formatFileSize(selectedEvidence.size)}</div>
              </div>
            </div>

            <div className="am-modal-footer">
              <button className="am-btn-download" onClick={() => handleDownloadEvidence(selectedEvidence)}>
                <FaDownload />
                Download
              </button>
              <button className="am-btn-cancel" onClick={() => setShowEvidenceModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppealManagement;
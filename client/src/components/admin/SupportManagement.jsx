import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaEye, 
  FaCheck, 
  FaTimes, 
  FaClock, 
  FaFilter, 
  FaSearch,
  FaUser,
  FaEnvelope,
  FaCalendar,
  FaPaperclip,
  FaComment,
  FaReply,
  FaUserShield,
  FaSync,
  FaTrash,
  FaEdit,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import '../../css/supportmanagement.css';

const SupportManagement = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all'
  });
  const [selectedTickets, setSelectedTickets] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [totalTickets, setTotalTickets] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Status counts state
  const [statusCounts, setStatusCounts] = useState({
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0
  });

  // Debounce search term
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timerId);
  }, [searchTerm]);

  // Fetch tickets when page, filters, or debounced search changes
  useEffect(() => {
    fetchTickets();
  }, [currentPage, filters.status, debouncedSearchTerm]);

  // Fetch total counts on component mount
  useEffect(() => {
    fetchTotalCounts();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        status: filters.status !== 'all' ? filters.status : undefined,
        search: debouncedSearchTerm || undefined
      };

      // Remove undefined parameters
      Object.keys(params).forEach(key => {
        if (params[key] === undefined) {
          delete params[key];
        }
      });

      const response = await axios.get('http://localhost:5000/api/support/tickets', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      
      if (response.data.success) {
        const ticketsData = response.data.tickets || [];
        setTickets(ticketsData);
        
        // Use backend pagination data
        setTotalTickets(response.data.total || 0);
        setTotalPages(response.data.totalPages || 1);
        setCurrentPage(response.data.page || 1);
      } else {
        throw new Error(response.data.error || 'Failed to fetch tickets');
      }
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      window.pfToast?.error?.('Failed to load support tickets: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchTotalCounts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/support/tickets', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: 1,
          limit: 100000, // Large limit to get all counts
          status: 'all'
        }
      });
      
      if (response.data.success) {
        const allTickets = response.data.tickets || [];
        const counts = {
          total: response.data.total || 0,
          open: allTickets.filter(t => t.status === 'open').length,
          in_progress: allTickets.filter(t => t.status === 'in_progress').length,
          resolved: allTickets.filter(t => t.status === 'resolved').length,
          closed: allTickets.filter(t => t.status === 'closed').length
        };
        setStatusCounts(counts);
      }
    } catch (error) {
      console.error('Error fetching total counts:', error);
      // Fallback to calculating from current tickets
      const counts = {
        total: totalTickets,
        open: tickets.filter(t => t.status === 'open').length,
        in_progress: tickets.filter(t => t.status === 'in_progress').length,
        resolved: tickets.filter(t => t.status === 'resolved').length,
        closed: tickets.filter(t => t.status === 'closed').length
      };
      setStatusCounts(counts);
    }
  };

  const fetchTicketDetails = async (ticketId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/support/tickets/${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        return response.data.ticket;
      } else {
        throw new Error(response.data.error || 'Failed to fetch ticket details');
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      throw error;
    }
  };

  // Pagination functions
  const goToPage = (page) => {
    setCurrentPage(page);
    setSelectedTickets(new Set());
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Skeleton loading components
  const SkeletonTicketCard = () => (
    <div className="sm-ticket-card sm-skeleton">
      <div className="sm-ticket-header">
        <div className="sm-ticket-selection">
          <div className="sm-skeleton-checkbox"></div>
        </div>
        <div className="sm-ticket-info">
          <div className="sm-skeleton-line sm-skeleton-subject"></div>
          <div className="sm-ticket-meta">
            <div className="sm-skeleton-line sm-skeleton-meta"></div>
          </div>
        </div>
        <div className="sm-ticket-actions">
          <div className="sm-skeleton-badge"></div>
          <div className="sm-skeleton-button"></div>
          <div className="sm-skeleton-button sm-skeleton-button-small"></div>
        </div>
      </div>
      <div className="sm-ticket-preview">
        <div className="sm-skeleton-line"></div>
        <div className="sm-skeleton-line sm-skeleton-short"></div>
      </div>
    </div>
  );

  const SkeletonStats = () => (
    <div className="sm-stats">
      <div className="sm-stat-card sm-skeleton">
        <div className="sm-skeleton-icon"></div>
        <div className="sm-skeleton-stat"></div>
        <div className="sm-skeleton-label"></div>
      </div>
      <div className="sm-stat-card sm-skeleton">
        <div className="sm-skeleton-icon"></div>
        <div className="sm-skeleton-stat"></div>
        <div className="sm-skeleton-label"></div>
      </div>
    </div>
  );

  const HeaderSkeleton = () => (
    <div className="sm-header skeleton">
      <div className="sm-header-content">
        <div className="sm-title-section">
          <div className="sm-skeleton-icon sm-skeleton-header-icon"></div>
          <div>
            <div className="sm-skeleton-line sm-skeleton-title"></div>
            <div className="sm-skeleton-line sm-skeleton-subtitle"></div>
          </div>
        </div>
        <SkeletonStats />
      </div>
    </div>
  );

  const ToolbarSkeleton = () => (
    <div className="sm-toolbar skeleton">
      <div className="sm-filters">
        <div className="sm-skeleton-filter"></div>
        <div className="sm-skeleton-search"></div>
      </div>
    </div>
  );

  const deleteTicket = async (ticketId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `http://localhost:5000/api/support/tickets/${ticketId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket(null);
        }
        
        const newSelected = new Set(selectedTickets);
        newSelected.delete(ticketId);
        setSelectedTickets(newSelected);
        
        setTickets(prevTickets => prevTickets.filter(ticket => ticket.id !== ticketId));
        setTotalTickets(prev => prev - 1);
        
        // Update status counts
        setStatusCounts(prev => ({
          ...prev,
          total: prev.total - 1
        }));
        
        window.pfToast?.deleted?.('Ticket deleted successfully');
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error('Error deleting ticket:', error);
      window.pfToast?.error?.('Failed to delete ticket: ' + (error.response?.data?.error || error.message));
    } finally {
      setShowDeleteConfirm(false);
      setTicketToDelete(null);
    }
  };

  const deleteMultipleTickets = async () => {
    if (selectedTickets.size === 0) {
      window.pfToast?.warning?.('Please select tickets to delete');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedTickets.size} ticket(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        'http://localhost:5000/api/support/tickets',
        {
          data: { ticketIds: Array.from(selectedTickets) },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        if (selectedTicket && selectedTickets.has(selectedTicket.id)) {
          setSelectedTicket(null);
        }
        
        setTickets(prevTickets => 
          prevTickets.filter(ticket => !selectedTickets.has(ticket.id))
        );
        
        setTotalTickets(prev => prev - selectedTickets.size);
        
        // Update status counts
        setStatusCounts(prev => ({
          ...prev,
          total: prev.total - selectedTickets.size
        }));
        
        setSelectedTickets(new Set());
        
        window.pfToast?.deleted?.(`Successfully deleted ${response.data.deletedCount} ticket(s)`);
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error('Error deleting tickets:', error);
      window.pfToast?.error?.('Failed to delete tickets: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleTicketSelect = (ticketId) => {
    const newSelected = new Set(selectedTickets);
    if (newSelected.has(ticketId)) {
      newSelected.delete(ticketId);
    } else {
      newSelected.add(ticketId);
    }
    setSelectedTickets(newSelected);
  };

  const selectAllTickets = () => {
    if (selectedTickets.size === tickets.length) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(tickets.map(ticket => ticket.id)));
    }
  };

  const updateTicketStatus = async (ticketId, status) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `http://localhost:5000/api/support/tickets/${ticketId}/status`, 
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        if (selectedTicket && selectedTicket.id === ticketId) {
          const updatedTicket = await fetchTicketDetails(ticketId);
          setSelectedTicket(updatedTicket);
        }
        
        setTickets(prevTickets => 
          prevTickets.map(ticket => 
            ticket.id === ticketId ? { ...ticket, status } : ticket
          )
        );
        
        // Update status counts
        setStatusCounts(prev => {
          const newCounts = { ...prev };
          const oldTicket = tickets.find(t => t.id === ticketId);
          if (oldTicket) {
            // Decrement old status count
            if (oldTicket.status === 'open') newCounts.open--;
            if (oldTicket.status === 'in_progress') newCounts.in_progress--;
            if (oldTicket.status === 'resolved') newCounts.resolved--;
            if (oldTicket.status === 'closed') newCounts.closed--;
            
            // Increment new status count
            if (status === 'open') newCounts.open++;
            if (status === 'in_progress') newCounts.in_progress++;
            if (status === 'resolved') newCounts.resolved++;
            if (status === 'closed') newCounts.closed++;
          }
          return newCounts;
        });

        window.pfToast?.updated?.(`Ticket marked as ${status} successfully`);
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
      window.pfToast?.error?.('Failed to update ticket: ' + (error.response?.data?.error || error.message));
    }
  };

  const addResponse = async (ticketId) => {
    if (!responseMessage.trim()) {
      window.pfToast?.warning?.('Please enter a response message');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5000/api/support/tickets/${ticketId}/responses`, 
        { message: responseMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setResponseMessage('');
        
        const updatedTicket = await fetchTicketDetails(ticketId);
        setSelectedTicket(updatedTicket);
        
        setTickets(prevTickets => 
          prevTickets.map(ticket => 
            ticket.id === ticketId 
              ? { 
                  ...ticket, 
                  response_count: (ticket.response_count || 0) + 1,
                  status: ticket.status === 'open' ? 'in_progress' : ticket.status
                }
              : ticket
          )
        );

        window.pfToast?.added?.('Response added successfully');
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error('Error adding response:', error);
      window.pfToast?.error?.('Failed to add response: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleViewTicket = async (ticket) => {
    try {
      setLoading(true);
      const ticketDetails = await fetchTicketDetails(ticket.id);
      setSelectedTicket(ticketDetails);
    } catch (error) {
      console.error('Error loading ticket details:', error);
      window.pfToast?.error?.('Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  const refreshTicket = async () => {
    if (selectedTicket) {
      try {
        const updatedTicket = await fetchTicketDetails(selectedTicket.id);
        setSelectedTicket(updatedTicket);
      } catch (error) {
        console.error('Error refreshing ticket:', error);
      }
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      open: { 
        color: 'sm-status-open', 
        icon: <FaClock className="sm-status-icon" />,
        label: 'Open'
      },
      in_progress: { 
        color: 'sm-status-in-progress', 
        icon: <FaComment className="sm-status-icon" />,
        label: 'In Progress'
      },
      resolved: { 
        color: 'sm-status-resolved', 
        icon: <FaCheck className="sm-status-icon" />,
        label: 'Resolved'
      },
      closed: { 
        color: 'sm-status-closed', 
        icon: <FaTimes className="sm-status-icon" />,
        label: 'Closed'
      }
    };
    
    const config = statusConfig[status] || statusConfig.open;
    
    return (
      <span className={`sm-status-badge ${config.color}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  const downloadEvidence = async (evidence) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/support/evidence/${evidence.filename}`, {
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
      } else {
        throw new Error('Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading evidence:', error);
      window.pfToast?.error?.('Failed to download file');
    }
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

  const renderPagination = () => {
    if (totalTickets === 0) return null;

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
      <div className="sm-pagination">
        <div className="sm-pagination-info">
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalTickets)} of {totalTickets} entries
        </div>
        <div className="sm-pagination-controls">
          <button
            className={`sm-pagination-btn ${currentPage === 1 ? 'disabled' : ''}`}
            onClick={prevPage}
            disabled={currentPage === 1}
          >
            <FaChevronLeft /> Previous
          </button>
          
          <div className="sm-pagination-numbers">
            {startPage > 1 && (
              <>
                <button
                  className={`sm-page-number ${1 === currentPage ? 'active' : ''}`}
                  onClick={() => goToPage(1)}
                >
                  1
                </button>
                {startPage > 2 && <span className="sm-page-ellipsis">...</span>}
              </>
            )}
            
            {pageNumbers.map(page => (
              <button
                key={page}
                className={`sm-page-number ${page === currentPage ? 'active' : ''}`}
                onClick={() => goToPage(page)}
              >
                {page}
              </button>
            ))}
            
            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && <span className="sm-page-ellipsis">...</span>}
                <button
                  className={`sm-page-number ${totalPages === currentPage ? 'active' : ''}`}
                  onClick={() => goToPage(totalPages)}
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>
          
          <button
            className={`sm-pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`}
            onClick={nextPage}
            disabled={currentPage === totalPages}
          >
            Next <FaChevronRight />
          </button>
        </div>
      </div>
    );
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="support-management">
        <HeaderSkeleton />
        <ToolbarSkeleton />

        <div className="sm-tickets-list">
          <div className="sm-tickets-container">
            <div className="sm-select-all">
              <div className="sm-skeleton-checkbox-label"></div>
            </div>
            {[...Array(5)].map((_, index) => (
              <SkeletonTicketCard key={index} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="support-management">
      {/* Header Section */}
      {loading ? (
        <HeaderSkeleton />
      ) : (
        <div className="sm-header">
          <div className="sm-header-content">
            <div className="sm-title-section">
              <FaComment className="sm-header-icon" />
              <div>
                <h1 className="sm-main-title">Support Tickets</h1>
                <p className="sm-subtitle">Manage user support requests</p>
              </div>
            </div>
            
            <div className="sm-stats">
              <div className="sm-stat-card">
                <FaComment className="sm-stat-icon total" />
                <span className="sm-stat-number total">{statusCounts.total}</span>
                <span className="sm-stat-label">Total</span>
              </div>
              <div className="sm-stat-card">
                <FaClock className="sm-stat-icon open" />
                <span className="sm-stat-number open">{statusCounts.open}</span>
                <span className="sm-stat-label">Open</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions Toolbar */}
      {selectedTickets.size > 0 && (
        <div className="sm-bulk-actions">
          <div className="sm-bulk-info">
            <span>{selectedTickets.size} ticket(s) selected</span>
          </div>
          <div className="sm-bulk-buttons">
            <button 
              onClick={deleteMultipleTickets}
              className="sm-btn-deletes-bulk"
            >
              <FaTrash /> Delete Selected
            </button>
            <button 
              onClick={() => setSelectedTickets(new Set())}
              className="sm-btn-clear-selection"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      {loading ? (
        <ToolbarSkeleton />
      ) : (
        <div className="sm-toolbar">
          <div className="sm-filters">
            <select 
              className="sm-filter-select"
              value={filters.status} 
              onChange={(e) => {
                setFilters({...filters, status: e.target.value});
                setCurrentPage(1);
              }}
            >
              <option value="all">All Tickets ({statusCounts.total})</option>
              <option value="open">Open ({statusCounts.open})</option>
              <option value="in_progress">In Progress ({statusCounts.in_progress})</option>
              <option value="resolved">Resolved ({statusCounts.resolved})</option>
              <option value="closed">Closed ({statusCounts.closed})</option>
            </select>
            
            <div className="sm-search">
              <FaSearch className="sm-search-icon" />
              <input
                type="text"
                className="sm-search-input"
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tickets List */}
      <div className="sm-tickets-list">
        {loading ? (
          <div className="sm-tickets-container">
            <div className="sm-select-all">
              <div className="sm-skeleton-checkbox-label"></div>
            </div>
            {[...Array(5)].map((_, index) => (
              <SkeletonTicketCard key={index} />
            ))}
          </div>
        ) : tickets.length > 0 ? (
          <div className="sm-tickets-container">
            {/* Select All Header */}
            <div className="sm-select-all">
              <label className="sm-checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedTickets.size === tickets.length && tickets.length > 0}
                  onChange={selectAllTickets}
                  className="sm-checkbox"
                />
                Select All ({tickets.length} tickets)
              </label>
            </div>

            {/* Tickets List */}
            {tickets.map(ticket => (
              <div key={ticket.id} className={`sm-ticket-card ${ticket.status === 'open' ? 'sm-urgent' : ''}`}>
                <div className="sm-ticket-header">
                  <div className="sm-ticket-selection">
                    <input
                      type="checkbox"
                      checked={selectedTickets.has(ticket.id)}
                      onChange={() => handleTicketSelect(ticket.id)}
                      className="sm-checkbox"
                    />
                  </div>
                  <div className="sm-ticket-info">
                    <h3 className="sm-ticket-subject">#{ticket.id} - {ticket.subject}</h3>
                    <div className="sm-ticket-meta">
                      <span className="sm-user">
                        <FaUser /> {ticket.name} ({ticket.email})
                      </span>
                      <span className="sm-date">
                        <FaCalendar /> {formatDate(ticket.created_at)}
                      </span>
                      {ticket.response_count > 0 && (
                        <span className="sm-response-count">
                          <FaComment /> {ticket.response_count} response{ticket.response_count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="sm-ticket-actions">
                    {getStatusBadge(ticket.status)}
                    <button 
                      onClick={() => handleViewTicket(ticket)}
                      className="sm-btn-view"
                    >
                      <FaEye /> View
                    </button>
                    <button 
                      onClick={() => {
                        setTicketToDelete(ticket);
                        setShowDeleteConfirm(true);
                      }}
                      className="sm-btn-deletes"
                      title="Delete ticket"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
                
                <div className="sm-ticket-preview">
                  <p>{ticket.message.substring(0, 150)}...</p>
                </div>

                {ticket.evidence && ticket.evidence.length > 0 && (
                  <div className="sm-ticket-files">
                    <FaPaperclip /> {ticket.evidence.length} file{ticket.evidence.length !== 1 ? 's' : ''} attached
                  </div>
                )}
              </div>
            ))}

            {/* Pagination */}
            {renderPagination()}
          </div>
        ) : (
          <div className="sm-no-data">
            <FaComment className="sm-no-data-icon" />
            <h3>No Support Tickets Found</h3>
            <p>
              {totalTickets === 0 
                ? "There are no support tickets yet."
                : "No tickets match your search criteria."
              }
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && ticketToDelete && (
        <div className="sm-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="sm-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sm-confirm-header">
              <h3>Confirm Deletion</h3>
            </div>
            <div className="sm-confirm-body">
              <p>Are you sure you want to delete ticket #{ticketToDelete.id}?</p>
              <p><strong>Subject:</strong> {ticketToDelete.subject}</p>
              <p><strong>User:</strong> {ticketToDelete.name} ({ticketToDelete.email})</p>
              <p className="sm-warning-text">This action cannot be undone and will permanently delete all ticket data and associated files.</p>
            </div>
            <div className="sm-confirm-actions">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="sm-btn-cancels"
              >
                Cancel
              </button>
              <button 
                onClick={() => deleteTicket(ticketToDelete.id)}
                className="sm-btn-confirm-delete"
              >
                <FaTrash /> Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="sm-modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="sm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="sm-modal-header">
              <h2>Support Ticket #{selectedTicket.id}</h2>
              <div className="sm-modal-actions">
                <button 
                  className="sm-modal-close"
                  onClick={() => setSelectedTicket(null)}
                >
                  <FaTimes />
                </button>
              </div>
            </div>
            
            <div className="sm-modal-body">
              {/* Ticket Info */}
              <div className="sm-ticket-detail">
                <div className="sm-detail-group">
                  <label>User:</label>
                  <span>{selectedTicket.name} ({selectedTicket.email})</span>
                </div>
                
                <div className="sm-detail-group">
                  <label>Subject:</label>
                  <span>{selectedTicket.subject}</span>
                </div>
                
                <div className="sm-detail-group">
                  <label>Status:</label>
                  <span>{getStatusBadge(selectedTicket.status)}</span>
                </div>
                
                <div className="sm-detail-group">
                  <label>Date:</label>
                  <span>{formatDate(selectedTicket.created_at)}</span>
                </div>
              </div>

              {/* Message */}
              <div className="sm-message-section">
                <h3>Message</h3>
                <div className="sm-message-box">
                  {selectedTicket.message}
                </div>
              </div>

              {/* Attachments */}
              {selectedTicket.evidence && selectedTicket.evidence.length > 0 && (
                <div className="sm-attachments-section">
                  <h3>Attachments ({selectedTicket.evidence.length})</h3>
                  <div className="sm-attachments-list">
                    {selectedTicket.evidence.map((file, index) => (
                      <div key={index} className="sm-attachment-item">
                        <FaPaperclip />
                        <span>{file.originalname}</span>
                        <button 
                          onClick={() => downloadEvidence(file)}
                          className="sm-download-btn"
                        >
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Responses */}
              <div className="sm-responses-section">
                <h3>Responses ({selectedTicket.responses ? selectedTicket.responses.length : 0})</h3>
                {selectedTicket.responses && selectedTicket.responses.length > 0 ? (
                  <div className="sm-responses-list">
                    {selectedTicket.responses.map((response, index) => (
                      <div key={response.id || index} className="sm-response-item">
                        <div className="sm-response-header">
                          <div>
                            <strong>{response.admin_name || 'Support Team'}</strong>
                            {response.admin_role && (
                              <span className="sm-admin-role">({response.admin_role})</span>
                            )}
                          </div>
                          <span>{formatDate(response.created_at)}</span>
                        </div>
                        <div className="sm-response-message">
                          {response.message}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="sm-no-responses">No responses yet.</p>
                )}

                {/* Add Response */}
                <div className="sm-response-form">
                  <h4>Add Response</h4>
                  <textarea
                    className="sm-response-textarea"
                    value={responseMessage}
                    onChange={(e) => setResponseMessage(e.target.value)}
                    placeholder="Type your response here..."
                    rows={4}
                  />
                  <button 
                    onClick={() => addResponse(selectedTicket.id)}
                    className="sm-btn-send-response"
                    disabled={!responseMessage.trim()}
                  >
                    <FaReply /> Send Response
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="sm-quick-actions">
                <h4>Quick Actions</h4>
                <div className="sm-action-buttons">
                  {selectedTicket.status !== 'resolved' && (
                    <button 
                      onClick={() => updateTicketStatus(selectedTicket.id, 'resolved')}
                      className="sm-btn-resolve"
                    >
                      <FaCheck /> Mark as Resolved
                    </button>
                  )}
                  {selectedTicket.status !== 'closed' && (
                    <button 
                      onClick={() => updateTicketStatus(selectedTicket.id, 'closed')}
                      className="sm-btn-close"
                    >
                      <FaTimes /> Close Ticket
                    </button>
                  )}
                  {selectedTicket.status === 'resolved' && (
                    <button 
                      onClick={() => updateTicketStatus(selectedTicket.id, 'in_progress')}
                      className="sm-btn-reopen"
                    >
                      <FaClock /> Reopen
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setTicketToDelete(selectedTicket);
                      setShowDeleteConfirm(true);
                    }}
                    className="sm-btn-deletes"
                  >
                    <FaTrash /> Delete Ticket
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportManagement;
import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { saveAs } from 'file-saver';
import { 
  FiImage, 
  FiBarChart2,
  FiUsers,
  FiShield,
  FiMessageSquare,
  FiStar,
  FiFlag,
  FiBarChart,
  FiPieChart,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiXCircle,
  FiBook,
  FiTrendingUp,
  FiActivity
} from 'react-icons/fi';

// Professional color schemes
const PROFESSIONAL_COLORS = {
  // Modern gradient blues for ratings (5-star to 1-star)
  ratingDistribution: ['#f6fa08ff', '#4ADE80', '#60A5FA', '#F59E0B', '#EF4444'],
  
  // Complementary colors for user ratings vs reviews
  topUsers: ['#3B82F6', '#10B981'],
  
  // Status-based colors for reports
  reports: {
    pending: '#F59E0B',    // Amber/Yellow
    reviewed: '#3B82F6',   // Blue
    resolved: '#22C55E',   // Green
    dismissed: '#EF4444',  // Red
    default: '#6B7280'     // Gray
  },
  
  // Analytics colors
  analytics: ['#22C55E', '#3B82F6', '#F59E0B', '#8B5CF6'],
  
  // Severity colors for reports
  severity: {
    high: '#EF4444',    // Red
    medium: '#F59E0B',  // Amber/Yellow
    low: '#10B981'      // Green
  },
  
  // Appeal status colors
  appeals: {
    pending: '#F59E0B',     // Amber/Yellow
    under_review: '#3B82F6', // Blue
    approved: '#22C55E',     // Green
    rejected: '#EF4444'      // Red
  }
};

const dashboardStyles = {
  container: {
    padding: '24px',
    backgroundColor: '#f8fafc',
    minHeight: '100vh'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e2e8f0'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a202c',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '24px',
    marginBottom: '32px'
  },
  statCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    borderLeft: '4px solid #3b82f6',
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  },
  statCardGreen: { borderLeftColor: '#10b981' },
  statCardYellow: { borderLeftColor: '#f59e0b' },
  statCardPurple: { borderLeftColor: '#8b5cf6' },
  statCardRed: { borderLeftColor: '#ef4444' },
  statCardOrange: { borderLeftColor: '#f97316' },
  statCardIndigo: { borderLeftColor: '#6366f1' },
  statTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1a202c',
    margin: 0
  },
  statSubtitle: {
    fontSize: '14px',
    color: '#718096',
    marginTop: '8px'
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
    gap: '24px',
    marginBottom: '32px'
  },
  chartCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    position: 'relative'
  },
  chartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  chartTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a202c',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  chartActions: {
    display: 'flex',
    gap: '8px'
  },
  chartActionButton: {
    background: 'none',
    border: '1px solid #d1d5db',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  chartContainer: {
    height: '350px',
    width: '100%',
    minHeight: '350px'
  },
  analyticsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },
  analyticsItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f7fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  analyticsLabel: {
    fontSize: '14px',
    color: '#4a5568',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  analyticsValue: {
    fontSize: '16px',
    fontWeight: '600'
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '400px',
    flexDirection: 'column'
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    animation: 'spin 1s linear infinite'
  },
  errorContainer: {
    backgroundColor: '#fed7d7',
    border: '1px solid #feb2b2',
    color: '#c53030',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  warningContainer: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fcd34d',
    color: '#92400e',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  legendContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px'
  },
  legendColor: {
    width: '12px',
    height: '12px',
    borderRadius: '2px'
  },
  miniStatsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  miniStatCard: {
    background: 'white',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    borderLeft: '3px solid #3b82f6'
  },
  miniStatTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  miniStatValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a202c',
    margin: 0
  }
};

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: 'white',
        padding: '12px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <p style={{ fontWeight: '600', margin: '0 0 8px 0' }}>{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ 
            color: entry.color, 
            margin: '4px 0',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: entry.color,
              borderRadius: '50%'
            }}></div>
            {entry.name}: <strong>{entry.value}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Status Icon Component
const StatusIcon = ({ status }) => {
  const icons = {
    pending: <FiClock style={{ color: PROFESSIONAL_COLORS.reports.pending }} />,
    reviewed: <FiAlertCircle style={{ color: PROFESSIONAL_COLORS.reports.reviewed }} />,
    resolved: <FiCheckCircle style={{ color: PROFESSIONAL_COLORS.reports.resolved }} />,
    dismissed: <FiXCircle style={{ color: PROFESSIONAL_COLORS.reports.dismissed }} />,
    active: <FiCheckCircle style={{ color: PROFESSIONAL_COLORS.reports.resolved }} />,
    inactive: <FiXCircle style={{ color: PROFESSIONAL_COLORS.reports.dismissed }} />,
    high: <FiAlertCircle style={{ color: PROFESSIONAL_COLORS.severity.high }} />,
    medium: <FiAlertCircle style={{ color: PROFESSIONAL_COLORS.severity.medium }} />,
    low: <FiAlertCircle style={{ color: PROFESSIONAL_COLORS.severity.low }} />
  };
  
  return icons[status] || <FiAlertCircle />;
};

// Enhanced download functionality using html2canvas
const downloadChartAsPNG = async (chartId, filename) => {
  const chartElement = document.getElementById(chartId);
  if (!chartElement) {
    console.error('Chart element not found:', chartId);
    return;
  }

  try {
    // Dynamically import html2canvas
    const html2canvas = (await import('html2canvas')).default;
    
    const canvas = await html2canvas(chartElement, {
      backgroundColor: '#ffffff',
      scale: 2, // Higher quality
      useCORS: true,
      logging: false
    });
    
    canvas.toBlob((blob) => {
      if (blob) {
        saveAs(blob, `${filename}-${new Date().getTime()}.png`);
      }
    });
  } catch (error) {
    console.error('Error generating PNG:', error);
    alert('Error generating PNG. Please try again or use CSV export.');
  }
};

const downloadChartAsCSV = (data, filename) => {
  if (!data || data.length === 0) {
    alert('No data available to export');
    return;
  }
  
  const headers = Object.keys(data[0]).filter(key => key !== 'color' && key !== 'status');
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => 
        JSON.stringify(row[header] || '')
      ).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${filename}-${new Date().getTime()}.csv`);
};

export default function DashboardOverview() {
  const [stats, setStats] = useState({
    users: 0,
    moderators: 0,
    feedback: 0,
    reports: 0,
    averageRating: 0,
    appeals: 0,
    pendingAppeals: 0,
    categories: 0,
    subjects: 0
  });
  const [ratingData, setRatingData] = useState([]);
  const [userGrowthData, setUserGrowthData] = useState([]);
  const [reportStatusData, setReportStatusData] = useState([]);
  const [reportSeverityData, setReportSeverityData] = useState([]);
  const [appealStatusData, setAppealStatusData] = useState([]);
  const [feedbackStats, setFeedbackStats] = useState({});
  const [reportStats, setReportStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState([]);

  // Get current user role
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const isModerator = currentUser?.role === 'moderator';

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setWarnings([]);
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch all required data
      const requests = [
        fetch(`${API_BASE}/admin/users`, { headers }),
        ...(isModerator ? [] : [fetch(`${API_BASE}/admin/moderators`, { headers })]),
        fetch(`${API_BASE}/admin/feedback/stats`, { headers }),
        fetch(`${API_BASE}/admin/reports/stats`, { headers }),
        fetch(`${API_BASE}/admin/subjects`, { headers }),
        fetch(`${API_BASE}/admin/appeals/stats`, { headers })
      ];

      const [usersResponse, ...otherResponses] = await Promise.all(requests);

      if (!usersResponse.ok) throw new Error(`Users: ${usersResponse.status}`);

      // Handle responses based on user role
      let moderatorsResponse, feedbackResponse, reportsResponse, subjectsResponse, appealsResponse;
      
      if (isModerator) {
        // For moderators: usersResponse, feedbackResponse, reportsResponse, subjectsResponse, appealsResponse
        [feedbackResponse, reportsResponse, subjectsResponse, appealsResponse] = otherResponses;
      } else {
        // For admins: usersResponse, moderatorsResponse, feedbackResponse, reportsResponse, subjectsResponse, appealsResponse
        [moderatorsResponse, feedbackResponse, reportsResponse, subjectsResponse, appealsResponse] = otherResponses;
        
        if (!moderatorsResponse.ok) throw new Error(`Moderators: ${moderatorsResponse.status}`);
      }

      if (!feedbackResponse.ok) throw new Error(`Feedback: ${feedbackResponse.status}`);
      if (!reportsResponse.ok) throw new Error(`Reports: ${reportsResponse.status}`);
      if (!subjectsResponse.ok) throw new Error(`Subjects: ${subjectsResponse.status}`);
      if (!appealsResponse.ok) throw new Error(`Appeals: ${appealsResponse.status}`);

      const users = await usersResponse.json();
      const moderators = isModerator ? 0 : await moderatorsResponse.json();
      const feedbackStats = await feedbackResponse.json();
      const reportsStats = await reportsResponse.json();
      const subjectsData = await subjectsResponse.json();
      const appealsStats = await appealsResponse.json();

      processDashboardData(users, moderators, feedbackStats, reportsStats, subjectsData, appealsStats);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      
      // Check if it's a permission error for moderators
      if (error.message.includes('403') && isModerator) {
        setWarnings(['Some data is restricted for moderator accounts']);
        // Try to fetch data without the restricted endpoints
        fetchLimitedData();
      } else {
        setError(`Failed to load dashboard data: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [API_BASE, isModerator]);

  // Fallback function to fetch data without restricted endpoints
  const fetchLimitedData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const [usersResponse, feedbackResponse, reportsResponse, subjectsResponse, appealsResponse] = await Promise.all([
        fetch(`${API_BASE}/admin/users`, { headers }),
        fetch(`${API_BASE}/admin/feedback/stats`, { headers }),
        fetch(`${API_BASE}/admin/reports/stats`, { headers }),
        fetch(`${API_BASE}/admin/subjects`, { headers }),
        fetch(`${API_BASE}/admin/appeals/stats`, { headers })
      ]);

      if (usersResponse.ok && feedbackResponse.ok && reportsResponse.ok && subjectsResponse.ok && appealsResponse.ok) {
        const users = await usersResponse.json();
        const feedbackStats = await feedbackResponse.json();
        const reportsStats = await reportsResponse.json();
        const subjectsData = await subjectsResponse.json();
        const appealsStats = await appealsResponse.json();
        
        processDashboardData(users, 0, feedbackStats, reportsStats, subjectsData, appealsStats);
      }
    } catch (error) {
      console.error('Error fetching limited data:', error);
    }
  };

  const processDashboardData = (users, moderators, feedbackStats, reportsStats, subjectsData, appealsStats) => {
    const totalUsers = Array.isArray(users) ? users.length : 0;
    const totalModerators = isModerator ? 0 : (Array.isArray(moderators) ? moderators.length : 0);
    
    const feedbackData = feedbackStats.stats || feedbackStats || {};
    const totalFeedback = Number(feedbackData.total_feedback) || 0;
    
    let avgRating = feedbackData.average_rating;
    if (avgRating === null || avgRating === undefined) avgRating = 0;
    avgRating = typeof avgRating === 'string' ? parseFloat(avgRating) : Number(avgRating);
    avgRating = isNaN(avgRating) ? 0 : avgRating;

    const reportsData = reportsStats.stats || reportsStats || {};
    const totalReports = Number(reportsData.total) || 0;

    const subjectsInfo = subjectsData.categories || [];
    const totalCategories = subjectsInfo.length || 0;
    const totalSubjects = subjectsInfo.reduce((total, category) => total + (category.subjects?.length || 0), 0);

    const appealsData = appealsStats.stats || appealsStats || {};
    const totalAppeals = Number(appealsData.total) || 0;
    const pendingAppeals = Number(appealsData.byStatus?.pending) || 0;

    setStats({
      users: totalUsers,
      moderators: totalModerators,
      feedback: totalFeedback,
      reports: totalReports,
      averageRating: avgRating.toFixed(1),
      appeals: totalAppeals,
      pendingAppeals: pendingAppeals,
      categories: totalCategories,
      subjects: totalSubjects
    });

    // Professional rating distribution with meaningful colors
    const ratingDistribution = [
      { 
        name: '5 Stars', 
        value: Number(feedbackData.five_star) || 0, 
        color: PROFESSIONAL_COLORS.ratingDistribution[0]
      },
      { 
        name: '4 Stars', 
        value: Number(feedbackData.four_star) || 0, 
        color: PROFESSIONAL_COLORS.ratingDistribution[1]
      },
      { 
        name: '3 Stars', 
        value: Number(feedbackData.three_star) || 0, 
        color: PROFESSIONAL_COLORS.ratingDistribution[2]
      },
      { 
        name: '2 Stars', 
        value: Number(feedbackData.two_star) || 0, 
        color: PROFESSIONAL_COLORS.ratingDistribution[3]
      },
      { 
        name: '1 Star', 
        value: Number(feedbackData.one_star) || 0, 
        color: PROFESSIONAL_COLORS.ratingDistribution[4]
      }
    ];
    setRatingData(ratingDistribution);

    // User ratings data
    const userRatings = (Array.isArray(users) ? users : [])
      .filter(user => user && (user.rating > 0))
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 8)
      .map(user => ({
        name: (user.username || 'Unknown').substring(0, 10) + 
              ((user.username || '').length > 10 ? '...' : ''),
        rating: Number(user.rating) || 0,
        reviews: Number(user.total_reviews) || 0,
        user: user.username || 'Unknown'
      }));
    setUserGrowthData(userRatings);

    // Report status data
    const reportStatuses = reportsData.byStatus || {};
    const reportData = Object.entries(reportStatuses).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      count: Number(count) || 0,
      color: PROFESSIONAL_COLORS.reports[status] || PROFESSIONAL_COLORS.reports.default,
      status: status
    }));
    setReportStatusData(reportData);

    // Report severity data
    const reportSeverities = reportsData.bySeverity || {};
    const severityData = Object.entries(reportSeverities).map(([severity, count]) => ({
      name: severity.charAt(0).toUpperCase() + severity.slice(1),
      count: Number(count) || 0,
      color: PROFESSIONAL_COLORS.severity[severity] || PROFESSIONAL_COLORS.reports.default,
      severity: severity
    }));
    setReportSeverityData(severityData);

    // Appeal status data
    const appealStatuses = appealsData.byStatus || {};
    const appealData = Object.entries(appealStatuses).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
      count: Number(count) || 0,
      color: PROFESSIONAL_COLORS.appeals[status] || PROFESSIONAL_COLORS.reports.default,
      status: status
    }));
    setAppealStatusData(appealData);

    setFeedbackStats(feedbackData);
    setReportStats(reportsData);
  };

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    fetchDashboardData();
    
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const statCardStyle = (color) => ({
    ...dashboardStyles.statCard,
    ...(color === 'green' && dashboardStyles.statCardGreen),
    ...(color === 'yellow' && dashboardStyles.statCardYellow),
    ...(color === 'purple' && dashboardStyles.statCardPurple),
    ...(color === 'red' && dashboardStyles.statCardRed),
    ...(color === 'orange' && dashboardStyles.statCardOrange),
    ...(color === 'indigo' && dashboardStyles.statCardIndigo)
  });

  if (loading) {
    return (
      <div style={dashboardStyles.container}>
        <div style={dashboardStyles.loadingContainer}>
          <div style={dashboardStyles.spinner}></div>
          <p style={{ marginTop: '16px', color: '#718096' }}>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={dashboardStyles.container}>
      {/* Header */}
      <div style={dashboardStyles.header}>
        <h1 style={dashboardStyles.title}>
          <FiBarChart style={{ color: '#3B82F6' }} />
          Analytics Dashboard
          {isModerator && (
            <span style={{ 
              fontSize: '14px', 
              color: '#6B7280', 
              fontWeight: 'normal',
              marginLeft: '12px'
            }}>
              (Moderator View)
            </span>
          )}
        </h1>
        <div style={{ fontSize: '14px', color: '#6B7280' }}>
          Auto-refreshes every 30 seconds
        </div>
      </div>

      {error && (
        <div style={dashboardStyles.errorContainer}>
          <FiAlertCircle size={18} />
          <div>
            <strong>Error: </strong>{error}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div style={dashboardStyles.warningContainer}>
          <FiAlertCircle size={18} />
          <div>
            <strong>Note: </strong>{warnings.join(' ')}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div style={{
        ...dashboardStyles.statsGrid,
        gridTemplateColumns: isModerator 
          ? 'repeat(auto-fit, minmax(250px, 1fr))' 
          : 'repeat(auto-fit, minmax(250px, 1fr))'
      }}>
        <div style={statCardStyle('blue')}>
          <div style={dashboardStyles.statTitle}>
            <FiUsers size={18} />
            Total Users
          </div>
          <div style={dashboardStyles.statValue}>{stats.users}</div>
          <div style={dashboardStyles.statSubtitle}>Registered users</div>
        </div>
        
        {/* Moderators Card - Only show for admins */}
        {!isModerator && (
          <div style={statCardStyle('green')}>
            <div style={dashboardStyles.statTitle}>
              <FiShield size={18} />
              Moderators
            </div>
            <div style={dashboardStyles.statValue}>{stats.moderators}</div>
            <div style={dashboardStyles.statSubtitle}>Active moderators</div>
          </div>
        )}
        
        <div style={statCardStyle('yellow')}>
          <div style={dashboardStyles.statTitle}>
            <FiMessageSquare size={18} />
            Total Feedback
          </div>
          <div style={dashboardStyles.statValue}>{stats.feedback}</div>
          <div style={dashboardStyles.statSubtitle}>User reviews</div>
        </div>
        
        <div style={statCardStyle('purple')}>
          <div style={dashboardStyles.statTitle}>
            <FiStar size={18} />
            Average Rating
          </div>
          <div style={dashboardStyles.statValue}>{stats.averageRating}</div>
          <div style={dashboardStyles.statSubtitle}>Out of 5 stars</div>
        </div>

        {/* New Stats for Reports, Appeals, and Subjects */}
        <div style={statCardStyle('red')}>
          <div style={dashboardStyles.statTitle}>
            <FiFlag size={18} />
            Total Reports
          </div>
          <div style={dashboardStyles.statValue}>{stats.reports}</div>
          <div style={dashboardStyles.statSubtitle}>User reports</div>
        </div>

        <div style={statCardStyle('orange')}>
          <div style={dashboardStyles.statTitle}>
            <FiBook size={18} />
            Pending Appeals
          </div>
          <div style={dashboardStyles.statValue}>{stats.pendingAppeals}</div>
          <div style={dashboardStyles.statSubtitle}>Out of {stats.appeals} total</div>
        </div>

        <div style={statCardStyle('indigo')}>
          <div style={dashboardStyles.statTitle}>
            <FiBook size={18} />
            Categories & Subjects
          </div>
          <div style={dashboardStyles.statValue}>{stats.categories}</div>
          <div style={dashboardStyles.statSubtitle}>{stats.subjects} total subjects</div>
        </div>
      </div>

      {/* Mini Stats Grid for Report Severity */}
      <div style={dashboardStyles.miniStatsGrid}>
        <div style={dashboardStyles.miniStatCard}>
          <div style={dashboardStyles.miniStatTitle}>
            <FiAlertCircle style={{ color: PROFESSIONAL_COLORS.severity.high }} />
            High Severity Reports
          </div>
          <div style={{...dashboardStyles.miniStatValue, color: PROFESSIONAL_COLORS.severity.high}}>
            {reportStats.bySeverity?.high || 0}
          </div>
        </div>
        <div style={dashboardStyles.miniStatCard}>
          <div style={dashboardStyles.miniStatTitle}>
            <FiAlertCircle style={{ color: PROFESSIONAL_COLORS.severity.medium }} />
            Medium Severity Reports
          </div>
          <div style={{...dashboardStyles.miniStatValue, color: PROFESSIONAL_COLORS.severity.medium}}>
            {reportStats.bySeverity?.medium || 0}
          </div>
        </div>
        <div style={dashboardStyles.miniStatCard}>
          <div style={dashboardStyles.miniStatTitle}>
            <FiAlertCircle style={{ color: PROFESSIONAL_COLORS.severity.low }} />
            Low Severity Reports
          </div>
          <div style={{...dashboardStyles.miniStatValue, color: PROFESSIONAL_COLORS.severity.low}}>
            {reportStats.bySeverity?.low || 0}
          </div>
        </div>
        <div style={dashboardStyles.miniStatCard}>
          <div style={dashboardStyles.miniStatTitle}>
            <FiActivity size={16} />
            Resolution Rate
          </div>
          <div style={dashboardStyles.miniStatValue}>
            {reportStats.total ? 
              `${(((reportStats.byStatus?.resolved || 0) / reportStats.total) * 100).toFixed(1)}%` 
              : '0%'
            }
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={dashboardStyles.chartsGrid}>
        {/* Rating Distribution */}
        <div style={dashboardStyles.chartCard}>
          <div style={dashboardStyles.chartHeader}>
            <h3 style={dashboardStyles.chartTitle}>
              <FiPieChart size={20} />
              Rating Distribution
            </h3>
            <div style={dashboardStyles.chartActions}>
              <button 
                style={dashboardStyles.chartActionButton}
                onClick={() => downloadChartAsPNG('rating-chart', 'rating-distribution')}
                onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <FiImage size={14} />
                PNG
              </button>
              <button 
                style={dashboardStyles.chartActionButton}
                onClick={() => downloadChartAsCSV(ratingData, 'rating-distribution')}
                onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <FiBarChart2 size={14} />
                CSV
              </button>
            </div>
          </div>
          <div style={dashboardStyles.chartContainer} id="rating-chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ratingData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name.split(' ')[0]}\n(${(percent * 100).toFixed(1)}%)`}
                  outerRadius={120}
                  innerRadius={60}
                  dataKey="value"
                >
                  {ratingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={dashboardStyles.legendContainer}>
            {ratingData.map((entry, index) => (
              <div key={index} style={dashboardStyles.legendItem}>
                <div style={{...dashboardStyles.legendColor, backgroundColor: entry.color}} />
                <span>{entry.name}: {entry.value} reviews</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Rated Users */}
        <div style={dashboardStyles.chartCard}>
          <div style={dashboardStyles.chartHeader}>
            <h3 style={dashboardStyles.chartTitle}>
              <FiBarChart2 size={20} />
              Top Rated Users
            </h3>
            <div style={dashboardStyles.chartActions}>
              <button 
                style={dashboardStyles.chartActionButton}
                onClick={() => downloadChartAsPNG('users-chart', 'top-users')}
                onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <FiImage size={14} />
                PNG
              </button>
              <button 
                style={dashboardStyles.chartActionButton}
                onClick={() => downloadChartAsCSV(userGrowthData, 'top-users')}
                onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <FiBarChart2 size={14} />
                CSV
              </button>
            </div>
          </div>
          <div style={dashboardStyles.chartContainer} id="users-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  dataKey="rating" 
                  name="Rating" 
                  fill={PROFESSIONAL_COLORS.topUsers[0]} 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="reviews" 
                  name="Reviews" 
                  fill={PROFESSIONAL_COLORS.topUsers[1]} 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={dashboardStyles.legendContainer}>
            <div style={dashboardStyles.legendItem}>
              <div style={{...dashboardStyles.legendColor, backgroundColor: PROFESSIONAL_COLORS.topUsers[0]}} />
              <span>User Rating (1-5 scale)</span>
            </div>
            <div style={dashboardStyles.legendItem}>
              <div style={{...dashboardStyles.legendColor, backgroundColor: PROFESSIONAL_COLORS.topUsers[1]}} />
              <span>Number of Reviews</span>
            </div>
          </div>
        </div>

        {/* Report Status */}
        <div style={dashboardStyles.chartCard}>
          <div style={dashboardStyles.chartHeader}>
            <h3 style={dashboardStyles.chartTitle}>
              <FiFlag size={20} />
              Report Status
            </h3>
            <div style={dashboardStyles.chartActions}>
              <button 
                style={dashboardStyles.chartActionButton}
                onClick={() => downloadChartAsPNG('reports-chart', 'reports-status')}
                onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <FiImage size={14} />
                PNG
              </button>
              <button 
                style={dashboardStyles.chartActionButton}
                onClick={() => downloadChartAsCSV(reportStatusData, 'reports-status')}
                onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <FiBarChart2 size={14} />
                CSV
              </button>
            </div>
          </div>
          <div style={dashboardStyles.chartContainer} id="reports-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  dataKey="count" 
                  name="Report Count" 
                  radius={[4, 4, 0, 0]}
                >
                  {reportStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={dashboardStyles.legendContainer}>
            {reportStatusData.map((entry, index) => (
              <div key={index} style={dashboardStyles.legendItem}>
                <StatusIcon status={entry.status} />
                <div style={{...dashboardStyles.legendColor, backgroundColor: entry.color}} />
                <span>{entry.name}: {entry.count} reports</span>
              </div>
            ))}
          </div>
        </div>

        {/* Report Severity */}
        <div style={dashboardStyles.chartCard}>
          <div style={dashboardStyles.chartHeader}>
            <h3 style={dashboardStyles.chartTitle}>
              <FiAlertCircle size={20} />
              Report Severity
            </h3>
            <div style={dashboardStyles.chartActions}>
              <button 
                style={dashboardStyles.chartActionButton}
                onClick={() => downloadChartAsPNG('severity-chart', 'reports-severity')}
                onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <FiImage size={14} />
                PNG
              </button>
              <button 
                style={dashboardStyles.chartActionButton}
                onClick={() => downloadChartAsCSV(reportSeverityData, 'reports-severity')}
                onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <FiBarChart2 size={14} />
                CSV
              </button>
            </div>
          </div>
          <div style={dashboardStyles.chartContainer} id="severity-chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reportSeverityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}\n(${(percent * 100).toFixed(1)}%)`}
                  outerRadius={120}
                  innerRadius={60}
                  dataKey="count"
                >
                  {reportSeverityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={dashboardStyles.legendContainer}>
            {reportSeverityData.map((entry, index) => (
              <div key={index} style={dashboardStyles.legendItem}>
                <StatusIcon status={entry.severity} />
                <div style={{...dashboardStyles.legendColor, backgroundColor: entry.color}} />
                <span>{entry.name} Severity: {entry.count} reports</span>
              </div>
            ))}
          </div>
        </div>

        {/* Appeal Status */}
        <div style={dashboardStyles.chartCard}>
          <div style={dashboardStyles.chartHeader}>
            <h3 style={dashboardStyles.chartTitle}>
              <FiBook size={20} />
              Appeal Status
            </h3>
            <div style={dashboardStyles.chartActions}>
              <button 
                style={dashboardStyles.chartActionButton}
                onClick={() => downloadChartAsPNG('appeals-chart', 'appeals-status')}
                onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <FiImage size={14} />
                PNG
              </button>
              <button 
                style={dashboardStyles.chartActionButton}
                onClick={() => downloadChartAsCSV(appealStatusData, 'appeals-status')}
                onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <FiBarChart2 size={14} />
                CSV
              </button>
            </div>
          </div>
          <div style={dashboardStyles.chartContainer} id="appeals-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={appealStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  dataKey="count" 
                  name="Appeal Count" 
                  radius={[4, 4, 0, 0]}
                >
                  {appealStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={dashboardStyles.legendContainer}>
            {appealStatusData.map((entry, index) => (
              <div key={index} style={dashboardStyles.legendItem}>
                <div style={{...dashboardStyles.legendColor, backgroundColor: entry.color}} />
                <span>{entry.name}: {entry.count} appeals</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback Analytics */}
        <div style={dashboardStyles.chartCard}>
          <h3 style={dashboardStyles.chartTitle}>
            <FiMessageSquare size={20} />
            Feedback Analytics
          </h3>
          <div style={dashboardStyles.analyticsGrid}>
            <div style={dashboardStyles.analyticsItem}>
              <span style={dashboardStyles.analyticsLabel}>
                <FiCheckCircle size={16} style={{ color: PROFESSIONAL_COLORS.analytics[0] }} />
                Total Recommended:
              </span>
              <span style={{...dashboardStyles.analyticsValue, color: PROFESSIONAL_COLORS.analytics[0]}}>
                {feedbackStats.total_recommended || 0}
              </span>
            </div>
            <div style={dashboardStyles.analyticsItem}>
              <span style={dashboardStyles.analyticsLabel}>
                <FiBarChart2 size={16} style={{ color: PROFESSIONAL_COLORS.analytics[1] }} />
                Recommendation Rate:
              </span>
              <span style={{...dashboardStyles.analyticsValue, color: PROFESSIONAL_COLORS.analytics[1]}}>
                {feedbackStats.total_feedback ? 
                  `${((feedbackStats.total_recommended / feedbackStats.total_feedback) * 100).toFixed(1)}%` 
                  : '0%'
                }
              </span>
            </div>
            <div style={dashboardStyles.analyticsItem}>
              <span style={dashboardStyles.analyticsLabel}>
                <FiStar size={16} style={{ color: PROFESSIONAL_COLORS.analytics[2] }} />
                5-Star Ratings:
              </span>
              <span style={{...dashboardStyles.analyticsValue, color: PROFESSIONAL_COLORS.analytics[2]}}>
                {feedbackStats.five_star || 0}
              </span>
            </div>
            <div style={dashboardStyles.analyticsItem}>
              <span style={dashboardStyles.analyticsLabel}>
                <FiTrendingUp size={16} style={{ color: PROFESSIONAL_COLORS.analytics[3] }} />
                Active Reviews:
              </span>
              <span style={{...dashboardStyles.analyticsValue, color: PROFESSIONAL_COLORS.analytics[3]}}>
                {feedbackStats.total_feedback || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Add CSS animation for spinner */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          }
        `}
      </style>
    </div>
  );
}
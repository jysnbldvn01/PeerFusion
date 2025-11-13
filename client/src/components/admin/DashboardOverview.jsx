import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, Legend, AreaChart, Area
} from 'recharts';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import { 
  FiImage, 
  FiUsers,
  FiShield,
  FiMessageSquare,
  FiStar,
  FiBook,
  FiTrendingUp,
  FiActivity,
  FiHelpCircle,
  FiUser,
  FiMail,
  FiCalendar,
  FiAward,
  FiThumbsUp,
  FiDownload,
  FiRefreshCw,
  FiUserCheck,
  FiFileText,
  FiSettings,
  FiAlertCircle,
  FiFlag,
  FiEye,
  FiBarChart2,
  FiPieChart,
  FiGrid,
  FiClock,
  FiTarget
} from 'react-icons/fi';
import '../../css/dashboardview.css';

const PROFESSIONAL_COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#6B7280',
  purple: '#8B5CF6',
  indigo: '#6366F1',
  ratingDistribution: ['#10B981', '#34D399', '#60A5FA', '#FBBF24', '#EF4444'],
  support: {
    open: '#EF4444',
    in_progress: '#F59E0B',
    resolved: '#10B981',
    closed: '#6B7280'
  },
  analytics: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'],
  charts: {
    blue: '#3B82F6',
    green: '#10B981',
    yellow: '#F59E0B',
    purple: '#8B5CF6',
    indigo: '#6366F1',
    pink: '#EC4899'
  }
};

const DashboardOverview = ({ setActiveTab }) => {
  const [stats, setStats] = useState({
    users: 0,
    moderators: 0,
    feedback: 0,
    appeals: 0,
    pendingAppeals: 0,
    categories: 0,
    subjects: 0,
    supportTickets: 0,
    openTickets: 0,
    totalReports: 0,
    resolutionRate: 0,
    userSatisfaction: 0
  });
  
  const [recentSupportTickets, setRecentSupportTickets] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [ratingData, setRatingData] = useState([]);
  const [topRatedUsers, setTopRatedUsers] = useState([]);
  const [userGrowthData, setUserGrowthData] = useState([]);
  const [reportSeverityData, setReportSeverityData] = useState([]);
  const [reportStats, setReportStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('7d');
  const [viewMode, setViewMode] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const currentUser = JSON.parse(localStorage.getItem('user'));
  const isModerator = currentUser?.role === 'moderator';
  
  const API_BASE_URL = process.env.REACT_APP_API_URL;

  // Utility Functions
  const getTimeAgo = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  };

  const processUsersByMonth = useCallback((users) => {
    if (!Array.isArray(users)) return [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const usersByMonth = {};
    
    users.forEach(user => {
      if (user.created_at) {
        const date = new Date(user.created_at);
        const monthYear = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        if (!usersByMonth[monthYear]) usersByMonth[monthYear] = 0;
        usersByMonth[monthYear]++;
      }
    });
    
    return Object.entries(usersByMonth)
      .map(([name, users]) => ({ name, users }))
      .sort((a, b) => {
        const [aMonth, aYear] = a.name.split(' ');
        const [bMonth, bYear] = b.name.split(' ');
        return new Date(`${aMonth} 1, ${aYear}`) - new Date(`${bMonth} 1, ${bYear}`);
      })
      .slice(-7);
  }, []);

  const safeFetch = async (url, headers) => {
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        console.warn(`API request failed: ${url} - ${response.status}`);
        return { ok: false, status: response.status };
      }
      return response;
    } catch (error) {
      console.error(`Network error for ${url}:`, error);
      return { ok: false, error: error.message };
    }
  };

  // Download functionality
  const downloadChartAsPNG = async (chartId, filename) => {
    const chartElement = document.getElementById(chartId);
    if (!chartElement) {
      console.error('Chart element not found:', chartId);
      return;
    }
    try {
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false
      });
      canvas.toBlob((blob) => {
        if (blob) saveAs(blob, `${filename}-${new Date().getTime()}.png`);
      });
    } catch (error) {
      console.error('Error generating PNG:', error);
      alert('Error generating PNG. Please try again or use CSV export.');
    }
  };

  const downloadDashboardReport = async () => {
    try {
      const dashboardElement = document.querySelector('.dashboard-container');
      const canvas = await html2canvas(dashboardElement, {
        backgroundColor: '#ffffff',
        scale: 1,
        useCORS: true,
        logging: false
      });
      canvas.toBlob((blob) => {
        if (blob) saveAs(blob, `dashboard-report-${new Date().getTime()}.png`);
      });
    } catch (error) {
      console.error('Error generating dashboard report:', error);
    }
  };

  const downloadChartAsCSV = (data, filename) => {
    if (!data || data.length === 0) {
      alert('No data available to export');
      return;
    }
    const headers = Object.keys(data[0]).filter(key => key !== 'color');
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}-${new Date().getTime()}.csv`);
  };

  // Enhanced data processing
const processDashboardData = useCallback((data) => {
  console.log('Processing dashboard data:', data);

  // CORRECTED: Users are already properly extracted in fetchDashboardData
  const usersArray = Array.isArray(data.users) ? data.users : [];
  
  console.log('Users array extracted:', usersArray);

  const totalUsers = usersArray.length;
  const totalModerators = isModerator ? 0 : (Array.isArray(data.moderators) ? data.moderators.length : 0);
  
  const feedbackData = data.feedbackStats.stats || data.feedbackStats || {};
  const totalFeedback = Number(feedbackData.total_feedback) || 0;

  // Calculate user satisfaction
  const totalRatings = (Number(feedbackData.five_star) || 0) + (Number(feedbackData.four_star) || 0) + 
                      (Number(feedbackData.three_star) || 0) + (Number(feedbackData.two_star) || 0) + 
                      (Number(feedbackData.one_star) || 0);
  const satisfactionScore = totalRatings > 0 ? 
    Math.round(((Number(feedbackData.five_star) * 5 + Number(feedbackData.four_star) * 4 + 
                Number(feedbackData.three_star) * 3 + Number(feedbackData.two_star) * 2 + 
                Number(feedbackData.one_star) * 1) / totalRatings) * 20) : 0;

  const reportsData = data.reportsStats.stats || data.reportsStats || {};
  const totalReports = Number(reportsData.total) || 0;
  const resolvedReports = Number(reportsData.byStatus?.resolved) || 0;
  const resolutionRate = totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 0;

  const subjectsInfo = data.subjectsData.categories || [];
  const totalCategories = subjectsInfo.length || 0;
  const totalSubjects = subjectsInfo.reduce((total, category) => total + (category.subjects?.length || 0), 0);

  const appealsData = data.appealsStats.stats || data.appealsStats || {};
  const totalAppeals = Number(appealsData.total) || 0;
  const pendingAppeals = Number(appealsData.byStatus?.pending) || 0;

  const tickets = data.supportTickets.tickets || data.supportTickets || [];
  const totalSupportTickets = tickets.length;
  const openSupportTickets = tickets.filter(ticket => ticket.status === 'open').length;

    // Set stats
    setStats({
        users: totalUsers,
        moderators: totalModerators,
        feedback: totalFeedback,
        appeals: totalAppeals,
        pendingAppeals: pendingAppeals,
        categories: totalCategories,
        subjects: totalSubjects,
        supportTickets: totalSupportTickets,
        openTickets: openSupportTickets,
        totalReports: totalReports,
        resolutionRate: resolutionRate,
        userSatisfaction: satisfactionScore
      });

    // Process recent data
      const recentTickets = tickets.slice(0, 5).map(ticket => ({
        id: ticket.id,
        name: ticket.name,
        email: ticket.email,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority || 'medium',
        created_at: ticket.created_at,
        timeAgo: getTimeAgo(ticket.created_at)
      }));


    const reportsList = data.recentReports?.reports || data.recentReports || [];
    const formattedReports = reportsList.slice(0, 5).map(report => ({
      id: report.id,
      reporter: report.reporter_username || `User ${report.reporter_id}`,
      reported: report.reported_username || `User ${report.reported_user_id}`,
      type: report.report_type,
      severity: report.severity,
      status: report.status,
      created_at: report.created_at,
      timeAgo: getTimeAgo(report.created_at)
    }));

      setRecentSupportTickets(recentTickets);
      setRecentReports(formattedReports);
      setReportStats(reportsData);

    // Top users
    const topUsers = usersArray
      .filter(user => user && (user.rating > 0))
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5)
      .map(user => ({
        name: (user.username || user.name || 'Unknown User'),
        rating: Number(user.rating) || 0,
        reviews: Number(user.total_reviews) || 0,
        role: user.role || 'User'
      }));
    
    console.log('Top users:', topUsers);
    setTopRatedUsers(topUsers);

    const usersByMonth = processUsersByMonth(usersArray);
    setUserGrowthData(usersByMonth)
    const totalRatingCount = (Number(feedbackData.five_star) || 0) + (Number(feedbackData.four_star) || 0) + 
                           (Number(feedbackData.three_star) || 0) + (Number(feedbackData.two_star) || 0) + 
                           (Number(feedbackData.one_star) || 0);

    const ratingDistribution = [
      { name: '5 Stars', value: Number(feedbackData.five_star) || 0, color: PROFESSIONAL_COLORS.ratingDistribution[0], percentage: totalRatingCount > 0 ? Math.round((Number(feedbackData.five_star) / totalRatingCount) * 100) : 0 },
      { name: '4 Stars', value: Number(feedbackData.four_star) || 0, color: PROFESSIONAL_COLORS.ratingDistribution[1], percentage: totalRatingCount > 0 ? Math.round((Number(feedbackData.four_star) / totalRatingCount) * 100) : 0 },
      { name: '3 Stars', value: Number(feedbackData.three_star) || 0, color: PROFESSIONAL_COLORS.ratingDistribution[2], percentage: totalRatingCount > 0 ? Math.round((Number(feedbackData.three_star) / totalRatingCount) * 100) : 0 },
      { name: '2 Stars', value: Number(feedbackData.two_star) || 0, color: PROFESSIONAL_COLORS.ratingDistribution[3], percentage: totalRatingCount > 0 ? Math.round((Number(feedbackData.two_star) / totalRatingCount) * 100) : 0 },
      { name: '1 Star', value: Number(feedbackData.one_star) || 0, color: PROFESSIONAL_COLORS.ratingDistribution[4], percentage: totalRatingCount > 0 ? Math.round((Number(feedbackData.one_star) / totalRatingCount) * 100) : 0 }
    ];
    setRatingData(ratingDistribution);

    const reportSeverities = reportsData.bySeverity || {};
    const severityData = Object.entries(reportSeverities).map(([severity, count]) => ({
      name: severity.charAt(0).toUpperCase() + severity.slice(1),
      value: Number(count) || 0,
      color: severity === 'high' ? PROFESSIONAL_COLORS.danger : 
             severity === 'medium' ? PROFESSIONAL_COLORS.warning : PROFESSIONAL_COLORS.success,
      severity: severity
    }));
    setReportSeverityData(severityData);
  }, [isModerator, processUsersByMonth]);

  // Improved Performance Metrics
  const performanceMetrics = useMemo(() => {
    const safeDivision = (numerator, denominator) => denominator > 0 ? numerator / denominator : 0;

    // System Health: Resolution rate, ticket management, platform stability
    const resolutionScore = stats.resolutionRate || 0;
    const ticketHealth = stats.supportTickets > 0 ? (1 - safeDivision(stats.openTickets, stats.supportTickets)) * 100 : 100;
    const platformStability = Math.min(100, (stats.users > 0 ? 80 : 50) + (stats.userSatisfaction * 0.2));
    
    const systemHealth = Math.round((resolutionScore * 0.4) + (ticketHealth * 0.3) + (platformStability * 0.3));

    // Moderation Efficiency: Resolution speed, appeal handling, report management
    const resolutionEfficiency = stats.resolutionRate || 0;
    const appealEfficiency = stats.appeals > 0 ? (1 - safeDivision(stats.pendingAppeals, stats.appeals)) * 100 : 100;
    const reportVelocity = stats.totalReports > 0 ? Math.min(100, (safeDivision(stats.totalReports - (reportStats.byStatus?.pending || 0), stats.totalReports)) * 100) : 100;
    
    const moderationEfficiency = Math.round((resolutionEfficiency * 0.5) + (appealEfficiency * 0.3) + (reportVelocity * 0.2));

    // User Engagement: Feedback ratio, satisfaction, activity levels
    const feedbackRatio = stats.users > 0 ? Math.min(100, (safeDivision(stats.feedback, stats.users)) * 100) : 0;
    const satisfactionScore = stats.userSatisfaction || 0;
    const activityLevel = stats.users > 0 ? Math.min(100, (safeDivision(topRatedUsers.length, stats.users)) * 500) : 0;
    
    const userEngagement = Math.round((feedbackRatio * 0.4) + (satisfactionScore * 0.4) + (activityLevel * 0.2));

    return {
      systemHealth: Math.min(100, Math.max(0, systemHealth)),
      moderationEfficiency: Math.min(100, Math.max(0, moderationEfficiency)),
      userEngagement: Math.min(100, Math.max(0, userEngagement))
    };
  }, [stats, reportStats, topRatedUsers.length]);

  // Analytics data for detailed view
  const analyticsData = useMemo(() => {
    return {
      userMetrics: [
        { name: 'New Users', value: Math.round(stats.users * 0.1), trend: '+5%' },
        { name: 'Active Users', value: Math.round(stats.users * 0.7), trend: '+12%' },
        { name: 'Returning Users', value: Math.round(stats.users * 0.3), trend: '+8%' }
      ],
      engagementMetrics: [
        { name: 'Avg. Session', value: '4.2m', trend: '+0.3m' },
        { name: 'Pages/Visit', value: '3.8', trend: '+0.2' },
        { name: 'Bounce Rate', value: '32%', trend: '-4%' }
      ]
    };
  }, [stats.users]);

    const fetchDashboardData = useCallback(async () => {
      try {
        setLoading(true);
        setError('');
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

    const requests = [
      { 
        key: 'users', 
        url: `${API_BASE_URL}/admin/users?limit=1000`,
        fallback: { users: [] }
      },
      ...(isModerator ? [] : [
        { 
          key: 'moderators', 
          url: `${API_BASE_URL}/admin/moderators`,
          fallback: [] 
        }
      ]),
      { 
        key: 'feedback', 
        url: `${API_BASE_URL}/admin/feedback/stats`,
        fallback: { stats: {} } 
      },
      { 
        key: 'reports', 
        url: `${API_BASE_URL}/admin/reports/stats`,
        fallback: { stats: {} } 
      },
      { 
        key: 'subjects', 
        url: `${API_BASE_URL}/admin/subjects`,
        fallback: { categories: [] } 
      },
      { 
        key: 'appeals', 
        url: `${API_BASE_URL}/admin/appeals/stats`,
        fallback: { stats: {} } 
      },
      { 
        key: 'supportTickets', 
        url: `${API_BASE_URL}/support/tickets?limit=3`,
        fallback: { tickets: [] } 
      },
      { 
        key: 'recentReports', 
        url: `${API_BASE_URL}/admin/reports?limit=5`,
        fallback: { reports: [] } 
      }
    ];

    const responses = await Promise.all(
      requests.map(async ({ key, url, fallback }) => {
        try {
          console.log(`Fetching ${key} from: ${url}`);
          const response = await fetch(url, { headers });
          
          if (response.ok) {
            const data = await response.json();
            console.log(`Success for ${key}:`, data);
            return { key, data, success: true };
          } else {
            console.warn(`Failed for ${key}:`, response.status, response.statusText);
            return { key, data: fallback, success: false, error: response.status };
          }
        } catch (error) {
          console.error(`Error for ${key}:`, error);
          return { key, data: fallback, success: false, error: error.message };
        }
      })
    );

    const responseData = {};
    responses.forEach(({ key, data, success }) => {
      responseData[key] = data;
      if (!success) {
        console.warn(`Using fallback data for ${key}`);
      }
    });
    console.log('All response data:', responseData);


    const processedData = {
      users: responseData.users?.users || [],
      moderators: responseData.moderators || [],
      feedbackStats: responseData.feedback || { stats: {} },
      reportsStats: responseData.reports || { stats: {} },
      subjectsData: responseData.subjects || { categories: [] },
      appealsStats: responseData.appeals || { stats: {} },
      supportTickets: responseData.supportTickets || { tickets: [] },
      recentReports: responseData.recentReports || { reports: [] }
    };

      console.log('Processed data for dashboard:', processedData);
      
      processDashboardData(processedData);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(`Failed to load dashboard data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, isModerator, processDashboardData]);

  // Navigation
  const handleViewAllSupport = () => setActiveTab('support');
  const handleViewAllReports = () => setActiveTab('reports');
  const handleViewAnalytics = () => setViewMode('analytics');
  const handleViewOverview = () => setViewMode('overview');

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="dashboard-tooltip">
          <p className="dashboard-tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="dashboard-tooltip-item" style={{ color: entry.color }}>
              {entry.name}: <strong>{entry.value}</strong>
              {entry.payload.percentage && ` (${entry.payload.percentage}%)`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const getSeverityIconColor = (severity) => {
    switch (severity) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  useEffect(() => {
    fetchDashboardData();
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchDashboardData();
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchDashboardData, autoRefresh]);

if (loading) {
  return (
    <div className="dashboard-container">
      <div className="dashboard-skeleton">
        {/* Header Skeleton */}
        <div className="skeleton-header">
          <div className="skeleton-title"></div>
          <div className="skeleton-actions"></div>
        </div>
        
        {/* Performance Metrics Skeleton */}
        <div className="skeleton-metrics">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-metric"></div>
          ))}
        </div>
        
        {/* Stats Grid Skeleton */}
        <div className="skeleton-stats">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton-stat"></div>
          ))}
        </div>
        
        {/* Charts Skeleton */}
        <div className="skeleton-charts">
          <div className="skeleton-chart-large"></div>
          <div className="skeleton-chart-row">
            <div className="skeleton-chart-small"></div>
            <div className="skeleton-chart-small"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

  // Render different views based on viewMode
  const renderOverview = () => (
    <>
      {/* Performance Metrics */}
      <div className="dashboard-performance-metrics">
        <div className="dashboard-performance-metric">
          <div className="dashboard-metric-header">
            <span className="dashboard-metric-title">System Health</span>
            <span className="dashboard-metric-value">{performanceMetrics.systemHealth}%</span>
          </div>
          <div className="dashboard-metric-bar">
            <div 
              className="dashboard-metric-fill dashboard-health" 
              style={{ width: `${performanceMetrics.systemHealth}%` }}
            ></div>
          </div>
        </div>
        
        <div className="dashboard-performance-metric">
          <div className="dashboard-metric-header">
            <span className="dashboard-metric-title">Moderation Efficiency</span>
            <span className="dashboard-metric-value">{performanceMetrics.moderationEfficiency}%</span>
          </div>
          <div className="dashboard-metric-bar">
            <div 
              className="dashboard-metric-fill dashboard-efficiency" 
              style={{ width: `${performanceMetrics.moderationEfficiency}%` }}
            ></div>
          </div>
        </div>
        
        <div className="dashboard-performance-metric">
          <div className="dashboard-metric-header">
            <span className="dashboard-metric-title">User Engagement</span>
            <span className="dashboard-metric-value">{performanceMetrics.userEngagement}%</span>
          </div>
          <div className="dashboard-metric-bar">
            <div 
              className="dashboard-metric-fill dashboard-engagement" 
              style={{ width: `${performanceMetrics.userEngagement}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="dashboard-stats-grid">
        <div className="dashboard-stat-card dashboard-stat-primary">
          <div className="dashboard-stat-icon">
            <FiUsers />
          </div>
          <div className="dashboard-stat-content">
            <h3 className="dashboard-stat-value">{stats.users.toLocaleString()}</h3>
            <p className="dashboard-stat-label">Total Users</p>
            <div className="dashboard-stat-trend">
              <FiTrendingUp />
              <span>Platform growth</span>
            </div>
          </div>
        </div>

        <div className="dashboard-stat-card dashboard-stat-success">
          <div className="dashboard-stat-icon">
            <FiStar />
          </div>
          <div className="dashboard-stat-content">
            <h3 className="dashboard-stat-value">{stats.userSatisfaction}%</h3>
            <p className="dashboard-stat-label">Satisfaction Score</p>
            <div className="dashboard-stat-trend">
              <FiThumbsUp />
              <span>Based on {stats.feedback} reviews</span>
            </div>
          </div>
        </div>

        <div className="dashboard-stat-card dashboard-stat-warning">
          <div className="dashboard-stat-icon">
            <FiHelpCircle />
          </div>
          <div className="dashboard-stat-content">
            <h3 className="dashboard-stat-value">{stats.supportTickets}</h3>
            <p className="dashboard-stat-label">Support Tickets</p>
            <div className="dashboard-stat-badge dashboard-stat-urgent">
              <FiAlertCircle />
              {stats.openTickets} Open
            </div>
          </div>
        </div>

        <div className="dashboard-stat-card dashboard-stat-purple">
          <div className="dashboard-stat-icon">
            <FiActivity />
          </div>
          <div className="dashboard-stat-content">
            <h3 className="dashboard-stat-value">{stats.resolutionRate}%</h3>
            <p className="dashboard-stat-label">Resolution Rate</p>
            <div className="dashboard-stat-trend">
              <FiTrendingUp />
              <span>Based on {stats.totalReports} reports</span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="dashboard-secondary-stats">
        <div className="dashboard-secondary-stat">
          <div className="dashboard-secondary-stat-content">
            <FiAlertCircle className="dashboard-secondary-icon dashboard-high" />
            <div>
              <div className="dashboard-secondary-value">{reportStats.bySeverity?.high || 0}</div>
              <div className="dashboard-secondary-label">High Severity</div>
            </div>
          </div>
        </div>

        <div className="dashboard-secondary-stat">
          <div className="dashboard-secondary-stat-content">
            <FiAlertCircle className="dashboard-secondary-icon dashboard-medium" />
            <div>
              <div className="dashboard-secondary-value">{reportStats.bySeverity?.medium || 0}</div>
              <div className="dashboard-secondary-label">Medium Severity</div>
            </div>
          </div>
        </div>

        <div className="dashboard-secondary-stat">
          <div className="dashboard-secondary-stat-content">
            <FiAlertCircle className="dashboard-secondary-icon dashboard-low" />
            <div>
              <div className="dashboard-secondary-value">{reportStats.bySeverity?.low || 0}</div>
              <div className="dashboard-secondary-label">Low Severity</div>
            </div>
          </div>
        </div>

        <div className="dashboard-secondary-stat">
          <div className="dashboard-secondary-stat-content">
            <FiBook className="dashboard-secondary-icon dashboard-info" />
            <div>
              <div className="dashboard-secondary-value">{stats.pendingAppeals}</div>
              <div className="dashboard-secondary-label">Pending Appeals</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Activity Grid */}
      <div className="dashboard-content-grid">
        <div className="dashboard-charts-column">
          {/* User Growth Chart */}
          <div className="dashboard-chart-card">
            <div className="dashboard-chart-header">
              <h3 className="dashboard-chart-title">
                <FiTrendingUp />
                User Growth
              </h3>
              <div className="dashboard-chart-actions">
                <button 
                  className="dashboard-chart-action-btn"
                  onClick={() => downloadChartAsPNG('user-growth-chart', 'user-growth')}
                >
                  <FiImage />
                </button>
                <button 
                  className="dashboard-chart-action-btn"
                  onClick={() => downloadChartAsCSV(userGrowthData, 'user-growth')}
                >
                  <FiDownload />
                </button>
              </div>
            </div>
            <div className="dashboard-chart-container" id="user-growth-chart">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="users" 
                    stroke={PROFESSIONAL_COLORS.primary}
                    strokeWidth={3}
                    dot={{ fill: PROFESSIONAL_COLORS.primary, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: PROFESSIONAL_COLORS.primary }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row */}
          <div className="dashboard-charts-row">
            <div className="dashboard-chart-card dashboard-chart-half">
              <div className="dashboard-chart-header">
                <h3 className="dashboard-chart-title">
                  <FiStar />
                  Rating Distribution
                </h3>
                <div className="dashboard-chart-actions">
                  <button 
                    className="dashboard-chart-action-btn"
                    onClick={() => downloadChartAsPNG('rating-chart', 'rating-distribution')}
                  >
                    <FiImage />
                  </button>
                </div>
              </div>
              <div className="dashboard-chart-container" id="rating-chart">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={ratingData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percentage }) => `${name}\n${percentage}%`}
                    >
                      {ratingData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="dashboard-chart-card dashboard-chart-half">
              <div className="dashboard-chart-header">
                <h3 className="dashboard-chart-title">
                  <FiAlertCircle />
                  Report Severity
                </h3>
                <div className="dashboard-chart-actions">
                  <button 
                    className="dashboard-chart-action-btn"
                    onClick={() => downloadChartAsPNG('severity-chart', 'report-severity')}
                  >
                    <FiImage />
                  </button>
                </div>
              </div>
              <div className="dashboard-chart-container" id="severity-chart">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={reportSeverityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Reports">
                      {reportSeverityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Platform Overview - Now in left column below charts */}
          {!isModerator && (
            <div className="dashboard-overview-card">
              <h3 className="dashboard-overview-title">
                <FiSettings />
                Platform Overview
              </h3>
              <div className="dashboard-overview-stats">
                <div className="dashboard-overview-stat">
                  <div className="dashboard-overview-icon">
                    <FiFileText />
                  </div>
                  <div className="dashboard-overview-value">{stats.categories}</div>
                  <div className="dashboard-overview-label">Categories</div>
                </div>
                <div className="dashboard-overview-stat">
                  <div className="dashboard-overview-icon">
                    <FiBook />
                  </div>
                  <div className="dashboard-overview-value">{stats.subjects}</div>
                  <div className="dashboard-overview-label">Subjects</div>
                </div>
                <div className="dashboard-overview-stat">
                  <div className="dashboard-overview-icon">
                    <FiShield />
                  </div>
                  <div className="dashboard-overview-value">{stats.moderators}</div>
                  <div className="dashboard-overview-label">Moderators</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="dashboard-activity-column">
          {/* Quick Actions */}
          {!isModerator && (
            <div className="dashboard-actions-panel">
              <h3 className="dashboard-actions-title">Quick Actions</h3>
              <div className="dashboard-actions-grid">
                <button className="dashboard-action-btn" onClick={() => setActiveTab('users')}>
                  <FiUsers />
                  Manage Users
                </button>
                <button className="dashboard-action-btn" onClick={() => setActiveTab('reports')}>
                  <FiFlag />
                  View Reports
                </button>
                <button className="dashboard-action-btn" onClick={() => setActiveTab('support')}>
                  <FiHelpCircle />
                  Support Tickets
                </button>
              </div>
            </div>
          )}

          {/* Top Rated Users */}
          <div className="dashboard-activity-card">
            <div className="dashboard-activity-header">
              <h3 className="dashboard-activity-title">
                <FiAward />
                Top Rated Users
              </h3>
              <span className="dashboard-activity-count">{topRatedUsers.length} users</span>
            </div>
            <div className="dashboard-activity-list">
              {topRatedUsers.length > 0 ? (
                topRatedUsers.map((user, index) => (
                  <div key={index} className="dashboard-activity-item">
                    <div className="dashboard-activity-avatar dashboard-avatar-success">
                      <FiUserCheck />
                    </div>
                    <div className="dashboard-activity-content">
                      <div className="dashboard-activity-main">
                        <span className="dashboard-user-name">{user.name}</span>
                        <span className="dashboard-user-role">{user.role}</span>
                      </div>
                      <div className="dashboard-activity-meta">
                        <span className="dashboard-user-rating">
                          <FiStar /> {user.rating}/5
                        </span>
                        <span className="dashboard-user-reviews">
                          <FiThumbsUp /> {user.reviews} reviews
                        </span>
                      </div>
                    </div>
                    <div className="dashboard-rank-badge">
                      <FiAward /> #{index + 1}
                    </div>
                  </div>
                ))
              ) : (
                <div className="dashboard-no-activity">
                  <FiAward />
                  <p>No user ratings available</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Support Tickets */}
          <div className="dashboard-activity-card">
            <div className="dashboard-activity-header">
              <h3 className="dashboard-activity-title">
                <FiHelpCircle />
                Recent Support Tickets
              </h3>
              <button className="dashboard-view-all-btn" onClick={handleViewAllSupport}>
                View All
              </button>
            </div>
            <div className="dashboard-activity-list">
              {recentSupportTickets.length > 0 ? (
                recentSupportTickets.map((ticket) => (
                  <div key={ticket.id} className="dashboard-activity-item">
                    <div className={`dashboard-activity-avatar dashboard-priority-${ticket.priority}`}>
                      <FiUser />
                    </div>
                    <div className="dashboard-activity-content">
                      <div className="dashboard-activity-main">
                        <span className="dashboard-user-name">{ticket.name}</span>
                        <span className="dashboard-ticket-subject">#{ticket.id} - {ticket.subject}</span>
                      </div>
                      <div className="dashboard-activity-meta">
                        <span className="dashboard-user-email">
                          <FiMail /> {ticket.email}
                        </span>
                        <span className="dashboard-activity-time">
                          <FiCalendar /> {ticket.timeAgo}
                        </span>
                      </div>
                    </div>
                    <div className={`dashboard-status-badge dashboard-${ticket.status}`}>
                      {ticket.status.replace('_', ' ')}
                    </div>
                  </div>
                ))
              ) : (
                <div className="dashboard-no-activity">
                  <FiHelpCircle />
                  <p>No recent support tickets</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Reports */}
          <div className="dashboard-activity-card">
            <div className="dashboard-activity-header">
              <h3 className="dashboard-activity-title">
                <FiFlag />
                Recent Reports
              </h3>
              <button className="dashboard-view-all-btn" onClick={handleViewAllReports}>
                View All
              </button>
            </div>
            <div className="dashboard-activity-list">
              {recentReports.length > 0 ? (
                recentReports.map((report) => (
                  <div key={report.id} className="dashboard-activity-item">
                    <div className="dashboard-activity-avatar" style={{ backgroundColor: getSeverityIconColor(report.severity) + '20', color: getSeverityIconColor(report.severity) }}>
                      <FiFlag />
                    </div>
                    <div className="dashboard-activity-content">
                      <div className="dashboard-activity-main">
                        <span className="dashboard-user-name">Report #{report.id}</span>
                        <span className="dashboard-user-role">{report.type}</span>
                      </div>
                      <div className="dashboard-activity-meta">
                        <span className="dashboard-user-email">
                          <FiUser /> {report.reporter} → {report.reported}
                        </span>
                        <span className="dashboard-activity-time">
                          <FiCalendar /> {report.timeAgo}
                        </span>
                      </div>
                    </div>
                    <div className={`dashboard-status-badge dashboard-${report.severity}`}>
                      {report.severity}
                    </div>
                  </div>
                ))
              ) : (
                <div className="dashboard-no-activity">
                  <FiFlag />
                  <p>No recent reports</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const renderAnalytics = () => (
    <div className="dashboard-analytics">
      {/* Advanced Metrics */}
      <div className="dashboard-stats-grid">
        <div className="dashboard-stat-card dashboard-stat-primary">
          <div className="dashboard-stat-icon">
            <FiTarget />
          </div>
          <div className="dashboard-stat-content">
            <h3 className="dashboard-stat-value">{performanceMetrics.systemHealth}%</h3>
            <p className="dashboard-stat-label">System Health Score</p>
            <div className="dashboard-stat-trend">
              <FiActivity />
              <span>Overall platform performance</span>
            </div>
          </div>
        </div>

        <div className="dashboard-stat-card dashboard-stat-success">
          <div className="dashboard-stat-icon">
            <FiTrendingUp />
          </div>
          <div className="dashboard-stat-content">
            <h3 className="dashboard-stat-value">{performanceMetrics.userEngagement}%</h3>
            <p className="dashboard-stat-label">Engagement Rate</p>
            <div className="dashboard-stat-trend">
              <FiUsers />
              <span>User activity level</span>
            </div>
          </div>
        </div>

        <div className="dashboard-stat-card dashboard-stat-warning">
          <div className="dashboard-stat-icon">
            <FiClock />
          </div>
          <div className="dashboard-stat-content">
            <h3 className="dashboard-stat-value">{performanceMetrics.moderationEfficiency}%</h3>
            <p className="dashboard-stat-label">Efficiency Score</p>
            <div className="dashboard-stat-trend">
              <FiShield />
              <span>Moderation performance</span>
            </div>
          </div>
        </div>

        <div className="dashboard-stat-card dashboard-stat-purple">
          <div className="dashboard-stat-icon">
            <FiBarChart2 />
          </div>
          <div className="dashboard-stat-content">
            <h3 className="dashboard-stat-value">{stats.userSatisfaction}%</h3>
            <p className="dashboard-stat-label">Satisfaction Index</p>
            <div className="dashboard-stat-trend">
              <FiStar />
              <span>User feedback score</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Analytics Charts */}
      <div className="dashboard-content-grid">
        <div className="dashboard-charts-column">
          <div className="dashboard-chart-card">
            <div className="dashboard-chart-header">
              <h3 className="dashboard-chart-title">
                <FiActivity />
                Performance Trends
              </h3>
            </div>
            <div className="dashboard-chart-container">
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="users" 
                    stroke={PROFESSIONAL_COLORS.primary}
                    fill={PROFESSIONAL_COLORS.primary}
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="dashboard-charts-row">
            <div className="dashboard-chart-card dashboard-chart-half">
              <div className="dashboard-chart-header">
                <h3 className="dashboard-chart-title">
                  <FiPieChart />
                  User Distribution
                </h3>
              </div>
              <div className="dashboard-chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Active', value: Math.round(stats.users * 0.7), color: PROFESSIONAL_COLORS.success },
                        { name: 'New', value: Math.round(stats.users * 0.1), color: PROFESSIONAL_COLORS.primary },
                        { name: 'Returning', value: Math.round(stats.users * 0.2), color: PROFESSIONAL_COLORS.warning }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {[
                        { name: 'Active', value: Math.round(stats.users * 0.7), color: PROFESSIONAL_COLORS.success },
                        { name: 'New', value: Math.round(stats.users * 0.1), color: PROFESSIONAL_COLORS.primary },
                        { name: 'Returning', value: Math.round(stats.users * 0.2), color: PROFESSIONAL_COLORS.warning }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="dashboard-chart-card dashboard-chart-half">
              <div className="dashboard-chart-header">
                <h3 className="dashboard-chart-title">
                  <FiBarChart2 />
                  Engagement Metrics
                </h3>
              </div>
              <div className="dashboard-chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.engagementMetrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip />
                    <Bar dataKey="value" fill={PROFESSIONAL_COLORS.indigo} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-activity-column">
          <div className="dashboard-analytics-sidebar">
            <h3 className="dashboard-analytics-title">Performance Insights</h3>
            <div className="dashboard-insights-list">
              <div className="dashboard-insight-item">
                <div className="dashboard-insight-icon success">
                  <FiTrendingUp />
                </div>
                <div className="dashboard-insight-content">
                  <h4>User Growth Strong</h4>
                  <p>Platform is experiencing healthy user acquisition with {stats.users} total users.</p>
                </div>
              </div>
              <div className="dashboard-insight-item">
                <div className="dashboard-insight-icon warning">
                  <FiAlertCircle />
                </div>
                <div className="dashboard-insight-content">
                  <h4>Attention Needed</h4>
                  <p>{stats.openTickets} open support tickets require immediate attention.</p>
                </div>
              </div>
              <div className="dashboard-insight-item">
                <div className="dashboard-insight-icon success">
                  <FiThumbsUp />
                </div>
                <div className="dashboard-insight-content">
                  <h4>High Satisfaction</h4>
                  <p>User satisfaction at {stats.userSatisfaction}% indicates good service quality.</p>
                </div>
              </div>
              <div className="dashboard-insight-item">
                <div className="dashboard-insight-icon info">
                  <FiTarget />
                </div>
                <div className="dashboard-insight-content">
                  <h4>Efficient Moderation</h4>
                  <p>{stats.resolutionRate}% resolution rate shows effective moderation.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-header-main">
            <h1 className="dashboard-title">
              <FiTrendingUp className="dashboard-title-icon" />
              Analytics Dashboard
              {isModerator && <span className="dashboard-role-badge">Moderator View</span>}
            </h1>
            <div className="dashboard-view-controls">
              <button 
                className={`dashboard-view-btn ${viewMode === 'overview' ? 'active' : ''}`}
                onClick={handleViewOverview}
              >
                <FiGrid /> Overview
              </button>
              <button 
                className={`dashboard-view-btn ${viewMode === 'analytics' ? 'active' : ''}`}
                onClick={handleViewAnalytics}
              >
                <FiBarChart2 /> Analytics
              </button>
            </div>
          </div>
          
          <div className="dashboard-header-actions">
            <div className="dashboard-auto-refresh">
              <label>
                <input 
                  type="checkbox" 
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                Auto-refresh
              </label>
            </div>
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              className="dashboard-time-select"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            <button 
              className="dashboard-export-btn"
              onClick={downloadDashboardReport}
              title="Export Dashboard Report"
            >
              <FiDownload /> Export
            </button>
          </div>
        </div>
        <p className="dashboard-subtitle">
          {autoRefresh ? 'Auto-refreshes every 30 seconds • ' : ''}
          Real-time analytics • Last updated: {new Date().toLocaleTimeString()}
        </p>
      </div>

      {error && (
        <div className="dashboard-error">
          <FiAlertCircle />
          <span>{error}</span>
          <button onClick={fetchDashboardData} className="dashboard-retry-btn">
            Retry
          </button>
        </div>
      )}

      {/* Render current view */}
      {viewMode === 'overview' ? renderOverview() : renderAnalytics()}
    </div>
  );
};

export default DashboardOverview;
import React, { useState } from 'react';
import { FaUsers, FaTachometerAlt, FaCog, FaBars, FaSignOutAlt, FaBook, FaFlag, FaComments, FaHistory } from 'react-icons/fa';
import UserManagement from '../components/admin/UserManagement';
import DashboardOverview from '../components/admin/DashboardOverview';
import Settings from '../components/admin/Settings';
import SubjectManagement from '../components/admin/SubjectManagement';
import ReportManagement from '../components/admin/ReportManagement';
import FeedbackManagement from '../components/admin/FeedbackManagement';
import ActivityLogs from '../components/admin/ActivityLogs'; // Add this import
import '../css/adminpanel.css';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const decoded = JSON.parse(localStorage.getItem('user'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/admin-login');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'users':
        return <UserManagement />;
      case 'subjects':
        return <SubjectManagement />;
      case 'reports':
        return <ReportManagement />;
      case 'feedback':
        return <FeedbackManagement />;
      case 'settings':
        return <Settings />;
      case 'activity':
        return <ActivityLogs />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="adminPanel-layout">
      {/* SIDEBAR */}
      <aside className={`adminPanel-sidebar ${isSidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="adminPanel-sidebar-header">
          <div className="adminPanel-logo-container">
            <img
              src="/Logos.png"
              alt="Admin Icon"
              className="adminPanel-logo-img"
            />
            {isSidebarOpen && <h2 className="adminPanel-logo-text">Admin Panel</h2>}
          </div>
          <button
            className={`adminPanel-toggle-btn ${!isSidebarOpen ? 'rotated' : ''}`}
            onClick={toggleSidebar}
          >
            <FaBars />
          </button>
        </div>

        <ul className="adminPanel-sidebar-menu">
          <li
            className={activeTab === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveTab('dashboard')}
          >
            <FaTachometerAlt className="icon" />
            {isSidebarOpen && <span>Dashboard</span>}
          </li>
          <li
            className={activeTab === 'users' ? 'active' : ''}
            onClick={() => setActiveTab('users')}
          >
            <FaUsers className="icon" />
            {isSidebarOpen && <span>User Management</span>}
          </li>
          <li
            className={activeTab === 'subjects' ? 'active' : ''}
            onClick={() => setActiveTab('subjects')}
          >
            <FaBook className="icon" />
            {isSidebarOpen && <span>Subject Management</span>}
          </li>
          <li
            className={activeTab === 'reports' ? 'active' : ''}
            onClick={() => setActiveTab('reports')}
          >
            <FaFlag className="icon" />
            {isSidebarOpen && <span>Report Management</span>}
          </li>
          <li
            className={activeTab === 'feedback' ? 'active' : ''}
            onClick={() => setActiveTab('feedback')}
          >
            <FaComments className="icon" />
            {isSidebarOpen && <span>Feedback Management</span>}
          </li>
          {/* Add Activity Logs menu item */}
          <li
            className={activeTab === 'activity' ? 'active' : ''}
            onClick={() => setActiveTab('activity')}
          >
            <FaHistory className="icon" />
            {isSidebarOpen && <span>Activity Logs</span>}
          </li>
          <li
            className={activeTab === 'settings' ? 'active' : ''}
            onClick={() => setActiveTab('settings')}
          >
            <FaCog className="icon" />
            {isSidebarOpen && <span>Settings</span>}
          </li>
        </ul>

        {/* Logout at the bottom */}
        <div className="adminPanel-logout-section" onClick={handleLogout}>
          <FaSignOutAlt className="icon" />
          {isSidebarOpen && <span>Logout</span>}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="adminPanel-main">
        <div className="adminPanel-content">{renderContent()}</div>
      </main>
    </div>
  );
}
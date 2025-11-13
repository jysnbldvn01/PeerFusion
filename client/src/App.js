import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// User Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import ChatPage from './pages/ChatPage';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import SetupAccount from './pages/SetupAccount';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import UserAppealPage from './components/UserAppealPage';
import Appeal from './pages/Appeal';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';

// Admin Pages
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';


// Moderator Pages
import ModeratorDashboard from './pages/ModeratorDashboard';

// Layout Components
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import VideoLayout from './components/layout/VideoLayout';

import { AuthProvider } from './context/AuthContext';

import LandingPage from './pages/LandingPage';
import SupportPage from './pages/SupportPage';

// In your App.js, update the routes:
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/appeal" element={<Appeal/>} />
          <Route path="/user-appeal" element={<UserAppealPage />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/support" element={<SupportPage />} />

          {/* Setup Account */}
          <Route
            path="/setup-account"
            element={
              <ProtectedRoute>
                <SetupAccount key="setup-account" />
              </ProtectedRoute>
            }
          />

          {/* User Routes with Main Layout */}
          <Route element={<MainLayout />}>
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <Home key="home" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <ChatPage key="chat" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notifications key="notifications" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile key="profile" />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Video Call Route */}
          <Route
            path="/videocall"
            element={
              <ProtectedRoute>
                <VideoLayout />
              </ProtectedRoute>
            }
          />

          {/* Admin Dashboard */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Moderator Dashboard */}
          <Route
            path="/moderator/dashboard"
            element={
              <ProtectedRoute allowedRoles={['moderator', 'admin']}>
                <ModeratorDashboard />
              </ProtectedRoute>
            }
          />

          {/* Default Redirect for authenticated users */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
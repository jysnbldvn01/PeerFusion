import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  try {
    const decoded = JSON.parse(atob(token.split('.')[1]));
    const userRole = decoded.role || 'User';

    if (allowedRoles && !allowedRoles.includes(userRole)) {
      return <Navigate to="/unauthorized" replace />;
    }

    return children;
  } catch (err) {
    console.error('Invalid token:', err);
    return <Navigate to="/login" replace />;
  }
}

export default ProtectedRoute;

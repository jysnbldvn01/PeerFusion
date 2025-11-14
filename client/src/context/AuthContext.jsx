import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
const API_BASE_URL = process.env.REACT_APP_API_URL;

export const AuthContext = createContext(null);


export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (token) => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    console.log('🔐 Token being sent to backend:', token);

    // Decode token to get user ID first
    let userIdFromToken;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userIdFromToken = payload.id;
      console.log('User ID from token:', userIdFromToken);
    } catch (tokenError) {
      console.error('Token parsing error:', tokenError);
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get(`${API_BASE_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('Full /api/profile response:', res.data);
      
      const userData = {
        ...res.data,
        id: res.data.user_id || userIdFromToken,
        user_id: res.data.user_id || userIdFromToken
      };
      
      console.log('Final user data:', userData);
      setUser(userData);
    } catch (err) {
      console.error('Profile fetch error:', err);
      
      console.log('Creating user from token ID:', userIdFromToken);
      setUser({ 
        user_id: userIdFromToken,
        id: userIdFromToken,
        username: `User ${userIdFromToken}` 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check for token on initial load
    const token = localStorage.getItem('token');
    fetchUserProfile(token);

    // Listen for storage changes (when token changes)
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        console.log('Token changed in storage, updating user...');
        fetchUserProfile(e.newValue);
      }
    };

    // Listen for custom logout events
    const handleLogoutEvent = () => {
      console.log('Logout event received');
      setUser(null);
      setLoading(false);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('storageClear', handleLogoutEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('storageClear', handleLogoutEvent);
    };
  }, []);

  const login = (token, userObj) => {
    localStorage.setItem('token', token);
    setUser(userObj);
    window.dispatchEvent(new Event('storage'));
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    window.dispatchEvent(new Event('storageClear'));
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
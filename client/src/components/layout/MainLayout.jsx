import React, { useState, useContext, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import NavigationBar from './NavigationBar';
import { AuthContext } from '../../context/AuthContext';
import FloatingChatToggle from '../chat/FloatingChatToggle';
import '../../css/layout.css';
import '../../css/floatingchattoggle.css';
import ToastHost from '../ui/ToastHost';
import ConfirmHost from '../ui/ConfirmHost';

function MainLayout() {
  const { user } = useContext(AuthContext);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="app-container">
      <ToastHost />
      <ConfirmHost />
      <NavigationBar 
        key={user?.id || 'guest'}
        isCollapsed={isNavCollapsed} 
        onToggle={() => setIsNavCollapsed(!isNavCollapsed)} 
      />
      <div className={`content-container ${isNavCollapsed ? 'collapsed' : ''} ${isMobile ? 'has-mobile-header' : ''}`}>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
      
      {/* Floating Chat Toggle - Only show for logged-in users */}
      {user && <FloatingChatToggle />}
    </div>
  );
}

export default MainLayout;
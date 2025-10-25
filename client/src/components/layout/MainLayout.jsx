import React, { useState, useContext, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import NavigationBar from './NavigationBar';
import { AuthContext } from '../../context/AuthContext';
import '../../css/layout.css';

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
    </div>
  );
}

export default MainLayout;
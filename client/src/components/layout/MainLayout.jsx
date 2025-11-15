import React, { useState, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import NavigationBar from './NavigationBar';
import { AuthContext } from '../../context/AuthContext';
import FloatingChatToggle from '../chat/FloatingChatToggle';
import '../../css/layout.css';
import '../../css/floatingchattoggle.css';
import ToastHost from '../ui/ToastHost';
import ConfirmHost from '../ui/ConfirmHost';
import useIsMobile from '../../hooks/useIsMobile';

function MainLayout() {
  const { user } = useContext(AuthContext);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const isMobile = useIsMobile();

  React.useEffect(() => {
    // Ensure consistent default behavior across devices
    // Collapse sidebar on mobile, expand on desktop
    setIsNavCollapsed(isMobile ? true : false);
  }, [isMobile]);

  return (
    <div className="app-container">
      <ToastHost />
      <ConfirmHost />
      <NavigationBar 
        key={user?.id || 'guest'}
        isCollapsed={isNavCollapsed} 
        onToggle={() => setIsNavCollapsed(!isNavCollapsed)}
        isMobile={isMobile}
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
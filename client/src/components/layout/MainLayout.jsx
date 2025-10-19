import React, { useState, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import NavigationBar from './NavigationBar';
import { AuthContext } from '../../context/AuthContext'; // This import should work now
import '../../css/layout.css';

function MainLayout() {
  const { user } = useContext(AuthContext);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  return (
    <div className="app-container">
      <NavigationBar 
        key={user?.id || 'guest'} // Force re-mount on user change
        isCollapsed={isNavCollapsed} 
        onToggle={() => setIsNavCollapsed(!isNavCollapsed)} 
      />
      <div className={`content-container ${isNavCollapsed ? 'collapsed' : ''}`}>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
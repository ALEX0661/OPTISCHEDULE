import React, { useState, useEffect } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import '../styles/Layout.css';

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const location = useLocation();

  
  const routeTitleMap = {
    '/create-schedule': 'Create Schedule',
    '/schedule-management': 'Schedule Management',
    '/faculty-overview': 'Faculty Overview',
    '/Generated-schedule': 'Generated Schedule',
    '/admin-settings': 'Admin Settings'
  };

  
  const headerTitle = routeTitleMap[location.pathname] || 'OptiSched';

  
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  
  useEffect(() => {
    if (windowWidth <= 767) {
      setIsSidebarOpen(false);
    }
  }, [windowWidth]);

  const toggleSidebar = () => {
    setIsSidebarOpen(prevState => !prevState);
  };

  return (
    <div className="layout-container">
      {/* Sidebar component */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Header with hamburger icon and dynamic page title */}
      <header className={`layout-header ${isSidebarOpen ? 'header-shift' : ''}`}>
        <div className="header-left">
          <button className="hamburger-btn" onClick={toggleSidebar} aria-label="Toggle Sidebar">
            ☰
          </button>
          <span className="brand-name">{headerTitle}</span>
        </div>
        <div className="header-right">
          {/* Additional header items can go here */}
        </div>
      </header>

      {/* Main content area - using Outlet instead of children prop */}
      <main className={`layout-content ${isSidebarOpen ? 'content-shift' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
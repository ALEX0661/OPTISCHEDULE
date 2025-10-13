import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import {
  MdCreateNewFolder,
  MdEventNote,
  MdPerson,
  MdCheckCircle,
  MdSettings,
  MdLogout,
  MdClose
} from 'react-icons/md';
import '../styles/Sidebar.css';
import logoImage from '../assets/optisched-logo.png'; 
import ConfirmationModal from '../components/ConfirmationModal'; 

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const [showConfirmation, setShowConfirmation] = useState(false);

  
  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    window.location.href = '/';
  };

  
  const confirmLogout = () => {
    setShowConfirmation(true);
  };

  
  const cancelLogout = () => {
    setShowConfirmation(false);
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      {/* Logo and brand name */}
      <div className="logo-container">
        <img src={logoImage} alt="OptiSched Logo" className="logo-image" />
        <span className="brand-name">OptiSched</span>
      </div>
      
      {/* Navigation */}
      <nav className="sidebar-menu">
        <a className="menu-item" href="/create-schedule">
          <MdCreateNewFolder className="menu-icon" />
          <span>Create Schedule</span>
        </a>
        <a className="menu-item" href="/schedule-management">
          <MdEventNote className="menu-icon" />
          <span>Schedule Management</span>
        </a>
        <a className="menu-item" href="/faculty-overview">
          <MdPerson className="menu-icon" />
          <span>Faculty Overview</span>
        </a>
        <a className="menu-item" href="/Generated-schedule">
          <MdCheckCircle className="menu-icon" />
          <span>Generated Schedule</span>
        </a>
        <a className="menu-item" href="/admin-settings">
          <MdSettings className="menu-icon" />
          <span>Admin Settings</span>
        </a>
      </nav>

      {/* Bottom area for logout */}
      <div className="sidebar-footer">
        <button className="menu-item logout-btn" onClick={confirmLogout}>
          <MdLogout className="menu-icon" />
          <span>Log Out</span>
        </button>
      </div>

      {/* Render the Confirmation Modal using a portal */}
      {showConfirmation &&
        ReactDOM.createPortal(
          <ConfirmationModal
            title="Confirm Logout"
            message="Are you sure you want to log out?"
            onConfirm={handleLogout}
            onCancel={cancelLogout}
            confirmLabel="Yes"
            cancelLabel="No"
            type="warning"
          />,
          document.body
        )
      }
      
      {/* (Optional) Close button for mobile/tablet view can be added here */}
    </div>
  );
};

export default Sidebar;

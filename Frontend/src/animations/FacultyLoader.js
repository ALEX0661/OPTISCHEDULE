import React from 'react';
import './FacultyLoader.css';
import icon from '../assets/facultyIcon1.png';

const FacultyLoader = ({ message = "Fetching Faculty Members" }) => {
  return (
    <div className="faculty-loader-wrapper">
      <div className="faculty-icons">
        <div className="faculty-icon">
          <img src={icon} alt="Faculty icon" className="icon-image" />
        </div>
        <div className="faculty-icon">
          <img src={icon} alt="Faculty icon" className="icon-image" />
        </div>
        <div className="faculty-icon">
          <img src={icon} alt="Faculty icon" className="icon-image" />
        </div>
      </div>
      <div className="loader-text">{message}</div>
    </div>
  );
};

export default FacultyLoader;
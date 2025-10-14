import React, { useState } from 'react';
import '../styles/CreateSchedule.css';

const BlockConfigModal = ({ courses, semester, onClose, onSubmit }) => {
  
  const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const getSemesterDisplayName = (sem) => {
    const semesterMap = {
      "1st Sem": "First Semester",
      "2nd Sem": "Second Semester",
      "Midyear": "Midyear"
    };
    return semesterMap[sem] || sem;
  };

  const initialConfig = {};
  courses.forEach(course => {
    const key = `${course.program}_${course.yearLevel}`;
    if (!initialConfig[key]) {
      initialConfig[key] = { program: course.program, yearLevel: course.yearLevel, blocks: '' };
    }
  });

  const [config, setConfig] = useState(initialConfig);

  const handleChange = (key, value) => {
    setConfig(prev => ({
      ...prev,
      [key]: { ...prev[key], blocks: value }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(config);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-window block-config-modal" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          Block Configuration - {getSemesterDisplayName(semester)} Courses
        </div>
        <form onSubmit={handleSubmit}>
          {Object.keys(config).map(key => (
            <div key={key} className="config-item">
              <label>
                {config[key].program} – {getOrdinal(config[key].yearLevel)} Year Blocks:
                <input
                  type="number"
                  placeholder="Enter number of blocks"
                  value={config[key].blocks}
                  onChange={(e) => handleChange(key, e.target.value)}
                  min="1"
                  required
                />
              </label>
            </div>
          ))}
          <div className="modal-button-row">
            <button type="submit" className="save-btn">Save Configuration</button>
            <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BlockConfigModal;
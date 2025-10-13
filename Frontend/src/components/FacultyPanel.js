import React from 'react';
import {
  calculateFacultyUnits,
  getFacultyLoadColor,
  isFacultyAvailableForGroup,
} from '../utils/scheduleHelpers';
import noFacultyLogo from '../assets/noFacultyLogo.png';
import FacultyLoader from '../animations/FacultyLoader';

const FacultyPanel = ({
  faculty,
  facultySearch,
  onFacultySearchChange,
  selectedGroup,
  schedule,
  onAssignFaculty,
  onOpenFacultyModal,
  isLoadingFaculty,
  fetchError,
}) => {
  const filteredFaculty = faculty.filter((f) =>
    f.name.toLowerCase().includes(facultySearch.toLowerCase())
  );

  return (
    <div className="floating-faculty-panel">
      <div className="card">
        <div className="faculty-header">
          <h3 className="faculty-title">Faculty Members</h3>
        </div>
        <input
          type="text"
          className="faculty-search"
          placeholder="Search faculty..."
          value={facultySearch}
          onChange={onFacultySearchChange}
        />
        <div className="faculty-content">
          {isLoadingFaculty ? (
            <div className="faculty-loader-container" style={{ padding: '20px 0' }}>
              <FacultyLoader />
            </div>
          ) : fetchError ? (
            <div className="no-faculty-container">
              <img
                src={noFacultyLogo}
                alt="Error fetching faculty"
                className="no-faculty-logo"
              />
              <p>Error fetching faculty.</p>
            </div>
          ) : filteredFaculty.length === 0 ? (
            <div className="no-faculty-container">
              <img
                src={noFacultyLogo}
                alt="No Faculty Found"
                className="no-faculty-logo"
              />
              <p>No faculty members found.</p>
            </div>
          ) : (
            <div className="faculty-cards">
              {filteredFaculty.map((f) => {
                const available = selectedGroup
                  ? isFacultyAvailableForGroup(f, selectedGroup, schedule)
                  : true;
                const unitCount = calculateFacultyUnits(f.name, schedule);
                const loadColor = getFacultyLoadColor(f, unitCount);
                return (
                  <div
                    key={f.id}
                    className={`faculty-card ${
                      selectedGroup && !available ? 'disabled' : ''
                    }`}
                    onClick={() => {
                      if (selectedGroup && available) {
                        onAssignFaculty(f);
                      } else if (!selectedGroup) {
                        onOpenFacultyModal(f);
                      }
                    }}
                    style={{ cursor: selectedGroup && available ? 'pointer' : 'default' }}
                  >
                    <div className="faculty-info">
                      <div className="faculty-name-text">{f.name}</div>
                      <div className="faculty-status">{f.Status || f.status}</div>
                    </div>
                    <div
                      className="faculty-status"
                      style={{ display: 'flex', alignItems: 'center' }}
                    >
                      <div className="faculty-workload" style={{ marginRight: '8px' }}>
                        {unitCount} units
                      </div>
                      <div className={`status-indicator status-${loadColor}`}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacultyPanel;

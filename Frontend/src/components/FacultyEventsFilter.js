
import React from 'react';

const FacultyEventsFilter = ({ filters, onFilterChange }) => {
  return (
    <div className="filters-card faculty-events-filters">
      <h3>Assigned Class Schedule</h3>
      <div className="filters-grid">
        <div className="filter-item">
          <label className="filter-label">Program</label>
          <select
            name="program"
            value={filters.program}
            onChange={onFilterChange}
            className="filter-select"
          >
            <option value="all">All Programs</option>
            <option value="BSIT">BS Information Technology</option>
            <option value="BSCS">BS Computer Science</option>
            <option value="BSEMC-DAT">BS Entertainment and Multimedia Computing - Major in Digital Animation Technology</option>
            <option value="BSEMC-GD">BS Entertainment and Multimedia Computing - Major in Game Development</option>
          </select>
        </div>
        <div className="filter-item">
          <label className="filter-label">Year</label>
          <select
            name="year"
            value={filters.year}
            onChange={onFilterChange}
            className="filter-select"
          >
            <option value="all">All Years</option>
            <option value="1">First Year</option>
            <option value="2">Second Year</option>
            <option value="3">Third Year</option>
            <option value="4">Fourth Year</option>
          </select>
        </div>
        <div className="filter-item">
          <label className="filter-label">Block</label>
          <select
            name="block"
            value={filters.block}
            onChange={onFilterChange}
            className="filter-select"
          >
            <option value="all">All Blocks</option>
            <option value="A">Block A</option>
            <option value="B">Block B</option>
            <option value="C">Block C</option>
            <option value="D">Block D</option>
            <option value="E">Block E</option>
            <option value="F">Block F</option>
          </select>
        </div>
        
        <div className="filter-item">
          <label className="filter-label">Course Code/Name</label>
          <input
            type="text"
            name="courseQuery"
            placeholder="Course code/name"
            value={filters.courseQuery}
            onChange={onFilterChange}
            className="filter-select"
          />
        </div>
      </div>
    </div>
  );
};

export default FacultyEventsFilter;

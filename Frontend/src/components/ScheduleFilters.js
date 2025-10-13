import React from 'react';

const ScheduleFilters = ({ filters, onFilterChange, rooms }) => {
  // Combine lecture and lab rooms into a single array, removing duplicates
  const allRooms = [...new Set([...(rooms?.lecture || []), ...(rooms?.lab || [])])].sort();

  return (
    <div className="cards filters-card">
      <div className="filters-header">
        <h2>Filters</h2>
      </div>
      <div className="filters-container">
        <div className="filter-group">
          <label className="filter-label">Program</label>
          <select className="filter-select" name="program" value={filters.program} onChange={onFilterChange}>
            <option value="all">All Programs</option>
            <option value="BSIT">BS Information Technology</option>
            <option value="BSCS">BS Computer Science</option>
            <option value="BSEMC">BS Entertainment and Multimedia Computing</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Year Level</label>
          <select className="filter-select" name="year" value={filters.year} onChange={onFilterChange}>
            <option value="all">All Years</option>
            <option value="1">First Year</option>
            <option value="2">Second Year</option>
            <option value="3">Third Year</option>
            <option value="4">Fourth Year</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Block</label>
          <select className="filter-select" name="block" value={filters.block} onChange={onFilterChange}>
            <option value="all">All Blocks</option>
            <option value="A">Block A</option>
            <option value="B">Block B</option>
            <option value="C">Block C</option>
            <option value="D">Block D</option>
            <option value="E">Block E</option>
            <option value="F">Block F</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Day</label>
          <select className="filter-select" name="day" value={filters.day} onChange={onFilterChange}>
            <option value="all">All Days</option>
            <option value="Monday">Monday</option>
            <option value="Tuesday">Tuesday</option>
            <option value="Wednesday">Wednesday</option>
            <option value="Thursday">Thursday</option>
            <option value="Friday">Friday</option>
            <option value="Saturday">Saturday</option>
            <option value="Sunday">Sunday</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Room</label>
          <select className="filter-select" name="room" value={filters.room} onChange={onFilterChange}>
            <option value="all">All Rooms</option>
            {allRooms.map((room) => (
              <option key={room} value={room}>{room}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Course Code/Name</label>
          <input
            className="filter-select"
            type="text"
            name="courseQuery"
            placeholder="Enter course code or name"
            value={filters.courseQuery}
            onChange={onFilterChange}
          />
        </div>
        <div className="filter-group checkbox-container">
          <label className="filter-label">Unassigned Only</label>
          <div className="custom-checkbox">
            <input
              id="showUnassignedOnly"
              type="checkbox"
              name="showUnassignedOnly"
              checked={filters.showUnassignedOnly}
              onChange={onFilterChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleFilters;
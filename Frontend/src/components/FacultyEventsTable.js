
import React from 'react';
import noScheduleLogo from '../assets/noScheduleLogo.png';

const FacultyEventsTable = ({ events, computeUnits, fetchError }) => {
  
  if (!events || events.length === 0) {
    return (
      <div className="no-schedule-container">
        <img
          src={noScheduleLogo}
          alt={fetchError ? "Error fetching schedule" : "No Schedule Available"}
          className="no-schedule-logo"
        />
        <p>{fetchError ? 'Error fetching schedule.' : 'No class scheduled.'}</p>
      </div>
    );
  }

  return (
    <div className="faculty-events-grid">
      <table className="events-table">
        <thead>
          <tr>
            <th>Course Code</th>
            <th>Course Title</th>
            <th>Session</th>
            <th>Program</th>
            <th>Year</th>
            <th>Block</th>
            <th>Day</th>
            <th>Time Slot</th>
            <th>Room</th>
            <th>Units</th>
          </tr>
        </thead>
        <tbody>
          {events.map(event => {
            const units = computeUnits(event);
            return (
              <tr key={event.schedule_id}>
                <td>{event.courseCode}</td>
                <td>{`${event.title} (${event.courseCode})`}</td>
                <td>{event.session}</td>
                <td>{event.program}</td>
                <td>{event.year}</td>
                <td>{event.block}</td>
                <td>{event.day || ''}</td>
                <td>{event.period || ''}</td>
                <td>{event.room}</td>
                <td>{units}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default FacultyEventsTable;

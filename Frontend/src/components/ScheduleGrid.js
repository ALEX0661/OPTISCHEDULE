import React from 'react';
import { parsePeriod, computeGroupKey } from '../utils/scheduleHelpers';
import noScheduleLogo from '../assets/noScheduleLogo.png';

const ScheduleGrid = ({
  groupedSchedule,
  daysOrder,
  selectedGroup,
  onToggleGroupSelection,
  onOverride,
  displayScheduleName,
  onSaveFinalSchedule,
  onSelectExistingSchedule,
  existingSchedules,
  fetchError  
}) => {
  daysOrder.forEach((day) => {
    if (groupedSchedule[day]) {
      groupedSchedule[day].sort((a, b) => {
        const [aStart] = parsePeriod(a.period);
        const [bStart] = parsePeriod(b.period);
        return aStart - bStart;
      });
    }
  });

  const totalEvents = daysOrder.reduce((acc, day) => {
    return acc + (groupedSchedule[day] ? groupedSchedule[day].length : 0);
  }, 0);

  return (
    <div className="cards schedule-card">
      <div className="save-schedule-container">
        <button className="save-schedule-btn" onClick={onSaveFinalSchedule}>
          Save Schedule
        </button>
        <div className="existing-schedules-dropdown">
          <label htmlFor="existingSchedulesSelect">Existing Schedules:</label>
          <select id="existingSchedulesSelect" onChange={onSelectExistingSchedule}>
            <option value="">Select a schedule</option>
            {existingSchedules &&
              existingSchedules.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="schedule-name-display">
        <h2>Generated Schedule For A.Y. {displayScheduleName}</h2>
      </div>

      {totalEvents === 0 ? (
        <div className="no-schedule-container" style={{ padding: '20px', textAlign: 'center' }}>
          <img
            src={noScheduleLogo}
            alt="No Schedule Available"
            className="no-schedule-logo"
            style={{ maxWidth: '200px', width: '100%', height: 'auto', marginBottom: '10px' }}
          />
          <p style={{ fontSize: '1.1em', color: '#555' }}>
            {fetchError ? 'Error fetching schedule.' : 'No schedule available.'}
          </p>
        </div>
      ) : (
        <div className="schedule-table-container">
          {daysOrder.map((day) =>
            groupedSchedule[day] && groupedSchedule[day].length > 0 ? (
              <div key={day}>
                <h3 style={{ padding: '10px', backgroundColor: '#f0f0f0' }}>{day}</h3>
                <table className="schedule-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Course (Name & Code)</th>
                      <th>Program</th>
                      <th>Year</th>
                      <th>Block</th>
                      <th>Session</th>
                      <th>Time</th>
                      <th>Room</th>
                      <th>Faculty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedSchedule[day].map((event) => (
                      <tr
                        key={event.schedule_id}
                        className={event.overlapDetails?.hasOverlap ? 'overlap-row' : ''}
                      >
                        <td>
                          <button className="override-btn" onClick={() => onOverride(event.schedule_id)}>
                            ⇄
                          </button>
                        </td>
                        <td>
                          <div className="course-info">
                            <div className="course-title">{event.title}</div>
                            <div className="course-code">{event.courseCode}</div>
                          </div>
                        </td>
                        <td>{event.program}</td>
                        <td>{event.year}</td>
                        <td>{event.block}</td>
                        <td>{event.session}</td>
                        <td>{event.period}</td>
                        <td>{event.room}</td>
                        <td>
                          <button
                            className={`toggle-faculty-btn toggle-faculty-btn-column ${
                              selectedGroup && computeGroupKey(event) === selectedGroup.groupKey ? 'active' : ''
                            } ${event.faculty && event.faculty.trim() !== '' ? '' : 'unassigned'}`}
                            onClick={() => onToggleGroupSelection(event)}
                            style={{ fontSize: '0.85em' }}
                          >
                            {event.faculty && event.faculty.trim() !== '' ? event.faculty : 'Unassigned'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
};

export default ScheduleGrid;
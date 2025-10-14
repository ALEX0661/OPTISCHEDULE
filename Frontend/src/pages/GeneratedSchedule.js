

import React, { useState, useEffect } from 'react';
import '../styles/GeneratedSchedulePage.css';
import { getFinalSchedule, getFinalSchedules } from '../services/scheduleService';
import SuccessModal from '../components/SuccessModal';
import noScheduleLogo from '../assets/noScheduleLogo.png';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';


const toMinutes = timeStr => {
  const [time, meridiem] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
};


const mergeConsecutiveEvents = events => {
  const eventsCopy = JSON.parse(JSON.stringify(events));
  eventsCopy.sort((a, b) => {
    if (a.courseCode !== b.courseCode) return a.courseCode.localeCompare(b.courseCode);
    if (a.title !== b.title) return a.title.localeCompare(b.title);
    if (a.session !== b.session) return a.session.localeCompare(b.session);
    if (a.program !== b.program) return a.program.localeCompare(b.program);
    if (a.year !== b.year) return a.year - b.year;
    if (a.block !== b.block) return a.block.localeCompare(b.block);
    if (a.room !== b.room) return a.room.localeCompare(b.room);
    if (a.day !== b.day) return a.day.localeCompare(b.day);
    if (a.faculty !== b.faculty) return a.faculty.localeCompare(b.faculty);
    const aStart = toMinutes(a.period.split(' - ')[0]);
    const bStart = toMinutes(b.period.split(' - ')[0]);
    return aStart - bStart;
  });

  const mergedEvents = [];
  let currentEvent = null;

  for (const event of eventsCopy) {
    if (!currentEvent) {
      currentEvent = { ...event };
      continue;
    }

    const canMerge =
      currentEvent.courseCode === event.courseCode &&
      currentEvent.title === event.title &&
      currentEvent.session === event.session &&
      currentEvent.program === event.program &&
      currentEvent.year === event.year &&
      currentEvent.block === event.block &&
      currentEvent.room === event.room &&
      currentEvent.day === event.day &&
      currentEvent.faculty === event.faculty;

    if (canMerge) {
      const [currStart, currEnd] = currentEvent.period.split(' - ');
      const [newStart, newEnd] = event.period.split(' - ');
      if (toMinutes(currEnd) === toMinutes(newStart)) {
        currentEvent.period = `${currStart} - ${newEnd}`;
        continue;
      }
    }

    mergedEvents.push(currentEvent);
    currentEvent = { ...event };
  }
  if (currentEvent) mergedEvents.push(currentEvent);

  return mergedEvents;
};

const GeneratedSchedulePage = () => {
  const [schedule, setSchedule] = useState([]);
  const [scheduleName, setScheduleName] = useState('');
  const [filter, setFilter] = useState({
    program: 'all',
    year: 'all',
    block: 'all',
    day: 'all',
    courseQuery: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [finalSchedulesList, setFinalSchedulesList] = useState([]);

  
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalMessage, setSuccessModalMessage] = useState('');
  const [modalType, setModalType] = useState("success");

  
  const dayMapping = {
    "Monday": "M",
    "Tuesday": "T",
    "Wednesday": "W",
    "Thursday": "Th",
    "Friday": "F",
    "Saturday": "Sat",
    "Sunday": "Sun"
  };
  const dayOrder = {
    "M":1,"Monday":1,
    "T":2,"Tuesday":2,
    "W":3,"Wednesday":3,
    "Th":4,"Thursday":4,
    "F":5,"Friday":5,
    "Sat":6,"Saturday":6,
    "Sun":7,"Sunday":7
  };

  useEffect(() => {
    const storedName = localStorage.getItem('finalScheduleName') || '2004-2005 Midyear';
    setScheduleName(storedName);
    fetchFinalSchedules();
  }, []);

  const fetchFinalSchedules = async () => {
    try {
      const data = await getFinalSchedules();
      if (data?.schedules) setFinalSchedulesList(data.schedules);
    } catch {}
  };

  const showModal = (msg, type = "success") => {
    setSuccessModalMessage(msg);
    setModalType(type);
    setShowSuccessModal(true);
  };
  const closeModal = () => setShowSuccessModal(false);

  const fetchSchedule = async (name) => {
    setLoading(true);
    setError('');
    try {
      const data = await getFinalSchedule(name);
      if (data?.schedule) {
        setSchedule(data.schedule);
        const newName = data.schedule_name || name;
        setScheduleName(newName);
        localStorage.setItem('finalScheduleName', newName);
        showModal("Schedule loaded successfully.", "success");
      } else {
        setError('Schedule not found.');
        setSchedule([]);
        showModal("Schedule not found.", "error");
      }
    } catch {
      setError('Error fetching schedule.');
      setSchedule([]);
      showModal("Error fetching schedule.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = e => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
  };

  const filteredSchedule = schedule.filter(evt => {
    if (filter.program !== 'all' && evt.program !== filter.program) return false;
    if (filter.year !== 'all' && String(evt.year) !== filter.year) return false;
    if (filter.block !== 'all' && evt.block !== filter.block) return false;
    if (filter.day !== 'all' && evt.day !== filter.day) return false;
    if (filter.courseQuery) {
      const q = filter.courseQuery.toLowerCase();
      if (!evt.courseCode.toLowerCase().includes(q) &&
          !evt.title.toLowerCase().includes(q)) return false;
    }
    return true;
  });

 
  const sortedSchedule = filteredSchedule.slice().sort((a, b) => {
    const aStart = toMinutes(a.period.split(' - ')[0]);
    const bStart = toMinutes(b.period.split(' - ')[0]);
    return aStart - bStart;
  });

  
  const grouped = sortedSchedule.reduce((acc, evt) => {
    const key = `${evt.courseCode}-${evt.session}-${evt.program}-${evt.year}-${evt.block}-${evt.period}-${evt.room}-${evt.faculty}`;
    const dayAbbrev = dayMapping[evt.day] || evt.day;
    if (acc[key]) {
      if (!acc[key].dayAbbrevs.includes(dayAbbrev)) acc[key].dayAbbrevs.push(dayAbbrev);
    } else {
      acc[key] = { ...evt, dayAbbrevs: [dayAbbrev] };
    }
    return acc;
  }, {});

  const dayMergedSchedule = Object.values(grouped).map(evt => ({
    ...evt,
    day: evt.dayAbbrevs
      .sort((a, b) => (dayOrder[a] || 99) - (dayOrder[b] || 99))
      .join('')
  }));

  const mergedSchedule = mergeConsecutiveEvents(dayMergedSchedule);

  
  const timeSortedSchedule = mergedSchedule.slice().sort((a, b) => {
    const aStart = toMinutes(a.period.split(' - ')[0]);
    const bStart = toMinutes(b.period.split(' - ')[0]);
    return aStart - bStart;
  });

  const handleExportToPDF = () => exportToPDF(timeSortedSchedule, scheduleName, filter);
  const handleExportToExcel = () => exportToExcel(timeSortedSchedule, scheduleName, filter);
  const handleSelectExistingSchedule = e => {
    const name = e.target.value;
    if (name) fetchSchedule(name);
  };

  return (
    <div className="Generated-schedule-container">
      {/* Top Section */}
      <div className="top-section">
        <div className="schedule-name-field">
          <label>Schedule Name</label>
          <p className="schedule-name-display">{`A.Y. ${scheduleName}`}</p>
        </div>
        <div className="existing-schedules">
          <label>Existing Schedules:</label>
          <select onChange={handleSelectExistingSchedule}>
            <option value="">Select a schedule</option>
            {finalSchedulesList.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-card">
        <h3>Filters</h3>
        <div className="filters-row">
          <div className="filter-group">
            <label>Program</label>
            <select name="program" value={filter.program} onChange={handleFilterChange}>
              <option value="all">All Programs</option>
              <option value="BSIT">BS Information Technology</option>
              <option value="BSCS">BS Computer Science</option>
              <option value="BSEMC-DAT">BS Entertainment and Multimedia Computing - Major in Digital Animation Technology</option>
              <option value="BSEMC-GD">BS Entertainment and Multimedia Computing - Major in Game Development</option>
          </select>
          </div>
          <div className="filter-group">
            <label>Year Level</label>
            <select name="year" value={filter.year} onChange={handleFilterChange}>
              <option value="all">All Years</option>
              <option value="1">First Year</option>
              <option value="2">Second Year</option>
              <option value="3">Third Year</option>
              <option value="4">Fourth Year</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Block</label>
            <select name="block" value={filter.block} onChange={handleFilterChange}>
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
            <label>Course Code/Name</label>
            <input
              type="text"
              name="courseQuery"
              placeholder="e.g., CS101"
              value={filter.courseQuery}
              onChange={handleFilterChange}
            />
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="export-buttons flex space-x-2">
        <button onClick={handleExportToExcel} className="excel-btn px-4 py-2 rounded shadow">
          <i className="fa fa-file-excel-o mr-1" /> Export to Excel
        </button>
        <button onClick={handleExportToPDF} className="pdf-btn px-4 py-2 rounded shadow">
          <i className="fa fa-file-pdf-o mr-1" /> Export to PDF
        </button>
      </div>

      {/* Schedule Table or No Data */}
      {loading ? (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Loading schedule...</p>
        </div>
      ) : error ? (
        <p className="error-msg">{error}</p>
      ) : (
        <div className="schedule-table-container">
          {timeSortedSchedule.length === 0 ? (
            <div className="no-schedule-container">
              <img src={noScheduleLogo} alt="No Schedule Available" className="no-schedule-logo" />
              <p>No schedule data to display.</p>
            </div>
          ) : (
            <table className="schedule-table">
              <thead>
                <tr>
                  <th>Course Title</th>
                  <th>Session</th>
                  <th>Program</th>
                  <th>Year</th>
                  <th>Block</th>
                  <th>Day</th>
                  <th>Time Slot</th>
                  <th>Room</th>
                  <th>Faculty</th>
                </tr>
              </thead>
              <tbody>
                {timeSortedSchedule.map((event, idx) => (
                  <tr key={idx}>
                    <td>{`${event.title} (${event.courseCode})`}</td>
                    <td>{event.session}</td>
                    <td>{event.program}</td>
                    <td>{event.year}</td>
                    <td>{event.block}</td>
                    <td>{event.day || ''}</td>
                    <td>{event.period || ''}</td>
                    <td>{event.room}</td>
                    <td>{event.faculty || 'Unassigned'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <SuccessModal 
          message={successModalMessage} 
          type={modalType}
          onClose={closeModal} 
        />
      )}
    </div>
  );
};

export default GeneratedSchedulePage;

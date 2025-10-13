import React, { useState, useEffect } from 'react';
import {
  getFacultyList,
  addFaculty,
  updateFaculty,
  deleteFaculty
} from '../services/facultyService';
import { generateSchedule } from '../services/scheduleService';
import {
  parsePeriod,
  computeEventUnits 
} from '../utils/scheduleHelpers';
import FacultyDetails from '../components/FacultyDetails';
import FacultyEventsFilter from '../components/FacultyEventsFilter';
import FacultyEventsTable from '../components/FacultyEventsTable';
import ExportButtons from '../components/ExportButtons';
import FacultyAddModal from '../components/FacultyAddModal';
import FacultyEditModal from '../components/FacultyEditModal';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import noFacultyLogo from '../assets/noFacultyLogo.png';
import '../styles/FacultyOverview.css';
import FacultyLoader from '../animations/FacultyLoader';  


const toMinutes = timeStr => {
  const [time, meridiem] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
};


const fromMinutes = mins => {
  let hours = Math.floor(mins / 60);
  let minutes = mins % 60;
  const meridiem = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes.toString().padStart(2, '0')} ${meridiem}`;
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
      const [currentStartStr, currentEndStr] = currentEvent.period.split(' - ');
      const [newStartStr, newEndStr] = event.period.split(' - ');
      const currentEndMins = toMinutes(currentEndStr);
      const newStartMins = toMinutes(newStartStr);
      if (currentEndMins === newStartMins) {
        currentEvent.period = `${currentStartStr} - ${newEndStr}`;
        continue;
      }
    }
    mergedEvents.push(currentEvent);
    currentEvent = { ...event };
  }
  if (currentEvent) mergedEvents.push(currentEvent);
  return mergedEvents;
};

const FacultyOverviewContainer = () => {
  const [facultyList, setFacultyList] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [facultyEvents, setFacultyEvents] = useState([]);
  const [filters, setFilters] = useState({
    program: 'all',
    block: 'all',
    year: 'all',
    courseQuery: '',
  });
  const [error, setError] = useState('');
  
  const [loading, setLoading] = useState(false);
  
  const [isFacultyLoading, setIsFacultyLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [facultyToEdit, setFacultyToEdit] = useState(null);
  const [scheduleError, setScheduleError] = useState(false);
  
  const [showDeleteFacultyConfirmation, setShowDeleteFacultyConfirmation] = useState(false);
  const [facultyToDelete, setFacultyToDelete] = useState(null);
  
  const [feedbackModal, setFeedbackModal] = useState(null);

  const storedScheduleName = localStorage.getItem('scheduleName') || 'Default Schedule';
  const scheduleName = `A.Y. ${storedScheduleName}`;

 
  const dayMapping = {
    "Monday": "M",
    "Tuesday": "T",
    "Wednesday": "W",
    "Thursday": "Th",
    "Friday": "F",
    "Saturday": "Sat",
    "Sunday": "Sun"
  };
  const dayOrder = ["M", "T", "W", "Th", "F", "Sat", "Sun"];

 
  useEffect(() => {
    const fetchFaculty = async () => {
      setIsFacultyLoading(true);
      try {
        const data = await getFacultyList();
        if (data.status === 'success') {
          setFacultyList(data.faculty);
        } else {
          setError('Error fetching faculty.');
        }
      } catch (err) {
        console.error('Error fetching faculty:', err);
        setError('Error fetching faculty.');
      } finally {
        setIsFacultyLoading(false);
      }
    };
    fetchFaculty();
  }, []);

  
  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const data = await generateSchedule();
        if (data.status === 'success') {
          setSchedule(data.schedule);
          setScheduleError(false);
        } else {
          setError('Error fetching schedule events.');
          setScheduleError(true);
        }
      } catch (err) {
        console.error('Error fetching schedule events:', err);
        setError('Error fetching schedule events.');
        setScheduleError(true);
      }
    };
    fetchSchedule();
  }, []);

  
  useEffect(() => {
    if (selectedFaculty) {
      const events = schedule.filter(e => e.faculty === selectedFaculty.name);
      setFacultyEvents(events);
    } else {
      setFacultyEvents([]);
    }
  }, [selectedFaculty, schedule]);

  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  
  const filteredEvents = facultyEvents.filter(event => {
    const { program, block, year, courseQuery } = filters;
    let matches = true;
    if (program !== 'all' && event.program !== program) matches = false;
    if (block !== 'all' && event.block !== block) matches = false;
    if (year !== 'all' && String(event.year) !== year) matches = false;
    if (
      courseQuery &&
      !event.courseCode.toLowerCase().includes(courseQuery.toLowerCase()) &&
      !event.title.toLowerCase().includes(courseQuery.toLowerCase())
    )
      matches = false;
    return matches;
  });

  
  const sortedEvents = filteredEvents.slice().sort((a, b) => {
    const aStart = toMinutes(a.period.split(' - ')[0]);
    const bStart = toMinutes(b.period.split(' - ')[0]);
    return aStart - bStart;
  });

  
  const mergedEventsMap = sortedEvents.reduce((acc, event) => {
    const key = `${event.courseCode}-${event.session}-${event.program}-${event.year}-${event.block}-${event.room}-${event.faculty}-${event.period}`;
    const dayAbbrev = dayMapping[event.day] || event.day;
    if (acc[key]) {
      if (dayAbbrev && !acc[key].dayAbbrevs.includes(dayAbbrev)) {
        acc[key].dayAbbrevs.push(dayAbbrev);
      }
    } else {
      acc[key] = { ...event, dayAbbrevs: [dayAbbrev] };
    }
    return acc;
  }, {});

  const mergedEvents = Object.values(mergedEventsMap).map(event => {
    const sortedDayAbbrevs = event.dayAbbrevs.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
    return { ...event, day: sortedDayAbbrevs.join('') };
  });

  
  const finalMergedEvents = mergeConsecutiveEvents(mergedEvents);

  
  const handleSelectFaculty = fac => {
    setSelectedFaculty(fac);
  };

  const handleBack = () => {
    setSelectedFaculty(null);
  };

  const openAddModal = () => {
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
  };

  const handleSaveFaculty = async facultyData => {
    try {
      setLoading(true);
      const response = await addFaculty(facultyData);
      if (response.status === 'success') {
        setFacultyList(prev => [...prev, response.faculty]);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        closeAddModal();
        setFeedbackModal({ message: "Faculty added successfully!", type: "success" });
      } else {
        setFeedbackModal({ message: "Error adding faculty: " + response.message, type: "error" });
      }
    } catch (err) {
      console.error("Error adding faculty:", err);
      setFeedbackModal({ message: "Error adding faculty.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleEditFaculty = faculty => {
    setFacultyToEdit(faculty);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setFacultyToEdit(null);
  };

  const handleSaveEditedFaculty = async (facultyId, updatedData) => {
    try {
      setLoading(true);
      const response = await updateFaculty(facultyId, updatedData);
      if (response.status === 'success') {
        setFacultyList(prev => prev.map(f => (f.id === facultyId ? response.faculty : f)));
        if (selectedFaculty && selectedFaculty.id === facultyId) {
          setSelectedFaculty(response.faculty);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        closeEditModal();
        setFeedbackModal({ message: "Faculty updated successfully!", type: "success" });
      } else {
        setFeedbackModal({ message: "Error updating faculty: " + response.message, type: "error" });
      }
    } catch (err) {
      console.error("Error updating faculty:", err);
      setFeedbackModal({ message: "Error updating faculty.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  
  const handleDeleteFaculty = facultyId => {
    setFacultyToDelete(facultyId);
    setShowDeleteFacultyConfirmation(true);
  };

  const confirmDeleteFaculty = async () => {
    setShowDeleteFacultyConfirmation(false);
    try {
      setLoading(true);
      const facultyId = facultyToDelete;
      const response = await deleteFaculty(facultyId);
      if (response.status === 'success') {
        setFacultyList(prev => prev.filter(f => f.id !== facultyId));
        if (selectedFaculty && selectedFaculty.id === facultyId) {
          setSelectedFaculty(null);
        }
        setFeedbackModal({ message: "Faculty deleted successfully!", type: "success" });
      } else {
        setFeedbackModal({ message: "Error deleting faculty: " + response.message, type: "error" });
      }
    } catch (err) {
      console.error("Error deleting faculty:", err);
      setFeedbackModal({ message: "Error deleting faculty.", type: "error" });
    } finally {
      setLoading(false);
      setFacultyToDelete(null);
    }
  };

  const cancelDeleteFaculty = () => {
    setShowDeleteFacultyConfirmation(false);
    setFacultyToDelete(null);
  };

  return (
    <div className="faculty-overview-container">
      {/* Overview Header: Always show the schedule name */}
      <div className="overview-header">
        <h1>{scheduleName}</h1>
      </div>

      {loading && (
        <div className="loading-overlay">
          {/* Global schedule-related loading spinner */}
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      )}

      {selectedFaculty ? (
        
        <div className="faculty-panel">
          <div className="faculty-panel-header">
            {}
            <button className="back-btn" onClick={handleBack} title="Back to Faculty List">
              <span className="back-logo">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span className="back-text">Back</span>
            </button>
          </div>
          <div className="faculty-details">
            <FacultyDetails
              faculty={selectedFaculty}
              schedule={schedule}
              onEdit={handleEditFaculty}
              onDelete={handleDeleteFaculty}
            />
            <FacultyEventsFilter filters={filters} onFilterChange={handleFilterChange} />
            <ExportButtons
              events={finalMergedEvents}
              faculty={selectedFaculty}
              scheduleName={scheduleName}
              filterInfo={
                filters.program !== 'all' ||
                filters.year !== 'all' ||
                filters.block !== 'all'
                  ? `${filters.program !== 'all' ? filters.program : ''} ${filters.year !== 'all' ? 'Year' + filters.year : ''} ${filters.block !== 'all' ? 'Block ' + filters.block : ''}`.trim()
                  : ''
              }
            />
            <FacultyEventsTable
              events={finalMergedEvents}
              computeUnits={computeEventUnits} 
              fetchError={scheduleError}
            />
          </div>
        </div>
      ) : (
        
        facultyList.length === 0 ? (
          <div className="no-faculty-container">
            {isFacultyLoading ? (
              <FacultyLoader />
            ) : (
              <>
                <img src={noFacultyLogo} alt="No Faculty Found" className="no-faculty-logo" />
                <p>{error ? "Error fetching faculty." : "No faculty found."}</p>
              </>
            )}
          </div>
        ) : (
          <div className="faculty-grid">
            {facultyList.map(fac => (
              <div
                key={fac.id}
                className="faculty-grid-card improved-grid-card"
                onClick={() => handleSelectFaculty(fac)}
                title={fac.name}
              >
                <div className="card-header">
                  <div className="card-title-container">
                    <h3 className="card-title">{fac.name}</h3>
                    <p className="card-subtitle">
                      {fac.AcademicRank || 'Academic Rank N/A'}
                    </p>
                  </div>
                </div>
                <div className="card-footer">
                  <span className="card-action-text">Click to view details</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Floating Add Button */}
      <button className="floating-add-btn" onClick={openAddModal} title="Add Faculty">
        +
      </button>

      {isAddModalOpen && (
        <FacultyAddModal onClose={closeAddModal} onSave={handleSaveFaculty} />
      )}

      {isEditModalOpen && facultyToEdit && (
        <FacultyEditModal
          faculty={facultyToEdit}
          onClose={closeEditModal}
          onSave={handleSaveEditedFaculty}
        />
      )}

      {feedbackModal && (
        <SuccessModal
          message={feedbackModal.message}
          type={feedbackModal.type}
          onClose={() => setFeedbackModal(null)}
        />
      )}

      {showDeleteFacultyConfirmation && (
        <ConfirmationModal
          title="Confirm Delete"
          message="Are you sure you want to delete this faculty?"
          onConfirm={confirmDeleteFaculty}
          onCancel={cancelDeleteFaculty}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          type="warning"
        />
      )}
    </div>
  );
};

export default FacultyOverviewContainer;

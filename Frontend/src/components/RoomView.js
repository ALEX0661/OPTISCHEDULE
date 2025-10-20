import React, { useState, useEffect, useMemo } from 'react';
import { getRooms, getDays, getTimeSettings } from '../services/settingService';
import { overrideEvent } from '../services/scheduleService';
import '../styles/RoomView.css';

const RoomView = ({ schedule, onScheduleUpdate, onClose }) => {
  const [selectedDay, setSelectedDay] = useState('');
  const [days, setDays] = useState([]);
  const [rooms, setRooms] = useState({ lecture: [], lab: [] });
  const [timeSettings, setTimeSettings] = useState({ start_time: 7, end_time: 21 });
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedEvent, setDraggedEvent] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [localSchedule, setLocalSchedule] = useState([]);

  // Initialize local schedule from props
  useEffect(() => {
    setLocalSchedule(schedule);
  }, [schedule]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [daysData, roomsData, timeData] = await Promise.all([
          getDays(),
          getRooms(),
          getTimeSettings()
        ]);

        if (daysData && daysData.days) {
          setDays(daysData.days);
          if (daysData.days.length > 0) {
            setSelectedDay(daysData.days[0]);
          }
        }

        if (roomsData) {
          setRooms(roomsData);
        }

        if (timeData) {
          setTimeSettings(timeData);
        }
      } catch (error) {
        console.error('Error fetching room view data:', error);
        setErrorMessage('Failed to load schedule settings');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (timeSettings.start_time !== undefined && timeSettings.end_time !== undefined) {
      generateTimeSlots();
    }
  }, [timeSettings]);

  const generateTimeSlots = () => {
    const slots = [];
    const startHour = timeSettings.start_time;
    const endHour = timeSettings.end_time;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const totalMinutes = hour * 60 + minute;
        slots.push({
          time: formatTime(hour, minute),
          startMinutes: totalMinutes
        });
      }
    }
    setTimeSlots(slots);
  };

  const formatTime = (hour, minute) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  const parseTimeToMinutes = (timeStr) => {
    const [time, period] = timeStr.split(' ');
    let [hour, minute] = time.split(':').map(Number);
    
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    
    return hour * 60 + minute;
  };

  const allRooms = [...rooms.lecture, ...rooms.lab];

  // Create a grid map of which cells are occupied by events
  const gridMap = useMemo(() => {
    const map = {};
    
    localSchedule.forEach(event => {
      if (event.day !== selectedDay) return;
      
      const periodMatch = event.period.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!periodMatch) return;
      
      const eventStart = parseTimeToMinutes(`${periodMatch[1]}:${periodMatch[2]} ${periodMatch[3]}`);
      const duration = event.session === 'Laboratory' ? 90 : 60;
      const numSlots = Math.ceil(duration / 30);
      
      const roomIndex = allRooms.indexOf(event.room);
      if (roomIndex === -1) return;
      
      const slotIndex = timeSlots.findIndex(slot => slot.startMinutes === eventStart);
      if (slotIndex === -1) return;
      
      // Mark this event in the starting slot
      const key = `${slotIndex}-${roomIndex}`;
      map[key] = {
        event,
        rowSpan: numSlots,
        isStart: true
      };
      
      // Mark the subsequent slots as occupied
      for (let i = 1; i < numSlots; i++) {
        const occupiedKey = `${slotIndex + i}-${roomIndex}`;
        map[occupiedKey] = {
          event,
          rowSpan: 0,
          isStart: false
        };
      }
    });
    
    return map;
  }, [localSchedule, selectedDay, allRooms, timeSlots]);

  const handleDragStart = (e, event) => {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, room, timeSlot) => {
    e.preventDefault();
    
    if (!draggedEvent) return;

    const newStartTime = timeSlot.time;
    const newRoom = room;
    const newDay = selectedDay;

    // Check if dropped in same location
    if (draggedEvent.room === newRoom && 
        draggedEvent.day === newDay && 
        draggedEvent.period.startsWith(newStartTime)) {
      setDraggedEvent(null);
      return;
    }

    try {
      // Parse the time and convert to 24-hour format
      const timeMatch = newStartTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!timeMatch) {
        throw new Error('Invalid time format');
      }
      
      let hour = parseInt(timeMatch[1]);
      const minute = timeMatch[2];
      const period = timeMatch[3].toUpperCase();
      
      // Convert to 24-hour format
      if (period === 'PM' && hour !== 12) {
        hour += 12;
      } else if (period === 'AM' && hour === 12) {
        hour = 0;
      }
      
      const overrideDetails = {
        schedule_id: draggedEvent.schedule_id,
        new_start: `${hour.toString().padStart(2, '0')}:${minute}`,
        new_room: newRoom,
        new_day: newDay
      };

      const response = await overrideEvent(overrideDetails);
      
      if (response.status === 'success' && response.event) {
        // Update local schedule immediately with the response
        setLocalSchedule(prevSchedule => 
          prevSchedule.map(event => 
            event.schedule_id === draggedEvent.schedule_id 
              ? { ...event, ...response.event }
              : event
          )
        );
        
        setSuccessMessage(`Successfully moved ${draggedEvent.courseCode} to ${newRoom} at ${newStartTime}`);
        setTimeout(() => setSuccessMessage(''), 3000);
        
        // Also update parent component
        if (onScheduleUpdate) {
          await onScheduleUpdate();
        }
      } else {
        setErrorMessage(response.detail || 'Failed to update schedule');
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error updating event:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to update schedule';
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setDraggedEvent(null);
    }
  };

  if (loading) {
    return (
      <div className="room-view-container">
        <div className="loading-spinner">Loading room view...</div>
      </div>
    );
  }

  return (
    <div className="room-view-container">
      <div className="room-view-header">
        <h2>Room-Based Schedule View</h2>
        <button className="close-room-view-btn" onClick={onClose}>
          Back to List View
        </button>
      </div>

      {successMessage && (
        <div className="success-notification">{successMessage}</div>
      )}

      {errorMessage && (
        <div className="error-notification">{errorMessage}</div>
      )}

      <div className="day-tabs">
        {days.map(day => (
          <button
            key={day}
            className={`day-tab ${selectedDay === day ? 'active' : ''}`}
            onClick={() => setSelectedDay(day)}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="room-grid-container">
        <table className="room-grid-table">
          <thead>
            <tr>
              <th className="time-column-header">Time</th>
              {allRooms.map(room => (
                <th key={room} className="room-column-header">
                  {room}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot, slotIndex) => {
              const isHourMark = slot.time.includes(':00');
              
              return (
                <tr key={slotIndex} className={isHourMark ? 'hour-row' : ''}>
                  <td className="time-cell">{slot.time}</td>
                  {allRooms.map((room, roomIndex) => {
                    const cellKey = `${slotIndex}-${roomIndex}`;
                    const cellData = gridMap[cellKey];
                    
                    // Skip cells that are part of a rowspan from above
                    if (cellData && !cellData.isStart) {
                      return null;
                    }
                    
                    // Cell has an event starting here
                    if (cellData && cellData.isStart) {
                      const event = cellData.event;
                      const rowSpan = cellData.rowSpan;
                      
                      return (
                        <td
                          key={room}
                          className="room-cell occupied"
                          rowSpan={rowSpan}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, room, slot)}
                        >
                          <div
                            className="event-card"
                            draggable
                            onDragStart={(e) => handleDragStart(e, event)}
                            onDragEnd={handleDragEnd}
                          >
                            <div className="event-course-code">{event.courseCode}</div>
                            <div className="event-title">{event.title}</div>
                            <div className="event-section">
                              {event.program} {event.year}-{event.block}
                            </div>
                            <div className="event-faculty">
                              {event.faculty || 'Unassigned'}
                            </div>
                            <div className="event-session">{event.session}</div>
                          </div>
                        </td>
                      );
                    }
                    
                    // Empty cell
                    return (
                      <td
                        key={room}
                        className="room-cell empty"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, room, slot)}
                      >
                        <div className="drop-zone">Drop here</div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RoomView;
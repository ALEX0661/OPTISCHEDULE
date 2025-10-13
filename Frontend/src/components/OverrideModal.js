import React, { useState, useEffect, useCallback } from "react";
import { getRooms } from "../services/settingService";
import { parsePeriod } from "../utils/scheduleHelpers";
import "../styles/ScheduleManagement.css";

const OverrideModal = ({ event, schedule, onClose, onSave }) => {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [availableRooms, setAvailableRooms] = useState([]);
  const [allRooms, setAllRooms] = useState({ lecture: [], lab: [] });
  const [hasOverlap, setHasOverlap] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  const fixedDuration = event.session.toLowerCase() === "lecture" ? 60 : 90;

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const rooms = await getRooms();
      if (rooms && rooms.lecture && rooms.lab) {
        setAllRooms(rooms);
      } else {
        console.error("Error: getRooms API did not return expected structure", rooms);
        setAllRooms({ lecture: [], lab: [] });
      }
    } catch (error) {
      console.error("Error fetching rooms:", error);
      setAllRooms({ lecture: [], lab: [] });
    }
  };

  const convertTo24 = (timeStr) => {
    const parts = timeStr.split(" ");
    if (parts.length < 2) return timeStr;
    const [time, meridiem] = parts;
    let [hours, minutes] = time.split(":").map(Number);
    if (meridiem.toUpperCase() === "PM" && hours !== 12) hours += 12;
    if (meridiem.toUpperCase() === "AM" && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const updateFields = useCallback(
    (newStart, dayValue) => {
      const startMinutes = timeToMinutes(newStart);
      const newEndMinutes = startMinutes + fixedDuration;
      const endHours = Math.floor(newEndMinutes / 60) % 24;
      const endMins = newEndMinutes % 60;
      setEndTime(
        `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`
      );

      const usedRooms = new Set();
      schedule.forEach((ev) => {
        if (ev.day === dayValue && ev.schedule_id !== event.schedule_id) {
          const [s, e] = parsePeriod(ev.period);
          if (startMinutes < e && s < newEndMinutes && ev.room) {
            usedRooms.add(ev.room);
          }
        }
      });

      const eventType = event.session.toLowerCase();
      const relevantRooms = eventType === "lecture" ? allRooms.lecture : allRooms.lab;
      const filteredRooms = (Array.isArray(relevantRooms) ? relevantRooms : []).filter(
        (room) => !usedRooms.has(room)
      );
      setAvailableRooms(filteredRooms);
    },
    [event, schedule, allRooms, fixedDuration]
  );

  const checkForOverlap = useCallback(() => {
    if (!startTime) return;
    const newStartMinutes = timeToMinutes(startTime);
    const newEndMinutes = newStartMinutes + fixedDuration;
    let overlapFound = false;
    const dayToCheck = selectedDay || event.day;

    schedule.forEach((ev) => {
      if (ev.schedule_id === event.schedule_id) return;
      if (
        ev.program === event.program &&
        ev.block === event.block &&
        ev.year === event.year &&
        ev.day === dayToCheck
      ) {
        const [evStart, evEnd] = parsePeriod(ev.period);
        console.log(`Checking overlap: ${event.title} (${newStartMinutes}-${newEndMinutes}) vs ${ev.title} (${evStart}-${evEnd})`);
        if (!(newEndMinutes <= evStart || newStartMinutes >= evEnd)) {
          overlapFound = true;
          console.log(`Overlap detected with ${ev.title}`);
        }
      }
    });

    if (event.faculty) {
      schedule.forEach((ev) => {
        if (ev.schedule_id === event.schedule_id) return;
        if (ev.day === dayToCheck && ev.faculty === event.faculty) {
          const [evStart, evEnd] = parsePeriod(ev.period);
          if (!(newEndMinutes <= evStart || newStartMinutes >= evEnd)) {
            overlapFound = true;
            console.log(`Faculty overlap detected with ${ev.title}`);
          }
        }
      });
    }
    setHasOverlap(overlapFound);
  }, [startTime, fixedDuration, schedule, event, selectedDay]);

  useEffect(() => {
    if (event) {
      const [startStr] = event.period.split(" - ");
      const convertedStart = convertTo24(startStr);
      setStartTime(convertedStart);
      setSelectedDay(event.day || "");
      updateFields(convertedStart, event.day || "");
    }
  }, [event, updateFields]);

  useEffect(() => {
    checkForOverlap();
  }, [startTime, selectedDay, checkForOverlap]);

  const handleStartTimeChange = (e) => {
    const newStart = e.target.value;
    setStartTime(newStart);
    updateFields(newStart, selectedDay || event.day);
    setWarningMessage(""); // Clear warning when start time changes
  };

  const handleDayChange = (e) => {
    const newDay = e.target.value;
    setSelectedDay(newDay);
    updateFields(startTime, newDay);
    setWarningMessage(""); // Clear warning when day changes
  };

  const handleSave = () => {
    const selectedRoomRadio = document.querySelector('input[name="override-room"]:checked');
    const newRoom = selectedRoomRadio ? selectedRoomRadio.value : "";
    if (!startTime || !newRoom) {
      setWarningMessage("Please select a start time and a room.");
      return;
    }
    setWarningMessage(""); // Clear warning on successful save attempt
    onSave({
      schedule_id: event.schedule_id,
      new_start: startTime,
      new_room: newRoom,
      new_day: selectedDay || event.day,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="override-modal" onClick={(e) => e.stopPropagation()}>
        <div className="override-header">
          <h3>Manual Adjustment</h3>
        </div>
        <div className="override-content">
          <div className="override-field">
            <label htmlFor="override-day">Select Day:</label>
            <select id="override-day" value={selectedDay} onChange={handleDayChange}>
              <option value="">(Auto)</option>
              <option value="Monday">Monday</option>
              <option value="Tuesday">Tuesday</option>
              <option value="Wednesday">Wednesday</option>
              <option value="Thursday">Thursday</option>
              <option value="Friday">Friday</option>
              <option value="Saturday">Saturday</option>
              <option value="Sunday">Sunday</option>
            </select>
          </div>
          <div className="override-field">
            <label htmlFor="override-start">Start Time:</label>
            <input type="time" id="override-start" value={startTime} onChange={handleStartTimeChange} />
          </div>
          <div className="override-field">
            <label htmlFor="override-end">End Time:</label>
            <input type="time" id="override-end" value={endTime} readOnly />
          </div>
          <div className="override-field">
            <label>Available Rooms:</label>
            <div id="override-room-container">
              {availableRooms.length > 0 ? (
                availableRooms.map((room) => (
                  <label key={room} className="room-label">
                    <input type="radio" name="override-room" value={room} defaultChecked={room === availableRooms[0]} />
                    {room}
                  </label>
                ))
              ) : (
                <span>No rooms available</span>
              )}
            </div>
            {warningMessage && (
              <div className="warning-message" style={{ color: "var(--red)", fontSize: "0.9em", marginTop: "5px" }}>
                {warningMessage}
              </div>
            )}
          </div>
          {hasOverlap && (
            <div className="overlap-warning" style={{ color: "var(--red)", fontSize: "0.9em", marginTop: "10px" }}>
              Warning: The selected time slot overlaps with another event for this program, year, and block. The overlapping events will be marked in red.
            </div>
          )}
        </div>
        <div className="override-actions">
          <button onClick={handleSave}>
            Save Adjustment
          </button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default OverrideModal;
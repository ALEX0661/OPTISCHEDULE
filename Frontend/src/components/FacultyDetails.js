import React from 'react';
import { calculateFacultyUnits } from '../utils/scheduleHelpers';

const FacultyDetails = ({ faculty, schedule, onEdit, onDelete }) => {
  if (!faculty) return null;

  const assignedUnits = calculateFacultyUnits(faculty.name, schedule);

  return (
    <article className="faculty-details-card">
      <header className="faculty-details-header">
        <h2 className="faculty-details-name">{faculty.name}</h2>
        <div className="faculty-actions">
          <button
            className="action-btn edit-faculty-btn"
            onClick={() => onEdit(faculty)}
            title="Edit Faculty"
            aria-label="Edit faculty member"
          >
            <i className="fas fa-edit edit-btn-icon"></i>
          </button>
          <button
            className="action-btn delete-btn"
            onClick={() => onDelete(faculty.id)}
            title="Delete Faculty"
            aria-label="Delete faculty member"
          >
            🗑
          </button>
        </div>
      </header>
      <section className="faculty-info">
        <p>
          <strong>Academic Rank:</strong> {faculty.AcademicRank || "N/A"}
        </p>
        <p>
          <strong>Field of Specialization:</strong> {faculty.specialization || "N/A"}
        </p>
        <p>
          <strong>Department:</strong> {faculty.Department || "N/A"}
        </p>
        <p>
          <strong>Educational Attainment:</strong>{" "}
          {faculty.Educational_attainment || "N/A"}
        </p>
        <p>
          <strong>Sex:</strong> {faculty.Sex || "N/A"}
        </p>
        <p>
          <strong>Status:</strong> {faculty.Status || "N/A"}
        </p>
      </section>
      <footer className="faculty-units">
        <p>
          <strong>Assigned Units:</strong> {assignedUnits}
        </p>
      </footer>
    </article>
  );
};

export default FacultyDetails;
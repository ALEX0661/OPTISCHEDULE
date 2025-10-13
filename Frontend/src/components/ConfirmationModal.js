
import React from 'react';
import '../styles/ConfirmationModal.css';

const ConfirmationModal = ({
  title = 'Please Confirm',
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  type = 'warning' 
}) => {
  return (
    <div className="confirmation-modal-overlay">
      <div className={`confirmation-modal ${type === 'warning' ? 'warning' : ''}`}>
        <h2 className="confirmation-modal-title">{title}</h2>
        <div className="confirmation-modal-message">{message}</div>
        <div className="confirmation-modal-buttons">
          <button className="confirmation-modal-btn confirm" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button className="confirmation-modal-btn cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;

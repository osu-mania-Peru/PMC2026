import { useState } from 'react';
import './TimelineEditModal.css';

export default function TimelineEditModal({ isOpen, onClose, onSave, events, loading }) {
  // Use events directly as source of truth, only track local edits
  const [localEdits, setLocalEdits] = useState({});

  if (!isOpen) return null;

  // Merge events with local edits
  const editedEvents = (events || []).map((event, index) => ({
    ...event,
    ...localEdits[index],
  }));

  const handleChange = (index, field, value) => {
    setLocalEdits(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: value,
      },
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(editedEvents.map(event => ({
      date_range: event.date,
      title: event.title,
    })));
  };

  const handleClose = () => {
    setLocalEdits({});
    onClose();
  };

  return (
    <div className="timeline-modal-overlay" onClick={handleClose}>
      <div className="timeline-modal" onClick={(e) => e.stopPropagation()}>
        <div className="timeline-modal-header">
          <h3>Editar Cronograma</h3>
          <p className="timeline-modal-description">
            Modifica las fechas y títulos de los eventos del torneo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="timeline-modal-content">
          <div className="timeline-events-list">
            {editedEvents.map((event, index) => (
              <div key={event.id} className="timeline-event-row">
                <input
                  type="text"
                  value={event.date}
                  onChange={(e) => handleChange(index, 'date', e.target.value)}
                  className="timeline-input date-input"
                  placeholder="DD/MM - DD/MM"
                  disabled={loading}
                />
                <input
                  type="text"
                  value={event.title}
                  onChange={(e) => handleChange(index, 'title', e.target.value)}
                  className="timeline-input title-input"
                  placeholder="Título del evento"
                  disabled={loading}
                />
              </div>
            ))}
          </div>

          <div className="timeline-modal-buttons">
            <button
              type="submit"
              className="timeline-btn primary"
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            <button
              type="button"
              className="timeline-btn secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

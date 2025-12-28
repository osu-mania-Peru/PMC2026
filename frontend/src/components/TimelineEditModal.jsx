import { useState } from 'react';
import { api } from '../api';
import catGif from '../assets/cat.gif';
import './TimelineEditModal.css';

// Convert DD/MM/YYYY or DD/MM to YYYY-MM-DD for date input
const toInputFormat = (displayDate) => {
  if (!displayDate) return '';
  const parts = displayDate.split('/');
  if (parts.length === 2) {
    // DD/MM format - assume 2026
    const [day, month] = parts;
    return `2026-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  if (parts.length === 3) {
    // DD/MM/YYYY format
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return '';
};

// Convert YYYY-MM-DD to DD/MM/YYYY for display
const toDisplayFormat = (inputDate) => {
  if (!inputDate) return '';
  const parts = inputDate.split('-');
  if (parts.length !== 3) return '';
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

// Parse date range "DD/MM - DD/MM" into { start, end }
const parseDateRange = (dateRange) => {
  if (!dateRange) return { start: '', end: '' };
  const parts = dateRange.split(' - ');
  if (parts.length === 2) {
    return { start: parts[0].trim(), end: parts[1].trim() };
  }
  // Single date
  return { start: dateRange.trim(), end: '' };
};

// Combine start and end into "DD/MM - DD/MM" or "DD/MM"
const combineDateRange = (start, end) => {
  if (!start && !end) return '';
  if (!end || start === end) return start;
  return `${start} - ${end}`;
};

export default function TimelineEditModal({ isOpen, onClose, onSave, events, loading, onRefresh }) {
  const [localEdits, setLocalEdits] = useState({});
  const [deleting, setDeleting] = useState(null);
  const [adding, setAdding] = useState(false);

  if (!isOpen) return null;

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

  const handleDateChange = (index, type, inputValue) => {
    const event = editedEvents[index];
    const { start, end } = parseDateRange(event.date);
    const displayValue = toDisplayFormat(inputValue);

    let newDateRange;
    if (type === 'start') {
      newDateRange = combineDateRange(displayValue, end);
    } else {
      newDateRange = combineDateRange(start, displayValue);
    }

    handleChange(index, 'date', newDateRange);
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

  const handleDelete = async (eventId) => {
    setDeleting(eventId);
    try {
      await api.deleteTimelineEvent(eventId);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete timeline event:', err);
    } finally {
      setDeleting(null);
    }
  };

  const handleAdd = async () => {
    setAdding(true);
    try {
      const today = new Date();
      const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
      await api.addTimelineEvent({ date_range: dateStr, title: 'NUEVO EVENTO' });
      onRefresh();
    } catch (err) {
      console.error('Failed to add timeline event:', err);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="timeline-modal-overlay" onClick={handleClose}>
      <div className="timeline-modal" onClick={(e) => e.stopPropagation()}>
        <div className="timeline-modal-header">
          <h3>Editar Cronograma</h3>
        </div>

        <form onSubmit={handleSubmit} className="timeline-modal-content">
          <div className="timeline-events-list">
            {editedEvents.map((event, index) => {
              const { start, end } = parseDateRange(event.date);
              return (
                <div key={event.id} className="timeline-event-row">
                  <div className="timeline-date-range">
                    <input
                      type="date"
                      value={toInputFormat(start)}
                      onChange={(e) => handleDateChange(index, 'start', e.target.value)}
                      className="timeline-input date-input"
                      disabled={loading || deleting === event.id}
                    />
                    <span className="timeline-date-separator">-</span>
                    <input
                      type="date"
                      value={toInputFormat(end)}
                      onChange={(e) => handleDateChange(index, 'end', e.target.value)}
                      className="timeline-input date-input"
                      disabled={loading || deleting === event.id}
                    />
                  </div>
                  <input
                    type="text"
                    value={event.title}
                    onChange={(e) => handleChange(index, 'title', e.target.value)}
                    className="timeline-input title-input"
                    placeholder="Título del evento"
                    disabled={loading || deleting === event.id}
                  />
                  <button
                    type="button"
                    className="timeline-delete-btn"
                    onClick={() => handleDelete(event.id)}
                    disabled={loading || deleting === event.id}
                  >
                    {deleting === event.id ? (
                      <img src={catGif} alt="" className="btn-loading-cat-small" />
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className="timeline-add-btn"
            onClick={handleAdd}
            disabled={loading || adding}
          >
            {adding ? (
              <><img src={catGif} alt="" className="btn-loading-cat" /> Agregando...</>
            ) : '+ Agregar Evento'}
          </button>

          <div className="timeline-modal-buttons">
            <button
              type="submit"
              className="timeline-btn primary"
              disabled={loading}
            >
              {loading ? (
                <><img src={catGif} alt="" className="btn-loading-cat" /> Guardando...</>
              ) : 'Guardar Cambios'}
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

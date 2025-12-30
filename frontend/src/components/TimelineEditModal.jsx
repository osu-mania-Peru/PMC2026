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

export default function TimelineEditModal({ isOpen, onClose, events, onRefresh }) {
  const [savingId, setSavingId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [adding, setAdding] = useState(false);
  const [editValues, setEditValues] = useState({});

  if (!isOpen) return null;

  const getEditValue = (eventId, field) => {
    const key = `${eventId}-${field}`;
    if (key in editValues) return editValues[key];
    const event = events.find(e => e.id === eventId);
    return event ? event[field] : '';
  };

  const handleChange = (eventId, field, value) => {
    const key = `${eventId}-${field}`;
    setEditValues(prev => ({ ...prev, [key]: value }));
  };

  const handleDateChange = (event, type, inputValue) => {
    const dateKey = `${event.id}-date`;
    const currentDate = dateKey in editValues ? editValues[dateKey] : event.date;
    const { start, end } = parseDateRange(currentDate);
    const displayValue = toDisplayFormat(inputValue);

    let newDateRange;
    if (type === 'start') {
      newDateRange = combineDateRange(displayValue, end);
    } else {
      newDateRange = combineDateRange(start, displayValue);
    }

    handleChange(event.id, 'date', newDateRange);
  };

  const handleBlur = async (event, field) => {
    const key = `${event.id}-${field}`;
    const newValue = editValues[key];

    // No change or no edit made
    if (newValue === undefined || newValue === event[field]) {
      return;
    }

    setSavingId(`${event.id}-${field}`);
    try {
      const updateData = field === 'date' ? { date_range: newValue } : { [field]: newValue };
      await api.updateTimelineEvent(event.id, updateData);
      // Clear the edit value and refresh to get updated data
      setEditValues(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      onRefresh();
    } catch (err) {
      console.error('Failed to update timeline event:', err);
    } finally {
      setSavingId(null);
    }
  };

  const handleClose = () => {
    setEditValues({});
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
          <span className="timeline-modal-hint">Los cambios se guardan automáticamente</span>
        </div>

        <div className="timeline-modal-content">
          <div className="timeline-events-list">
            {(events || []).map((event) => {
              const currentDate = getEditValue(event.id, 'date');
              const { start, end } = parseDateRange(currentDate);
              return (
                <div key={event.id} className="timeline-event-row">
                  <div className="timeline-date-range">
                    <div className="timeline-field-wrapper">
                      <input
                        type="date"
                        value={toInputFormat(start)}
                        onChange={(e) => handleDateChange(event, 'start', e.target.value)}
                        onBlur={() => handleBlur(event, 'date')}
                        className="timeline-input date-input"
                        disabled={deleting === event.id}
                      />
                    </div>
                    <span className="timeline-date-separator">-</span>
                    <div className="timeline-field-wrapper">
                      <input
                        type="date"
                        value={toInputFormat(end)}
                        onChange={(e) => handleDateChange(event, 'end', e.target.value)}
                        onBlur={() => handleBlur(event, 'date')}
                        className="timeline-input date-input"
                        disabled={deleting === event.id}
                      />
                    </div>
                    {savingId === `${event.id}-date` && (
                      <img src={catGif} alt="" className="field-saving-indicator" />
                    )}
                  </div>
                  <div className="timeline-field-wrapper timeline-field-grow">
                    <input
                      type="text"
                      value={getEditValue(event.id, 'title')}
                      onChange={(e) => handleChange(event.id, 'title', e.target.value)}
                      onBlur={() => handleBlur(event, 'title')}
                      className="timeline-input title-input"
                      placeholder="Título del evento"
                      disabled={deleting === event.id}
                    />
                    {savingId === `${event.id}-title` && (
                      <img src={catGif} alt="" className="field-saving-indicator" />
                    )}
                  </div>
                  <button
                    type="button"
                    className="timeline-delete-btn"
                    onClick={() => handleDelete(event.id)}
                    disabled={deleting === event.id}
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
            disabled={adding}
          >
            {adding ? (
              <><img src={catGif} alt="" className="btn-loading-cat" /> Agregando...</>
            ) : '+ Agregar Evento'}
          </button>

          <div className="timeline-modal-buttons">
            <button
              type="button"
              className="timeline-btn secondary"
              onClick={handleClose}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

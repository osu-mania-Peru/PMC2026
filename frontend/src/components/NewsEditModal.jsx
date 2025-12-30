import { useState } from 'react';
import { api } from '../api';
import catGif from '../assets/cat.gif';
import './NewsEditModal.css';

// Convert DD/MM/YYYY to YYYY-MM-DD for date input
const toInputFormat = (displayDate) => {
  if (!displayDate) return '';
  const parts = displayDate.split('/');
  if (parts.length !== 3) return '';
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

// Convert YYYY-MM-DD to DD/MM/YYYY for display
const toDisplayFormat = (inputDate) => {
  if (!inputDate) return '';
  const parts = inputDate.split('-');
  if (parts.length !== 3) return '';
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

export default function NewsEditModal({ isOpen, onClose, items, onRefresh }) {
  const [savingId, setSavingId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [adding, setAdding] = useState(false);
  const [editValues, setEditValues] = useState({});

  if (!isOpen) return null;

  const getEditValue = (itemId, field) => {
    const key = `${itemId}-${field}`;
    if (key in editValues) return editValues[key];
    const item = items.find(i => i.id === itemId);
    return item ? item[field] : '';
  };

  const handleChange = (itemId, field, value) => {
    const key = `${itemId}-${field}`;
    setEditValues(prev => ({ ...prev, [key]: value }));
  };

  const handleBlur = async (item, field) => {
    const key = `${item.id}-${field}`;
    const newValue = editValues[key];

    // No change or no edit made
    if (newValue === undefined || newValue === item[field]) {
      return;
    }

    setSavingId(`${item.id}-${field}`);
    try {
      await api.updateNewsItem(item.id, { [field]: newValue });
      // Clear the edit value and refresh to get updated data
      setEditValues(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      onRefresh();
    } catch (err) {
      console.error('Failed to update news item:', err);
    } finally {
      setSavingId(null);
    }
  };

  const handleClose = () => {
    setEditValues({});
    onClose();
  };

  const handleDelete = async (itemId) => {
    setDeleting(itemId);
    try {
      await api.deleteNewsItem(itemId);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete news item:', err);
    } finally {
      setDeleting(null);
    }
  };

  const handleAdd = async () => {
    setAdding(true);
    try {
      const today = new Date();
      const date = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
      await api.addNewsItem({ date, title: 'Nueva noticia' });
      onRefresh();
    } catch (err) {
      console.error('Failed to add news item:', err);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="news-modal-overlay" onClick={handleClose}>
      <div className="news-modal" onClick={(e) => e.stopPropagation()}>
        <div className="news-modal-header">
          <h3>Editar Noticias</h3>
          <span className="news-modal-hint">Los cambios se guardan automáticamente</span>
        </div>

        <div className="news-modal-content">
          <div className="news-items-list">
            {(items || []).map((item) => (
              <div key={item.id} className="news-item-row">
                <div className="news-field-wrapper">
                  <input
                    type="date"
                    value={toInputFormat(getEditValue(item.id, 'date'))}
                    onChange={(e) => handleChange(item.id, 'date', toDisplayFormat(e.target.value))}
                    onBlur={() => handleBlur(item, 'date')}
                    className="news-input date-input"
                    disabled={deleting === item.id}
                  />
                  {savingId === `${item.id}-date` && (
                    <img src={catGif} alt="" className="field-saving-indicator" />
                  )}
                </div>
                <div className="news-field-wrapper news-field-grow">
                  <input
                    type="text"
                    value={getEditValue(item.id, 'title')}
                    onChange={(e) => handleChange(item.id, 'title', e.target.value)}
                    onBlur={() => handleBlur(item, 'title')}
                    className="news-input title-input"
                    placeholder="Título de la noticia"
                    disabled={deleting === item.id}
                  />
                  {savingId === `${item.id}-title` && (
                    <img src={catGif} alt="" className="field-saving-indicator" />
                  )}
                </div>
                <button
                  type="button"
                  className="news-delete-btn"
                  onClick={() => handleDelete(item.id)}
                  disabled={deleting === item.id}
                >
                  {deleting === item.id ? (
                    <img src={catGif} alt="" className="btn-loading-cat-small" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="news-add-btn"
            onClick={handleAdd}
            disabled={adding}
          >
            {adding ? (
              <><img src={catGif} alt="" className="btn-loading-cat" /> Agregando...</>
            ) : '+ Agregar Noticia'}
          </button>

          <div className="news-modal-buttons">
            <button
              type="button"
              className="news-btn secondary"
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

import { useState } from 'react';
import { api } from '../api';
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

export default function NewsEditModal({ isOpen, onClose, onSave, items, loading, onRefresh }) {
  const [localEdits, setLocalEdits] = useState({});
  const [deleting, setDeleting] = useState(null);
  const [adding, setAdding] = useState(false);

  if (!isOpen) return null;

  const editedItems = (items || []).map((item, index) => ({
    ...item,
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
    onSave(editedItems.map(item => ({
      date: item.date,
      title: item.title,
    })));
  };

  const handleClose = () => {
    setLocalEdits({});
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
        </div>

        <form onSubmit={handleSubmit} className="news-modal-content">
          <div className="news-items-list">
            {editedItems.map((item, index) => (
              <div key={item.id} className="news-item-row">
                <input
                  type="date"
                  value={toInputFormat(item.date)}
                  onChange={(e) => handleChange(index, 'date', toDisplayFormat(e.target.value))}
                  className="news-input date-input"
                  disabled={loading || deleting === item.id}
                />
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => handleChange(index, 'title', e.target.value)}
                  className="news-input title-input"
                  placeholder="Título de la noticia"
                  disabled={loading || deleting === item.id}
                />
                <button
                  type="button"
                  className="news-delete-btn"
                  onClick={() => handleDelete(item.id)}
                  disabled={loading || deleting === item.id}
                >
                  {deleting === item.id ? '...' : (
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
            disabled={loading || adding}
          >
            {adding ? 'Agregando...' : '+ Agregar Noticia'}
          </button>

          <div className="news-modal-buttons">
            <button
              type="submit"
              className="news-btn primary"
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            <button
              type="button"
              className="news-btn secondary"
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

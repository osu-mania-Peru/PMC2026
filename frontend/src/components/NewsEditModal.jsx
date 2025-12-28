import { useState } from 'react';
import './NewsEditModal.css';

export default function NewsEditModal({ isOpen, onClose, onSave, items, loading }) {
  // Use items directly as source of truth, only track local edits
  const [localEdits, setLocalEdits] = useState({});

  if (!isOpen) return null;

  // Merge items with local edits
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
                  type="text"
                  value={item.date}
                  onChange={(e) => handleChange(index, 'date', e.target.value)}
                  className="news-input date-input"
                  placeholder="DD/MM/YYYY"
                  disabled={loading}
                />
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => handleChange(index, 'title', e.target.value)}
                  className="news-input title-input"
                  placeholder="Título de la noticia"
                  disabled={loading}
                />
              </div>
            ))}
          </div>

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

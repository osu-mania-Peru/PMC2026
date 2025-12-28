import { useState, useEffect } from 'react';
import { api } from '../api';
import catGif from '../assets/cat.gif';
import './SlotEditModal.css';

// SVG Icons
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const ChevronUpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="18 15 12 9 6 15"></polyline>
  </svg>
);

const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

export default function SlotEditModal({ isOpen, onClose, onSlotsChange }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSlot, setNewSlot] = useState({ name: '', color: '#3b82f6' });
  const [editingSlot, setEditingSlot] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchSlots();
    }
  }, [isOpen]);

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const data = await api.getSlots();
      setSlots(data);
    } catch (err) {
      console.error('Failed to fetch slots:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
    if (!newSlot.name.trim()) return;

    setSaving(true);
    try {
      const nextOrder = slots.length > 0 ? Math.max(...slots.map(s => s.slot_order)) + 1 : 0;
      await api.createSlot({ ...newSlot, slot_order: nextOrder });
      await fetchSlots();
      setNewSlot({ name: '', color: '#3b82f6' });
      setShowAddForm(false);
      onSlotsChange?.();
    } catch (err) {
      console.error('Failed to create slot:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSlot = async (slot) => {
    setSaving(true);
    try {
      await api.updateSlot(slot.id, { name: slot.name, color: slot.color });
      await fetchSlots();
      setEditingSlot(null);
      onSlotsChange?.();
    } catch (err) {
      console.error('Failed to update slot:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!confirm('¿Eliminar este slot?')) return;

    setSaving(true);
    try {
      await api.deleteSlot(slotId);
      await fetchSlots();
      onSlotsChange?.();
    } catch (err) {
      console.error('Failed to delete slot:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleMoveSlot = async (slotId, direction) => {
    const index = slots.findIndex(s => s.id === slotId);
    if (direction === 'up' && index <= 0) return;
    if (direction === 'down' && index >= slots.length - 1) return;

    setSaving(true);
    try {
      const currentSlot = slots[index];
      const targetSlot = direction === 'up' ? slots[index - 1] : slots[index + 1];

      await api.updateSlot(currentSlot.id, { slot_order: targetSlot.slot_order });
      await api.updateSlot(targetSlot.id, { slot_order: currentSlot.slot_order });
      await fetchSlots();
      onSlotsChange?.();
    } catch (err) {
      console.error('Failed to move slot:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSeedSlots = async () => {
    if (!confirm('¿Crear slots por defecto? Esto solo funciona si no hay slots existentes.')) return;

    setSaving(true);
    try {
      await api.seedSlots();
      await fetchSlots();
      onSlotsChange?.();
    } catch (err) {
      console.error('Failed to seed slots:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="slot-modal-overlay" onClick={onClose}>
      <div className="slot-modal" onClick={(e) => e.stopPropagation()}>
        <div className="slot-modal-header">
          <h3>Editar Slots</h3>
          <button className="slot-close-btn" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="slot-modal-content">
          {loading ? (
            <div className="slot-loading">
              <img src={catGif} alt="Loading" className="loading-cat" />
              <span>Cargando slots...</span>
            </div>
          ) : (
            <>
              {slots.length === 0 ? (
                <div className="slot-empty">
                  <p>No hay slots definidos.</p>
                  <button className="slot-btn slot-btn-primary" onClick={handleSeedSlots} disabled={saving}>
                    {saving ? <img src={catGif} alt="" className="btn-loading-cat" /> : null}
                    Crear Slots por Defecto
                  </button>
                </div>
              ) : (
                <div className="slot-list">
                  {slots.map((slot, index) => (
                    <div key={slot.id} className="slot-item">
                      <div className="slot-order-btns">
                        <button
                          className="slot-order-btn"
                          onClick={() => handleMoveSlot(slot.id, 'up')}
                          disabled={saving || index === 0}
                        >
                          <ChevronUpIcon />
                        </button>
                        <button
                          className="slot-order-btn"
                          onClick={() => handleMoveSlot(slot.id, 'down')}
                          disabled={saving || index === slots.length - 1}
                        >
                          <ChevronDownIcon />
                        </button>
                      </div>

                      {editingSlot?.id === slot.id ? (
                        <div className="slot-edit-form">
                          <input
                            type="text"
                            value={editingSlot.name}
                            onChange={(e) => setEditingSlot({ ...editingSlot, name: e.target.value })}
                            className="slot-input"
                            placeholder="Nombre"
                          />
                          <input
                            type="color"
                            value={editingSlot.color}
                            onChange={(e) => setEditingSlot({ ...editingSlot, color: e.target.value })}
                            className="slot-color-input"
                          />
                          <button
                            className="slot-btn slot-btn-primary slot-btn-sm"
                            onClick={() => handleUpdateSlot(editingSlot)}
                            disabled={saving}
                          >
                            Guardar
                          </button>
                          <button
                            className="slot-btn slot-btn-secondary slot-btn-sm"
                            onClick={() => setEditingSlot(null)}
                            disabled={saving}
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <>
                          <div
                            className="slot-preview"
                            style={{ borderRightColor: slot.color }}
                            onClick={() => setEditingSlot({ ...slot })}
                          >
                            {slot.name}
                          </div>
                          <button
                            className="slot-icon-btn slot-icon-btn-danger"
                            onClick={() => handleDeleteSlot(slot.id)}
                            disabled={saving}
                          >
                            <TrashIcon />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {showAddForm ? (
                <form className="slot-add-form" onSubmit={handleAddSlot}>
                  <input
                    type="text"
                    value={newSlot.name}
                    onChange={(e) => setNewSlot({ ...newSlot, name: e.target.value })}
                    className="slot-input"
                    placeholder="Nombre del slot (ej: NM1, HD1)"
                    autoFocus
                  />
                  <input
                    type="color"
                    value={newSlot.color}
                    onChange={(e) => setNewSlot({ ...newSlot, color: e.target.value })}
                    className="slot-color-input"
                  />
                  <button type="submit" className="slot-btn slot-btn-primary" disabled={saving || !newSlot.name.trim()}>
                    {saving ? <img src={catGif} alt="" className="btn-loading-cat" /> : null}
                    Agregar
                  </button>
                  <button
                    type="button"
                    className="slot-btn slot-btn-secondary"
                    onClick={() => setShowAddForm(false)}
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                </form>
              ) : (
                <button
                  className="slot-add-btn"
                  onClick={() => setShowAddForm(true)}
                  disabled={saving}
                >
                  <PlusIcon /> Agregar Slot
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

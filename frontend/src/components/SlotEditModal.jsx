import { useState, useEffect } from 'react';
import { X, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { api } from '../api';
import catGif from '../assets/cat.gif';
import './SlotEditModal.css';

export default function SlotEditModal({ isOpen, onClose, onSlotsChange }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedSlots, setEditedSlots] = useState({});

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
      setEditedSlots({});
    } catch (err) {
      console.error('Failed to fetch slots:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (slotId, field, value) => {
    setEditedSlots(prev => ({
      ...prev,
      [slotId]: {
        ...prev[slotId],
        [field]: value
      }
    }));
  };

  const getSlotValue = (slot, field) => {
    if (editedSlots[slot.id] && editedSlots[slot.id][field] !== undefined) {
      return editedSlots[slot.id][field];
    }
    return slot[field];
  };

  const handleBlur = async (slot, field) => {
    const newValue = editedSlots[slot.id]?.[field];
    if (newValue === undefined || newValue === slot[field]) return;

    setSaving(true);
    try {
      await api.updateSlot(slot.id, { [field]: newValue });
      await fetchSlots();
      onSlotsChange?.();
    } catch (err) {
      console.error('Failed to update slot:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSlot = async (afterIndex = -1) => {
    setSaving(true);
    try {
      const newOrder = afterIndex >= 0 ? afterIndex + 1 : slots.length;

      // Shift orders of slots after the insertion point
      if (afterIndex >= 0 && afterIndex < slots.length - 1) {
        for (let i = slots.length - 1; i > afterIndex; i--) {
          await api.updateSlot(slots[i].id, { slot_order: slots[i].slot_order + 1 });
        }
      }

      await api.createSlot({
        name: `SLOT${slots.length + 1}`,
        color: '#3b82f6',
        slot_order: newOrder
      });
      await fetchSlots();
      onSlotsChange?.();
    } catch (err) {
      console.error('Failed to create slot:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
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
            <X size={20} />
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
                  <div className="slot-empty-actions">
                    <button className="slot-btn slot-btn-primary" onClick={handleSeedSlots} disabled={saving}>
                      {saving ? <img src={catGif} alt="" className="btn-loading-cat" /> : null}
                      Crear Slots por Defecto
                    </button>
                    <button className="slot-btn slot-btn-secondary" onClick={() => handleAddSlot(-1)} disabled={saving}>
                      <Plus size={18} /> Agregar Slot Vacío
                    </button>
                  </div>
                </div>
              ) : (
                <div className="slot-table">
                  <div className="slot-table-header">
                    <div className="slot-col-actions"></div>
                    <div className="slot-col-order"></div>
                    <div className="slot-col-name">Nombre</div>
                    <div className="slot-col-color">Color</div>
                    <div className="slot-col-preview">Preview</div>
                    <div className="slot-col-delete"></div>
                  </div>

                  {slots.map((slot, index) => (
                    <div key={slot.id} className="slot-table-row">
                      <div className="slot-col-actions">
                        <button
                          className="slot-row-btn slot-row-btn-add"
                          onClick={() => handleAddSlot(index)}
                          disabled={saving}
                          title="Insertar slot después"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div className="slot-col-order">
                        <div className="slot-order-btns">
                          <button
                            className="slot-order-btn"
                            onClick={() => handleMoveSlot(slot.id, 'up')}
                            disabled={saving || index === 0}
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            className="slot-order-btn"
                            onClick={() => handleMoveSlot(slot.id, 'down')}
                            disabled={saving || index === slots.length - 1}
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="slot-col-name">
                        <input
                          type="text"
                          value={getSlotValue(slot, 'name')}
                          onChange={(e) => handleFieldChange(slot.id, 'name', e.target.value)}
                          onBlur={() => handleBlur(slot, 'name')}
                          className="slot-table-input"
                          disabled={saving}
                        />
                      </div>

                      <div className="slot-col-color">
                        <input
                          type="color"
                          value={getSlotValue(slot, 'color')}
                          onChange={(e) => handleFieldChange(slot.id, 'color', e.target.value)}
                          onBlur={() => handleBlur(slot, 'color')}
                          className="slot-table-color"
                          disabled={saving}
                        />
                      </div>

                      <div className="slot-col-preview">
                        <div
                          className="slot-preview-badge"
                          style={{ borderRightColor: getSlotValue(slot, 'color') }}
                        >
                          {getSlotValue(slot, 'name')}
                        </div>
                      </div>

                      <div className="slot-col-delete">
                        <button
                          className="slot-row-btn slot-row-btn-delete"
                          onClick={() => handleDeleteSlot(slot.id)}
                          disabled={saving}
                          title="Eliminar slot"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="slot-table-footer">
                    <button
                      className="slot-add-row-btn"
                      onClick={() => handleAddSlot(slots.length - 1)}
                      disabled={saving}
                    >
                      <Plus size={18} /> Agregar Slot
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

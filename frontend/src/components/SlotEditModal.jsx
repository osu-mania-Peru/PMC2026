import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, ChevronUp, ChevronDown, Copy, ClipboardPaste } from 'lucide-react';
import { api } from '../api';
import catGif from '../assets/cat.gif';
import './SlotEditModal.css';

export default function SlotEditModal({ isOpen, onClose, onSlotsChange }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedSlots, setEditedSlots] = useState({});
  const [copyFeedback, setCopyFeedback] = useState(null);
  const [hasClipboard, setHasClipboard] = useState(false);
  const colorDebounceRef = useRef({});

  useEffect(() => {
    if (isOpen) {
      fetchSlots();
      setHasClipboard(!!localStorage.getItem('pmc_slot_clipboard'));
    } else {
      // Clear any pending debounced saves when modal closes
      Object.values(colorDebounceRef.current).forEach(clearTimeout);
      colorDebounceRef.current = {};
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(colorDebounceRef.current).forEach(clearTimeout);
    };
  }, []);

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const data = await api.getSlots();
      // Sort by slot_order to ensure correct ordering
      const sorted = [...data].sort((a, b) => a.slot_order - b.slot_order);
      setSlots(sorted);
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

  const handleKeyDown = (e, slot, field) => {
    if (e.key === 'Enter') {
      e.target.blur(); // This triggers handleBlur which saves
    }
  };

  const handleColorChange = (slot, newColor) => {
    // Update local state for immediate visual feedback
    handleFieldChange(slot.id, 'color', newColor);

    // Also update the slots array directly so preview updates
    setSlots(prev => prev.map(s =>
      s.id === slot.id ? { ...s, color: newColor } : s
    ));

    // Debounce the API save to avoid spamming during drag
    if (colorDebounceRef.current[slot.id]) {
      clearTimeout(colorDebounceRef.current[slot.id]);
    }

    colorDebounceRef.current[slot.id] = setTimeout(async () => {
      try {
        await api.updateSlot(slot.id, { color: newColor });
        onSlotsChange?.();
      } catch (err) {
        console.error('Failed to update slot color:', err);
      }
    }, 300);
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
      // Create new order by swapping positions in array
      const newSlots = [...slots];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newSlots[index], newSlots[targetIndex]] = [newSlots[targetIndex], newSlots[index]];

      // Update all slots with new sequential order values
      for (let i = 0; i < newSlots.length; i++) {
        if (newSlots[i].slot_order !== i) {
          await api.updateSlot(newSlots[i].id, { slot_order: i });
        }
      }

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

  const handleCopySlot = async (slot) => {
    const data = { name: slot.name, color: slot.color };
    const json = JSON.stringify(data);
    localStorage.setItem('pmc_slot_clipboard', json);
    setHasClipboard(true);
    try { await navigator.clipboard.writeText(json); } catch {}
    setCopyFeedback('Slot copiado');
    setTimeout(() => setCopyFeedback(null), 1500);
  };

  const handleCopyAll = async () => {
    const data = slots.map(s => ({ name: s.name, color: s.color }));
    const json = JSON.stringify(data, null, 2);
    localStorage.setItem('pmc_slot_clipboard', json);
    setHasClipboard(true);
    try { await navigator.clipboard.writeText(json); } catch {}
    setCopyFeedback('Todos los slots copiados');
    setTimeout(() => setCopyFeedback(null), 1500);
  };

  const handlePaste = async () => {
    const text = localStorage.getItem('pmc_slot_clipboard');
    if (!text) {
      setCopyFeedback('Nada que pegar');
      setTimeout(() => setCopyFeedback(null), 1500);
      return;
    }

    setSaving(true);
    try {
      const parsed = JSON.parse(text);
      const slotsToAdd = Array.isArray(parsed) ? parsed : [parsed];
      let addedCount = 0;

      for (let i = 0; i < slotsToAdd.length; i++) {
        const slot = slotsToAdd[i];
        if (slot.name && slot.color) {
          let name = slot.name;
          let counter = 1;
          const existingNames = [...slots.map(s => s.name)];
          while (existingNames.includes(name)) {
            name = `${slot.name}_${counter}`;
            counter++;
          }
          existingNames.push(name);
          await api.createSlot({
            name,
            color: slot.color,
            slot_order: slots.length + i
          });
          addedCount++;
        }
      }
      await fetchSlots();
      onSlotsChange?.();
      setCopyFeedback(`${addedCount} slot(s) pegado(s)`);
      setTimeout(() => setCopyFeedback(null), 1500);
    } catch (err) {
      console.error('Failed to paste slots:', err);
      setCopyFeedback('Error al pegar');
      setTimeout(() => setCopyFeedback(null), 1500);
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
          <div className="slot-header-actions">
            <button
              className="slot-header-btn"
              onClick={handleCopyAll}
              disabled={saving || slots.length === 0}
              title="Copiar todos los slots"
            >
              <Copy size={16} /> Copiar Todos
            </button>
            <button
              className="slot-header-btn"
              onClick={handlePaste}
              disabled={saving || !hasClipboard}
              title="Pegar slots desde portapapeles"
            >
              <ClipboardPaste size={16} /> Pegar Todos
            </button>
            <button className="slot-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          {copyFeedback && <div className="slot-copy-feedback">{copyFeedback}</div>}
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

                  {slots.map((slot, index) => (
                    <div key={slot.id} className="slot-table-row">
                      <div className="slot-col-actions">
                        <button
                          className="slot-row-btn-text slot-row-btn-add"
                          onClick={() => handleAddSlot(index)}
                          disabled={saving}
                          title="Insertar slot después"
                        >
                          <Plus size={12} /> Añadir
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
                          onKeyDown={(e) => handleKeyDown(e, slot, 'name')}
                          onBlur={() => handleBlur(slot, 'name')}
                          className="slot-table-input"
                          disabled={saving}
                        />
                      </div>

                      <div className="slot-col-color">
                        <input
                          type="color"
                          value={getSlotValue(slot, 'color')}
                          onChange={(e) => handleColorChange(slot, e.target.value)}
                          className="slot-table-color"
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

                      <div className="slot-col-actions-end">
                        <button
                          className="slot-row-btn-text slot-row-btn-copy"
                          onClick={() => handleCopySlot(slot)}
                          disabled={saving}
                          title="Copiar slot"
                        >
                          <Copy size={14} /> Copiar
                        </button>
                        <button
                          className="slot-row-btn-text slot-row-btn-delete"
                          onClick={() => handleDeleteSlot(slot.id)}
                          disabled={saving}
                          title="Eliminar slot"
                        >
                          <Trash2 size={14} /> Borrar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {slots.length > 0 && (
          <div className="slot-modal-footer">
            <button
              className="slot-add-row-btn"
              onClick={() => handleAddSlot(slots.length - 1)}
              disabled={saving}
            >
              {saving ? <img src={catGif} alt="" className="btn-loading-cat" /> : <Plus size={18} />}
              Agregar Slot
            </button>
            {hasClipboard && (
              <button
                className="slot-add-row-btn slot-paste-row-btn"
                onClick={handlePaste}
                disabled={saving}
              >
                <ClipboardPaste size={18} />
                Pegar Slot Copiado
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

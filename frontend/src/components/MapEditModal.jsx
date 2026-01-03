import { useState } from 'react';
import catGif from '../assets/cat.gif';
import './MapEditModal.css';

// SVG Icons
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const PencilIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
  </svg>
);

export default function MapEditModal({ isOpen, map, onSave, onClose, slots, onEditSlots }) {
  const [formData, setFormData] = useState(null);
  const [saving, setSaving] = useState(false);

  // Initialize form data when map changes
  if (isOpen && map && !formData) {
    setFormData({
      slot: map.slot,
      beatmap_id: map.beatmap_id,
      artist: map.artist,
      title: map.title,
      difficulty_name: map.difficulty_name,
      mapper: map.mapper,
      star_rating: map.star_rating,
      bpm: map.bpm,
      length_seconds: map.length_seconds,
      od: map.od,
      hp: map.hp,
      ln_percent: map.ln_percent || '0',
      is_custom_map: map.is_custom_map || false,
      is_custom_song: map.is_custom_song || false,
    });
  }

  if (!isOpen || !map) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData || !formData.beatmap_id || !formData.title) {
      console.warn('MapEditModal: validation failed', { formData });
      return;
    }
    setSaving(true);
    try {
      await onSave(map.id, formData);
      setFormData(null);
    } catch (err) {
      console.error('Failed to save map:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFormData(null);
    onClose();
  };

  if (!formData) return null;

  return (
    <div className="map-edit-modal-overlay" onClick={handleClose}>
      <div className="map-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="map-edit-modal-header">
          <h3>Editar Mapa</h3>
          <button className="map-edit-close-btn" onClick={handleClose}>
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="map-edit-modal-content">
          {/* Banner Preview */}
          {map.banner_url && (
            <div className="map-edit-preview">
              <img src={map.banner_url} alt="Map banner" />
            </div>
          )}

          {/* Row 1: Slot + Beatmap ID */}
          <div className="map-edit-row">
            <div className="map-edit-field">
              <label className="map-edit-label">
                Slot
                <button type="button" className="slot-edit-pencil" onClick={onEditSlots} title="Editar slots">
                  <PencilIcon />
                </button>
              </label>
              <select
                value={formData.slot}
                onChange={(e) => handleChange('slot', e.target.value)}
                className="map-edit-input"
                disabled={saving}
              >
                {slots && slots.length > 0 ? (
                  slots.map((slot) => (
                    <option key={slot.id} value={slot.name}>{slot.name}</option>
                  ))
                ) : (
                  <>
                    <option value="NM1">NM1</option>
                    <option value="NM2">NM2</option>
                    <option value="NM3">NM3</option>
                    <option value="NM4">NM4</option>
                    <option value="HD1">HD1</option>
                    <option value="HD2">HD2</option>
                    <option value="HR1">HR1</option>
                    <option value="HR2">HR2</option>
                    <option value="DT1">DT1</option>
                    <option value="DT2">DT2</option>
                    <option value="FM1">FM1</option>
                    <option value="FM2">FM2</option>
                    <option value="TB">TB</option>
                  </>
                )}
              </select>
            </div>
            <div className="map-edit-field map-edit-field-grow">
              <label className="map-edit-label">Beatmap ID</label>
              <input
                type="text"
                value={formData.beatmap_id}
                className="map-edit-input"
                disabled
              />
            </div>
          </div>

          {/* Row 2: Artist + Title */}
          <div className="map-edit-row">
            <div className="map-edit-field">
              <label className="map-edit-label">Artista</label>
              <input
                type="text"
                value={formData.artist}
                onChange={(e) => handleChange('artist', e.target.value)}
                className="map-edit-input"
                disabled={saving}
              />
            </div>
            <div className="map-edit-field">
              <label className="map-edit-label">Título</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="map-edit-input"
                disabled={saving}
              />
            </div>
          </div>

          {/* Row 3: Difficulty + Mapper */}
          <div className="map-edit-row">
            <div className="map-edit-field">
              <label className="map-edit-label">Dificultad</label>
              <input
                type="text"
                value={formData.difficulty_name}
                onChange={(e) => handleChange('difficulty_name', e.target.value)}
                className="map-edit-input"
                disabled={saving}
              />
            </div>
            <div className="map-edit-field">
              <label className="map-edit-label">Mapper</label>
              <input
                type="text"
                value={formData.mapper}
                onChange={(e) => handleChange('mapper', e.target.value)}
                className="map-edit-input"
                disabled={saving}
              />
            </div>
          </div>

          {/* Row 4: SR, BPM, Length */}
          <div className="map-edit-row map-edit-row-stats">
            <div className="map-edit-field">
              <label className="map-edit-label">SR</label>
              <input
                type="number"
                step="0.01"
                value={formData.star_rating}
                onChange={(e) => handleChange('star_rating', parseFloat(e.target.value) || 0)}
                className="map-edit-input"
                disabled={saving}
              />
            </div>
            <div className="map-edit-field">
              <label className="map-edit-label">BPM</label>
              <input
                type="number"
                value={formData.bpm}
                onChange={(e) => handleChange('bpm', parseInt(e.target.value) || 0)}
                className="map-edit-input"
                disabled={saving}
              />
            </div>
            <div className="map-edit-field">
              <label className="map-edit-label">Tiempo (s)</label>
              <input
                type="number"
                value={formData.length_seconds}
                onChange={(e) => handleChange('length_seconds', parseInt(e.target.value) || 0)}
                className="map-edit-input"
                disabled={saving}
              />
            </div>
          </div>

          {/* Row 5: OD, HP, LN% */}
          <div className="map-edit-row map-edit-row-stats">
            <div className="map-edit-field">
              <label className="map-edit-label">OD</label>
              <input
                type="number"
                step="0.1"
                value={formData.od}
                onChange={(e) => handleChange('od', parseFloat(e.target.value) || 0)}
                className="map-edit-input"
                disabled={saving}
              />
            </div>
            <div className="map-edit-field">
              <label className="map-edit-label">HP</label>
              <input
                type="number"
                step="0.1"
                value={formData.hp}
                onChange={(e) => handleChange('hp', parseFloat(e.target.value) || 0)}
                className="map-edit-input"
                disabled={saving}
              />
            </div>
            <div className="map-edit-field">
              <label className="map-edit-label">LN%</label>
              <input
                type="text"
                value={formData.ln_percent}
                onChange={(e) => handleChange('ln_percent', e.target.value)}
                className="map-edit-input"
                disabled={saving}
              />
            </div>
          </div>

          {/* Row 6: Checkboxes */}
          <div className="map-edit-row map-edit-row-checkboxes">
            <label className="map-edit-checkbox">
              <input
                type="checkbox"
                checked={formData.is_custom_map}
                onChange={(e) => handleChange('is_custom_map', e.target.checked)}
                disabled={saving}
              />
              Custom Map
            </label>
            <label className="map-edit-checkbox">
              <input
                type="checkbox"
                checked={formData.is_custom_song}
                onChange={(e) => handleChange('is_custom_song', e.target.checked)}
                disabled={saving}
              />
              Custom Song
            </label>
          </div>

          {/* Actions */}
          <div className="map-edit-actions">
            <button type="submit" className="map-edit-btn map-edit-btn-primary" disabled={saving}>
              {saving ? (
                <><img src={catGif} alt="" className="btn-loading-cat" /> Guardando...</>
              ) : 'Guardar Cambios'}
            </button>
            <button type="button" className="map-edit-btn map-edit-btn-secondary" onClick={handleClose} disabled={saving}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

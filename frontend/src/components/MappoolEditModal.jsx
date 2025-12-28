import { useState } from 'react';
import { api } from '../api';
import './MappoolEditModal.css';

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

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

// Add Pool Form
function AddPoolForm({ onAdd, onCancel, loading }) {
  const [stageName, setStageName] = useState('');
  const [stageOrder, setStageOrder] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stageName.trim()) return;
    await onAdd({ stage_name: stageName, stage_order: stageOrder });
    setStageName('');
    setStageOrder(0);
  };

  return (
    <form className="add-pool-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Nombre del Stage</label>
        <input
          type="text"
          value={stageName}
          onChange={(e) => setStageName(e.target.value)}
          placeholder="Ej: Quarterfinals, Round of 16, Qualifiers..."
          className="mpm-input"
          disabled={loading}
        />
      </div>
      <div className="form-group">
        <label className="form-label">Orden (menor = aparece primero)</label>
        <input
          type="number"
          value={stageOrder}
          onChange={(e) => setStageOrder(parseInt(e.target.value) || 0)}
          placeholder="0"
          className="mpm-input"
          disabled={loading}
        />
      </div>
      <div className="form-actions">
        <button type="submit" className="mpm-btn mpm-btn-primary" disabled={loading || !stageName.trim()}>
          Agregar Pool
        </button>
        <button type="button" className="mpm-btn mpm-btn-secondary" onClick={onCancel} disabled={loading}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

// Add Map Form
function AddMapForm({ poolId, onAdd, onCancel, loading }) {
  const [formData, setFormData] = useState({
    slot: 'NM1',
    slot_order: 0,
    beatmap_id: '',
    artist: '',
    title: '',
    difficulty_name: '',
    star_rating: 0,
    bpm: 0,
    length_seconds: 0,
    od: 0,
    hp: 0,
    ln_percent: 0,
    mapper: '',
    is_custom_map: false,
    is_custom_song: false,
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.beatmap_id || !formData.title) return;
    await onAdd(poolId, formData);
  };

  return (
    <form className="add-map-form" onSubmit={handleSubmit}>
      <div className="map-form-row">
        <select
          value={formData.slot}
          onChange={(e) => handleChange('slot', e.target.value)}
          className="mpm-input mpm-input-small"
          disabled={loading}
        >
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
        </select>
        <input
          type="text"
          value={formData.beatmap_id}
          onChange={(e) => handleChange('beatmap_id', e.target.value)}
          placeholder="Beatmap ID"
          className="mpm-input"
          disabled={loading}
        />
      </div>
      <div className="map-form-row">
        <input
          type="text"
          value={formData.artist}
          onChange={(e) => handleChange('artist', e.target.value)}
          placeholder="Artista"
          className="mpm-input"
          disabled={loading}
        />
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Título"
          className="mpm-input"
          disabled={loading}
        />
      </div>
      <div className="map-form-row">
        <input
          type="text"
          value={formData.difficulty_name}
          onChange={(e) => handleChange('difficulty_name', e.target.value)}
          placeholder="Dificultad"
          className="mpm-input"
          disabled={loading}
        />
        <input
          type="text"
          value={formData.mapper}
          onChange={(e) => handleChange('mapper', e.target.value)}
          placeholder="Mapper"
          className="mpm-input"
          disabled={loading}
        />
      </div>
      <div className="map-form-row">
        <input
          type="number"
          step="0.01"
          value={formData.star_rating}
          onChange={(e) => handleChange('star_rating', parseFloat(e.target.value) || 0)}
          placeholder="SR"
          className="mpm-input mpm-input-small"
          disabled={loading}
        />
        <input
          type="number"
          value={formData.bpm}
          onChange={(e) => handleChange('bpm', parseInt(e.target.value) || 0)}
          placeholder="BPM"
          className="mpm-input mpm-input-small"
          disabled={loading}
        />
        <input
          type="number"
          value={formData.length_seconds}
          onChange={(e) => handleChange('length_seconds', parseInt(e.target.value) || 0)}
          placeholder="Duración (seg)"
          className="mpm-input mpm-input-small"
          disabled={loading}
        />
      </div>
      <div className="map-form-row">
        <input
          type="number"
          step="0.1"
          value={formData.od}
          onChange={(e) => handleChange('od', parseFloat(e.target.value) || 0)}
          placeholder="OD"
          className="mpm-input mpm-input-small"
          disabled={loading}
        />
        <input
          type="number"
          step="0.1"
          value={formData.hp}
          onChange={(e) => handleChange('hp', parseFloat(e.target.value) || 0)}
          placeholder="HP"
          className="mpm-input mpm-input-small"
          disabled={loading}
        />
        <input
          type="number"
          value={formData.ln_percent}
          onChange={(e) => handleChange('ln_percent', parseInt(e.target.value) || 0)}
          placeholder="LN%"
          className="mpm-input mpm-input-small"
          disabled={loading}
        />
      </div>
      <div className="map-form-row">
        <label className="mpm-checkbox">
          <input
            type="checkbox"
            checked={formData.is_custom_map}
            onChange={(e) => handleChange('is_custom_map', e.target.checked)}
            disabled={loading}
          />
          Custom Map
        </label>
        <label className="mpm-checkbox">
          <input
            type="checkbox"
            checked={formData.is_custom_song}
            onChange={(e) => handleChange('is_custom_song', e.target.checked)}
            disabled={loading}
          />
          Custom Song
        </label>
      </div>
      <div className="map-form-actions">
        <button type="submit" className="mpm-btn mpm-btn-primary" disabled={loading}>
          Agregar Mapa
        </button>
        <button type="button" className="mpm-btn mpm-btn-secondary" onClick={onCancel} disabled={loading}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

// Pool Item Component
function PoolItem({ pool, onDelete, onAddMap, onDeleteMap, loading }) {
  const [showAddMap, setShowAddMap] = useState(false);
  const [deletingMap, setDeletingMap] = useState(null);

  const handleAddMap = async (poolId, mapData) => {
    await onAddMap(poolId, mapData);
    setShowAddMap(false);
  };

  const handleDeleteMap = async (mapId) => {
    setDeletingMap(mapId);
    await onDeleteMap(mapId);
    setDeletingMap(null);
  };

  return (
    <div className="mpm-pool-item">
      <div className="mpm-pool-header">
        <span className="mpm-pool-name">{pool.stage_name}</span>
        <span className="mpm-pool-count">{pool.map_count} maps</span>
        <button
          className="mpm-icon-btn mpm-icon-btn-danger"
          onClick={() => onDelete(pool.id)}
          disabled={loading}
          title="Eliminar pool"
        >
          <TrashIcon />
        </button>
      </div>

      {pool.maps && pool.maps.length > 0 && (
        <div className="mpm-maps-list">
          {pool.maps.map((map) => (
            <div key={map.id} className="mpm-map-item">
              <span className="mpm-map-slot">{map.slot}</span>
              <span className="mpm-map-title">{map.artist} - {map.title}</span>
              <button
                className="mpm-icon-btn mpm-icon-btn-danger"
                onClick={() => handleDeleteMap(map.id)}
                disabled={loading || deletingMap === map.id}
                title="Eliminar mapa"
              >
                {deletingMap === map.id ? '...' : <TrashIcon />}
              </button>
            </div>
          ))}
        </div>
      )}

      {showAddMap ? (
        <AddMapForm
          poolId={pool.id}
          onAdd={handleAddMap}
          onCancel={() => setShowAddMap(false)}
          loading={loading}
        />
      ) : (
        <button
          className="mpm-add-map-btn"
          onClick={() => setShowAddMap(true)}
          disabled={loading}
        >
          <PlusIcon /> Agregar Mapa
        </button>
      )}
    </div>
  );
}

export default function MappoolEditModal({ isOpen, onClose, pools, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [showAddPool, setShowAddPool] = useState(false);
  const [deletingPool, setDeletingPool] = useState(null);

  if (!isOpen) return null;

  const handleAddPool = async (data) => {
    setLoading(true);
    try {
      await api.createMappool(data);
      onRefresh();
      setShowAddPool(false);
    } catch (err) {
      console.error('Failed to create mappool:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePool = async (poolId) => {
    if (!confirm('¿Eliminar este pool y todos sus mapas?')) return;
    setDeletingPool(poolId);
    try {
      await api.deleteMappool(poolId);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete mappool:', err);
    } finally {
      setDeletingPool(null);
    }
  };

  const handleAddMap = async (poolId, mapData) => {
    setLoading(true);
    try {
      await api.addMapToPool(poolId, mapData);
      onRefresh();
    } catch (err) {
      console.error('Failed to add map:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMap = async (mapId) => {
    try {
      await api.deletePoolMap(mapId);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete map:', err);
    }
  };

  const handleClose = () => {
    setShowAddPool(false);
    onClose();
  };

  return (
    <div className="mpm-overlay" onClick={handleClose}>
      <div className="mpm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mpm-header">
          <h3>Editar Mappools</h3>
          <button className="mpm-close-btn" onClick={handleClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="mpm-content">
          {pools.length === 0 && !showAddPool ? (
            <p className="mpm-empty">No hay mappools. Agrega uno para comenzar.</p>
          ) : (
            <div className="mpm-pools-list">
              {pools.map((pool) => (
                <PoolItem
                  key={pool.id}
                  pool={pool}
                  onDelete={handleDeletePool}
                  onAddMap={handleAddMap}
                  onDeleteMap={handleDeleteMap}
                  loading={loading || deletingPool === pool.id}
                />
              ))}
            </div>
          )}

          {showAddPool ? (
            <AddPoolForm
              onAdd={handleAddPool}
              onCancel={() => setShowAddPool(false)}
              loading={loading}
            />
          ) : (
            <button
              className="mpm-add-pool-btn"
              onClick={() => setShowAddPool(true)}
              disabled={loading}
            >
              <PlusIcon /> Agregar Pool
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

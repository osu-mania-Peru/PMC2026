import { useState, useEffect } from 'react';
import { api } from '../api';
import catGif from '../assets/cat.gif';
import SlotEditModal from './SlotEditModal';
import MapEditModal from './MapEditModal';
import { useMappoolStore } from '../stores/mappoolStore';
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

// Arrow Icons
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

// Add Pool Form
function AddPoolForm({ onAdd, onCancel, loading, nextOrder }) {
  const [stageName, setStageName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stageName.trim()) return;
    await onAdd({ stage_name: stageName, stage_order: nextOrder });
    setStageName('');
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
          autoFocus
        />
      </div>
      <div className="form-actions">
        <button type="submit" className="mpm-btn mpm-btn-primary" disabled={loading || !stageName.trim()}>
          {loading ? (
            <><img src={catGif} alt="" className="btn-loading-cat" /> Agregando...</>
          ) : 'Agregar Pool'}
        </button>
        <button type="button" className="mpm-btn mpm-btn-secondary" onClick={onCancel} disabled={loading}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

// Pencil Icon for slot editing
const PencilIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
  </svg>
);

// Add Map Form
function AddMapForm({ poolId, onAdd, onCancel, loading, slots, onEditSlots }) {
  const {
    addMapDraft,
    addMapPoolId,
    addMapStage,
    beatmapsetData: storedBeatmapset,
    setAddMapDraft,
    clearAddMapDraft,
  } = useMappoolStore();

  // Restore from store if we have a draft for this pool
  const hasDraft = addMapPoolId === poolId && addMapDraft !== null;

  const [urlInput, setUrlInput] = useState('');
  const [beatmapsetData, setBeatmapsetData] = useState(hasDraft ? storedBeatmapset : null);
  const [formData, setFormData] = useState(hasDraft ? addMapDraft : null);
  const [bannerUrl, setBannerUrl] = useState(hasDraft && addMapDraft ? addMapDraft.banner_url : null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Save draft when formData changes
  useEffect(() => {
    if (formData) {
      setAddMapDraft(poolId, formData, 'form', beatmapsetData);
    }
  }, [formData, poolId, beatmapsetData, setAddMapDraft]);

  // Parse URL to extract beatmapset ID and optional beatmap ID
  const parseOsuUrl = (input) => {
    if (!input) return null;

    // Format: https://osu.ppy.sh/beatmapsets/2478095#mania/5435290
    const fullMatch = input.match(/beatmapsets\/(\d+)(?:#\w+\/(\d+))?/);
    if (fullMatch) {
      return {
        beatmapsetId: fullMatch[1],
        beatmapId: fullMatch[2] || null,
      };
    }

    // Format: https://osu.ppy.sh/beatmaps/5435290
    const beatmapMatch = input.match(/beatmaps\/(\d+)/);
    if (beatmapMatch) {
      return { beatmapsetId: null, beatmapId: beatmapMatch[1] };
    }

    // Just a number - assume it's a beatmapset ID
    const numMatch = input.match(/^(\d+)$/);
    if (numMatch) {
      return { beatmapsetId: numMatch[1], beatmapId: null };
    }

    return null;
  };

  const handleUrlChange = async (value) => {
    setUrlInput(value);
    setFetchError(null);

    const parsed = parseOsuUrl(value);
    if (!parsed) return;

    // If we have a specific beatmap ID from URL, fetch just that
    if (parsed.beatmapId) {
      await fetchBeatmap(parsed.beatmapId);
    } else if (parsed.beatmapsetId && parsed.beatmapsetId.length >= 4) {
      // Otherwise fetch the beatmapset to show all difficulties
      await fetchBeatmapset(parsed.beatmapsetId);
    }
  };

  const fetchBeatmapset = async (beatmapsetId) => {
    setFetching(true);
    setFetchError(null);

    try {
      const data = await api.lookupBeatmapset(beatmapsetId);
      setBeatmapsetData(data);
      setBannerUrl(data.banner_url);
    } catch (err) {
      setFetchError('Beatmapset no encontrado');
      setBeatmapsetData(null);
      setBannerUrl(null);
    } finally {
      setFetching(false);
    }
  };

  const getDefaultSlot = () => slots && slots.length > 0 ? slots[0].name : 'NM1';

  const fetchBeatmap = async (beatmapId) => {
    setFetching(true);
    setFetchError(null);

    try {
      const data = await api.lookupBeatmap(beatmapId);
      setBannerUrl(data.banner_url);
      setFormData({
        slot: getDefaultSlot(),
        slot_order: 0,
        beatmap_id: beatmapId,
        artist: data.artist,
        title: data.title,
        difficulty_name: data.difficulty_name,
        mapper: data.mapper,
        star_rating: data.star_rating,
        bpm: data.bpm,
        length_seconds: data.length_seconds,
        od: data.od,
        hp: data.hp,
        ln_percent: '0',
        is_custom_map: false,
        is_custom_song: false,
        banner_url: data.banner_url,
      });
    } catch (err) {
      setFetchError('Beatmap no encontrado');
      setFormData(null);
      setBannerUrl(null);
    } finally {
      setFetching(false);
    }
  };

  const selectDifficulty = (beatmap) => {
    setFormData({
      slot: getDefaultSlot(),
      slot_order: 0,
      beatmap_id: beatmap.beatmap_id,
      artist: beatmapsetData.artist,
      title: beatmapsetData.title,
      difficulty_name: beatmap.difficulty_name,
      mapper: beatmapsetData.mapper,
      star_rating: beatmap.star_rating,
      bpm: beatmap.bpm,
      length_seconds: beatmap.length_seconds,
      od: beatmap.od,
      hp: beatmap.hp,
      ln_percent: '0',
      is_custom_map: false,
      is_custom_song: false,
      banner_url: beatmapsetData.banner_url,
    });
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData || !formData.beatmap_id || !formData.title) return;
    await onAdd(poolId, formData);
    clearAddMapDraft();
  };

  const handleBack = () => {
    setFormData(null);
    setBeatmapsetData(null);
    setBannerUrl(null);
    setUrlInput('');
    clearAddMapDraft();
  };

  const handleCancel = () => {
    clearAddMapDraft();
    onCancel();
  };

  // Stage 1: URL Input
  if (!formData && !beatmapsetData) {
    return (
      <div className="add-map-form">
        {fetching ? (
          <div className="map-fetch-status">
            <img src={catGif} alt="Loading" className="loading-cat" />
            <span>Buscando beatmap...</span>
          </div>
        ) : (
          <>
            <div className="mpm-field">
              <label className="mpm-field-label">URL o ID del Beatmap</label>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="Pega el link de osu! aquí..."
                className="mpm-input"
                autoFocus
              />
            </div>
            {fetchError && <div className="map-fetch-error">{fetchError}</div>}
            <div className="map-form-actions">
              <button type="button" className="mpm-btn mpm-btn-secondary" onClick={handleCancel}>
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Stage 2: Difficulty Selection (when beatmapset has multiple diffs)
  if (beatmapsetData && !formData) {
    return (
      <div className="add-map-form">
        {bannerUrl && (
          <div className="map-preview">
            <img src={bannerUrl} alt="Map banner" />
          </div>
        )}
        <div className="map-info-header">
          <span className="map-info-artist">{beatmapsetData.artist}</span>
          <span className="map-info-title">{beatmapsetData.title}</span>
          <span className="map-info-mapper">by {beatmapsetData.mapper}</span>
        </div>
        <div className="mpm-field">
          <label className="mpm-field-label">Selecciona la dificultad</label>
          <div className="difficulty-list">
            {beatmapsetData.beatmaps.map((bm) => (
              <button
                key={bm.beatmap_id}
                type="button"
                className="difficulty-item"
                onClick={() => selectDifficulty(bm)}
              >
                <span className="diff-name">{bm.difficulty_name}</span>
                <span className="diff-sr">{bm.star_rating.toFixed(2)}★</span>
              </button>
            ))}
          </div>
        </div>
        <div className="map-form-actions">
          <button type="button" className="mpm-btn mpm-btn-secondary" onClick={handleBack}>
            Cambiar Mapa
          </button>
          <button type="button" className="mpm-btn mpm-btn-secondary" onClick={handleCancel}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // Stage 3: Full Form
  return (
    <form className="add-map-form" onSubmit={handleSubmit}>
      {/* Map Preview */}
      {bannerUrl && (
        <div className="map-preview">
          <img src={bannerUrl} alt="Map banner" />
        </div>
      )}

      {/* Row 1: Slot */}
      <div className="map-form-row">
        <div className="mpm-field">
          <label className="mpm-field-label">
            Slot
            <button type="button" className="slot-edit-pencil" onClick={onEditSlots} title="Editar slots">
              <PencilIcon />
            </button>
          </label>
          <select
            value={formData.slot}
            onChange={(e) => handleChange('slot', e.target.value)}
            className="mpm-input"
            disabled={loading}
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
        <div className="mpm-field mpm-field-grow">
          <label className="mpm-field-label">Beatmap ID</label>
          <input
            type="text"
            value={formData.beatmap_id}
            className="mpm-input"
            disabled
          />
        </div>
      </div>

      {/* Row 2: Artist + Title */}
      <div className="map-form-row">
        <div className="mpm-field">
          <label className="mpm-field-label">Artista</label>
          <input
            type="text"
            value={formData.artist}
            onChange={(e) => handleChange('artist', e.target.value)}
            className="mpm-input"
            disabled={loading}
          />
        </div>
        <div className="mpm-field">
          <label className="mpm-field-label">Título</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="mpm-input"
            disabled={loading}
          />
        </div>
      </div>

      {/* Row 3: Difficulty + Mapper */}
      <div className="map-form-row">
        <div className="mpm-field">
          <label className="mpm-field-label">Dificultad</label>
          <input
            type="text"
            value={formData.difficulty_name}
            onChange={(e) => handleChange('difficulty_name', e.target.value)}
            className="mpm-input"
            disabled={loading}
          />
        </div>
        <div className="mpm-field">
          <label className="mpm-field-label">Mapper</label>
          <input
            type="text"
            value={formData.mapper}
            onChange={(e) => handleChange('mapper', e.target.value)}
            className="mpm-input"
            disabled={loading}
          />
        </div>
      </div>

      {/* Row 4: SR, BPM, Length */}
      <div className="map-form-row map-form-row-stats">
        <div className="mpm-field">
          <label className="mpm-field-label">SR</label>
          <input
            type="number"
            step="0.01"
            value={formData.star_rating}
            onChange={(e) => handleChange('star_rating', parseFloat(e.target.value) || 0)}
            className="mpm-input"
            disabled={loading}
          />
        </div>
        <div className="mpm-field">
          <label className="mpm-field-label">BPM</label>
          <input
            type="number"
            value={formData.bpm}
            onChange={(e) => handleChange('bpm', parseInt(e.target.value) || 0)}
            className="mpm-input"
            disabled={loading}
          />
        </div>
        <div className="mpm-field">
          <label className="mpm-field-label">Tiempo</label>
          <input
            type="number"
            value={formData.length_seconds}
            onChange={(e) => handleChange('length_seconds', parseInt(e.target.value) || 0)}
            className="mpm-input"
            disabled={loading}
          />
        </div>
      </div>

      {/* Row 5: OD, HP, LN% */}
      <div className="map-form-row map-form-row-stats">
        <div className="mpm-field">
          <label className="mpm-field-label">OD</label>
          <input
            type="number"
            step="0.1"
            value={formData.od}
            onChange={(e) => handleChange('od', parseFloat(e.target.value) || 0)}
            className="mpm-input"
            disabled={loading}
          />
        </div>
        <div className="mpm-field">
          <label className="mpm-field-label">HP</label>
          <input
            type="number"
            step="0.1"
            value={formData.hp}
            onChange={(e) => handleChange('hp', parseFloat(e.target.value) || 0)}
            className="mpm-input"
            disabled={loading}
          />
        </div>
        <div className="mpm-field">
          <label className="mpm-field-label">LN%</label>
          <input
            type="text"
            value={formData.ln_percent}
            onChange={(e) => handleChange('ln_percent', e.target.value)}
            className="mpm-input"
            disabled={loading}
          />
        </div>
      </div>

      {/* Row 6: Checkboxes */}
      <div className="map-form-row map-form-row-checkboxes">
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

      {/* Actions */}
      <div className="map-form-actions">
        <button type="submit" className="mpm-btn mpm-btn-primary" disabled={loading}>
          {loading ? (
            <><img src={catGif} alt="" className="btn-loading-cat" /> Agregando...</>
          ) : 'Agregar Mapa'}
        </button>
        <button type="button" className="mpm-btn mpm-btn-secondary" onClick={handleBack} disabled={loading}>
          Cambiar Mapa
        </button>
        <button type="button" className="mpm-btn mpm-btn-secondary" onClick={handleCancel} disabled={loading}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

// Pool Item Component
function PoolItem({ pool, onDelete, onEditMap, onAddMap, onDeleteMap, onMoveUp, onMoveDown, isFirst, isLast, loading, slots, onEditSlots }) {
  const { addMapPoolId, addMapDraft } = useMappoolStore();
  const hasDraft = addMapPoolId === pool.id && addMapDraft !== null;

  const [showAddMap, setShowAddMap] = useState(hasDraft);
  const [deletingMap, setDeletingMap] = useState(null);

  const getSlotColor = (slotName) => {
    const slot = slots?.find(s => s.name === slotName);
    return slot?.color || '#ff0844'; // Default color if not found
  };

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
        <div className="mpm-pool-order-btns">
          <button
            className="mpm-order-btn"
            onClick={() => onMoveUp(pool.id)}
            disabled={loading || isFirst}
            title="Mover arriba"
          >
            <ChevronUpIcon />
          </button>
          <button
            className="mpm-order-btn"
            onClick={() => onMoveDown(pool.id)}
            disabled={loading || isLast}
            title="Mover abajo"
          >
            <ChevronDownIcon />
          </button>
        </div>
        <span className="mpm-pool-name">{pool.stage_name}</span>
        <span className="mpm-pool-count">{pool.map_count} maps</span>
        <button
          className="mpm-icon-btn mpm-icon-btn-danger"
          onClick={() => onDelete(pool.id)}
          disabled={loading}
          title="Eliminar pool"
        >
          {loading ? <img src={catGif} alt="" className="btn-loading-cat-small" /> : <TrashIcon />}
        </button>
      </div>

      {pool.maps && pool.maps.length > 0 && (
        <div className="mpm-maps-list">
          {pool.maps.map((map) => (
            <div key={map.id} className="mpm-map-item">
              <span className="mpm-map-slot" style={{ backgroundColor: getSlotColor(map.slot) }}>{map.slot}</span>
              <span className="mpm-map-title">{map.artist} - {map.title}</span>
              <span className="mpm-map-diff">[{map.difficulty_name}]</span>
              <button
                className="mpm-icon-btn"
                onClick={() => onEditMap(map)}
                disabled={loading || deletingMap === map.id}
                title="Editar mapa"
              >
                <EditIcon />
              </button>
              <button
                className="mpm-icon-btn mpm-icon-btn-danger"
                onClick={() => handleDeleteMap(map.id)}
                disabled={loading || deletingMap === map.id}
                title="Eliminar mapa"
              >
                {deletingMap === map.id ? <img src={catGif} alt="" className="btn-loading-cat-small" /> : <TrashIcon />}
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
          slots={slots}
          onEditSlots={onEditSlots}
        />
      ) : (
        <button
          className={`mpm-add-map-btn ${hasDraft ? 'has-draft' : ''}`}
          onClick={() => setShowAddMap(true)}
          disabled={loading}
        >
          <PlusIcon /> {hasDraft ? 'Continuar donde lo dejaste' : 'Agregar Mapa'}
        </button>
      )}
    </div>
  );
}

export default function MappoolEditModal({ isOpen, onClose, pools, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [showAddPool, setShowAddPool] = useState(false);
  const [deletingPool, setDeletingPool] = useState(null);
  const [slots, setSlots] = useState([]);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [editingMap, setEditingMap] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchSlots();
    }
  }, [isOpen]);

  const fetchSlots = async () => {
    try {
      const data = await api.getSlots();
      setSlots(data);
    } catch (err) {
      console.error('Failed to fetch slots:', err);
    }
  };

  if (!isOpen) return null;

  // Calculate next order for new pools
  const nextOrder = pools.length > 0 ? Math.max(...pools.map(p => p.stage_order)) + 1 : 0;

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

  const handleMoveUp = async (poolId) => {
    const index = pools.findIndex(p => p.id === poolId);
    if (index <= 0) return;

    setLoading(true);
    try {
      const currentPool = pools[index];
      const prevPool = pools[index - 1];
      // Swap orders
      await api.updateMappool(currentPool.id, { stage_order: prevPool.stage_order });
      await api.updateMappool(prevPool.id, { stage_order: currentPool.stage_order });
      onRefresh();
    } catch (err) {
      console.error('Failed to move pool:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveDown = async (poolId) => {
    const index = pools.findIndex(p => p.id === poolId);
    if (index < 0 || index >= pools.length - 1) return;

    setLoading(true);
    try {
      const currentPool = pools[index];
      const nextPool = pools[index + 1];
      // Swap orders
      await api.updateMappool(currentPool.id, { stage_order: nextPool.stage_order });
      await api.updateMappool(nextPool.id, { stage_order: currentPool.stage_order });
      onRefresh();
    } catch (err) {
      console.error('Failed to move pool:', err);
    } finally {
      setLoading(false);
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

  const handleEditMap = async (mapId, mapData) => {
    console.log('handleEditMap called', { mapId, mapData });
    setLoading(true);
    try {
      await api.updatePoolMap(mapId, mapData);
      setEditingMap(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to update map:', err);
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
    setEditingMap(null);
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
              {pools.map((pool, index) => (
                <PoolItem
                  key={pool.id}
                  pool={pool}
                  onDelete={handleDeletePool}
                  onEditMap={setEditingMap}
                  onAddMap={handleAddMap}
                  onDeleteMap={handleDeleteMap}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  isFirst={index === 0}
                  isLast={index === pools.length - 1}
                  loading={loading || deletingPool === pool.id}
                  slots={slots}
                  onEditSlots={() => setShowSlotModal(true)}
                />
              ))}
            </div>
          )}

          {showAddPool ? (
            <AddPoolForm
              onAdd={handleAddPool}
              onCancel={() => setShowAddPool(false)}
              loading={loading}
              nextOrder={nextOrder}
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

      <SlotEditModal
        isOpen={showSlotModal}
        onClose={() => setShowSlotModal(false)}
        onSlotsChange={fetchSlots}
      />

      <MapEditModal
        isOpen={editingMap !== null}
        map={editingMap}
        onSave={handleEditMap}
        onClose={() => setEditingMap(null)}
        slots={slots}
        onEditSlots={() => setShowSlotModal(true)}
      />
    </div>
  );
}

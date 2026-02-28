import { useState, useEffect, useRef } from 'react';
import catGif from '../assets/cat.gif';
import './MatchEditModal.css';

// SVG Icons
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const MATCH_STATUSES = [
  { value: 'scheduled', label: 'Programado' },
  { value: 'in_progress', label: 'En Progreso' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'forfeit', label: 'Forfeit' },
];

function PlayerSelect({ value, onChange, players, disabled, placeholder = '-- Seleccionar --' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  const selected = players.find(p => String(p.id) === String(value));

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const filtered = search
    ? players.filter(p => p.username.toLowerCase().includes(search.toLowerCase()))
    : players;

  return (
    <div className="player-select" ref={ref}>
      <button
        type="button"
        className="player-select-trigger match-edit-input"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
      >
        {selected ? (
          <span className="player-select-value">
            <img src={`https://a.ppy.sh/${selected.osu_id}`} alt="" className="player-select-avatar" />
            {selected.username}
          </span>
        ) : (
          <span className="player-select-placeholder">{placeholder}</span>
        )}
      </button>
      {open && (
        <div className="player-select-dropdown">
          <input
            type="text"
            className="player-select-search"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="player-select-options">
            <div
              className="player-select-option"
              onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
            >
              <span className="player-select-placeholder">{placeholder}</span>
            </div>
            {filtered.map(p => (
              <div
                key={p.id}
                className={`player-select-option ${String(p.id) === String(value) ? 'selected' : ''}`}
                onClick={() => { onChange(String(p.id)); setOpen(false); setSearch(''); }}
              >
                <img src={`https://a.ppy.sh/${p.osu_id}`} alt="" className="player-select-avatar" />
                {p.username}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MatchEditModal({ isOpen, match, users, maps, onSave, onCreate, onClose }) {
  const [formData, setFormData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Determine if we're in create mode (no match.id means creating new)
  const isCreateMode = match && !match.id;

  // Initialize form data when match changes
  useEffect(() => {
    if (isOpen && match) {
      setFormData({
        bracket_id: match.bracket_id,
        player1_id: match.player1_id || '',
        player2_id: match.player2_id || '',
        map_id: match.map_id || '',
        player1_score: match.player1_score ?? '',
        player2_score: match.player2_score ?? '',
        winner_id: match.winner_id ?? '',
        match_status: match.match_status || 'scheduled',
        scheduled_time: match.scheduled_time ? formatDatetimeLocal(match.scheduled_time) : '',
        round_name: match.round_name || '',
        forfeit_reason: match.forfeit_reason || '',
        referee_name: match.referee_name || '',
      });
      setError(null);
    }
  }, [isOpen, match]);

  if (!isOpen || !match || !formData) return null;

  function formatDatetimeLocal(isoString) {
    const date = new Date(isoString);
    // Format as YYYY-MM-DDTHH:MM for datetime-local input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (isCreateMode) {
        // Validate required fields for creation
        if (!formData.player1_id || !formData.player2_id) {
          throw new Error('Debes seleccionar ambos jugadores');
        }
        if (!formData.map_id) {
          throw new Error('Debes seleccionar un mapa');
        }

        const createPayload = {
          bracket_id: formData.bracket_id,
          player1_id: parseInt(formData.player1_id),
          player2_id: parseInt(formData.player2_id),
          map_id: parseInt(formData.map_id),
        };
        if (formData.scheduled_time) {
          createPayload.scheduled_time = new Date(formData.scheduled_time).toISOString();
        }
        if (formData.referee_name) {
          createPayload.referee_name = formData.referee_name;
        }

        await onCreate(createPayload);
      } else {
        // Build update payload with only changed/valid fields
        const payload = {};

        if (formData.player1_id) payload.player1_id = parseInt(formData.player1_id);
        if (formData.player2_id) payload.player2_id = parseInt(formData.player2_id);
        if (formData.player1_score !== '' && formData.player1_score !== null) {
          payload.player1_score = parseInt(formData.player1_score);
        }
        if (formData.player2_score !== '' && formData.player2_score !== null) {
          payload.player2_score = parseInt(formData.player2_score);
        }
        if (formData.winner_id) payload.winner_id = parseInt(formData.winner_id);
        if (formData.match_status) payload.match_status = formData.match_status;
        if (formData.scheduled_time) {
          payload.scheduled_time = new Date(formData.scheduled_time).toISOString();
        }
        if (formData.round_name) payload.round_name = formData.round_name;
        if (formData.forfeit_reason) payload.forfeit_reason = formData.forfeit_reason;
        if (formData.referee_name) payload.referee_name = formData.referee_name;

        await onSave(match.id, payload);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFormData(null);
    setError(null);
    onClose();
  };

  // Filter registered users for player dropdowns
  const registeredUsers = users?.filter(u => u.is_registered) || [];

  return (
    <div className="match-edit-modal-overlay" onClick={handleClose}>
      <div className="match-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="match-edit-modal-header">
          <h3>{isCreateMode ? 'Crear Partida' : `Editar Partida #${match.id}`}</h3>
          <button className="match-edit-close-btn" onClick={handleClose}>
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="match-edit-modal-content">
          {/* Match Info */}
          <div className="match-edit-info">
            <span className="match-edit-round">{match.round_name || 'Round'}</span>
            <span className="match-edit-bracket">Bracket ID: {match.bracket_id}</span>
          </div>

          {/* Map Selector (required for create mode) */}
          {isCreateMode && (
            <div className="match-edit-row">
              <div className="match-edit-field match-edit-field-full">
                <label className="match-edit-label">Mapa *</label>
                <select
                  value={formData.map_id || ''}
                  onChange={(e) => handleChange('map_id', e.target.value)}
                  className="match-edit-input"
                  disabled={saving}
                  required
                >
                  <option value="">-- Seleccionar Mapa --</option>
                  {maps?.map(map => (
                    <option key={map.id} value={map.id}>
                      {map.artist} - {map.title} [{map.difficulty_name}]
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Players Row */}
          <div className="match-edit-row">
            <div className="match-edit-field">
              <label className="match-edit-label">Jugador 1</label>
              <PlayerSelect
                value={formData.player1_id}
                onChange={(val) => handleChange('player1_id', val)}
                players={registeredUsers}
                disabled={saving}
              />
            </div>
            <div className="match-edit-field">
              <label className="match-edit-label">Jugador 2</label>
              <PlayerSelect
                value={formData.player2_id}
                onChange={(val) => handleChange('player2_id', val)}
                players={registeredUsers}
                disabled={saving}
              />
            </div>
          </div>

          {/* Scores Row */}
          <div className="match-edit-row">
            <div className="match-edit-field">
              <label className="match-edit-label">Score P1</label>
              <input
                type="number"
                min="0"
                value={formData.player1_score}
                onChange={(e) => handleChange('player1_score', e.target.value)}
                className="match-edit-input"
                placeholder="0"
                disabled={saving}
              />
            </div>
            <div className="match-edit-field">
              <label className="match-edit-label">Score P2</label>
              <input
                type="number"
                min="0"
                value={formData.player2_score}
                onChange={(e) => handleChange('player2_score', e.target.value)}
                className="match-edit-input"
                placeholder="0"
                disabled={saving}
              />
            </div>
          </div>

          {/* Winner & Status Row */}
          <div className="match-edit-row">
            <div className="match-edit-field">
              <label className="match-edit-label">Ganador</label>
              <PlayerSelect
                value={formData.winner_id}
                onChange={(val) => handleChange('winner_id', val)}
                players={[
                  ...(formData.player1_id ? registeredUsers.filter(u => String(u.id) === String(formData.player1_id)) : []),
                  ...(formData.player2_id ? registeredUsers.filter(u => String(u.id) === String(formData.player2_id)) : []),
                ]}
                disabled={saving}
                placeholder="-- Sin ganador --"
              />
            </div>
            <div className="match-edit-field">
              <label className="match-edit-label">Estado</label>
              <select
                value={formData.match_status}
                onChange={(e) => handleChange('match_status', e.target.value)}
                className="match-edit-input"
                disabled={saving}
              >
                {MATCH_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Schedule & Round Row */}
          <div className="match-edit-row">
            <div className="match-edit-field">
              <label className="match-edit-label">Fecha/Hora</label>
              <input
                type="datetime-local"
                value={formData.scheduled_time}
                onChange={(e) => handleChange('scheduled_time', e.target.value)}
                className="match-edit-input"
                disabled={saving}
              />
            </div>
            <div className="match-edit-field">
              <label className="match-edit-label">Ronda</label>
              <input
                type="text"
                value={formData.round_name}
                onChange={(e) => handleChange('round_name', e.target.value)}
                className="match-edit-input"
                placeholder="Quarterfinals"
                disabled={saving}
              />
            </div>
          </div>

          {/* Referee */}
          <div className="match-edit-row">
            <div className="match-edit-field match-edit-field-full">
              <label className="match-edit-label">Árbitro (Referee)</label>
              <input
                type="text"
                value={formData.referee_name}
                onChange={(e) => handleChange('referee_name', e.target.value)}
                className="match-edit-input"
                placeholder="Nombre del árbitro"
                disabled={saving}
              />
            </div>
          </div>

          {/* Forfeit Reason (shown only for forfeit/cancelled status) */}
          {(formData.match_status === 'forfeit' || formData.match_status === 'cancelled') && (
            <div className="match-edit-row">
              <div className="match-edit-field match-edit-field-full">
                <label className="match-edit-label">Motivo de Forfeit/Cancelación</label>
                <input
                  type="text"
                  value={formData.forfeit_reason}
                  onChange={(e) => handleChange('forfeit_reason', e.target.value)}
                  className="match-edit-input"
                  placeholder="Razón..."
                  disabled={saving}
                />
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="match-edit-error">{error}</div>
          )}

          {/* Actions */}
          <div className="match-edit-actions">
            <button type="submit" className="match-edit-btn match-edit-btn-primary" disabled={saving}>
              {saving ? (
                <><img src={catGif} alt="" className="btn-loading-cat" /> {isCreateMode ? 'Creando...' : 'Guardando...'}</>
              ) : (isCreateMode ? 'Crear Partida' : 'Guardar Cambios')}
            </button>
            <button type="button" className="match-edit-btn match-edit-btn-secondary" onClick={handleClose} disabled={saving}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

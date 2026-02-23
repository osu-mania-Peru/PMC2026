import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, Check, X, Trash2 } from 'lucide-react';
import catGif from '../assets/cat.gif';
import { api } from '../api';
import AvailabilityCalendar from './AvailabilityCalendar';
import './MatchSchedulingPanel.css';

export default function MatchSchedulingPanel({ match, user, users, onClose }) {
  const [availability, setAvailability] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Calendar-driven pending windows (ISO format)
  const [pendingWindows, setPendingWindows] = useState([]);


  const isPlayer = user && (user.id === match.player1_id || user.id === match.player2_id);
  const isStaff = user?.is_staff;
  const hasControls = isPlayer || isStaff;
  const myId = user?.id;
  // For staff who aren't a player, default perspective to player1
  const perspectiveId = isPlayer ? myId : match.player1_id;
  useEffect(() => {
    loadData();
  }, [match.id]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [availData, propData] = await Promise.all([
        api.getMatchAvailability(match.id),
        api.getMatchProposals(match.id),
      ]);
      setAvailability(availData);
      setProposals(propData.proposals || []);

      // Load own windows into pending
      const myWindows = perspectiveId === availData.player1_id
        ? availData.player1_windows
        : availData.player2_windows;
      setPendingWindows(myWindows.map(w => ({
        start_time: w.start_time,
        end_time: w.end_time,
      })));
    } catch { /* ignore */ }
    setLoading(false);
  };

  const saveAvailability = async () => {
    setSaving(true);
    try {
      await api.addMatchAvailability(match.id, pendingWindows.map(w => ({
        start_time: new Date(w.start_time).toISOString(),
        end_time: new Date(w.end_time).toISOString(),
      })));
      await loadData();
      showToast('Disponibilidad guardada');
    } catch { /* ignore */ }
    setSaving(false);
  };

  const clearAvailability = async () => {
    setSaving(true);
    try {
      await api.clearMatchAvailability(match.id);
      setPendingWindows([]);
      await loadData();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleCalendarPropose = async (isoTime) => {
    try {
      await api.proposeMatchTime(match.id, isoTime);
      await loadData();
      showToast('Horario propuesto');
    } catch { /* ignore */ }
  };

  const handleRespond = async (proposalId, status) => {
    try {
      await api.respondToProposal(match.id, proposalId, status);
      await loadData();
    } catch { /* ignore */ }
  };

  const formatDT = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getMyWindows = () => {
    if (!availability) return [];
    return perspectiveId === availability.player1_id
      ? availability.player1_windows
      : availability.player2_windows;
  };

  const getOpponentWindows = () => {
    if (!availability) return [];
    return perspectiveId === availability.player1_id
      ? availability.player2_windows
      : availability.player1_windows;
  };

  // TODO: Replace with real API call to fetch confirmed matches for this player
  // e.g. api.getPlayerConfirmedMatches(perspectiveId) → [{start_time, end_time, label}]
  const busyWindows = [];

  if (loading) {
    return (
      <div className="scheduling-panel">
        <div className="scheduling-panel-header">
          <h3>Coordinar Horario</h3>
          <button className="scheduling-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="scheduling-loading">
          <img src={catGif} alt="" className="btn-loading-cat" />
        </div>
      </div>
    );
  }

  return (
    <div className="scheduling-panel">
      <div className="scheduling-panel-header">
        <h3><Calendar size={18} /> Coordinar Horario</h3>
        <button className="scheduling-close" onClick={onClose}><X size={18} /></button>
      </div>

      {/* Calendar Availability Section */}
      <div className="scheduling-section">
        <h4>{hasControls ? (isPlayer ? 'Tu Disponibilidad' : `Disponibilidad de ${users?.[perspectiveId]?.username || 'Jugador 1'}`) : 'Disponibilidad'}</h4>
        <AvailabilityCalendar
          myWindows={getMyWindows()}
          opponentWindows={getOpponentWindows()}
          busyWindows={busyWindows}
          onChange={(windows) => setPendingWindows(windows)}
          onProposeTime={hasControls ? handleCalendarPropose : undefined}
          readOnly={!hasControls}
        />

        {hasControls && (
          <div className="scheduling-actions">
            <button className="scheduling-save-btn" onClick={saveAvailability} disabled={saving}>
              {saving ? <img src={catGif} alt="" className="btn-loading-cat" /> : <Check size={14} />}
              Guardar tiempos disponibles
            </button>
            {pendingWindows.length > 0 && (
              <button className="scheduling-clear-btn" onClick={clearAvailability} disabled={saving}>
                <Trash2 size={14} /> Limpiar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Proposals Section */}
      <div className="scheduling-section">
        <h4><Clock size={16} /> Horarios Propuestos</h4>

        {proposals.length === 0 ? (
          <p className="scheduling-empty">No hay propuestas aún.</p>
        ) : (
          <div className="scheduling-proposals">
            {proposals.map(p => {
              const isOwn = p.proposed_by === myId;
              const proposerName = users?.[p.proposed_by]?.username || 'Jugador';
              return (
                <div key={p.id} className={`scheduling-proposal ${p.status}`}>
                  <div className="scheduling-proposal-info">
                    <span className="scheduling-proposal-who">{proposerName}</span>
                    <span className="scheduling-proposal-time">{formatDT(p.proposed_time)}</span>
                    <span className={`scheduling-proposal-status ${p.status}`}>
                      {p.status === 'pending' ? 'Pendiente' : p.status === 'accepted' ? 'Aceptada' : 'Rechazada'}
                    </span>
                  </div>
                  {hasControls && (isStaff || !isOwn) && p.status === 'pending' && (
                    <div className="scheduling-proposal-actions">
                      <button className="scheduling-accept-btn" onClick={() => handleRespond(p.id, 'accepted')}>
                        <Check size={14} /> Aceptar
                      </button>
                      <button className="scheduling-reject-btn" onClick={() => handleRespond(p.id, 'rejected')}>
                        <X size={14} /> Rechazar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {proposals.length === 0 && hasControls && (
          <p className="scheduling-hint">Marca tu disponibilidad arriba y haz clic en una coincidencia para proponer un horario.</p>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div className={`scheduling-toast scheduling-toast--${toast.type}`}>
          <Check size={14} />
          {toast.message}
        </div>
      )}
    </div>
  );
}

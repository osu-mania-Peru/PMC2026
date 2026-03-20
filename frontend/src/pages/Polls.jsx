import { useEffect, useState } from 'react';
import { api } from '../api';
import { Plus, Trash2, BarChart3, Clock, X } from 'lucide-react';
import catGif from '../assets/cat.gif';
import PageTransition from '../components/PageTransition';
import './Polls.css';

function PollCard({ poll, user, onVote, onRemoveVote, onDelete, onClose }) {
  const hasVoted = poll.user_vote !== null && poll.user_vote !== undefined;
  const isStaff = user?.is_staff;
  const canVote = !!user && poll.is_active;

  const handleVote = (optionId) => {
    if (!canVote) return;
    if (hasVoted && poll.user_vote === optionId) {
      onRemoveVote(poll.id);
    } else {
      onVote(poll.id, optionId);
    }
  };

  return (
    <div className={`poll-card ${!poll.is_active ? 'poll-closed' : ''}`}>
      <div className="poll-header">
        <div className="poll-title-row">
          <h3 className="poll-title">{poll.title}</h3>
          {!poll.is_active && <span className="poll-badge closed">Cerrada</span>}
        </div>
        {poll.description && <p className="poll-description">{poll.description}</p>}
        <div className="poll-meta">
          <span className="poll-author">por {poll.created_by}</span>
          <span className="poll-votes-count">
            <BarChart3 size={14} /> {poll.total_votes} voto{poll.total_votes !== 1 ? 's' : ''}
          </span>
          {poll.closes_at && (
            <span className="poll-deadline">
              <Clock size={14} /> {new Date(poll.closes_at).toLocaleDateString('es-PE', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: false
              })}
            </span>
          )}
        </div>
      </div>

      <div className="poll-options">
        {poll.options.map(opt => {
          const isSelected = poll.user_vote === opt.id;
          return (
            <button
              key={opt.id}
              className={`poll-option ${isSelected ? 'selected' : ''} ${!canVote ? 'disabled' : ''}`}
              onClick={() => handleVote(opt.id)}
              disabled={!canVote}
            >
              <div className="poll-option-bar" style={{ width: `${opt.percentage}%` }} />
              <span className="poll-option-text">{opt.option_text}</span>
              <span className="poll-option-pct">{opt.percentage}%</span>
              <span className="poll-option-count">({opt.vote_count})</span>
            </button>
          );
        })}
      </div>

      {!user && <p className="poll-login-hint">Inicia sesión para votar</p>}

      {isStaff && (
        <div className="poll-staff-actions">
          {poll.is_active && (
            <button className="poll-action-btn" onClick={() => onClose(poll.id)}>
              <X size={14} /> Cerrar
            </button>
          )}
          <button className="poll-action-btn danger" onClick={() => onDelete(poll.id)}>
            <Trash2 size={14} /> Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

function CreatePollModal({ isOpen, onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [closesAt, setClosesAt] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const addOption = () => setOptions([...options, '']);
  const removeOption = (idx) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== idx));
  };
  const updateOption = (idx, val) => {
    const updated = [...options];
    updated[idx] = val;
    setOptions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validOptions = options.filter(o => o.trim());
    if (!title.trim() || validOptions.length < 2) return;
    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        poll_type: 'single',
        closes_at: closesAt ? new Date(closesAt).toISOString() : null,
        options: validOptions.map(o => ({ option_text: o.trim() })),
      });
      setTitle('');
      setDescription('');
      setOptions(['', '']);
      setClosesAt('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="poll-modal-overlay" onClick={onClose}>
      <div className="poll-modal" onClick={e => e.stopPropagation()}>
        <div className="poll-modal-header">
          <h3>Crear Encuesta</h3>
          <button className="poll-modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="poll-form-group">
            <label>Pregunta</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="¿Cuál es tu mapa favorito?"
              required
            />
          </div>
          <div className="poll-form-group">
            <label>Descripción (opcional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Contexto adicional..."
              rows={2}
            />
          </div>
          <div className="poll-form-group">
            <label>Opciones</label>
            {options.map((opt, i) => (
              <div key={i} className="poll-option-input-row">
                <input
                  type="text"
                  value={opt}
                  onChange={e => updateOption(i, e.target.value)}
                  placeholder={`Opción ${i + 1}`}
                  required
                />
                {options.length > 2 && (
                  <button type="button" className="poll-remove-option" onClick={() => removeOption(i)}>
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="poll-add-option" onClick={addOption}>
              <Plus size={14} /> Agregar opción
            </button>
          </div>
          <div className="poll-form-group">
            <label>Cierre automático (opcional)</label>
            <input
              type="datetime-local"
              value={closesAt}
              onChange={e => setClosesAt(e.target.value)}
            />
          </div>
          <div className="poll-modal-actions">
            <button type="button" className="poll-btn secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="poll-btn primary" disabled={saving}>
              {saving ? <><img src={catGif} alt="" className="btn-loading-cat" /> Creando...</> : 'Crear Encuesta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Polls({ user }) {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchPolls = async () => {
    try {
      const isStaff = user?.is_staff;
      const res = isStaff ? await api.getAllPolls() : await api.getPolls();
      setPolls(res.polls);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, [user]);

  const handleVote = async (pollId, optionId) => {
    try {
      const updated = await api.votePoll(pollId, optionId);
      setPolls(polls.map(p => p.id === pollId ? updated : p));
    } catch (err) {
      alert(err?.message || 'Error al votar');
    }
  };

  const handleRemoveVote = async (pollId) => {
    try {
      const updated = await api.removeVote(pollId);
      setPolls(polls.map(p => p.id === pollId ? updated : p));
    } catch (err) {
      alert(err?.message || 'Error al quitar voto');
    }
  };

  const handleCreate = async (data) => {
    const created = await api.createPoll(data);
    setPolls([created, ...polls]);
  };

  const handleDelete = async (pollId) => {
    if (!confirm('¿Eliminar esta encuesta?')) return;
    try {
      await api.deletePoll(pollId);
      setPolls(polls.filter(p => p.id !== pollId));
    } catch (err) {
      alert(err?.message || 'Error al eliminar');
    }
  };

  const handleClose = async (pollId) => {
    try {
      const updated = await api.updatePoll(pollId, { is_active: false });
      setPolls(polls.map(p => p.id === pollId ? updated : p));
    } catch (err) {
      alert(err?.message || 'Error al cerrar encuesta');
    }
  };

  return (
    <PageTransition loading={loading} error={error} text="Cargando encuestas...">
      <div className="polls-container">
        <div className="polls-header">
          <h2>Encuestas</h2>
          {user?.is_staff && (
            <button className="poll-create-btn" onClick={() => setShowCreate(true)}>
              <Plus size={18} /> Nueva Encuesta
            </button>
          )}
        </div>

        {polls.length === 0 ? (
          <p className="polls-empty">No hay encuestas disponibles.</p>
        ) : (
          <div className="polls-list">
            {polls.map(poll => (
              <PollCard
                key={poll.id}
                poll={poll}
                user={user}
                onVote={handleVote}
                onRemoveVote={handleRemoveVote}
                onDelete={handleDelete}
                onClose={handleClose}
              />
            ))}
          </div>
        )}

        <CreatePollModal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      </div>
    </PageTransition>
  );
}

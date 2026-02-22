import { useEffect, useState } from 'react';
import { Plus, Trash2, Shield } from 'lucide-react';
import { api } from '../api';
import PageTransition from '../components/PageTransition';
import catGif from '../assets/cat.gif';
import './StaffWhitelist.css';

export default function StaffWhitelist() {
  const [whitelist, setWhitelist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newUsername, setNewUsername] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');

  const fetchWhitelist = () => {
    api.getWhitelist()
      .then(data => setWhitelist(data.whitelist || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWhitelist();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    setActionLoading('add');
    setError('');
    try {
      await api.addToWhitelist(newUsername.trim());
      setNewUsername('');
      fetchWhitelist();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (username) => {
    if (!confirm(`¿Eliminar ${username} de la whitelist?`)) return;

    setActionLoading(`del-${username}`);
    try {
      await api.removeFromWhitelist(username);
      fetchWhitelist();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <PageTransition loading={loading} text="Cargando whitelist...">
    <div className="staff-whitelist-page">
      <div className="staff-whitelist-header">
        <div className="staff-whitelist-header-left">
          <h1 className="staff-whitelist-title">Whitelist</h1>
          <span className="staff-whitelist-count">{whitelist.length} usuarios</span>
          <span className="staff-whitelist-badge">STAFF</span>
        </div>
        <div className="staff-whitelist-header-right">
          <Shield className="staff-whitelist-header-icon" />
        </div>
      </div>

      <p className="staff-whitelist-subtitle">
        Usuarios que pueden registrarse sin ser de nacionalidad peruana
      </p>

      <form onSubmit={handleAdd} className="staff-whitelist-form">
        <input
          type="text"
          placeholder="Nombre de usuario de osu!..."
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          className="staff-whitelist-input"
          disabled={actionLoading === 'add'}
        />
        <button
          type="submit"
          className="staff-whitelist-add-btn"
          disabled={actionLoading === 'add' || !newUsername.trim()}
        >
          {actionLoading === 'add' ? (
            <img src={catGif} alt="" className="btn-loading-cat-small" />
          ) : (
            <Plus size={20} />
          )}
          Agregar
        </button>
      </form>

      {error && <div className="staff-whitelist-error">{error}</div>}

      {whitelist.length === 0 ? (
        <div className="staff-whitelist-empty">
          <p>No hay usuarios en la whitelist.</p>
        </div>
      ) : (
        <div className="staff-whitelist-grid">
          {whitelist.map(username => (
            <div key={username} className="staff-whitelist-card">
              <div className="staff-whitelist-info">
                <Shield size={18} className="staff-whitelist-icon" />
                <span className="staff-whitelist-username">{username}</span>
              </div>
              <button
                className="staff-whitelist-action-btn staff-whitelist-action-danger"
                onClick={() => handleRemove(username)}
                disabled={actionLoading === `del-${username}`}
                title="Eliminar de whitelist"
              >
                {actionLoading === `del-${username}` ? (
                  <img src={catGif} alt="" className="btn-loading-cat-small" />
                ) : (
                  <Trash2 size={16} />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
    </PageTransition>
  );
}

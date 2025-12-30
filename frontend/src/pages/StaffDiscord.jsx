import { useEffect, useState } from 'react';
import { Copy, UserX, Trash2 } from 'lucide-react';
import { FaDiscord } from 'react-icons/fa';
import { api } from '../api';
import Spinner from '../components/Spinner';
import catGif from '../assets/cat.gif';
import './StaffDiscord.css';

export default function StaffDiscord() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchUsers = () => {
    api.getAllUsers()
      .then(data => setPlayers(data.users))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUnregister = async (userId, username) => {
    if (!confirm(`¿Cancelar registro de ${username}?`)) return;
    setActionLoading(`unreg-${userId}`);
    try {
      await api.adminUnregisterUser(userId);
      fetchUsers();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (userId, username) => {
    if (!confirm(`¿Eliminar usuario ${username}? Esta acción no se puede deshacer.`)) return;
    setActionLoading(`del-${userId}`);
    try {
      await api.adminDeleteUser(userId);
      fetchUsers();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <Spinner size="large" text="Cargando usuarios..." />;

  const filteredPlayers = players
    .filter(p =>
      p.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.discord_username?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.username?.localeCompare(b.username));

  return (
    <div className="staff-discord-page">
      <div className="staff-discord-header">
        <div className="staff-discord-header-left">
          <h1 className="staff-discord-title">Discord</h1>
          <span className="staff-discord-count">{players.length} usuarios</span>
          <span className="staff-discord-badge">STAFF</span>
        </div>
        <div className="staff-discord-header-right">
          <FaDiscord className="staff-discord-header-icon" />
        </div>
      </div>

      <p className="staff-discord-subtitle">Lista de usuarios de Discord registrados</p>

      <div className="staff-discord-search">
        <input
          type="text"
          placeholder="Buscar por osu! o Discord..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="staff-discord-search-input"
        />
      </div>

      {filteredPlayers.length === 0 ? (
        <div className="staff-discord-empty">
          <p>No se encontraron usuarios.</p>
        </div>
      ) : (
        <div className="staff-discord-grid">
          {filteredPlayers.map(player => (
            <div key={player.id} className="staff-discord-card">
              <img
                src={`https://a.ppy.sh/${player.osu_id}`}
                alt={player.username}
                className="staff-discord-avatar"
              />
              <div className="staff-discord-info">
                <a
                  href={`https://osu.ppy.sh/users/${player.osu_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="staff-discord-osu-name"
                >
                  {player.username}
                </a>
                <span className="staff-discord-discord-name">
                  @{player.discord_username || 'No registrado'}
                </span>
                {player.is_registered && (
                  <span className="staff-discord-registered-badge">Registrado</span>
                )}
              </div>
              <div className="staff-discord-actions">
                {player.discord_username && (
                  <button
                    className="staff-discord-action-btn"
                    onClick={() => navigator.clipboard.writeText(player.discord_username)}
                    title="Copiar Discord"
                  >
                    <Copy size={16} />
                  </button>
                )}
                {player.is_registered && (
                  <button
                    className="staff-discord-action-btn staff-discord-action-warning"
                    onClick={() => handleUnregister(player.id, player.username)}
                    disabled={actionLoading === `unreg-${player.id}`}
                    title="Cancelar registro"
                  >
                    {actionLoading === `unreg-${player.id}` ? (
                      <img src={catGif} alt="" className="btn-loading-cat-small" />
                    ) : (
                      <UserX size={16} />
                    )}
                  </button>
                )}
                <button
                  className="staff-discord-action-btn staff-discord-action-danger"
                  onClick={() => handleDelete(player.id, player.username)}
                  disabled={actionLoading === `del-${player.id}`}
                  title="Eliminar usuario"
                >
                  {actionLoading === `del-${player.id}` ? (
                    <img src={catGif} alt="" className="btn-loading-cat-small" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

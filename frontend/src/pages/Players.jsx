import { useEffect, useState, useMemo } from 'react';
import { api } from '../api';
import PageTransition from '../components/PageTransition';
import { Search, RefreshCw } from 'lucide-react';
import catGif from '../assets/cat.gif';
import './Players.css';

// Icon components
const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="players-header-icon">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
  </svg>
);

const REFRESH_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const REFRESH_COOLDOWN_KEY = 'players_refresh_timestamp';

export default function Players({ user }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('pp');
  const [countryFilter, setCountryFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Check cooldown on mount and update every second
  useEffect(() => {
    const checkCooldown = () => {
      const lastRefresh = localStorage.getItem(REFRESH_COOLDOWN_KEY);
      if (lastRefresh) {
        const elapsed = Date.now() - parseInt(lastRefresh, 10);
        const remaining = REFRESH_COOLDOWN_MS - elapsed;
        setCooldownRemaining(remaining > 0 ? remaining : 0);
      }
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchPlayers = () => {
    api.getAllUsers()
      .then(data => setPlayers(data.users))
      .catch(err => {
        console.error(err);
        setLoadError(err?.message || String(err));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const handleRefreshStats = async () => {
    // Check cooldown
    if (cooldownRemaining > 0) {
      const minutes = Math.ceil(cooldownRemaining / 60000);
      alert(`Debes esperar ${minutes} minuto(s) antes de refrescar de nuevo.`);
      return;
    }

    setRefreshing(true);
    setRefreshResult(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/users/sync-stats`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Error al refrescar');
      }

      // Save timestamp to localStorage for cooldown
      localStorage.setItem(REFRESH_COOLDOWN_KEY, Date.now().toString());
      setCooldownRemaining(REFRESH_COOLDOWN_MS);

      setRefreshResult({ success: true, updated: data.updated, errors: data.errors });
      // Reload players to show updated stats
      fetchPlayers();
    } catch (err) {
      setRefreshResult({ success: false, message: err.message });
    } finally {
      setRefreshing(false);
    }
  };

  const registeredPlayers = useMemo(() => players.filter(p => p.is_registered), [players]);

  const countries = useMemo(() => {
    const codes = [...new Set(registeredPlayers.map(p => p.flag_code))].sort();
    return codes;
  }, [registeredPlayers]);

  const filteredPlayers = useMemo(() => {
    let result = registeredPlayers;

    if (search) {
      result = result.filter(p => p.username.toLowerCase().includes(search.toLowerCase()));
    }

    if (countryFilter !== 'all') {
      result = result.filter(p => p.flag_code === countryFilter);
    }

    result = [...result].sort((a, b) => {
      if (sortBy === 'pp') return (b.mania_pp || 0) - (a.mania_pp || 0);
      if (sortBy === 'rank') return (a.mania_country_rank || 9999) - (b.mania_country_rank || 9999);
      if (sortBy === 'name') return a.username.localeCompare(b.username);
      return 0;
    });

    return result;
  }, [registeredPlayers, search, sortBy, countryFilter]);

  return (
    <PageTransition loading={loading} error={loadError} text="Cargando jugadores...">
      <div className="players-page">
      <div className="players-header">
        <div className="players-header-left">
          <h1 className="players-title">Jugadores</h1>
          <span className="players-count">{registeredPlayers.length} registrados</span>
          {user?.is_staff && (
            <>
              <button
                className={`refresh-stats-btn ${cooldownRemaining > 0 ? 'on-cooldown' : ''}`}
                onClick={handleRefreshStats}
                disabled={refreshing || cooldownRemaining > 0}
                title="Refrescar estadísticas desde osu! (Admin)"
              >
                {refreshing ? (
                  <img src={catGif} alt="" className="btn-loading-cat" />
                ) : (
                  <RefreshCw size={16} />
                )}
                {refreshing
                  ? 'Refrescando...'
                  : cooldownRemaining > 0
                    ? `${Math.floor(cooldownRemaining / 60000)}:${String(Math.floor((cooldownRemaining % 60000) / 1000)).padStart(2, '0')}`
                    : 'Refrescar Stats'}
              </button>
              {refreshResult && (
                <span className={`refresh-result ${refreshResult.success ? 'success' : 'error'}`}>
                  {refreshResult.success
                    ? `✓ ${refreshResult.updated} actualizados`
                    : `✗ ${refreshResult.message}`}
                </span>
              )}
            </>
          )}
        </div>
        <div className="players-header-right">
          <UsersIcon />
        </div>
      </div>

      <p className="players-subtitle">Lista de jugadores registrados en el torneo · Rangos nacionales (Perú)</p>

      <div className="players-filters">
        <div className="filter-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar jugador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="pp">Ordenar por PP</option>
          <option value="rank">Ordenar por Rank</option>
          <option value="name">Ordenar por Nombre</option>
        </select>
        <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}>
          <option value="all">Todos los países</option>
          {countries.map(code => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>
      </div>

      {filteredPlayers.length === 0 ? (
        <div className="players-empty">
          <p>No se encontraron jugadores.</p>
        </div>
      ) : (
        <div className="players-grid">
          {filteredPlayers.map(player => (
            <a
              key={player.id}
              href={`https://osu.ppy.sh/users/${player.osu_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="player-card"
            >
              <div className={`player-seed-container ${player.seed_number === 1 ? 'gold' : player.seed_number === 2 ? 'silver' : player.seed_number === 3 ? 'bronze' : ''}`}>
                <span className={`player-seed ${!player.seed_number ? 'unranked' : ''}`}>
                  {player.seed_number || '—'}
                </span>
              </div>
              <img
                src={`https://a.ppy.sh/${player.osu_id}`}
                alt={player.username}
                className="player-avatar"
              />
              <div className="player-info">
                <span className="player-name">{player.username}</span>
                <div className="player-stats">
                  {player.mania_country_rank && (
                    <span className="player-country-rank">#{player.mania_country_rank}</span>
                  )}
                  {player.mania_pp && (
                    <span className="player-pp">{Math.round(player.mania_pp).toLocaleString()}<span className="pp-label">pp</span></span>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
    </PageTransition>
  );
}

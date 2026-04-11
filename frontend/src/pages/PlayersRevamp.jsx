import { useEffect, useState, useMemo, useRef } from 'react';
import { api } from '../api';
import Spinner from '../components/Spinner';
import catGif from '../assets/cat.gif';
import './PlayersRevamp.css';

const REFRESH_COOLDOWN_MS = 5 * 60 * 1000;
const REFRESH_COOLDOWN_KEY = 'players_refresh_timestamp';

export default function PlayersRevamp({ user }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('seed');
  const [hoveredPlayer, setHoveredPlayer] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const spotlightRef = useRef(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPlayers(); }, []);

  const handleRefreshStats = async () => {
    if (cooldownRemaining > 0) return;
    setRefreshing(true);
    setRefreshResult(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/users/sync-stats`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Error');
      localStorage.setItem(REFRESH_COOLDOWN_KEY, Date.now().toString());
      setCooldownRemaining(REFRESH_COOLDOWN_MS);
      setRefreshResult({ success: true, updated: data.updated });
      fetchPlayers();
    } catch (err) {
      setRefreshResult({ success: false, message: err.message });
    } finally {
      setRefreshing(false);
    }
  };

  const registeredPlayers = useMemo(() => players.filter(p => p.is_registered), [players]);

  const stats = useMemo(() => {
    const totalPP = registeredPlayers.reduce((sum, p) => sum + (p.mania_pp || 0), 0);
    const seededCount = registeredPlayers.filter(p => p.seed_number).length;
    return {
      total: registeredPlayers.length,
      seeded: seededCount,
      avgPP: registeredPlayers.length > 0 ? Math.round(totalPP / registeredPlayers.length) : 0,
      maxPP: Math.max(...registeredPlayers.map(p => p.mania_pp || 0), 0),
    };
  }, [registeredPlayers]);

  const sortedPlayers = useMemo(() => {
    let result = [...registeredPlayers];
    if (search) {
      result = result.filter(p => p.username.toLowerCase().includes(search.toLowerCase()));
    }
    result.sort((a, b) => {
      if (sortBy === 'seed') return (a.seed_number || 9999) - (b.seed_number || 9999);
      if (sortBy === 'pp') return (b.mania_pp || 0) - (a.mania_pp || 0);
      if (sortBy === 'name') return a.username.localeCompare(b.username);
      return 0;
    });
    return result;
  }, [registeredPlayers, search, sortBy]);

  const champion = useMemo(() => {
    return registeredPlayers.find(p => p.seed_number === 1);
  }, [registeredPlayers]);

  // Mouse spotlight effect
  const handleMouseMove = (e) => {
    if (spotlightRef.current) {
      const rect = spotlightRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      spotlightRef.current.style.setProperty('--mouse-x', `${x}px`);
      spotlightRef.current.style.setProperty('--mouse-y', `${y}px`);
    }
  };

  if (loading) return <Spinner size="large" text="Cargando jugadores..." />;

  return (
    <div className="pr" ref={spotlightRef} onMouseMove={handleMouseMove}>
      <div className="pr-spotlight" />

      {/* Floating Particles */}
      <div className="pr-particles">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="pr-particle" style={{
            '--delay': `${i * 0.5}s`,
            '--x': `${Math.random() * 100}%`,
            '--duration': `${15 + Math.random() * 10}s`
          }} />
        ))}
      </div>

      {/* Champion Spotlight */}
      {champion && !search && (
        <section className="pr-champion">
          <div className="pr-champion-glow" />
          <div className="pr-champion-content">
            <div className="pr-champion-badge">TOP SEED</div>
            <a
              href={`https://osu.ppy.sh/users/${champion.osu_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="pr-champion-card"
            >
              <div className="pr-champion-avatar-wrap">
                <img
                  src={`https://a.ppy.sh/${champion.osu_id}`}
                  alt=""
                  className="pr-champion-avatar"
                />
                <div className="pr-champion-ring" />
                <div className="pr-champion-ring pr-champion-ring-2" />
              </div>
              <div className="pr-champion-info">
                <h2 className="pr-champion-name">{champion.username}</h2>
                <div className="pr-champion-stats">
                  <div className="pr-champion-stat">
                    <span className="pr-champion-stat-value">
                      {Math.round(champion.mania_pp || 0).toLocaleString()}
                    </span>
                    <span className="pr-champion-stat-label">PP</span>
                  </div>
                  <div className="pr-champion-stat">
                    <span className="pr-champion-stat-value">
                      #{champion.mania_country_rank || '—'}
                    </span>
                    <span className="pr-champion-stat-label">{champion.flag_code}</span>
                  </div>
                </div>
              </div>
            </a>
          </div>
        </section>
      )}

      {/* Stats Bar */}
      <div className="pr-stats-bar">
        <div className="pr-stat-item">
          <span className="pr-stat-num">{stats.total}</span>
          <span className="pr-stat-txt">PLAYERS</span>
        </div>
        <div className="pr-stat-divider" />
        <div className="pr-stat-item">
          <span className="pr-stat-num">{stats.seeded}</span>
          <span className="pr-stat-txt">SEEDED</span>
        </div>
        <div className="pr-stat-divider" />
        <div className="pr-stat-item">
          <span className="pr-stat-num">{stats.avgPP.toLocaleString()}</span>
          <span className="pr-stat-txt">AVG PP</span>
        </div>
        <div className="pr-stat-divider" />
        <div className="pr-stat-item pr-stat-highlight">
          <span className="pr-stat-num">{Math.round(stats.maxPP).toLocaleString()}</span>
          <span className="pr-stat-txt">TOP PP</span>
        </div>
      </div>

      {/* Controls */}
      <div className="pr-controls">
        <div className="pr-search-wrap">
          <input
            type="text"
            className="pr-search"
            placeholder="Search player..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="pr-search-line" />
        </div>

        <div className="pr-sort-tabs">
          {[
            { key: 'seed', label: 'SEED' },
            { key: 'pp', label: 'PP' },
            { key: 'name', label: 'A-Z' },
          ].map(tab => (
            <button
              key={tab.key}
              className={`pr-sort-tab ${sortBy === tab.key ? 'active' : ''}`}
              onClick={() => setSortBy(tab.key)}
            >
              {tab.label}
              {sortBy === tab.key && <div className="pr-sort-tab-indicator" />}
            </button>
          ))}
        </div>

        {user?.is_staff && (
          <button
            className={`pr-sync-btn ${refreshing ? 'loading' : ''} ${cooldownRemaining > 0 ? 'cooldown' : ''}`}
            onClick={handleRefreshStats}
            disabled={refreshing || cooldownRemaining > 0}
          >
            {refreshing ? (
              <img src={catGif} alt="" />
            ) : cooldownRemaining > 0 ? (
              `${Math.floor(cooldownRemaining / 60000)}:${String(Math.floor((cooldownRemaining % 60000) / 1000)).padStart(2, '0')}`
            ) : (
              'SYNC'
            )}
          </button>
        )}
      </div>

      {/* Player Grid - Masonry Style */}
      {sortedPlayers.length === 0 ? (
        <div className="pr-empty">
          <div className="pr-empty-icon">?</div>
          <p>No players found</p>
        </div>
      ) : (
        <div className="pr-grid">
          {sortedPlayers.map((player, idx) => {
            const isTop3 = player.seed_number && player.seed_number <= 3;
            const isHovered = hoveredPlayer === player.id;

            return (
              <a
                key={player.id}
                href={`https://osu.ppy.sh/users/${player.osu_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`pr-card ${isTop3 ? 'pr-card-featured' : ''} ${isHovered ? 'pr-card-hover' : ''}`}
                style={{ '--i': idx }}
                onMouseEnter={() => setHoveredPlayer(player.id)}
                onMouseLeave={() => setHoveredPlayer(null)}
              >
                {/* Background gradient based on PP */}
                <div
                  className="pr-card-bg"
                  style={{ '--pp-percent': `${Math.min((player.mania_pp || 0) / stats.maxPP * 100, 100)}%` }}
                />

                {/* Seed Badge */}
                {player.seed_number && (
                  <div className={`pr-card-seed ${player.seed_number <= 3 ? 'top' : ''}`}>
                    {player.seed_number}
                  </div>
                )}

                {/* Avatar */}
                <div className="pr-card-avatar-wrap">
                  <img
                    src={`https://a.ppy.sh/${player.osu_id}`}
                    alt=""
                    className="pr-card-avatar"
                  />
                  {player.flag_code && (
                    <img
                      src={`https://flagcdn.com/w80/${player.flag_code.toLowerCase()}.png`}
                      alt=""
                      className="pr-card-flag"
                    />
                  )}
                </div>

                {/* Info */}
                <div className="pr-card-info">
                  <span className="pr-card-name">{player.username}</span>
                  <div className="pr-card-meta">
                    <span className="pr-card-pp">
                      {Math.round(player.mania_pp || 0).toLocaleString()}
                      <small>pp</small>
                    </span>
                    {player.mania_country_rank && (
                      <span className="pr-card-rank">
                        #{player.mania_country_rank}
                      </span>
                    )}
                  </div>
                </div>

                {/* Hover Shine Effect */}
                <div className="pr-card-shine" />
              </a>
            );
          })}
        </div>
      )}

      {/* Footer Accent */}
      <div className="pr-footer-accent" />
    </div>
  );
}

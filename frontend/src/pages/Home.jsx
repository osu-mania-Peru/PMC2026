import { useEffect, useState } from 'react';
import { api } from '../api';
import { Link } from 'react-router-dom';
import './Home.css';

const timelineEvents = [
  { date: '16/01 - 01/02', title: 'Registros', id: 'registros' },
  { date: '01/02 - 08/02', title: 'Screening', id: 'screening' },
  { date: '08/02', title: 'Qualifiers Showcase', id: 'showcase' },
  { date: '13/02 - 15/02', title: 'Qualifiers', id: 'qualifiers' },
  { date: '27/02 - 01/03', title: 'Round of 16', id: 'ro16' },
  { date: '06/03 - 08/03', title: 'Quarterfinals', id: 'quarters' },
  { date: '13/03 - 15/03', title: 'Semifinals', id: 'semis' },
  { date: '20/03 - 22/03', title: 'Finals', id: 'finals' },
  { date: '27/03 - 29/03', title: 'Grand Finals', id: 'grandfinals' },
];

export default function Home({ user }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    api.getTournamentStatus().then(setStatus).catch(console.error);
  }, []);

  return (
    <div className="home-page">
      {/* Hero Section */}
      <div className="home-hero">
        <div className="hero-left">
          <h1 className="hero-title">
            Peru Mania<br />
            <span>Cup 2026</span>
          </h1>
          <p className="hero-subtitle">
            El torneo de osu!mania 4K más grande de Perú.
          </p>
          <div className="hero-cta">
            {!user ? (
              <>
                <button onClick={api.login} className="cta-button">
                  Inscribirse
                </button>
                <Link to="/brackets" className="cta-button secondary">
                  Ver Brackets
                </Link>
              </>
            ) : !user.is_registered && status?.registration_open ? (
              <>
                <Link to="/register" className="cta-button">
                  Inscribirse
                </Link>
                <Link to="/brackets" className="cta-button secondary">
                  Ver Brackets
                </Link>
              </>
            ) : (
              <Link to="/brackets" className="cta-button">
                Ver Brackets
              </Link>
            )}
          </div>

          {/* Stats inline */}
          {status && (
            <div className="hero-stats">
              <div className="stat-block">
                <div className="stat-number">{status.total_registered_players}</div>
                <div className="stat-label">Jugadores</div>
              </div>
              <div className="stat-block">
                <div className="stat-number">/32</div>
                <div className="stat-label">Cupos</div>
              </div>
              <div className="stat-block">
                <div className={`stat-number ${status.registration_open ? 'accent' : ''}`}>
                  {status.registration_open ? 'Abierta' : 'Cerrada'}
                </div>
                <div className="stat-label">Inscripción</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="quick-links">
        <Link to="/maps" className="quick-link">
          <div className="quick-link-text">
            <h3>mappool qualifiers</h3>
            <p>Descarga y estadísticas del mappool</p>
          </div>
          <span className="quick-link-arrow">→</span>
        </Link>
        <Link to="/players" className="quick-link">
          <div className="quick-link-text">
            <h3>jugadores inscritos</h3>
            <p>Lista completa de participantes</p>
          </div>
          <span className="quick-link-arrow">→</span>
        </Link>
        <Link to="/matches" className="quick-link">
          <div className="quick-link-text">
            <h3>partidas</h3>
            <p>Resultados y próximos enfrentamientos</p>
          </div>
          <span className="quick-link-arrow">→</span>
        </Link>
      </div>

      {/* Timeline */}
      <div className="timeline-section">
        <div className="section-header">
          <h2>Cronograma</h2>
          <span className="section-note">Sujeto a cambios</span>
        </div>
        <div className="timeline-track">
          <div className="timeline-line"></div>
          {timelineEvents.map((event, index) => (
            <div
              key={event.id}
              className={`timeline-event ${event.id === 'registros' ? 'active' : ''}`}
            >
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <span className="timeline-event-title">{event.title}</span>
                <span className="timeline-event-date">{event.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Status */}
      {user && (
        <div className={`user-status ${user.is_registered ? 'registered' : ''}`}>
          <div className="user-status-left">
            {user.is_registered ? (
              <>
                <h3>Estás inscrito</h3>
                <p>Buena suerte en el torneo, {user.username}</p>
              </>
            ) : (
              <>
                <h3>Hola, {user.username}</h3>
                <p>Aún no estás inscrito en el torneo</p>
              </>
            )}
          </div>
          {user.is_registered && user.seed_number && (
            <div className="seed-badge">#{user.seed_number}</div>
          )}
          {!user.is_registered && status?.registration_open && (
            <Link to="/register" className="cta-button">
              Inscribirse
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

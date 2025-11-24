import { useEffect, useState } from 'react';
import { api } from '../api';
import { Link, useNavigate } from 'react-router-dom';
import './Home.css';

export default function Home({ user }) {
  const [status, setStatus] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.getTournamentStatus().then(setStatus).catch(console.error);
  }, []);

  return (
    <div className="home-bento">
      {/* Timeline - Large Left Section */}
      <div className="bento-timeline">
        <h2>CRONOGRAMA</h2>
        <div className="timeline-item">
          <div className="timeline-date">16/01/26 - 01/02/26</div>
          <div className="timeline-content">
            <h3>REGISTROS</h3>
          </div>
        </div>
        <div className="timeline-item">
          <div className="timeline-date">01/02/26 - 08/02/26</div>
          <div className="timeline-content">
            <h3>SCREENING</h3>
          </div>
        </div>
        <div className="timeline-item">
          <div className="timeline-date">08/02/26</div>
          <div className="timeline-content">
            <h3>QUALIFIERS SHOWCASE</h3>
          </div>
        </div>
        <div className="timeline-item">
          <div className="timeline-date">13/02/26 - 15/02/26</div>
          <div className="timeline-content">
            <h3>QUALIFIERS</h3>
          </div>
        </div>
        <div className="timeline-item">
          <div className="timeline-date">20/02/26 - 22/02/26</div>
          <div className="timeline-content">
            <h3>ROUND OF 32</h3>
          </div>
        </div>
        <div className="timeline-item">
          <div className="timeline-date">27/02/26 - 01/03/26</div>
          <div className="timeline-content">
            <h3>ROUND OF 16</h3>
          </div>
        </div>
        <div className="timeline-item">
          <div className="timeline-date">06/03/26 - 08/03/26</div>
          <div className="timeline-content">
            <h3>QUARTERFINALS</h3>
          </div>
        </div>
        <div className="timeline-item">
          <div className="timeline-date">13/03/26 - 15/03/26</div>
          <div className="timeline-content">
            <h3>SEMIFINALS</h3>
          </div>
        </div>
        <div className="timeline-item">
          <div className="timeline-date">20/03/26 - 22/03/26</div>
          <div className="timeline-content">
            <h3>FINALS</h3>
          </div>
        </div>
        <div className="timeline-item">
          <div className="timeline-date">27/03/26 - 29/03/26</div>
          <div className="timeline-content">
            <h3>GRANDFINALS</h3>
          </div>
        </div>
      </div>

      {/* Stats - Top Right */}
      {status && (
        <div className="bento-stats">
          <div className="stat-item">
            <div className="stat-label">ESTADO</div>
            <div className="stat-value">{status.status}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">JUGADORES</div>
            <div className="stat-value">{status.total_registered_players}/32</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">INSCRIPCIÓN</div>
            <div className="stat-value">{status.registration_open ? 'ABIERTA' : 'CERRADA'}</div>
          </div>
        </div>
      )}

      {/* Mappool Card */}
      <div className="bento-mappool">
        <div>
          <h3 className="bento-card-title">mappool qualifiers</h3>
          <p className="bento-card-description">Descarga y estadísticas del mappool</p>
        </div>
        <Link to="/maps" className="bento-button">VER MAPPOOL</Link>
      </div>

      {/* Registration Card */}
      <div className="bento-registration">
        <div>
          <h3 className="bento-card-title">inscripción de equipos</h3>
          <p className="bento-card-description">Las inscripciones cierran POR DEFINIR a las 00:00 UTC</p>
        </div>
        {user && !user.is_registered && status?.registration_open ? (
          <Link to="/register" className="bento-button">INSCRIBIRSE</Link>
        ) : !user ? (
          <button onClick={api.login} className="bento-button">INICIAR SESIÓN</button>
        ) : (
          <div className="unavailable-text">¡INSCRITO!</div>
        )}
      </div>

      {/* Action Card - Bottom Right */}
      {!user ? (
        <div className="bento-action">
          <h3>COMIENZA AQUÍ</h3>
          <p>Inicia sesión con tu cuenta de osu! para inscribirte al torneo.</p>
          <button onClick={api.login} className="bento-button">INICIAR SESIÓN</button>
        </div>
      ) : user.is_registered ? (
        <div className="bento-action registered">
          <h3>¡ESTÁS INSCRITO!</h3>
          <p>Número de Seed: {user.seed_number || 'Por Determinar'}</p>
          <p>¡Buena suerte en el torneo!</p>
        </div>
      ) : (
        <div className="bento-action">
          <h3>INSCRÍBETE AHORA</h3>
          <Link to="/register" className="bento-button">INSCRIBIRSE AL PMC2026</Link>
        </div>
      )}
    </div>
  );
}

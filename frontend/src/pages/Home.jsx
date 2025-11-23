import { useEffect, useState } from 'react';
import { api } from '../api';
import { Link } from 'react-router-dom';

export default function Home({ user }) {
  const [status, setStatus] = useState(null);
  const [registrations, setRegistrations] = useState(null);

  useEffect(() => {
    api.getTournamentStatus().then(setStatus).catch(console.error);
    api.getRegistrations().then(setRegistrations).catch(console.error);
  }, []);

  return (
    <div className="page">
      <h2>Peru Mania Cup 2025</h2>
      <p>Bienvenido a la plataforma oficial del torneo Peru Mania Cup de osu!.</p>

      {status && (
        <div className="stats">
          <div className="stat-box">
            <h4>Estado del Torneo</h4>
            <div className="value">{status.status}</div>
          </div>
          <div className="stat-box">
            <h4>Jugadores Registrados</h4>
            <div className="value">{status.total_registered_players}/32</div>
          </div>
          <div className="stat-box">
            <h4>Registro</h4>
            <div className="value">{status.registration_open ? 'Abierto' : 'Cerrado'}</div>
          </div>
        </div>
      )}

      {status?.current_bracket && (
        <div className="bracket-card">
          <h3>Ronda Actual</h3>
          <p><strong>{status.current_bracket.bracket_name}</strong></p>
          <p>Tamaño: {status.current_bracket.bracket_size} jugadores</p>
          <Link to="/brackets">Ver Brackets →</Link>
        </div>
      )}

      {!user && (
        <div className="stat-box" style={{ marginTop: '2rem' }}>
          <h4>Comenzar</h4>
          <p>Inicia sesión con tu cuenta de osu! para registrarte al torneo.</p>
          <Link to="/login" className="button" style={{ marginTop: '1rem' }}>
            Iniciar Sesión con osu!
          </Link>
        </div>
      )}

      {user && !user.is_registered && status?.registration_open && (
        <div className="stat-box" style={{ marginTop: '2rem' }}>
          <h4>Regístrate Ahora</h4>
          <p>¡El registro está abierto! Inscríbete para competir en Peru Mania Cup 2025.</p>
          <Link to="/register" className="button" style={{ marginTop: '1rem' }}>
            Registrarse al Torneo
          </Link>
        </div>
      )}

      {user?.is_registered && (
        <div className="stat-box" style={{ marginTop: '2rem', borderLeftColor: '#90ee90' }}>
          <h4>¡Estás Registrado!</h4>
          <p>Número de Seed: {user.seed_number || 'Por Determinar'}</p>
          <p>¡Buena suerte en el torneo!</p>
        </div>
      )}

      <div style={{ marginTop: '3rem' }}>
        <h3>Enlaces Rápidos</h3>
        <ul className="list">
          <li className="list-item"><Link to="/brackets">Ver Brackets del Torneo</Link></li>
          <li className="list-item"><Link to="/matches">Ver Calendario de Partidas</Link></li>
          <li className="list-item"><Link to="/players">Jugadores Registrados</Link></li>
          <li className="list-item"><Link to="/maps">Pool de Mapas</Link></li>
        </ul>
      </div>
    </div>
  );
}

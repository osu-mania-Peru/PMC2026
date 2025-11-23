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
      <p>Welcome to the official Peru Mania Cup osu! tournament platform.</p>

      {status && (
        <div className="stats">
          <div className="stat-box">
            <h4>Tournament Status</h4>
            <div className="value">{status.status}</div>
          </div>
          <div className="stat-box">
            <h4>Registered Players</h4>
            <div className="value">{status.total_registered_players}/32</div>
          </div>
          <div className="stat-box">
            <h4>Registration</h4>
            <div className="value">{status.registration_open ? 'Open' : 'Closed'}</div>
          </div>
        </div>
      )}

      {status?.current_bracket && (
        <div className="bracket-card">
          <h3>Current Round</h3>
          <p><strong>{status.current_bracket.bracket_name}</strong></p>
          <p>Size: {status.current_bracket.bracket_size} players</p>
          <Link to="/brackets">View Brackets →</Link>
        </div>
      )}

      {!user && (
        <div className="stat-box" style={{ marginTop: '2rem' }}>
          <h4>Get Started</h4>
          <p>Login with your osu! account to register for the tournament.</p>
          <Link to="/login" className="button" style={{ marginTop: '1rem' }}>
            Login with osu!
          </Link>
        </div>
      )}

      {user && !user.is_registered && status?.registration_open && (
        <div className="stat-box" style={{ marginTop: '2rem' }}>
          <h4>Register Now</h4>
          <p>Registration is open! Sign up to compete in Peru Mania Cup 2025.</p>
          <Link to="/register" className="button" style={{ marginTop: '1rem' }}>
            Register for Tournament
          </Link>
        </div>
      )}

      {user?.is_registered && (
        <div className="stat-box" style={{ marginTop: '2rem', borderLeftColor: '#90ee90' }}>
          <h4>✓ You're Registered!</h4>
          <p>Seed Number: {user.seed_number || 'TBD'}</p>
          <p>Good luck in the tournament!</p>
        </div>
      )}

      <div style={{ marginTop: '3rem' }}>
        <h3>Quick Links</h3>
        <ul className="list">
          <li className="list-item"><Link to="/brackets">View Tournament Brackets</Link></li>
          <li className="list-item"><Link to="/matches">View Match Schedule</Link></li>
          <li className="list-item"><Link to="/players">Registered Players</Link></li>
          <li className="list-item"><Link to="/maps">Map Pool</Link></li>
        </ul>
      </div>
    </div>
  );
}

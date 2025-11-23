import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Register({ user, setUser }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getTournamentStatus().then(setStatus).catch(console.error);
  }, []);

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.register();
      setUser(result.user);
      alert('Successfully registered for the tournament!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnregister = async () => {
    if (!confirm('Are you sure you want to unregister?')) return;

    setLoading(true);
    setError(null);
    try {
      await api.unregister();
      const updatedUser = await api.getMe();
      setUser(updatedUser);
      alert('Successfully unregistered from the tournament.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!status) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <h2>Tournament Registration</h2>

      {error && <div className="error">{error}</div>}

      {user.is_registered ? (
        <div>
          <div className="stat-box" style={{ borderLeftColor: '#90ee90' }}>
            <h4>You are registered!</h4>
            <p>Username: <strong>{user.username}</strong></p>
            <p>Country: <strong>{user.flag_code}</strong></p>
            <p>Seed Number: <strong>{user.seed_number || 'TBD'}</strong></p>
            <p>Registered: <strong>{user.registered_at ? new Date(user.registered_at).toLocaleDateString() : 'N/A'}</strong></p>
          </div>

          <button
            onClick={handleUnregister}
            disabled={loading}
            style={{ marginTop: '1rem', background: '#d44', border: 'none' }}
          >
            {loading ? 'Processing...' : 'Unregister'}
          </button>
        </div>
      ) : status.registration_open ? (
        <div>
          <div className="stat-box">
            <h4>Registration is Open</h4>
            <p>Spots Remaining: <strong>{32 - status.total_registered_players}/32</strong></p>
            <p>Your Username: <strong>{user.username}</strong></p>
            <p>Your Country: <strong>{user.flag_code}</strong></p>
          </div>

          <button onClick={handleRegister} disabled={loading} style={{ marginTop: '1rem' }}>
            {loading ? 'Registering...' : 'Register for Tournament'}
          </button>
        </div>
      ) : (
        <div className="error">
          Registration is currently closed.
        </div>
      )}
    </div>
  );
}

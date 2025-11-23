import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Players() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRegisteredPlayers()
      .then(data => setPlayers(data.users))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <h2>Registered Players</h2>
      <p>Total: {players.length}/32</p>

      <table>
        <thead>
          <tr>
            <th>Seed</th>
            <th>Username</th>
            <th>Country</th>
            <th>osu! ID</th>
          </tr>
        </thead>
        <tbody>
          {players
            .sort((a, b) => (a.seed_number || 999) - (b.seed_number || 999))
            .map(player => (
              <tr key={player.id}>
                <td>{player.seed_number || '-'}</td>
                <td>
                  <a
                    href={`https://osu.ppy.sh/users/${player.osu_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {player.username}
                  </a>
                </td>
                <td>{player.flag_code}</td>
                <td>{player.osu_id}</td>
              </tr>
            ))}
        </tbody>
      </table>

      {players.length === 0 && (
        <p>No players registered yet.</p>
      )}
    </div>
  );
}

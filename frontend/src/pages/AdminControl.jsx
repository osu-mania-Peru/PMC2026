import { useState, useEffect } from 'react';
import { api } from '../api';
import './AdminControl.css';

export default function AdminControl({ user }) {
  // --- State ---
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState('');

  // Users
  const [users, setUsers] = useState([]);
  const [staffUserId, setStaffUserId] = useState('');
  const [staffValue, setStaffValue] = useState(true);

  // Brackets
  const [brackets, setBrackets] = useState([]);
  const [bracketSize, setBracketSize] = useState(8);
  const [bracketMatches, setBracketMatches] = useState([]);
  const [selectedBracketId, setSelectedBracketId] = useState('');

  // Matches
  const [matches, setMatches] = useState([]);
  const [matchForm, setMatchForm] = useState({ bracket_id: '', player1_id: '', player2_id: '', map_id: '', round_name: '' });
  const [scoreForm, setScoreForm] = useState({ match_id: '', player1_score: '', player2_score: '', winner_id: '' });
  const [updateMatchForm, setUpdateMatchForm] = useState({ match_id: '', player1_score: '', player2_score: '', winner_id: '', match_status: '' });

  // Mappools
  const [mappools, setMappools] = useState([]);
  const [mappoolForm, setMappoolForm] = useState({ name: '', description: '', round_name: '', is_visible: true });
  const [mappoolMapForm, setMappoolMapForm] = useState({ pool_id: '', beatmap_id: '', slot_id: '', slot_number: '' });
  const [beatmapLookup, setBeatmapLookup] = useState('');
  const [beatmapResult, setBeatmapResult] = useState(null);

  // Slots
  const [slots, setSlots] = useState([]);
  const [slotForm, setSlotForm] = useState({ name: '', short_name: '', color: '#ffffff', slot_order: '' });

  // Timeline
  const [timeline, setTimeline] = useState([]);
  const [timelineForm, setTimelineForm] = useState({ title: '', description: '', event_date: '', status: 'upcoming' });

  // News
  const [news, setNews] = useState([]);
  const [newsForm, setNewsForm] = useState({ title: '', content: '', author: '' });

  // Whitelist
  const [whitelist, setWhitelist] = useState([]);
  const [whitelistName, setWhitelistName] = useState('');

  // API Keys
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');

  // --- Helpers ---
  const run = async (label, fn) => {
    setLoading(true);
    setLastError('');
    try {
      const result = await fn();
      return result;
    } catch (err) {
      setLastError(`${label}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Users ---
  const fetchUsers = () => run('GET Users', async () => {
    const data = await api.fetch('/users/all');
    setUsers(Array.isArray(data) ? data : data.users || []);
    return data;
  });

  const syncStats = () => run('Sync Stats', () => api.fetch('/users/sync-stats', { method: 'POST' }));

  const setStaff = () => run(`Set Staff user=${staffUserId}`, () =>
    api.fetch(`/users/${staffUserId}/staff`, {
      method: 'PATCH',
      body: JSON.stringify({ is_staff: staffValue }),
    })
  );

  const unregisterUser = (id) => run(`Unregister ${id}`, () => api.fetch(`/users/${id}/registration`, { method: 'DELETE' }));
  const deleteUser = (id) => {
    if (!confirm(`Delete user ${id}?`)) return;
    run(`Delete user ${id}`, () => api.fetch(`/users/${id}`, { method: 'DELETE' }));
  };

  // --- Brackets ---
  const fetchBrackets = () => run('GET Brackets', async () => {
    const data = await api.fetch('/brackets');
    setBrackets(data.brackets || []);
    return data;
  });

  const generateBrackets = () => run(`Generate Brackets size=${bracketSize}`, () =>
    api.fetch('/brackets/generate', { method: 'POST', body: JSON.stringify({ bracket_size: bracketSize }) })
  );

  const fetchBracketMatches = () => run(`GET Bracket ${selectedBracketId} Matches`, async () => {
    const data = await api.fetch(`/brackets/${selectedBracketId}/matches`);
    setBracketMatches(data.matches || []);
    return data;
  });

  // --- Matches ---
  const fetchMatches = () => run('GET Matches', async () => {
    const data = await api.fetch('/matches');
    setMatches(Array.isArray(data) ? data : data.matches || []);
    return data;
  });

  const createMatch = () => run('Create Match', () =>
    api.fetch('/matches', {
      method: 'POST',
      body: JSON.stringify({
        bracket_id: Number(matchForm.bracket_id),
        player1_id: Number(matchForm.player1_id),
        player2_id: Number(matchForm.player2_id),
        map_id: Number(matchForm.map_id),
        round_name: matchForm.round_name,
      }),
    })
  );

  const submitScore = () => run(`Score Match ${scoreForm.match_id}`, () =>
    api.fetch(`/matches/${scoreForm.match_id}/score`, {
      method: 'PATCH',
      body: JSON.stringify({
        player1_score: Number(scoreForm.player1_score),
        player2_score: Number(scoreForm.player2_score),
        winner_id: Number(scoreForm.winner_id),
      }),
    })
  );

  const updateMatch = () => run(`Update Match ${updateMatchForm.match_id}`, () => {
    const body = {};
    if (updateMatchForm.player1_score) body.player1_score = Number(updateMatchForm.player1_score);
    if (updateMatchForm.player2_score) body.player2_score = Number(updateMatchForm.player2_score);
    if (updateMatchForm.winner_id) body.winner_id = Number(updateMatchForm.winner_id);
    if (updateMatchForm.match_status) body.match_status = updateMatchForm.match_status;
    return api.fetch(`/matches/${updateMatchForm.match_id}`, { method: 'PUT', body: JSON.stringify(body) });
  });

  const completeMatch = (id) => run(`Complete Match ${id}`, () =>
    api.fetch(`/matches/${id}/complete`, { method: 'PATCH' })
  );

  const deleteMatch = (id) => {
    if (!confirm(`Delete match ${id}?`)) return;
    run(`Delete Match ${id}`, () => api.fetch(`/matches/${id}`, { method: 'DELETE' }));
  };

  // --- Mappools ---
  const fetchMappools = () => run('GET Mappools', async () => {
    const data = await api.fetch('/mappools/all');
    setMappools(Array.isArray(data) ? data : data.mappools || []);
    return data;
  });

  const createMappool = () => run('Create Mappool', () =>
    api.fetch('/mappools', { method: 'POST', body: JSON.stringify(mappoolForm) })
  );

  const deleteMappool = (id) => {
    if (!confirm(`Delete mappool ${id}?`)) return;
    run(`Delete Mappool ${id}`, () => api.fetch(`/mappools/${id}`, { method: 'DELETE' }));
  };

  const lookupBeatmapFn = () => run(`Lookup Beatmap ${beatmapLookup}`, async () => {
    const data = await api.fetch(`/mappools/lookup/${beatmapLookup}`);
    setBeatmapResult(data);
    return data;
  });

  const addMapToPool = () => run('Add Map to Pool', () =>
    api.fetch(`/mappools/${mappoolMapForm.pool_id}/maps`, {
      method: 'POST',
      body: JSON.stringify({
        beatmap_id: Number(mappoolMapForm.beatmap_id),
        slot_id: Number(mappoolMapForm.slot_id),
        slot_number: Number(mappoolMapForm.slot_number),
      }),
    })
  );

  const deletePoolMap = (mapId) => run(`Delete Pool Map ${mapId}`, () =>
    api.fetch(`/mappools/maps/${mapId}`, { method: 'DELETE' })
  );

  const syncBeatmaps = () => run('Sync Beatmaps', () => api.fetch('/mappools/sync', { method: 'POST' }));
  const syncStatus = () => run('Sync Status', () => api.fetch('/mappools/sync/status'));

  // --- Slots ---
  const fetchSlots = () => run('GET Slots', async () => {
    const data = await api.fetch('/slots');
    setSlots(Array.isArray(data) ? data : data.slots || []);
    return data;
  });

  const createSlot = () => run('Create Slot', () =>
    api.fetch('/slots', { method: 'POST', body: JSON.stringify({ ...slotForm, slot_order: Number(slotForm.slot_order) }) })
  );

  const deleteSlot = (id) => run(`Delete Slot ${id}`, () => api.fetch(`/slots/${id}`, { method: 'DELETE' }));
  const seedSlots = () => run('Seed Slots', () => api.fetch('/slots/seed', { method: 'POST' }));

  // --- Timeline ---
  const fetchTimeline = () => run('GET Timeline', async () => {
    const data = await api.fetch('/timeline');
    setTimeline(Array.isArray(data) ? data : data.events || data.timeline || []);
    return data;
  });

  const addTimelineEvent = () => run('Add Timeline Event', () =>
    api.fetch('/timeline', { method: 'POST', body: JSON.stringify(timelineForm) })
  );

  const deleteTimelineEvent = (id) => run(`Delete Event ${id}`, () =>
    api.fetch(`/timeline/${id}`, { method: 'DELETE' })
  );

  // --- News ---
  const fetchNews = () => run('GET News', async () => {
    const data = await api.fetch('/news');
    setNews(Array.isArray(data) ? data : data.items || data.news || []);
    return data;
  });

  const addNewsItem = () => run('Add News', () =>
    api.fetch('/news', { method: 'POST', body: JSON.stringify(newsForm) })
  );

  const deleteNewsItem = (id) => run(`Delete News ${id}`, () =>
    api.fetch(`/news/${id}`, { method: 'DELETE' })
  );

  // --- Whitelist ---
  const fetchWhitelist = () => run('GET Whitelist', async () => {
    const data = await api.fetch('/whitelist');
    setWhitelist(Array.isArray(data) ? data : data.whitelist || []);
    return data;
  });

  const addWhitelist = () => run(`Add Whitelist: ${whitelistName}`, () =>
    api.fetch('/whitelist', { method: 'POST', body: JSON.stringify({ username: whitelistName }) })
  );

  const removeWhitelist = (name) => run(`Remove Whitelist: ${name}`, () =>
    api.fetch(`/whitelist/${encodeURIComponent(name)}`, { method: 'DELETE' })
  );

  // --- API Keys ---
  const fetchApiKeys = () => run('GET API Keys', async () => {
    const data = await api.fetch('/api-keys');
    setApiKeys(Array.isArray(data) ? data : data.keys || []);
    return data;
  });

  const generateApiKey = () => run('Generate API Key', async () => {
    const data = await api.fetch('/api-keys', { method: 'POST', body: JSON.stringify({ name: newKeyName }) });
    if (data.key) setGeneratedKey(data.key);
    return data;
  });

  const revokeApiKey = (id) => run(`Revoke Key ${id}`, () =>
    api.fetch(`/api-keys/${id}`, { method: 'DELETE' })
  );

  // --- Render ---
  if (!user?.is_staff) {
    return <p>Staff only. Login as staff to access.</p>;
  }

  return (
    <div className="admin-control">
      <h1>Admin Control Panel</h1>
      <p>Logged in as: <b>{user.username}</b> (staff)</p>
      {loading && <p><b>Loading...</b></p>}
      {lastError && <p className="admin-error">{lastError}</p>}

          {/* USERS */}
          <fieldset>
            <legend><b>Users</b></legend>
            <button onClick={fetchUsers}>Load Users</button>{' '}
            <button onClick={syncStats}>Sync osu! Stats</button>
            <br /><br />
            <label>Set Staff: User ID </label>
            <input type="number" value={staffUserId} onChange={e => setStaffUserId(e.target.value)} style={{ width: '60px' }} />
            <select value={staffValue} onChange={e => setStaffValue(e.target.value === 'true')}>
              <option value="true">Staff=true</option>
              <option value="false">Staff=false</option>
            </select>
            <button onClick={setStaff}>Apply</button>
            {users.length > 0 && (
              <table>
                <thead>
                  <tr><th>ID</th><th>Username</th><th>osu_id</th><th>Staff</th><th>Registered</th><th>Seed</th><th>Rank</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td>{u.username}</td>
                      <td>{u.osu_id}</td>
                      <td>{u.is_staff ? 'Y' : 'N'}</td>
                      <td>{u.is_registered ? 'Y' : 'N'}</td>
                      <td>{u.seed_number ?? '-'}</td>
                      <td>{u.mania_rank ?? '-'}</td>
                      <td>
                        <button onClick={() => unregisterUser(u.id)}>Unreg</button>
                        <button onClick={() => deleteUser(u.id)}>Del</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </fieldset>

          {/* BRACKETS */}
          <fieldset>
            <legend><b>Brackets</b></legend>
            <button onClick={fetchBrackets}>Load Brackets</button>{' '}
            <select value={bracketSize} onChange={e => setBracketSize(Number(e.target.value))}>
              <option value={4}>4</option>
              <option value={8}>8</option>
              <option value={16}>16</option>
              <option value={32}>32</option>
            </select>
            <button onClick={generateBrackets}>Generate Brackets</button>
            {brackets.length > 0 && (
              <table >
                <thead>
                  <tr><th>ID</th><th>Name</th><th>Type</th><th>Size</th><th>Matches</th><th>Completed</th></tr>
                </thead>
                <tbody>
                  {brackets.map(b => (
                    <tr key={b.id}>
                      <td>{b.id}</td>
                      <td>{b.bracket_name}</td>
                      <td>{b.bracket_type}</td>
                      <td>{b.bracket_size}</td>
                      <td>{b.total_matches}</td>
                      <td>{b.completed_matches}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <br />
            <label>Bracket ID: </label>
            <input type="number" value={selectedBracketId} onChange={e => setSelectedBracketId(e.target.value)} style={{ width: '50px' }} />
            <button onClick={fetchBracketMatches}>Load Matches</button>
            {bracketMatches.length > 0 && (
              <table >
                <thead>
                  <tr><th>ID</th><th>Round</th><th>P1</th><th>P2</th><th>Score</th><th>Winner</th><th>Status</th><th>Next</th><th>Loser→</th></tr>
                </thead>
                <tbody>
                  {bracketMatches.map(m => (
                    <tr key={m.id} className={m.is_completed ? 'completed-row' : ''}>
                      <td>{m.id}</td>
                      <td>{m.round_name}</td>
                      <td>{m.player1_username}</td>
                      <td>{m.player2_username}</td>
                      <td>{m.player1_score ?? '-'} / {m.player2_score ?? '-'}</td>
                      <td>{m.winner_username || '-'}</td>
                      <td>{m.match_status}</td>
                      <td>{m.next_match_id ?? '-'}</td>
                      <td>{m.loser_next_match_id ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </fieldset>

          {/* MATCHES */}
          <fieldset>
            <legend><b>Matches</b></legend>
            <button onClick={fetchMatches}>Load All Matches</button>
            <br /><br />
            <b>Create Match:</b><br />
            <label>bracket_id:</label><input type="number" value={matchForm.bracket_id} onChange={e => setMatchForm({ ...matchForm, bracket_id: e.target.value })} style={{ width: '50px' }} />
            <label> p1_id:</label><input type="number" value={matchForm.player1_id} onChange={e => setMatchForm({ ...matchForm, player1_id: e.target.value })} style={{ width: '50px' }} />
            <label> p2_id:</label><input type="number" value={matchForm.player2_id} onChange={e => setMatchForm({ ...matchForm, player2_id: e.target.value })} style={{ width: '50px' }} />
            <label> map_id:</label><input type="number" value={matchForm.map_id} onChange={e => setMatchForm({ ...matchForm, map_id: e.target.value })} style={{ width: '50px' }} />
            <label> round:</label><input value={matchForm.round_name} onChange={e => setMatchForm({ ...matchForm, round_name: e.target.value })} style={{ width: '100px' }} />
            <button onClick={createMatch}>Create</button>
            <br /><br />
            <b>Submit Score:</b><br />
            <label>match_id:</label><input type="number" value={scoreForm.match_id} onChange={e => setScoreForm({ ...scoreForm, match_id: e.target.value })} style={{ width: '50px' }} />
            <label> p1_score:</label><input type="number" value={scoreForm.player1_score} onChange={e => setScoreForm({ ...scoreForm, player1_score: e.target.value })} style={{ width: '70px' }} />
            <label> p2_score:</label><input type="number" value={scoreForm.player2_score} onChange={e => setScoreForm({ ...scoreForm, player2_score: e.target.value })} style={{ width: '70px' }} />
            <label> winner_id:</label><input type="number" value={scoreForm.winner_id} onChange={e => setScoreForm({ ...scoreForm, winner_id: e.target.value })} style={{ width: '50px' }} />
            <button onClick={submitScore}>Submit</button>
            <br /><br />
            <b>Update Match:</b><br />
            <label>match_id:</label><input type="number" value={updateMatchForm.match_id} onChange={e => setUpdateMatchForm({ ...updateMatchForm, match_id: e.target.value })} style={{ width: '50px' }} />
            <label> p1_score:</label><input type="number" value={updateMatchForm.player1_score} onChange={e => setUpdateMatchForm({ ...updateMatchForm, player1_score: e.target.value })} style={{ width: '70px' }} />
            <label> p2_score:</label><input type="number" value={updateMatchForm.player2_score} onChange={e => setUpdateMatchForm({ ...updateMatchForm, player2_score: e.target.value })} style={{ width: '70px' }} />
            <label> winner_id:</label><input type="number" value={updateMatchForm.winner_id} onChange={e => setUpdateMatchForm({ ...updateMatchForm, winner_id: e.target.value })} style={{ width: '50px' }} />
            <label> status:</label>
            <select value={updateMatchForm.match_status} onChange={e => setUpdateMatchForm({ ...updateMatchForm, match_status: e.target.value })}>
              <option value="">--</option>
              <option value="scheduled">scheduled</option>
              <option value="in_progress">in_progress</option>
              <option value="completed">completed</option>
              <option value="cancelled">cancelled</option>
              <option value="forfeit">forfeit</option>
            </select>
            <button onClick={updateMatch}>Update</button>
            {matches.length > 0 && (
              <table >
                <thead>
                  <tr><th>ID</th><th>Bracket</th><th>P1</th><th>P2</th><th>Score</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {matches.map(m => (
                    <tr key={m.id}>
                      <td>{m.id}</td>
                      <td>{m.bracket_id}</td>
                      <td>{m.player1_id}</td>
                      <td>{m.player2_id}</td>
                      <td>{m.player1_score ?? '-'}/{m.player2_score ?? '-'}</td>
                      <td>{m.match_status}</td>
                      <td>
                        <button onClick={() => completeMatch(m.id)}>Complete</button>
                        <button onClick={() => deleteMatch(m.id)}>Del</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </fieldset>

          {/* MAPPOOLS */}
          <fieldset>
            <legend><b>Mappools</b></legend>
            <button onClick={fetchMappools}>Load Mappools</button>{' '}
            <button onClick={syncBeatmaps}>Sync Beatmaps</button>{' '}
            <button onClick={syncStatus}>Sync Status</button>
            <br /><br />
            <b>Create Mappool:</b><br />
            <label>name:</label><input value={mappoolForm.name} onChange={e => setMappoolForm({ ...mappoolForm, name: e.target.value })} style={{ width: '100px' }} />
            <label> round:</label><input value={mappoolForm.round_name} onChange={e => setMappoolForm({ ...mappoolForm, round_name: e.target.value })} style={{ width: '80px' }} />
            <label> desc:</label><input value={mappoolForm.description} onChange={e => setMappoolForm({ ...mappoolForm, description: e.target.value })} style={{ width: '120px' }} />
            <label> visible:</label><input type="checkbox" checked={mappoolForm.is_visible} onChange={e => setMappoolForm({ ...mappoolForm, is_visible: e.target.checked })} />
            <button onClick={createMappool}>Create</button>
            <br /><br />
            <b>Lookup Beatmap:</b>{' '}
            <input type="number" value={beatmapLookup} onChange={e => setBeatmapLookup(e.target.value)} placeholder="beatmap_id" style={{ width: '90px' }} />
            <button onClick={lookupBeatmapFn}>Lookup</button>
            {beatmapResult && <pre>{JSON.stringify(beatmapResult, null, 2)}</pre>}
            <br />
            <b>Add Map to Pool:</b><br />
            <label>pool_id:</label><input type="number" value={mappoolMapForm.pool_id} onChange={e => setMappoolMapForm({ ...mappoolMapForm, pool_id: e.target.value })} style={{ width: '50px' }} />
            <label> beatmap_id:</label><input type="number" value={mappoolMapForm.beatmap_id} onChange={e => setMappoolMapForm({ ...mappoolMapForm, beatmap_id: e.target.value })} style={{ width: '80px' }} />
            <label> slot_id:</label><input type="number" value={mappoolMapForm.slot_id} onChange={e => setMappoolMapForm({ ...mappoolMapForm, slot_id: e.target.value })} style={{ width: '50px' }} />
            <label> slot#:</label><input type="number" value={mappoolMapForm.slot_number} onChange={e => setMappoolMapForm({ ...mappoolMapForm, slot_number: e.target.value })} style={{ width: '40px' }} />
            <button onClick={addMapToPool}>Add</button>
            {mappools.length > 0 && (
              <table >
                <thead>
                  <tr><th>ID</th><th>Name</th><th>Round</th><th>Visible</th><th>Maps</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {mappools.map(p => (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      <td>{p.name}</td>
                      <td>{p.round_name}</td>
                      <td>{p.is_visible ? 'Y' : 'N'}</td>
                      <td>{p.maps?.length ?? '?'}</td>
                      <td><button onClick={() => deleteMappool(p.id)}>Del</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </fieldset>

          {/* SLOTS */}
          <fieldset>
            <legend><b>Slots</b></legend>
            <button onClick={fetchSlots}>Load Slots</button>{' '}
            <button onClick={seedSlots}>Seed Defaults</button>
            <br />
            <label>name:</label><input value={slotForm.name} onChange={e => setSlotForm({ ...slotForm, name: e.target.value })} style={{ width: '60px' }} />
            <label> short:</label><input value={slotForm.short_name} onChange={e => setSlotForm({ ...slotForm, short_name: e.target.value })} style={{ width: '30px' }} />
            <label> color:</label><input type="color" value={slotForm.color} onChange={e => setSlotForm({ ...slotForm, color: e.target.value })} />
            <label> order:</label><input type="number" value={slotForm.slot_order} onChange={e => setSlotForm({ ...slotForm, slot_order: e.target.value })} style={{ width: '40px' }} />
            <button onClick={createSlot}>Create</button>
            {slots.length > 0 && (
              <table >
                <thead><tr><th>ID</th><th>Name</th><th>Short</th><th>Color</th><th>Order</th><th>Del</th></tr></thead>
                <tbody>
                  {slots.map(s => (
                    <tr key={s.id}>
                      <td>{s.id}</td><td>{s.name}</td><td>{s.short_name}</td>
                      <td style={{ background: s.color }}>{s.color}</td><td>{s.slot_order}</td>
                      <td><button onClick={() => deleteSlot(s.id)}>Del</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </fieldset>

          {/* TIMELINE */}
          <fieldset>
            <legend><b>Timeline</b></legend>
            <button onClick={fetchTimeline}>Load</button>
            <br />
            <label>title:</label><input value={timelineForm.title} onChange={e => setTimelineForm({ ...timelineForm, title: e.target.value })} style={{ width: '100px' }} />
            <label> desc:</label><input value={timelineForm.description} onChange={e => setTimelineForm({ ...timelineForm, description: e.target.value })} style={{ width: '120px' }} />
            <label> date:</label><input type="date" value={timelineForm.event_date} onChange={e => setTimelineForm({ ...timelineForm, event_date: e.target.value })} />
            <label> status:</label>
            <select value={timelineForm.status} onChange={e => setTimelineForm({ ...timelineForm, status: e.target.value })}>
              <option value="upcoming">upcoming</option>
              <option value="ongoing">ongoing</option>
              <option value="completed">completed</option>
            </select>
            <button onClick={addTimelineEvent}>Add</button>
            {timeline.length > 0 && (
              <table >
                <thead><tr><th>ID</th><th>Title</th><th>Date</th><th>Status</th><th>Del</th></tr></thead>
                <tbody>
                  {timeline.map(e => (
                    <tr key={e.id}>
                      <td>{e.id}</td><td>{e.title}</td><td>{e.event_date}</td><td>{e.status}</td>
                      <td><button onClick={() => deleteTimelineEvent(e.id)}>Del</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </fieldset>

          {/* NEWS */}
          <fieldset>
            <legend><b>News</b></legend>
            <button onClick={fetchNews}>Load</button>
            <br />
            <label>title:</label><input value={newsForm.title} onChange={e => setNewsForm({ ...newsForm, title: e.target.value })} style={{ width: '100px' }} />
            <label> content:</label><input value={newsForm.content} onChange={e => setNewsForm({ ...newsForm, content: e.target.value })} style={{ width: '150px' }} />
            <label> author:</label><input value={newsForm.author} onChange={e => setNewsForm({ ...newsForm, author: e.target.value })} style={{ width: '80px' }} />
            <button onClick={addNewsItem}>Add</button>
            {news.length > 0 && (
              <table >
                <thead><tr><th>ID</th><th>Title</th><th>Author</th><th>Del</th></tr></thead>
                <tbody>
                  {news.map(n => (
                    <tr key={n.id}>
                      <td>{n.id}</td><td>{n.title}</td><td>{n.author}</td>
                      <td><button onClick={() => deleteNewsItem(n.id)}>Del</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </fieldset>

          {/* WHITELIST */}
          <fieldset>
            <legend><b>Whitelist</b></legend>
            <button onClick={fetchWhitelist}>Load</button>{' '}
            <input value={whitelistName} onChange={e => setWhitelistName(e.target.value)} placeholder="username" style={{ width: '100px' }} />
            <button onClick={addWhitelist}>Add</button>
            {whitelist.length > 0 && (
              <ul>
                {whitelist.map((w, i) => (
                  <li key={i}>{typeof w === 'string' ? w : w.username} <button onClick={() => removeWhitelist(typeof w === 'string' ? w : w.username)}>X</button></li>
                ))}
              </ul>
            )}
          </fieldset>

          {/* API KEYS */}
          <fieldset>
            <legend><b>API Keys</b></legend>
            <button onClick={fetchApiKeys}>Load</button>{' '}
            <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="key name" style={{ width: '100px' }} />
            <button onClick={generateApiKey}>Generate</button>
            {generatedKey && <p className="admin-warning"><b>NEW KEY (copy now!):</b> {generatedKey}</p>}
            {apiKeys.length > 0 && (
              <table >
                <thead><tr><th>ID</th><th>Name</th><th>Created</th><th>Last Used</th><th>Revoke</th></tr></thead>
                <tbody>
                  {apiKeys.map(k => (
                    <tr key={k.id}>
                      <td>{k.id}</td><td>{k.name}</td><td>{k.created_at?.slice(0, 10)}</td><td>{k.last_used_at?.slice(0, 10) || '-'}</td>
                      <td><button onClick={() => revokeApiKey(k.id)}>Revoke</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </fieldset>

    </div>
  );
}

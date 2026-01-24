import React, { useState, useEffect } from 'react';
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
  const [mappoolForm, setMappoolForm] = useState({ stage_name: '', stage_order: 0, download_url: '', is_visible: true });
  const [mappoolMapForm, setMappoolMapForm] = useState({ pool_id: '', slot: '', slot_order: 0, beatmap_id: '', artist: '', title: '', difficulty_name: '', star_rating: 0, bpm: 0, length_seconds: 0, od: 0, hp: 0, ln_percent: '0', mapper: '', is_custom_map: false, is_custom_song: false });
  const [beatmapLookup, setBeatmapLookup] = useState('');
  const [beatmapResult, setBeatmapResult] = useState(null);
  const [editingMappoolId, setEditingMappoolId] = useState(null);
  const [editMappoolForm, setEditMappoolForm] = useState({});
  const [editingPoolMapId, setEditingPoolMapId] = useState(null);
  const [editPoolMapForm, setEditPoolMapForm] = useState({});
  const [expandedPoolId, setExpandedPoolId] = useState(null);

  // Tournament
  const [tournamentStatus, setTournamentStatus] = useState(null);
  const [registrations, setRegistrations] = useState(null);

  // Maps (standalone)
  const [maps, setMaps] = useState([]);
  const [editingMapId, setEditingMapId] = useState(null);
  const [editMapForm, setEditMapForm] = useState({});

  // Slots
  const [slots, setSlots] = useState([]);
  const [slotForm, setSlotForm] = useState({ name: '', color: '#3b82f6', slot_order: 0 });
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [editSlotForm, setEditSlotForm] = useState({});

  // Timeline
  const [timeline, setTimeline] = useState([]);
  const [timelineForm, setTimelineForm] = useState({ title: '', date_range: '' });
  const [editingEventId, setEditingEventId] = useState(null);
  const [editEventForm, setEditEventForm] = useState({});

  // News
  const [news, setNews] = useState([]);
  const [newsForm, setNewsForm] = useState({ title: '', date: '' });
  const [editingNewsId, setEditingNewsId] = useState(null);
  const [editNewsForm, setEditNewsForm] = useState({});

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
    setMappools(Array.isArray(data) ? data : data.pools || []);
    return data;
  });

  const createMappool = () => run('Create Mappool', () =>
    api.fetch('/mappools', { method: 'POST', body: JSON.stringify({ ...mappoolForm, download_url: mappoolForm.download_url || null }) })
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

  const addMapToPool = () => run('Add Map to Pool', () => {
    const { pool_id, ...mapData } = mappoolMapForm;
    return api.fetch(`/mappools/${pool_id}/maps`, {
      method: 'POST',
      body: JSON.stringify({
        ...mapData,
        slot_order: Number(mapData.slot_order),
        star_rating: Number(mapData.star_rating),
        bpm: Number(mapData.bpm),
        length_seconds: Number(mapData.length_seconds),
        od: Number(mapData.od),
        hp: Number(mapData.hp),
      }),
    });
  });

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
    setApiKeys(Array.isArray(data) ? data : data.api_keys || []);
    return data;
  });

  const generateApiKey = () => run('Generate API Key', async () => {
    const data = await api.fetch('/api-keys', { method: 'POST', body: JSON.stringify({ name: newKeyName }) });
    if (data.raw_key) setGeneratedKey(data.raw_key);
    return data;
  });

  const revokeApiKey = (id) => run(`Revoke Key ${id}`, () =>
    api.fetch(`/api-keys/${id}`, { method: 'DELETE' })
  );

  // --- Tournament ---
  const fetchTournamentStatus = () => run('GET Tournament Status', async () => {
    const data = await api.fetch('/tournament/status');
    setTournamentStatus(data);
    return data;
  });

  const fetchRegistrations = () => run('GET Registrations', async () => {
    const data = await api.fetch('/tournament/registrations');
    setRegistrations(data);
    return data;
  });

  // --- Maps (standalone) ---
  const fetchMaps = () => run('GET Maps', async () => {
    const data = await api.fetch('/maps');
    setMaps(Array.isArray(data) ? data : data.maps || []);
    return data;
  });

  const updateMapFn = (id) => run(`Update Map ${id}`, async () => {
    const body = {};
    if (editMapForm.map_url) body.map_url = editMapForm.map_url;
    if (editMapForm.map_name) body.map_name = editMapForm.map_name;
    if (editMapForm.difficulty_name) body.difficulty_name = editMapForm.difficulty_name;
    if (editMapForm.mapper_name) body.mapper_name = editMapForm.mapper_name;
    const result = await api.fetch(`/maps/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    setEditingMapId(null);
    fetchMaps();
    return result;
  });

  // --- Slots (edit) ---
  const updateSlotFn = (id) => run(`Update Slot ${id}`, async () => {
    const body = {};
    if (editSlotForm.name) body.name = editSlotForm.name;
    if (editSlotForm.color) body.color = editSlotForm.color;
    if (editSlotForm.slot_order !== undefined && editSlotForm.slot_order !== '') body.slot_order = Number(editSlotForm.slot_order);
    const result = await api.fetch(`/slots/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    setEditingSlotId(null);
    fetchSlots();
    return result;
  });

  // --- Timeline (edit) ---
  const updateTimelineEventFn = (id) => run(`Update Event ${id}`, async () => {
    const body = {};
    if (editEventForm.date_range) body.date_range = editEventForm.date_range;
    if (editEventForm.title) body.title = editEventForm.title;
    const result = await api.fetch(`/timeline/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    setEditingEventId(null);
    fetchTimeline();
    return result;
  });

  // --- News (edit) ---
  const updateNewsItemFn = (id) => run(`Update News ${id}`, async () => {
    const body = {};
    if (editNewsForm.date) body.date = editNewsForm.date;
    if (editNewsForm.title) body.title = editNewsForm.title;
    const result = await api.fetch(`/news/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    setEditingNewsId(null);
    fetchNews();
    return result;
  });

  // --- Mappools (edit) ---
  const updateMappoolFn = (id) => run(`Update Mappool ${id}`, async () => {
    const body = {};
    if (editMappoolForm.stage_name) body.stage_name = editMappoolForm.stage_name;
    if (editMappoolForm.stage_order !== undefined && editMappoolForm.stage_order !== '') body.stage_order = Number(editMappoolForm.stage_order);
    if (editMappoolForm.download_url !== undefined) body.download_url = editMappoolForm.download_url || null;
    if (editMappoolForm.is_visible !== undefined) body.is_visible = editMappoolForm.is_visible;
    const result = await api.fetch(`/mappools/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    setEditingMappoolId(null);
    fetchMappools();
    return result;
  });

  const updatePoolMapFn = (mapId) => run(`Update Pool Map ${mapId}`, async () => {
    const body = { ...editPoolMapForm };
    if (body.slot_order !== undefined && body.slot_order !== '') body.slot_order = Number(body.slot_order);
    if (body.star_rating !== undefined && body.star_rating !== '') body.star_rating = Number(body.star_rating);
    if (body.bpm !== undefined && body.bpm !== '') body.bpm = Number(body.bpm);
    if (body.length_seconds !== undefined && body.length_seconds !== '') body.length_seconds = Number(body.length_seconds);
    if (body.od !== undefined && body.od !== '') body.od = Number(body.od);
    if (body.hp !== undefined && body.hp !== '') body.hp = Number(body.hp);
    // Remove empty string fields
    Object.keys(body).forEach(k => { if (body[k] === '') delete body[k]; });
    const result = await api.fetch(`/mappools/maps/${mapId}`, { method: 'PUT', body: JSON.stringify(body) });
    setEditingPoolMapId(null);
    fetchMappools();
    return result;
  });

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

          {/* TOURNAMENT */}
          <fieldset>
            <legend><b>Tournament</b></legend>
            <button onClick={fetchTournamentStatus}>Load Status</button>{' '}
            <button onClick={fetchRegistrations}>Load Registrations</button>
            {tournamentStatus && (
              <table>
                <tbody>
                  <tr><td><b>Status</b></td><td>{tournamentStatus.status}</td></tr>
                  <tr><td><b>Registration Open</b></td><td>{tournamentStatus.registration_open ? 'Yes' : 'No'}</td></tr>
                  <tr><td><b>Total Registered</b></td><td>{tournamentStatus.total_registered_players}</td></tr>
                  <tr><td><b>Started At</b></td><td>{tournamentStatus.started_at || '-'}</td></tr>
                  <tr><td><b>Ended At</b></td><td>{tournamentStatus.ended_at || '-'}</td></tr>
                </tbody>
              </table>
            )}
            {registrations && (
              <>
                <p><b>Registered:</b> {registrations.total_registered} | <b>Open:</b> {registrations.registration_open ? 'Yes' : 'No'}</p>
                {registrations.registered_players?.length > 0 && (
                  <table>
                    <thead><tr><th>Username</th><th>osu_id</th><th>Seed</th><th>Rank</th></tr></thead>
                    <tbody>
                      {registrations.registered_players.map((p, i) => (
                        <tr key={i}>
                          <td>{p.username}</td>
                          <td>{p.osu_id}</td>
                          <td>{p.seed_number ?? '-'}</td>
                          <td>{p.mania_rank ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
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

          {/* MAPS (standalone) */}
          <fieldset>
            <legend><b>Maps</b></legend>
            <button onClick={fetchMaps}>Load Maps</button>
            {maps.length > 0 && (
              <table>
                <thead><tr><th>ID</th><th>Map Name</th><th>Difficulty</th><th>Mapper</th><th>URL</th><th>Actions</th></tr></thead>
                <tbody>
                  {maps.map(m => (
                    <tr key={m.id}>
                      {editingMapId === m.id ? (
                        <>
                          <td>{m.id}</td>
                          <td><input value={editMapForm.map_name || ''} onChange={e => setEditMapForm({ ...editMapForm, map_name: e.target.value })} style={{ width: '100px' }} /></td>
                          <td><input value={editMapForm.difficulty_name || ''} onChange={e => setEditMapForm({ ...editMapForm, difficulty_name: e.target.value })} style={{ width: '80px' }} /></td>
                          <td><input value={editMapForm.mapper_name || ''} onChange={e => setEditMapForm({ ...editMapForm, mapper_name: e.target.value })} style={{ width: '80px' }} /></td>
                          <td><input value={editMapForm.map_url || ''} onChange={e => setEditMapForm({ ...editMapForm, map_url: e.target.value })} style={{ width: '120px' }} /></td>
                          <td>
                            <button onClick={() => updateMapFn(m.id)}>Save</button>
                            <button onClick={() => setEditingMapId(null)}>Cancel</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{m.id}</td>
                          <td>{m.map_name}</td>
                          <td>{m.difficulty_name}</td>
                          <td>{m.mapper_name}</td>
                          <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.map_url}</td>
                          <td>
                            <button onClick={() => { setEditingMapId(m.id); setEditMapForm({ map_name: m.map_name || '', difficulty_name: m.difficulty_name || '', mapper_name: m.mapper_name || '', map_url: m.map_url || '' }); }}>Edit</button>
                          </td>
                        </>
                      )}
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
            <label>stage_name:</label><input value={mappoolForm.stage_name} onChange={e => setMappoolForm({ ...mappoolForm, stage_name: e.target.value })} style={{ width: '100px' }} />
            <label> order:</label><input type="number" value={mappoolForm.stage_order} onChange={e => setMappoolForm({ ...mappoolForm, stage_order: Number(e.target.value) })} style={{ width: '40px' }} />
            <label> download_url:</label><input value={mappoolForm.download_url} onChange={e => setMappoolForm({ ...mappoolForm, download_url: e.target.value })} style={{ width: '120px' }} />
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
            <label> slot:</label><input value={mappoolMapForm.slot} onChange={e => setMappoolMapForm({ ...mappoolMapForm, slot: e.target.value })} placeholder="RC" style={{ width: '40px' }} />
            <label> order:</label><input type="number" value={mappoolMapForm.slot_order} onChange={e => setMappoolMapForm({ ...mappoolMapForm, slot_order: e.target.value })} style={{ width: '35px' }} />
            <label> beatmap_id:</label><input value={mappoolMapForm.beatmap_id} onChange={e => setMappoolMapForm({ ...mappoolMapForm, beatmap_id: e.target.value })} style={{ width: '80px' }} />
            <br />
            <label>artist:</label><input value={mappoolMapForm.artist} onChange={e => setMappoolMapForm({ ...mappoolMapForm, artist: e.target.value })} style={{ width: '80px' }} />
            <label> title:</label><input value={mappoolMapForm.title} onChange={e => setMappoolMapForm({ ...mappoolMapForm, title: e.target.value })} style={{ width: '80px' }} />
            <label> diff:</label><input value={mappoolMapForm.difficulty_name} onChange={e => setMappoolMapForm({ ...mappoolMapForm, difficulty_name: e.target.value })} style={{ width: '80px' }} />
            <label> mapper:</label><input value={mappoolMapForm.mapper} onChange={e => setMappoolMapForm({ ...mappoolMapForm, mapper: e.target.value })} style={{ width: '70px' }} />
            <br />
            <label>SR:</label><input type="number" step="0.01" value={mappoolMapForm.star_rating} onChange={e => setMappoolMapForm({ ...mappoolMapForm, star_rating: e.target.value })} style={{ width: '50px' }} />
            <label> BPM:</label><input type="number" value={mappoolMapForm.bpm} onChange={e => setMappoolMapForm({ ...mappoolMapForm, bpm: e.target.value })} style={{ width: '50px' }} />
            <label> len(s):</label><input type="number" value={mappoolMapForm.length_seconds} onChange={e => setMappoolMapForm({ ...mappoolMapForm, length_seconds: e.target.value })} style={{ width: '50px' }} />
            <label> OD:</label><input type="number" step="0.1" value={mappoolMapForm.od} onChange={e => setMappoolMapForm({ ...mappoolMapForm, od: e.target.value })} style={{ width: '45px' }} />
            <label> HP:</label><input type="number" step="0.1" value={mappoolMapForm.hp} onChange={e => setMappoolMapForm({ ...mappoolMapForm, hp: e.target.value })} style={{ width: '45px' }} />
            <label> LN%:</label><input value={mappoolMapForm.ln_percent} onChange={e => setMappoolMapForm({ ...mappoolMapForm, ln_percent: e.target.value })} style={{ width: '35px' }} />
            <label> custom_map:</label><input type="checkbox" checked={mappoolMapForm.is_custom_map} onChange={e => setMappoolMapForm({ ...mappoolMapForm, is_custom_map: e.target.checked })} />
            <label> custom_song:</label><input type="checkbox" checked={mappoolMapForm.is_custom_song} onChange={e => setMappoolMapForm({ ...mappoolMapForm, is_custom_song: e.target.checked })} />
            <button onClick={addMapToPool}>Add</button>
            <br /><br />
            <b>Edit Pool Map (by ID):</b><br />
            <label>map_id:</label><input type="number" value={editingPoolMapId || ''} onChange={e => setEditingPoolMapId(e.target.value)} style={{ width: '50px' }} />
            <label> slot:</label><input value={editPoolMapForm.slot || ''} onChange={e => setEditPoolMapForm({ ...editPoolMapForm, slot: e.target.value })} style={{ width: '40px' }} />
            <label> order:</label><input type="number" value={editPoolMapForm.slot_order ?? ''} onChange={e => setEditPoolMapForm({ ...editPoolMapForm, slot_order: e.target.value })} style={{ width: '40px' }} />
            <label> beatmap_id:</label><input value={editPoolMapForm.beatmap_id || ''} onChange={e => setEditPoolMapForm({ ...editPoolMapForm, beatmap_id: e.target.value })} style={{ width: '80px' }} />
            <label> custom_map:</label><input type="checkbox" checked={editPoolMapForm.is_custom_map ?? false} onChange={e => setEditPoolMapForm({ ...editPoolMapForm, is_custom_map: e.target.checked })} />
            <label> custom_song:</label><input type="checkbox" checked={editPoolMapForm.is_custom_song ?? false} onChange={e => setEditPoolMapForm({ ...editPoolMapForm, is_custom_song: e.target.checked })} />
            <button onClick={() => editingPoolMapId && updatePoolMapFn(editingPoolMapId)}>Update Map</button>
            {mappools.length > 0 && (
              <table>
                <thead>
                  <tr><th>ID</th><th>Stage Name</th><th>Order</th><th>Visible</th><th>Download URL</th><th>Maps</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {mappools.map(p => (
                    <React.Fragment key={p.id}>
                    <tr>
                      {editingMappoolId === p.id ? (
                        <>
                          <td>{p.id}</td>
                          <td><input value={editMappoolForm.stage_name || ''} onChange={e => setEditMappoolForm({ ...editMappoolForm, stage_name: e.target.value })} style={{ width: '80px' }} /></td>
                          <td><input type="number" value={editMappoolForm.stage_order ?? ''} onChange={e => setEditMappoolForm({ ...editMappoolForm, stage_order: e.target.value })} style={{ width: '40px' }} /></td>
                          <td><input type="checkbox" checked={editMappoolForm.is_visible ?? true} onChange={e => setEditMappoolForm({ ...editMappoolForm, is_visible: e.target.checked })} /></td>
                          <td><input value={editMappoolForm.download_url || ''} onChange={e => setEditMappoolForm({ ...editMappoolForm, download_url: e.target.value })} style={{ width: '120px' }} /></td>
                          <td>{p.maps?.length ?? '?'}</td>
                          <td>
                            <button onClick={() => updateMappoolFn(p.id)}>Save</button>
                            <button onClick={() => setEditingMappoolId(null)}>Cancel</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{p.id}</td>
                          <td>{p.stage_name || p.name}</td>
                          <td>{p.stage_order ?? '-'}</td>
                          <td>{p.is_visible ? 'Y' : 'N'}</td>
                          <td style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.download_url || '-'}</td>
                          <td>{p.maps?.length ?? '?'}</td>
                          <td>
                            <button onClick={() => setExpandedPoolId(expandedPoolId === p.id ? null : p.id)}>{expandedPoolId === p.id ? 'Hide' : 'Maps'}</button>
                            <button onClick={() => { setEditingMappoolId(p.id); setEditMappoolForm({ stage_name: p.stage_name || p.name || '', stage_order: p.stage_order ?? '', download_url: p.download_url || '', is_visible: p.is_visible ?? true }); }}>Edit</button>
                            <button onClick={() => deleteMappool(p.id)}>Del</button>
                          </td>
                        </>
                      )}
                    </tr>
                    {expandedPoolId === p.id && p.maps?.length > 0 && (
                      <tr>
                        <td colSpan="7" style={{ padding: '4px 8px' }}>
                          <table style={{ width: '100%', fontSize: '11px' }}>
                            <thead><tr><th>ID</th><th>Slot</th><th>#</th><th>Artist</th><th>Title</th><th>Diff</th><th>Mapper</th><th>SR</th><th>BPM</th><th>Len</th><th>Del</th></tr></thead>
                            <tbody>
                              {p.maps.map(m => (
                                <tr key={m.id}>
                                  <td>{m.id}</td><td>{m.slot}</td><td>{m.slot_order}</td>
                                  <td>{m.artist}</td><td>{m.title}</td><td>{m.difficulty_name}</td><td>{m.mapper}</td>
                                  <td>{m.star_rating}</td><td>{m.bpm}</td><td>{m.length}</td>
                                  <td><button onClick={() => deletePoolMap(m.id)}>Del</button></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
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
            <label>name:</label><input value={slotForm.name} onChange={e => setSlotForm({ ...slotForm, name: e.target.value })} style={{ width: '80px' }} />
            <label> color:</label><input type="color" value={slotForm.color} onChange={e => setSlotForm({ ...slotForm, color: e.target.value })} />
            <label> order:</label><input type="number" value={slotForm.slot_order} onChange={e => setSlotForm({ ...slotForm, slot_order: Number(e.target.value) })} style={{ width: '40px' }} />
            <button onClick={createSlot}>Create</button>
            {slots.length > 0 && (
              <table>
                <thead><tr><th>ID</th><th>Name</th><th>Color</th><th>Order</th><th>Actions</th></tr></thead>
                <tbody>
                  {slots.map(s => (
                    <tr key={s.id}>
                      {editingSlotId === s.id ? (
                        <>
                          <td>{s.id}</td>
                          <td><input value={editSlotForm.name || ''} onChange={e => setEditSlotForm({ ...editSlotForm, name: e.target.value })} style={{ width: '60px' }} /></td>
                          <td><input type="color" value={editSlotForm.color || '#ffffff'} onChange={e => setEditSlotForm({ ...editSlotForm, color: e.target.value })} /></td>
                          <td><input type="number" value={editSlotForm.slot_order ?? ''} onChange={e => setEditSlotForm({ ...editSlotForm, slot_order: e.target.value })} style={{ width: '40px' }} /></td>
                          <td>
                            <button onClick={() => updateSlotFn(s.id)}>Save</button>
                            <button onClick={() => setEditingSlotId(null)}>Cancel</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{s.id}</td>
                          <td>{s.name}</td>
                          <td style={{ background: s.color }}>{s.color}</td>
                          <td>{s.slot_order}</td>
                          <td>
                            <button onClick={() => { setEditingSlotId(s.id); setEditSlotForm({ name: s.name || '', color: s.color || '#ffffff', slot_order: s.slot_order ?? '' }); }}>Edit</button>
                            <button onClick={() => deleteSlot(s.id)}>Del</button>
                          </td>
                        </>
                      )}
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
            <label>title:</label><input value={timelineForm.title} onChange={e => setTimelineForm({ ...timelineForm, title: e.target.value })} style={{ width: '120px' }} />
            <label> date_range:</label><input value={timelineForm.date_range} onChange={e => setTimelineForm({ ...timelineForm, date_range: e.target.value })} placeholder="e.g. Jan 1 - Jan 5" style={{ width: '120px' }} />
            <button onClick={addTimelineEvent}>Add</button>
            {timeline.length > 0 && (
              <table>
                <thead><tr><th>ID</th><th>Title</th><th>Date Range</th><th>Actions</th></tr></thead>
                <tbody>
                  {timeline.map(e => (
                    <tr key={e.id}>
                      {editingEventId === e.id ? (
                        <>
                          <td>{e.id}</td>
                          <td><input value={editEventForm.title || ''} onChange={ev => setEditEventForm({ ...editEventForm, title: ev.target.value })} style={{ width: '100px' }} /></td>
                          <td><input value={editEventForm.date_range || ''} onChange={ev => setEditEventForm({ ...editEventForm, date_range: ev.target.value })} style={{ width: '100px' }} /></td>
                          <td>
                            <button onClick={() => updateTimelineEventFn(e.id)}>Save</button>
                            <button onClick={() => setEditingEventId(null)}>Cancel</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{e.id}</td>
                          <td>{e.title}</td>
                          <td>{e.date || '-'}</td>
                          <td>
                            <button onClick={() => { setEditingEventId(e.id); setEditEventForm({ title: e.title || '', date_range: e.date || '' }); }}>Edit</button>
                            <button onClick={() => deleteTimelineEvent(e.id)}>Del</button>
                          </td>
                        </>
                      )}
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
            <label>title:</label><input value={newsForm.title} onChange={e => setNewsForm({ ...newsForm, title: e.target.value })} style={{ width: '150px' }} />
            <label> date:</label><input value={newsForm.date} onChange={e => setNewsForm({ ...newsForm, date: e.target.value })} placeholder="e.g. 2026-01-24" style={{ width: '100px' }} />
            <button onClick={addNewsItem}>Add</button>
            {news.length > 0 && (
              <table>
                <thead><tr><th>ID</th><th>Title</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {news.map(n => (
                    <tr key={n.id}>
                      {editingNewsId === n.id ? (
                        <>
                          <td>{n.id}</td>
                          <td><input value={editNewsForm.title || ''} onChange={e => setEditNewsForm({ ...editNewsForm, title: e.target.value })} style={{ width: '120px' }} /></td>
                          <td><input value={editNewsForm.date || ''} onChange={e => setEditNewsForm({ ...editNewsForm, date: e.target.value })} style={{ width: '100px' }} /></td>
                          <td>
                            <button onClick={() => updateNewsItemFn(n.id)}>Save</button>
                            <button onClick={() => setEditingNewsId(null)}>Cancel</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{n.id}</td>
                          <td>{n.title}</td>
                          <td>{n.date || '-'}</td>
                          <td>
                            <button onClick={() => { setEditingNewsId(n.id); setEditNewsForm({ title: n.title || '', date: n.date || '' }); }}>Edit</button>
                            <button onClick={() => deleteNewsItem(n.id)}>Del</button>
                          </td>
                        </>
                      )}
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

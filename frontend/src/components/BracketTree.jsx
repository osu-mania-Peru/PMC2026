import { useEffect, useState, useRef } from 'react';
import { Bracket } from 'react-tournament-bracket';
import { Pencil, Plus, Trophy, ChevronDown } from 'lucide-react';
import Spinner from './Spinner';
import './BracketTree.css';

function CustomGame({ game, x, y, onEditMatch, onCreateMatch, onContextMenu, isStaff, bracketId }) {
  const home = game.sides?.home;
  const visitor = game.sides?.visitor;
  const homeTeam = home?.team;
  const visitorTeam = visitor?.team;
  const homeScore = home?.score?.score;
  const visitorScore = visitor?.score?.score;
  const matchData = game._matchData;

  const isCompleted = matchData?.is_completed;
  const winnerId = matchData?.winner_id;
  const homeIsWinner = winnerId && winnerId === matchData?.player1_id;
  const visitorIsWinner = winnerId && winnerId === matchData?.player2_id;
  const homeTBD = !matchData?.player1_id;
  const visitorTBD = !matchData?.player2_id;

  const width = 310;
  const height = 160;

  const handleEditClick = (e) => {
    e.stopPropagation();
    if (onEditMatch && matchData) {
      onEditMatch(matchData);
    }
  };

  const handleCreateClick = (e) => {
    e.stopPropagation();
    if (onCreateMatch) {
      onCreateMatch({
        bracket_id: bracketId,
        round_name: game.name,
        _slotInfo: { round: game._round, position: game._position }
      });
    }
  };

  const statusClass = matchData?.match_status === 'in_progress' ? 'live' :
                      isCompleted ? 'completed' : '';

  return (
    <foreignObject x={x} y={y} width={width} height={height} style={{ overflow: 'visible' }}>
      <div xmlns="http://www.w3.org/1999/xhtml" className={`custom-match ${statusClass}`}>
        {matchData && (
          <div className="match-hover-info">
            <span className={`hover-status ${matchData.match_status}`}>
              {matchData.match_status === 'completed' ? 'Completado' :
               matchData.match_status === 'in_progress' ? 'En Progreso' : 'Programado'}
            </span>
            {matchData.winner_id && (
              <span className="hover-winner">
                Ganador: {matchData.winner_id === matchData.player1_id ? homeTeam?.name : visitorTeam?.name}
              </span>
            )}
          </div>
        )}
        <div className="bracket-date">
          <span className="bracket-round-label">{game.name}</span>
          {matchData?.match_status === 'in_progress' && (
            <span className="match-live-badge">EN VIVO</span>
          )}
          {isStaff && matchData && (
            <button className="bracket-edit-btn" onClick={handleEditClick} title="Editar partida">
              <Pencil size={12} />
            </button>
          )}
          {isStaff && !matchData && bracketId && (
            <button className="bracket-edit-btn bracket-add-btn" onClick={handleCreateClick} title="Crear partida">
              <Plus size={14} />
            </button>
          )}
        </div>
        <div
          className={`bracket-player-row ${homeIsWinner ? 'winner' : ''} ${homeTBD ? 'tbd' : ''} ${isStaff && matchData?.player1_id && !isCompleted ? 'clickable' : ''}`}
          onClick={(e) => {
            if (isStaff && matchData && matchData.player1_id && !isCompleted) {
              e.stopPropagation();
              onContextMenu?.(e, matchData, matchData.player1_id, homeTeam?.name);
            }
          }}
        >
          <span className="bracket-player-name">{homeTeam?.name || 'TBD'}</span>
          <span className={`bracket-indicator ${homeIsWinner ? 'winner' : ''}`}>
            {homeScore != null ? homeScore.toLocaleString() : ''}
          </span>
        </div>
        <div
          className={`bracket-player-row ${visitorIsWinner ? 'winner' : ''} ${visitorTBD ? 'tbd' : ''} ${isStaff && matchData?.player2_id && !isCompleted ? 'clickable' : ''}`}
          onClick={(e) => {
            if (isStaff && matchData && matchData.player2_id && !isCompleted) {
              e.stopPropagation();
              onContextMenu?.(e, matchData, matchData.player2_id, visitorTeam?.name);
            }
          }}
        >
          <span className="bracket-player-name">{visitorTeam?.name || 'TBD'}</span>
          <span className={`bracket-indicator ${visitorIsWinner ? 'winner' : ''}`}>
            {visitorScore != null ? visitorScore.toLocaleString() : ''}
          </span>
        </div>
      </div>
    </foreignObject>
  );
}

function MobileBracketView({ matches, bracketId, user, onEditMatch, onCreateMatch, onContextMenu }) {
  const [collapsed, setCollapsed] = useState({});

  if (!matches || matches.length === 0) {
    return <div className="bracket-mobile"><div className="no-matches">No hay partidas programadas</div></div>;
  }

  // Compute round depth via topological sort (same approach as loser bracket)
  const matchMap = {};
  matches.forEach(m => { matchMap[m.id] = m; });

  const feedersOf = {};
  matches.forEach(m => { feedersOf[m.id] = []; });
  matches.forEach(m => {
    if (m.next_match_id && matchMap[m.next_match_id]) {
      feedersOf[m.next_match_id].push(m.id);
    }
  });

  const roundOf = {};
  const assignRound = (matchId, visited = new Set()) => {
    if (roundOf[matchId] !== undefined) return roundOf[matchId];
    if (visited.has(matchId)) return 0;
    visited.add(matchId);
    const feeders = feedersOf[matchId] || [];
    if (feeders.length === 0) {
      roundOf[matchId] = 0;
    } else {
      roundOf[matchId] = Math.max(...feeders.map(fid => assignRound(fid, visited))) + 1;
    }
    return roundOf[matchId];
  };
  matches.forEach(m => assignRound(m.id));

  // Group by round_name, ordered by computed round depth
  const roundGroups = {};
  matches.forEach(m => {
    const name = m.round_name || `Round ${roundOf[m.id] + 1}`;
    if (!roundGroups[name]) roundGroups[name] = { depth: roundOf[m.id], matches: [] };
    roundGroups[name].matches.push(m);
    roundGroups[name].depth = Math.min(roundGroups[name].depth, roundOf[m.id]);
  });

  const sortedRounds = Object.entries(roundGroups)
    .sort((a, b) => a[1].depth - b[1].depth)
    .map(([name, group]) => ({ name, matches: group.matches.sort((a, b) => a.id - b.id) }));

  const toggleRound = (name) => {
    setCollapsed(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className="bracket-mobile">
      {sortedRounds.map(round => {
        const isCollapsed = collapsed[round.name];
        return (
          <div key={round.name} className="mobile-round">
            <button className="mobile-round-header" onClick={() => toggleRound(round.name)}>
              <span className="mobile-round-name">{round.name}</span>
              <span className="mobile-round-count">{round.matches.length} partida{round.matches.length !== 1 ? 's' : ''}</span>
              <ChevronDown size={16} className={`mobile-round-chevron ${isCollapsed ? 'collapsed' : ''}`} />
            </button>
            {!isCollapsed && (
              <div className="mobile-round-matches">
                {round.matches.map(m => {
                  const isCompleted = m.is_completed;
                  const winnerId = m.winner_id;
                  const homeIsWinner = winnerId && winnerId === m.player1_id;
                  const visitorIsWinner = winnerId && winnerId === m.player2_id;
                  const statusClass = m.match_status === 'in_progress' ? 'live' : isCompleted ? 'completed' : '';

                  return (
                    <div key={m.id} className={`mobile-match ${statusClass}`}>
                      <div className="mobile-match-header">
                        {m.match_status === 'in_progress' && <span className="match-live-badge">EN VIVO</span>}
                        {user?.is_staff && m.id && (
                          <button className="bracket-edit-btn" onClick={() => onEditMatch?.(m)} title="Editar partida">
                            <Pencil size={12} />
                          </button>
                        )}
                        {user?.is_staff && !m.id && bracketId && (
                          <button className="bracket-edit-btn bracket-add-btn" onClick={() => onCreateMatch?.({ bracket_id: bracketId, round_name: m.round_name })} title="Crear partida">
                            <Plus size={14} />
                          </button>
                        )}
                      </div>
                      <div
                        className={`mobile-match-player ${homeIsWinner ? 'winner' : ''} ${!m.player1_id ? 'tbd' : ''} ${user?.is_staff && m.player1_id && !isCompleted ? 'clickable' : ''}`}
                        onClick={(e) => {
                          if (user?.is_staff && m.player1_id && !isCompleted) {
                            e.stopPropagation();
                            onContextMenu?.(e, m, m.player1_id, m.player1_username);
                          }
                        }}
                      >
                        <span className="mobile-player-name">{m.player1_username || 'TBD'}</span>
                        <span className={`mobile-player-score ${homeIsWinner ? 'winner' : ''}`}>
                          {m.player1_score != null ? m.player1_score.toLocaleString() : ''}
                        </span>
                      </div>
                      <div className="mobile-match-vs">vs</div>
                      <div
                        className={`mobile-match-player ${visitorIsWinner ? 'winner' : ''} ${!m.player2_id ? 'tbd' : ''} ${user?.is_staff && m.player2_id && !isCompleted ? 'clickable' : ''}`}
                        onClick={(e) => {
                          if (user?.is_staff && m.player2_id && !isCompleted) {
                            e.stopPropagation();
                            onContextMenu?.(e, m, m.player2_id, m.player2_username);
                          }
                        }}
                      >
                        <span className="mobile-player-name">{m.player2_username || 'TBD'}</span>
                        <span className={`mobile-player-score ${visitorIsWinner ? 'winner' : ''}`}>
                          {m.player2_score != null ? m.player2_score.toLocaleString() : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function BracketTree({ bracketId, api, defaultBracket, hideTitle = false, user, onEditMatch, onCreateMatch, refreshKey }) {
  const [data, setData] = useState(() => {
    if (!bracketId) {
      return { bracket: defaultBracket, matches: [] };
    }
    return null;
  });
  const [loading, setLoading] = useState(() => !!bracketId);
  const [ctxMenu, setCtxMenu] = useState(null); // { x, y, matchData, playerId, playerName }
  const containerRef = useRef(null);

  useEffect(() => {
    if (!bracketId) {
      setData({ bracket: defaultBracket, matches: [] });
      setLoading(false);
      return;
    }

    const fetchData = () => {
      api.getBracketMatches(bracketId)
        .then(setData)
        .catch(console.error);
    };

    setLoading(true);
    api.getBracketMatches(bracketId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));

    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [bracketId, api, defaultBracket, refreshKey]);

  // Context menu handlers
  const handleContextMenu = (e, matchData, playerId, playerName) => {
    setCtxMenu({ x: e.clientX, y: e.clientY, matchData, playerId, playerName });
  };

  const closeCtxMenu = () => setCtxMenu(null);

  const handleMarkWinner = async () => {
    if (!ctxMenu) return;
    const { matchData, playerId } = ctxMenu;
    closeCtxMenu();
    try {
      await api.updateMatch(matchData.id, { winner_id: playerId, match_status: 'completed' });
      // Immediate refetch
      const fresh = await api.getBracketMatches(bracketId);
      setData(fresh);
    } catch (err) {
      console.error('Error marking winner:', err);
    }
  };

  // Color connector lines based on match completion (winner bracket only, loser uses inline classes)
  useEffect(() => {
    const bType = data?.bracket?.type || data?.bracket?.bracket_type || 'winner';
    if (!containerRef.current || !data?.matches || bType === 'loser') return;

    const colorConnectors = () => {
      const svg = containerRef.current?.querySelector('svg');
      if (!svg) return;

      const paths = svg.querySelectorAll('path');
      const foreignObjects = svg.querySelectorAll('foreignObject');
      if (paths.length === 0 || foreignObjects.length === 0) return;

      // Build a list of completed game right-edge positions
      // The library draws paths FROM parent's left TO child's right edge
      // Path format: M x1 y1 H x2 V y3 H x4
      // x4,y3 = endpoint near the child (source) game's right edge
      const completedEdges = [];
      foreignObjects.forEach((fo) => {
        const x = parseFloat(fo.getAttribute('x') || 0);
        const y = parseFloat(fo.getAttribute('y') || 0);
        const w = parseFloat(fo.getAttribute('width') || 310);
        const h = parseFloat(fo.getAttribute('height') || 160);
        const matchDiv = fo.querySelector('.custom-match.completed');
        if (matchDiv) {
          completedEdges.push({ x: x + w, yMin: y, yMax: y + h });
        }
      });

      paths.forEach((path) => {
        path.classList.remove('decided');
        const d = path.getAttribute('d');
        if (!d) return;
        // Library path format: "M x1 y1 H x2 V y3 H x4"
        // The endpoint x4 is the child game's right edge
        // y3 is the vertical position at the child side
        const parts = d.split(/\s+/);
        // Find last H value (endpoint x) and V value (endpoint y)
        let endX = null, endY = null;
        for (let i = parts.length - 1; i >= 0; i--) {
          if (parts[i].startsWith('H') && endX === null) {
            endX = parseFloat(parts[i].substring(1));
          }
          if (parts[i].startsWith('V') && endY === null) {
            endY = parseFloat(parts[i].substring(1));
          }
        }
        if (endX === null || endY === null) return;

        const isDecided = completedEdges.some(edge =>
          Math.abs(endX - edge.x) < 30 && endY >= edge.yMin - 10 && endY <= edge.yMax + 10
        );
        if (isDecided) path.classList.add('decided');
      });
    };

    // Delay to ensure Bracket SVG has rendered after key change
    const timer = setTimeout(colorConnectors, 150);
    return () => clearTimeout(timer);
  }, [data]);

  // Close popup on click outside or Escape
  useEffect(() => {
    if (!ctxMenu) return;
    const handleClick = () => closeCtxMenu();
    const handleKey = (e) => { if (e.key === 'Escape') closeCtxMenu(); };
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [ctxMenu]);

  if (loading) return <div className="bracket-tree" ref={containerRef}><Spinner size="large" text="Cargando brackets..." /></div>;
  if (!data) {
    return <div className="bracket-tree" ref={containerRef}><div className="no-data">Error al cargar brackets.</div></div>;
  }

  const bracketSize = data.bracket?.size || data.bracket?.bracket_size || 32;
  const bracketType = data.bracket?.type || data.bracket?.bracket_type || 'winner';

  if (bracketSize < 2 || !Number.isFinite(bracketSize)) {
    return (
      <div className="bracket-tree" ref={containerRef}>
        <div className="bracket-section">
          <h2 className="bracket-section-title">Bracket no disponible</h2>
          <div className="no-matches">Configuración de bracket inválida</div>
        </div>
      </div>
    );
  }

  // Build the bracket tree using next_match_id links
  const buildTreeFromLinks = (matches) => {
    if (!matches || matches.length === 0) return null;

    const matchMap = {};
    matches.forEach(m => { matchMap[m.id] = m; });

    // Find the final match: the one no other match's next_match_id points to
    const nextMatchIds = new Set(matches.map(m => m.next_match_id).filter(Boolean));
    let finalMatch = matches.find(m => !nextMatchIds.has(m.id) && !m.next_match_id);
    // If not found (all have next_match_id), find the one whose next_match_id points outside this bracket
    if (!finalMatch) {
      finalMatch = matches.find(m => m.next_match_id && !matchMap[m.next_match_id]);
    }
    // Fallback: last match in array
    if (!finalMatch) {
      finalMatch = matches[matches.length - 1];
    }

    // Build game tree recursively
    const buildGame = (match, round = 0) => {
      // Find matches that feed into this one
      const feeders = matches.filter(m => m.next_match_id === match.id);

      const game = {
        id: match.id.toString(),
        name: match.round_name || `Round ${round + 1}`,
        scheduled: match.scheduled_time ? new Date(match.scheduled_time).getTime() : Date.now(),
        sides: {
          home: {
            team: {
              id: match.player1_id?.toString() || `tbd-home-${match.id}`,
              name: match.player1_username || 'TBD'
            },
            score: match.player1_score != null ? { score: match.player1_score } : undefined
          },
          visitor: {
            team: {
              id: match.player2_id?.toString() || `tbd-visitor-${match.id}`,
              name: match.player2_username || 'TBD'
            },
            score: match.player2_score != null ? { score: match.player2_score } : undefined
          }
        },
        _round: round,
        _position: 0,
        _matchData: match
      };

      // Link feeder games
      if (feeders.length >= 1) {
        const homeFeeder = buildGame(feeders[0], round + 1);
        game.sides.home.seed = {
          displayName: game.sides.home.team.name,
          rank: 1,
          sourceGame: homeFeeder,
          sourcePool: {}
        };
      }
      if (feeders.length >= 2) {
        const visitorFeeder = buildGame(feeders[1], round + 1);
        game.sides.visitor.seed = {
          displayName: game.sides.visitor.team.name,
          rank: 1,
          sourceGame: visitorFeeder,
          sourcePool: {}
        };
      }

      return game;
    };

    return buildGame(finalMatch);
  };

  // Fallback: build tree by index/position (for brackets without next_match_id links)
  const buildTreeByPosition = (matches, bracketSize) => {
    const numRounds = Math.log2(bracketSize);

    const getRoundName = (roundIndex, numRounds, bracketType) => {
      if (bracketType === 'loser') {
        if (roundIndex === numRounds - 1) return 'Loser Finals';
        return `Loser Round ${roundIndex + 1}`;
      }
      const roundFromEnd = numRounds - roundIndex;
      if (roundFromEnd === 1) return 'Finals';
      if (roundFromEnd === 2) return 'Semifinals';
      if (roundFromEnd === 3) return 'Quarterfinals';
      if (roundFromEnd === 4) return 'Round of 16';
      if (roundFromEnd === 5) return 'Round of 32';
      return `Round ${roundIndex + 1}`;
    };

    const games = [];
    const matchesPerRound = [];
    for (let r = 0; r < numRounds; r++) {
      matchesPerRound.push(bracketSize / Math.pow(2, r + 1));
    }

    let matchIndex = 0;
    for (let round = 0; round < numRounds; round++) {
      const matchesInRound = matchesPerRound[round];
      for (let m = 0; m < matchesInRound; m++) {
        const apiMatch = matches?.[matchIndex];
        games.push({
          id: apiMatch?.id?.toString() || `game-${matchIndex}`,
          name: apiMatch?.round_name || getRoundName(round, numRounds, bracketType),
          scheduled: Date.now(),
          sides: {
            home: {
              team: {
                id: apiMatch?.player1_id?.toString() || `p1-${matchIndex}`,
                name: apiMatch?.player1_username || 'TBD'
              },
              score: apiMatch?.player1_score != null ? { score: apiMatch.player1_score } : undefined
            },
            visitor: {
              team: {
                id: apiMatch?.player2_id?.toString() || `p2-${matchIndex}`,
                name: apiMatch?.player2_username || 'TBD'
              },
              score: apiMatch?.player2_score != null ? { score: apiMatch.player2_score } : undefined
            }
          },
          _round: round,
          _position: m,
          _matchData: apiMatch || null
        });
        matchIndex++;
      }
    }

    // Link games
    matchIndex = 0;
    for (let round = 0; round < numRounds - 1; round++) {
      const matchesInRound = matchesPerRound[round];
      const nextRoundStart = games.findIndex(g => g._round === round + 1);

      for (let m = 0; m < matchesInRound; m++) {
        const game = games[matchIndex];
        const nextGameIndex = nextRoundStart + Math.floor(m / 2);
        const nextGame = games[nextGameIndex];

        if (nextGame) {
          const side = m % 2 === 0 ? 'home' : 'visitor';
          nextGame.sides[side].seed = {
            displayName: nextGame.sides[side].team?.name || 'TBD',
            rank: 1,
            sourceGame: game,
            sourcePool: {}
          };
        }
        matchIndex++;
      }
    }

    return games.length > 0 ? games[games.length - 1] : null;
  };

  // Determine which tree-building method to use
  const hasLinks = data.matches?.some(m => m.next_match_id);

  const contextMenuEl = ctxMenu && (
    <div className="bracket-ctx-menu" style={{ left: ctxMenu.x, top: ctxMenu.y }} onClick={(e) => e.stopPropagation()}>
      <div className="bracket-ctx-header">
        <Trophy size={12} /> ¿Marcar a <strong>{ctxMenu.playerName}</strong> como ganador?
      </div>
      <div className="bracket-ctx-actions">
        <button className="bracket-ctx-confirm" onClick={handleMarkWinner}>Confirmar</button>
        <button className="bracket-ctx-cancel" onClick={closeCtxMenu}>Cancelar</button>
      </div>
    </div>
  );

  // Custom renderer for loser bracket (library creates too much empty space for asymmetric trees)
  if (bracketType === 'loser' && data.matches?.length > 0) {
    const matches = data.matches;

    // Group matches into structural rounds using topological sort
    const matchMap = {};
    matches.forEach(m => { matchMap[m.id] = m; });

    // Find feeders for each match (within this bracket)
    const feedersOf = {};
    matches.forEach(m => { feedersOf[m.id] = []; });
    matches.forEach(m => {
      if (m.next_match_id && matchMap[m.next_match_id]) {
        feedersOf[m.next_match_id].push(m.id);
      }
    });

    // Assign round index: matches with no feeders = round 0, then increment
    const roundOf = {};
    const assignRound = (matchId, visited = new Set()) => {
      if (roundOf[matchId] !== undefined) return roundOf[matchId];
      if (visited.has(matchId)) return 0;
      visited.add(matchId);
      const feeders = feedersOf[matchId] || [];
      if (feeders.length === 0) {
        roundOf[matchId] = 0;
      } else {
        roundOf[matchId] = Math.max(...feeders.map(fid => assignRound(fid, visited))) + 1;
      }
      return roundOf[matchId];
    };
    matches.forEach(m => assignRound(m.id));

    // Group by round
    const numRounds = Math.max(...Object.values(roundOf)) + 1;
    const rounds = Array.from({ length: numRounds }, () => []);
    matches.forEach(m => {
      rounds[roundOf[m.id]].push(m);
    });
    // Sort matches within each round by ID for consistent ordering
    rounds.forEach(r => r.sort((a, b) => a.id - b.id));

    // Layout constants
    const matchWidth = 310;
    const matchHeight = 105;
    const hGap = 80;
    const vGap = 20;
    const padding = 30;

    // Calculate max column height
    const maxMatchesInRound = Math.max(...rounds.map(r => r.length));
    const totalHeight = maxMatchesInRound * matchHeight + (maxMatchesInRound - 1) * vGap + padding * 2;
    const totalWidth = numRounds * matchWidth + (numRounds - 1) * hGap + padding * 2;

    // Calculate positions for each match
    const positions = {};
    rounds.forEach((round, colIdx) => {
      const colHeight = round.length * matchHeight + (round.length - 1) * vGap;
      const offsetY = (totalHeight - colHeight) / 2;
      round.forEach((match, rowIdx) => {
        positions[match.id] = {
          x: padding + colIdx * (matchWidth + hGap),
          y: offsetY + rowIdx * (matchHeight + vGap)
        };
      });
    });

    // Generate connector paths
    const connectorPaths = [];
    matches.forEach(m => {
      if (m.next_match_id && positions[m.next_match_id]) {
        const src = positions[m.id];
        const tgt = positions[m.next_match_id];
        const srcRight = src.x + matchWidth;
        const srcMidY = src.y + matchHeight / 2;
        const tgtLeft = tgt.x;
        const tgtMidY = tgt.y + matchHeight / 2;
        const midX = (srcRight + tgtLeft) / 2;
        const isCompleted = m.is_completed;
        connectorPaths.push({
          d: `M${srcRight} ${srcMidY} H${midX} V${tgtMidY} H${tgtLeft}`,
          decided: isCompleted
        });
      }
    });

    return (
      <div className="bracket-tree" ref={containerRef}>
        <MobileBracketView matches={matches} bracketId={bracketId} user={user} onEditMatch={onEditMatch} onCreateMatch={onCreateMatch} onContextMenu={handleContextMenu} />
        <div className="bracket-section bracket-desktop">
          <svg width={totalWidth} height={totalHeight} key={data.matches?.map(m => `${m.id}:${m.winner_id}:${m.player1_id}:${m.player2_id}`).join(',')}>
            {/* Connector paths */}
            {connectorPaths.map((p, i) => (
              <path key={i} d={p.d} className={p.decided ? 'decided' : ''} />
            ))}
            {/* Match cards */}
            {matches.map(m => {
              const pos = positions[m.id];
              if (!pos) return null;
              const isCompleted = m.is_completed;
              const winnerId = m.winner_id;
              const homeIsWinner = winnerId && winnerId === m.player1_id;
              const visitorIsWinner = winnerId && winnerId === m.player2_id;
              const homeTBD = !m.player1_id;
              const visitorTBD = !m.player2_id;
              const statusClass = m.match_status === 'in_progress' ? 'live' : isCompleted ? 'completed' : '';

              return (
                <foreignObject key={m.id} x={pos.x} y={pos.y} width={matchWidth} height={matchHeight} style={{ overflow: 'visible' }}>
                  <div xmlns="http://www.w3.org/1999/xhtml" className={`custom-match ${statusClass}`}>
                    <div className="match-hover-info">
                      <span className={`hover-status ${m.match_status}`}>
                        {m.match_status === 'completed' ? 'Completado' :
                         m.match_status === 'in_progress' ? 'En Progreso' : 'Programado'}
                      </span>
                      {m.winner_id && (
                        <span className="hover-winner">
                          Ganador: {m.winner_id === m.player1_id ? m.player1_username : m.player2_username}
                        </span>
                      )}
                    </div>
                    <div className="bracket-date">
                      <span className="bracket-round-label">{m.round_name}</span>
                      {m.match_status === 'in_progress' && <span className="match-live-badge">EN VIVO</span>}
                      {user?.is_staff && (
                        <button className="bracket-edit-btn" onClick={() => onEditMatch?.(m)} title="Editar partida">
                          <Pencil size={12} />
                        </button>
                      )}
                    </div>
                    <div
                      className={`bracket-player-row ${homeIsWinner ? 'winner' : ''} ${homeTBD ? 'tbd' : ''} ${user?.is_staff && m.player1_id && !isCompleted ? 'clickable' : ''}`}
                      onClick={(e) => {
                        if (user?.is_staff && m.player1_id && !isCompleted) {
                          e.stopPropagation();
                          handleContextMenu(e, m, m.player1_id, m.player1_username);
                        }
                      }}
                    >
                      <span className="bracket-player-name">{m.player1_username || 'TBD'}</span>
                      <span className={`bracket-indicator ${homeIsWinner ? 'winner' : ''}`}>
                        {m.player1_score != null ? m.player1_score.toLocaleString() : ''}
                      </span>
                    </div>
                    <div
                      className={`bracket-player-row ${visitorIsWinner ? 'winner' : ''} ${visitorTBD ? 'tbd' : ''} ${user?.is_staff && m.player2_id && !isCompleted ? 'clickable' : ''}`}
                      onClick={(e) => {
                        if (user?.is_staff && m.player2_id && !isCompleted) {
                          e.stopPropagation();
                          handleContextMenu(e, m, m.player2_id, m.player2_username);
                        }
                      }}
                    >
                      <span className="bracket-player-name">{m.player2_username || 'TBD'}</span>
                      <span className={`bracket-indicator ${visitorIsWinner ? 'winner' : ''}`}>
                        {m.player2_score != null ? m.player2_score.toLocaleString() : ''}
                      </span>
                    </div>
                  </div>
                </foreignObject>
              );
            })}
          </svg>
        </div>
        {contextMenuEl}
      </div>
    );
  }

  const finalGame = hasLinks
    ? buildTreeFromLinks(data.matches)
    : buildTreeByPosition(data.matches, bracketSize);

  if (!finalGame) {
    return (
      <div className="bracket-tree" ref={containerRef}>
        <div className="bracket-section">
          <div className="no-matches">No hay partidas programadas</div>
        </div>
      </div>
    );
  }

  // For single match (Grand Finals), render a simple view
  if (bracketSize <= 2) {
    const matchData = finalGame._matchData;
    const winnerId = matchData?.winner_id;

    const handleSingleMatchEdit = () => {
      if (onEditMatch && matchData) {
        onEditMatch(matchData);
      }
    };

    const handleSingleMatchCreate = () => {
      if (onCreateMatch) {
        onCreateMatch({
          bracket_id: bracketId,
          round_name: finalGame.name,
          _slotInfo: { round: finalGame._round, position: finalGame._position }
        });
      }
    };

    return (
      <div className="bracket-tree" ref={containerRef}>
        <MobileBracketView matches={data.matches} bracketId={bracketId} user={user} onEditMatch={onEditMatch} onCreateMatch={onCreateMatch} onContextMenu={handleContextMenu} />
        <div className="bracket-section bracket-desktop">
          <div className="single-match-view">
            <div className={`styled-match single ${matchData?.is_completed ? 'completed' : ''} ${matchData?.match_status === 'in_progress' ? 'live' : ''}`}>
              <div className="match-round-text">
                {finalGame.name}
                {matchData?.match_status === 'in_progress' && (
                  <span className="match-live-badge">EN VIVO</span>
                )}
                {user?.is_staff && matchData && (
                  <button className="bracket-edit-btn" onClick={handleSingleMatchEdit} title="Editar partida">
                    <Pencil size={12} />
                  </button>
                )}
                {user?.is_staff && !matchData && bracketId && (
                  <button className="bracket-edit-btn bracket-add-btn" onClick={handleSingleMatchCreate} title="Crear partida">
                    <Plus size={14} />
                  </button>
                )}
              </div>
              <div
                className={`match-team ${winnerId === matchData?.player1_id ? 'winner' : ''} ${!matchData?.player1_id ? 'tbd' : ''} ${user?.is_staff && matchData?.player1_id && !matchData?.is_completed ? 'clickable' : ''}`}
                onClick={(e) => {
                  if (user?.is_staff && matchData?.player1_id && !matchData?.is_completed) {
                    e.stopPropagation();
                    handleContextMenu(e, matchData, matchData.player1_id, finalGame.sides.home.team?.name);
                  }
                }}
              >
                <span className="team-name">{finalGame.sides.home.team?.name || 'TBD'}</span>
                <span className="team-score">
                  {matchData?.player1_score != null ? matchData.player1_score.toLocaleString() : ''}
                </span>
              </div>
              <div
                className={`match-team ${winnerId === matchData?.player2_id ? 'winner' : ''} ${!matchData?.player2_id ? 'tbd' : ''} ${user?.is_staff && matchData?.player2_id && !matchData?.is_completed ? 'clickable' : ''}`}
                onClick={(e) => {
                  if (user?.is_staff && matchData?.player2_id && !matchData?.is_completed) {
                    e.stopPropagation();
                    handleContextMenu(e, matchData, matchData.player2_id, finalGame.sides.visitor.team?.name);
                  }
                }}
              >
                <span className="team-name">{finalGame.sides.visitor.team?.name || 'TBD'}</span>
                <span className="team-score">
                  {matchData?.player2_score != null ? matchData.player2_score.toLocaleString() : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
        {contextMenuEl}
      </div>
    );
  }

  const GameWithProps = (props) => (
    <CustomGame {...props} onEditMatch={onEditMatch} onCreateMatch={onCreateMatch} onContextMenu={handleContextMenu} isStaff={user?.is_staff} bracketId={bracketId} />
  );

  return (
    <div className="bracket-tree" ref={containerRef}>
      <MobileBracketView matches={data.matches} bracketId={bracketId} user={user} onEditMatch={onEditMatch} onCreateMatch={onCreateMatch} onContextMenu={handleContextMenu} />
      <div className="bracket-section bracket-desktop">
        <Bracket
          key={data.matches?.map(m => `${m.id}:${m.winner_id}:${m.player1_id}:${m.player2_id}`).join(',')}
          game={finalGame}
          GameComponent={GameWithProps}
          gameDimensions={{ width: 310, height: 160 }}
          roundSeparatorWidth={80}
          svgPadding={30}
          homeOnTop={true}
        />
      </div>
      {contextMenuEl}
    </div>
  );
}

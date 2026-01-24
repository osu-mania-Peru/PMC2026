import { useEffect, useState, useRef } from 'react';
import { Bracket } from 'react-tournament-bracket';
import { Pencil, Plus } from 'lucide-react';
import Spinner from './Spinner';
import './BracketTree.css';

function CustomGame({ game, x, y, onEditMatch, onCreateMatch, isStaff, bracketId }) {
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
        <div className={`bracket-player-row ${homeIsWinner ? 'winner' : ''} ${homeTBD ? 'tbd' : ''}`}>
          <span className="bracket-player-name">{homeTeam?.name || 'TBD'}</span>
          <span className={`bracket-indicator ${homeIsWinner ? 'winner' : ''}`}>
            {homeScore != null ? homeScore.toLocaleString() : ''}
          </span>
        </div>
        <div className={`bracket-player-row ${visitorIsWinner ? 'winner' : ''} ${visitorTBD ? 'tbd' : ''}`}>
          <span className="bracket-player-name">{visitorTeam?.name || 'TBD'}</span>
          <span className={`bracket-indicator ${visitorIsWinner ? 'winner' : ''}`}>
            {visitorScore != null ? visitorScore.toLocaleString() : ''}
          </span>
        </div>
      </div>
    </foreignObject>
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
        <div className="bracket-section">
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
              <div className={`match-team ${winnerId === matchData?.player1_id ? 'winner' : ''} ${!matchData?.player1_id ? 'tbd' : ''}`}>
                <span className="team-name">{finalGame.sides.home.team?.name || 'TBD'}</span>
                <span className="team-score">
                  {matchData?.player1_score != null ? matchData.player1_score.toLocaleString() : ''}
                </span>
              </div>
              <div className={`match-team ${winnerId === matchData?.player2_id ? 'winner' : ''} ${!matchData?.player2_id ? 'tbd' : ''}`}>
                <span className="team-name">{finalGame.sides.visitor.team?.name || 'TBD'}</span>
                <span className="team-score">
                  {matchData?.player2_score != null ? matchData.player2_score.toLocaleString() : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const GameWithProps = (props) => (
    <CustomGame {...props} onEditMatch={onEditMatch} onCreateMatch={onCreateMatch} isStaff={user?.is_staff} bracketId={bracketId} />
  );

  return (
    <div className="bracket-tree" ref={containerRef}>
      <div className="bracket-section">
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
    </div>
  );
}

import { useEffect, useState, useRef } from 'react';
import { Bracket, BracketGame } from 'react-tournament-bracket';
import Spinner from './Spinner';
import './BracketTree.css';

export default function BracketTree({ bracketId, api, defaultBracket, hideTitle = false }) {
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

    // Initial fetch
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

    // Poll for updates every 3 seconds
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [bracketId, api, defaultBracket]);

  if (loading) return <div className="bracket-tree" ref={containerRef}><Spinner size="large" text="Cargando brackets..." /></div>;
  if (!data) {
    return <div className="bracket-tree" ref={containerRef}><div className="no-data">Error al cargar brackets.</div></div>;
  }

  const bracketSize = data.bracket?.size || data.bracket?.bracket_size || 32;
  const bracketType = data.bracket?.type || data.bracket?.bracket_type || 'winner';

  // Guard against invalid bracket sizes
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

  // Transform API data to react-tournament-bracket format
  const transformToGameFormat = (matches, bracketSize) => {
    const numRounds = Math.log2(bracketSize);
    const totalMatchCount = bracketSize - 1;

    // Helper to get round name
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

    // Build games array - we need to create them in order and link them
    const games = [];

    // Calculate matches per round
    const matchesPerRound = [];
    for (let r = 0; r < numRounds; r++) {
      matchesPerRound.push(bracketSize / Math.pow(2, r + 1));
    }

    // Create all game objects first
    let matchIndex = 0;
    for (let round = 0; round < numRounds; round++) {
      const matchesInRound = matchesPerRound[round];
      for (let m = 0; m < matchesInRound; m++) {
        const apiMatch = matches?.[matchIndex];
        games.push({
          id: apiMatch?.id?.toString() || `game-${matchIndex}`,
          name: getRoundName(round, numRounds, bracketType),
          bracketLabel: getRoundName(round, numRounds, bracketType),
          scheduled: Date.now(),
          sides: {
            home: {
              team: {
                id: apiMatch?.player1_id?.toString() || `p1-${matchIndex}`,
                name: apiMatch?.player1_username || 'TBD'
              },
              score: apiMatch?.player1_score !== null && apiMatch?.player1_score !== undefined
                ? { score: apiMatch.player1_score }
                : undefined
            },
            visitor: {
              team: {
                id: apiMatch?.player2_id?.toString() || `p2-${matchIndex}`,
                name: apiMatch?.player2_username || 'TBD'
              },
              score: apiMatch?.player2_score !== null && apiMatch?.player2_score !== undefined
                ? { score: apiMatch.player2_score }
                : undefined
            }
          },
          _round: round,
          _position: m,
          _winnerId: apiMatch?.winner_id
        });
        matchIndex++;
      }
    }

    // Now link the games: each game in round N feeds into a game in round N+1
    matchIndex = 0;
    for (let round = 0; round < numRounds - 1; round++) {
      const matchesInRound = matchesPerRound[round];
      const nextRoundStart = games.findIndex(g => g._round === round + 1);

      for (let m = 0; m < matchesInRound; m++) {
        const game = games[matchIndex];
        const nextGameIndex = nextRoundStart + Math.floor(m / 2);
        const nextGame = games[nextGameIndex];

        if (nextGame) {
          // Determine if this game feeds into home or visitor of next game
          const isHomeFeeder = m % 2 === 0;
          const side = isHomeFeeder ? 'home' : 'visitor';

          // Set up the seed reference - link to source game for bracket lines
          // The team name comes from the API data, we just need to link for the bracket visualization
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

    // Return the final game (last one in the array)
    return games.length > 0 ? games[games.length - 1] : null;
  };

  const finalGame = transformToGameFormat(data.matches, bracketSize);

  if (!finalGame) {
    return (
      <div className="bracket-tree" ref={containerRef}>
        <div className="bracket-section">
          <div className="no-matches">No hay partidas programadas</div>
        </div>
      </div>
    );
  }

  // For single match (like Grand Finals), render a simple view
  if (bracketSize <= 2) {
    return (
      <div className="bracket-tree" ref={containerRef}>
        <div className="bracket-section">
          <div className="single-match-view">
            <div className="styled-match single">
              <div className="match-round-text">{finalGame.name}</div>
              <div className={`match-team ${finalGame._winnerId === finalGame.sides.home.team?.id ? 'winner' : ''}`}>
                <span className="team-name">{finalGame.sides.home.team?.name || 'TBD'}</span>
                <span className="team-score">{finalGame.sides.home.score?.score ?? ''}</span>
              </div>
              <div className={`match-team ${finalGame._winnerId === finalGame.sides.visitor.team?.id ? 'winner' : ''}`}>
                <span className="team-name">{finalGame.sides.visitor.team?.name || 'TBD'}</span>
                <span className="team-score">{finalGame.sides.visitor.score?.score ?? ''}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bracket-tree" ref={containerRef}>
      <div className="bracket-section">
        <Bracket
          game={finalGame}
          gameDimensions={{ width: 200, height: 80 }}
          roundSeparatorWidth={24}
          svgPadding={20}
          homeOnTop={true}
        />
      </div>
    </div>
  );
}

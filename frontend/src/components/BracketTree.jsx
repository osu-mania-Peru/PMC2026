import { useEffect, useState, useRef } from 'react';
import { SingleEliminationBracket, SVGViewer } from '@g-loot/react-tournament-brackets';
import './BracketTree.css';

// Custom Match component with proper styling
const StyledMatch = ({ match, onMatchClick, onPartyClick }) => {
  const topParty = match.participants?.[0];
  const bottomParty = match.participants?.[1];

  return (
    <div
      className="styled-match"
      onClick={onMatchClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
      }}
    >
      <div className="match-round-text">
        {match.tournamentRoundText}
      </div>
      <div
        className={`match-team ${topParty?.isWinner ? 'winner' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onPartyClick?.(topParty);
        }}
      >
        <span className="team-name">{topParty?.name || 'TBD'}</span>
        <span className="team-score">{topParty?.resultText || ''}</span>
      </div>
      <div
        className={`match-team ${bottomParty?.isWinner ? 'winner' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onPartyClick?.(bottomParty);
        }}
      >
        <span className="team-name">{bottomParty?.name || 'TBD'}</span>
        <span className="team-score">{bottomParty?.resultText || ''}</span>
      </div>
    </div>
  );
};

export default function BracketTree({ bracketId, api, defaultBracket }) {
  // Initialize with default bracket if no bracketId provided
  const [data, setData] = useState(() => {
    if (!bracketId) {
      return { bracket: defaultBracket, matches: [] };
    }
    return null;
  });
  const [loading, setLoading] = useState(() => !!bracketId);
  const [dimensions, setDimensions] = useState({ width: 1400, height: 800 });
  const containerRef = useRef(null);

  useEffect(() => {
    if (!bracketId) {
      // Already initialized with default bracket in useState
      return;
    }

    api.getBracketMatches(bracketId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [bracketId, api]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    // Update on mount and when data changes
    updateDimensions();

    // Small delay to ensure layout is complete
    setTimeout(updateDimensions, 100);

    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [data]);

  if (loading) return <div className="bracket-tree" ref={containerRef}><div className="loading">Cargando brackets...</div></div>;
  if (!data) {
    return <div className="bracket-tree" ref={containerRef}><div className="no-data">Error al cargar brackets.</div></div>;
  }

  // Transform API data to @g-loot/react-tournament-brackets format
  const transformMatches = (matches, bracketSize) => {
    const numRounds = Math.log2(bracketSize);
    const totalMatchCount = bracketSize - 1;

    // Calculate nextMatchId for a given match index
    const getNextMatchId = (matchIndex) => {
      if (matchIndex === totalMatchCount - 1) return null; // Final match

      // Calculate which round this match is in and its position
      let matchCount = 0;
      for (let round = 0; round < numRounds; round++) {
        const matchesInRound = bracketSize / Math.pow(2, round + 1);
        if (matchIndex < matchCount + matchesInRound) {
          // This match is in 'round'
          const positionInRound = matchIndex - matchCount;
          const nextRoundStart = matchCount + matchesInRound;
          return nextRoundStart + Math.floor(positionInRound / 2);
        }
        matchCount += matchesInRound;
      }
      return null;
    };

    if (!matches || matches.length === 0) {
      // Generate empty bracket structure
      const emptyMatches = [];

      for (let i = 0; i < totalMatchCount; i++) {
        emptyMatches.push({
          id: i,
          name: `Partida ${i + 1}`,
          nextMatchId: getNextMatchId(i),
          tournamentRoundText: getRoundText(i, bracketSize),
          startTime: new Date().toISOString(),
          state: 'SCHEDULED',
          participants: [
            {
              id: `${i}-p1`,
              resultText: null,
              isWinner: false,
              status: null,
              name: 'POR DEFINIR'
            },
            {
              id: `${i}-p2`,
              resultText: null,
              isWinner: false,
              status: null,
              name: 'POR DEFINIR'
            }
          ]
        });
      }

      return emptyMatches;
    }

    // Transform actual match data
    return matches.map((match, index) => ({
      id: match.id || index,
      name: `Partida ${index + 1}`,
      nextMatchId: match.next_match_id !== undefined ? match.next_match_id : getNextMatchId(index),
      tournamentRoundText: match.round_name || getRoundText(index, bracketSize),
      startTime: match.scheduled_time || new Date().toISOString(),
      state: match.winner_id ? 'DONE' : 'SCHEDULED',
      participants: [
        {
          id: match.player1_id || `${index}-p1`,
          resultText: match.player1_score !== null ? String(match.player1_score) : null,
          isWinner: match.winner_id === match.player1_id,
          status: match.winner_id === match.player1_id ? 'PLAYED' : null,
          name: match.player1_username || 'POR DEFINIR'
        },
        {
          id: match.player2_id || `${index}-p2`,
          resultText: match.player2_score !== null ? String(match.player2_score) : null,
          isWinner: match.winner_id === match.player2_id,
          status: match.winner_id === match.player2_id ? 'PLAYED' : null,
          name: match.player2_username || 'POR DEFINIR'
        }
      ]
    }));
  };

  const getRoundText = (matchIndex, bracketSize) => {
    const numRounds = Math.log2(bracketSize);

    // Calculate which round this match belongs to
    let matchCount = 0;
    for (let round = 0; round < numRounds; round++) {
      const matchesInRound = bracketSize / Math.pow(2, round + 1);
      if (matchIndex < matchCount + matchesInRound) {
        // Found the round - rename from Round 5 to Round 1
        const roundNumber = round + 1;
        return `Round ${roundNumber}`;
      }
      matchCount += matchesInRound;
    }
    return 'Finals';
  };

  const bracketSize = data.bracket.size || data.bracket.bracket_size || 32;
  const transformedMatches = transformMatches(data.matches, bracketSize);
  const bracketType = data.bracket.type || 'winner';

  const getBracketTitle = () => {
    switch (bracketType) {
      case 'winner':
        return 'Winner Bracket';
      case 'loser':
        return 'Loser Bracket';
      case 'grandfinals':
        return 'Grand Finals';
      default:
        return 'Tournament Bracket';
    }
  };

  const getTitleClass = () => {
    if (bracketType === 'loser') return 'loser';
    if (bracketType === 'grandfinals') return 'grandfinals';
    return '';
  };

  return (
    <div className="bracket-tree" ref={containerRef}>
      <div className="bracket-section">
        <h2 className={`bracket-section-title ${getTitleClass()}`}>
          {getBracketTitle()}
        </h2>
        <SingleEliminationBracket
          matches={transformedMatches}
          matchComponent={StyledMatch}
          options={{
            style: {
              width: 300,
              roundSeparatorWidth: 60,
              connectorColor: '#222222',
              connectorColorHighlight: bracketType === 'winner' ? '#ff0844' : '#00ff00',
              spaceBetweenRows: 0,
              roundHeader: {
                isShown: true,
                backgroundColor: bracketType === 'winner' ? '#212121ff' : '#141414',
                fontColor: '#ffffffff',
                fontSize: 14,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                roundTextGenerator: (currentRoundNumber, roundsTotalNumber) => {
                  const roundFromEnd = roundsTotalNumber - currentRoundNumber + 1;
                  if (roundFromEnd === 1) return 'Finals';
                  if (roundFromEnd === 2) return 'Semifinals';
                  if (roundFromEnd === 3) return 'Quarterfinals';
                  if (roundFromEnd === 4) return 'Round of 16';
                  return `Round ${currentRoundNumber}`;
                },
              },
            },
          }}
          svgWrapper={({ children, ...props }) => (
            <SVGViewer
              width={dimensions.width}
              height={dimensions.height}
              background="transparent"
              SVGBackground="transparent"
              {...props}
            >
              {children}
            </SVGViewer>
          )}
        />
      </div>
    </div>
  );
}

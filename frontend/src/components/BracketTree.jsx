import { useEffect, useState } from 'react';
import './BracketTree.css';

export default function BracketTree({ bracketId, api }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bracketId) return;

    api.getBracketMatches(bracketId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [bracketId]);

  if (loading) return <div className="loading">Cargando bracket...</div>;
  if (!data) {
    return <div className="no-data">Error cargando bracket.</div>;
  }

  // Organize matches into rounds based on bracket size
  const organizeRounds = (matches, bracketSize) => {
    // Calculate number of rounds (log2 of bracket size)
    const numRounds = Math.log2(bracketSize);
    const rounds = [];

    // Calculate expected matches per round
    let matchIndex = 0;
    for (let round = 0; round < numRounds; round++) {
      const matchesInRound = bracketSize / Math.pow(2, round + 1);
      const roundMatches = [];

      // Fill with actual matches or create empty placeholders
      for (let i = 0; i < matchesInRound; i++) {
        if (matches && matches[matchIndex]) {
          roundMatches.push(matches[matchIndex]);
          matchIndex++;
        } else {
          // Create empty match placeholder
          roundMatches.push({
            id: `empty-${round}-${i}`,
            isEmpty: true,
            player1_username: 'Vacío',
            player2_username: 'Vacío',
            player1_score: null,
            player2_score: null,
            winner_id: null
          });
        }
      }

      rounds.push(roundMatches);
    }

    return rounds;
  };

  const rounds = organizeRounds(data.matches, data.bracket.size);

  const getRoundName = (roundIndex, totalRounds) => {
    const remaining = totalRounds - roundIndex;
    if (remaining === 1) return 'Final';
    if (remaining === 2) return 'Semifinal';
    if (remaining === 3) return 'Cuartos de Final';
    return `Ronda ${roundIndex + 1}`;
  };

  return (
    <div className="bracket-tree">
      <h3 className="bracket-title">{data.bracket.name}</h3>

      <div className="bracket-rounds">
        {rounds.map((round, roundIndex) => (
          <div key={roundIndex} className="bracket-round">
            <div className="round-label">{getRoundName(roundIndex, rounds.length)}</div>
            <div className="round-matches">
              {round.map((match) => (
                <div key={match.id} className="bracket-match" data-empty={match.isEmpty || false}>
                  <div className={`match-player ${match.winner_id === match.player1_id ? 'winner' : ''}`}>
                    <span className="player-name">{match.player1_username}</span>
                    {match.player1_score !== null && (
                      <span className="player-score">{match.player1_score}</span>
                    )}
                  </div>
                  <div className="match-connector"></div>
                  <div className={`match-player ${match.winner_id === match.player2_id ? 'winner' : ''}`}>
                    <span className="player-name">{match.player2_username}</span>
                    {match.player2_score !== null && (
                      <span className="player-score">{match.player2_score}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

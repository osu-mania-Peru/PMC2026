import { Pencil } from 'lucide-react';
import './MatchCard.css';

export default function MatchCard({ match, player1, player2, statusInfo, hasScore, onEdit }) {
  const getAvatarUrl = (player) => {
    if (!player?.osu_id) return null;
    return `https://a.ppy.sh/${player.osu_id}`;
  };

  return (
    <div className={`match-card ${statusInfo.type}`}>
      {/* Left content with gray bg */}
      <div className="match-card-left">
        <div className="match-teams">
          <div className="match-team">
            <span className="team-label">TEAM 1</span>
            <span className="team-dash"> - </span>
            {player1 && <img src={getAvatarUrl(player1)} alt="" className="match-team-avatar" />}
            <span className="team-name">{player1?.username || 'TBD'}</span>
            <span className="team-dash"> -</span>
          </div>
          <div className="match-team">
            <span className="team-label">TEAM 2</span>
            <span className="team-dash"> </span>
            {player2 && <img src={getAvatarUrl(player2)} alt="" className="match-team-avatar" />}
            <span className="team-name">{player2?.username || 'TBD'}</span>
          </div>
        </div>
        <div className="match-info">
          <span className="match-status-text">{statusInfo.text}</span>
          {match.referee_name && <span className="match-referee">Refeado por {match.referee_name}</span>}
          {match.forfeit_reason && <span className="match-forfeit-reason">{match.forfeit_reason}</span>}
        </div>
      </div>

      {/* Right image area - full height */}
      <div className="match-card-right">
        <div className="match-card-image-fade"></div>
        {player2 && (
          <img
            src={getAvatarUrl(player2)}
            alt=""
            className="match-bg-avatar"
          />
        )}
        <div className="match-score-display">
          {hasScore ? (
            <span className="match-score">{match.player1_score} - {match.player2_score}</span>
          ) : (
            <span className="match-no-info">NO INFO</span>
          )}
        </div>
      </div>

      {/* Edit button for staff */}
      {onEdit && (
        <button className="match-card-edit-btn" onClick={(e) => { e.stopPropagation(); onEdit(match); }}>
          <Pencil size={14} />
        </button>
      )}

      {/* Footer overlay */}
      {match.mp_link ? (
        <a href={match.mp_link} target="_blank" rel="noopener noreferrer" className={`match-link ${statusInfo.type}`}>
          CLICK PARA IR AL MP &gt;
        </a>
      ) : (
        <span className={`match-link ${statusInfo.type}`}>
          MP NO DISPONIBLE AUN
        </span>
      )}
    </div>
  );
}

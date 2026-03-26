import './MatchGrid.css';
import { getTeamIcon } from '../utils/constants';

export default function MatchGrid({ matches, selectedLeague, onSelectMatch, selectedMatchId }) {
    const filtered = selectedLeague === 'all'
        ? matches
        : matches.filter(m => m.league?.toLowerCase().includes(selectedLeague.toLowerCase()));

    if (!filtered.length) {
        return (
            <div className="match-grid-empty">
                <div className="match-grid-empty-icon">⚽</div>
                <p>Nenhum jogo disponível</p>
            </div>
        );
    }

    return (
        <div className="match-grid">
            {filtered.map(match => {
                const isLive = match.status === 'INPLAY';
                const hasScore = isLive && match.homeScore != null;
                
                return (
                    <div
                        key={match.id}
                        className={`match-grid-card ${isLive ? 'live' : ''} ${selectedMatchId === match.id ? 'selected' : ''}`}
                        onClick={() => onSelectMatch(match)}
                    >
                        <div className="match-grid-header">
                            <span className="match-grid-league">{match.league || 'Liga'}</span>
                            {isLive ? (
                                <span className="match-grid-live">AO VIVO</span>
                            ) : (
                                <span className="match-grid-time">{match.time || '--:--'}</span>
                            )}
                        </div>

                        <div className="match-grid-teams">
                            <div className="match-grid-team">
                                <span className="match-grid-icon">{getTeamIcon(match.home)}</span>
                                <span className="match-grid-name">{match.home || 'Time A'}</span>
                            </div>

                            <div className="match-grid-center">
                                {hasScore ? (
                                    <div className="match-grid-score">
                                        <span>{match.homeScore}</span>
                                        <span className="match-grid-dash">-</span>
                                        <span>{match.awayScore}</span>
                                    </div>
                                ) : (
                                    <span className="match-grid-vs">VS</span>
                                )}
                            </div>

                            <div className="match-grid-team">
                                <span className="match-grid-name">{match.away || 'Time B'}</span>
                                <span className="match-grid-icon">{getTeamIcon(match.away)}</span>
                            </div>
                        </div>

                        <div className="match-grid-odds">
                            {['home', 'draw', 'away'].map((key, i) => (
                                <div key={i} className="match-grid-odd">
                                    <span>{['1', 'X', '2'][i]}</span>
                                    <span>{match.odds?.[key] || '1.00'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

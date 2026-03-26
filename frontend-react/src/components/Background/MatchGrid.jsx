import './MatchGrid.css';

const teamIcons = {
    'Flamengo': '🔥', 'Palmeiras': '💚', 'Corinthians': '⚫',
    'São Paulo': '🔴', 'Santos': '⚪', 'Botafogo': '⚫',
    'Fluminense': '🟤', 'Vasco': '⚫', 'Athletico': '🔴',
    'Atlético': '⚫', 'Cruzeiro': '🔵', 'Bahia': '💛',
    'Fortaleza': '🔵', 'Grêmio': '🔵', 'Internacional': '🔴',
    'Barcelona': '🔵', 'Real Madrid': '⚪', 'Madrid': '🔴',
    'Manchester City': '🩵', 'Liverpool': '🔴', 'Arsenal': '🔴',
    'Chelsea': '🔵', 'Bayern': '🔴', 'Dortmund': '💛',
    'Inter Milan': '🔵', 'AC Milan': '🔴', 'Juventus': '⚫',
    'Napoli': '🔵', 'PSG': '🔵', 'Marseille': '🔵',
    'River Plate': '⚫', 'Sao Paolo': '⚫',
    'Cruz Azul': '🔵', 'Atletico Nacional': '⚫',
    'default': '⚽'
};

function getTeamIcon(teamName) {
    if (!teamName) return teamIcons.default;
    for (const [team, icon] of Object.entries(teamIcons)) {
        if (teamName.toLowerCase().includes(team.toLowerCase())) {
            return icon;
        }
    }
    return teamIcons.default;
}

function formatTime(timeStr) {
    if (!timeStr) return '--:--';
    if (typeof timeStr === 'string' && timeStr.includes(':')) {
        return timeStr;
    }
    return timeStr;
}

export default function MatchGrid({ matches, selectedLeague, onSelectMatch, selectedMatchId }) {
    const filteredMatches = selectedLeague === 'all'
        ? matches
        : matches.filter(m => m.league?.toLowerCase().includes(selectedLeague.toLowerCase()));

    if (filteredMatches.length === 0) {
        return (
            <div className="match-grid-empty">
                <div className="match-grid-empty-icon">⚽</div>
                <p>Nenhum jogo disponível</p>
            </div>
        );
    }

    return (
        <div className="match-grid">
            {filteredMatches.map(match => {
                const isLive = match.status === 'INPLAY';
                const isSelected = selectedMatchId === match.id;
                const hasScore = isLive && match.homeScore !== null && match.homeScore !== undefined;
                
                return (
                    <div
                        key={match.id}
                        className={`match-grid-card ${isLive ? 'live' : ''} ${isSelected ? 'selected' : ''}`}
                        onClick={() => onSelectMatch(match)}
                    >
                        <div className="match-grid-header">
                            <span className="match-grid-league">{match.league || 'Liga'}</span>
                            {isLive ? (
                                <span className="match-grid-live">AO VIVO</span>
                            ) : (
                                <span className="match-grid-time">{formatTime(match.time)}</span>
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
                            <div className="match-grid-odd">
                                <span>1</span>
                                <span>{match.odds?.home || '1.00'}</span>
                            </div>
                            <div className="match-grid-odd">
                                <span>X</span>
                                <span>{match.odds?.draw || '3.00'}</span>
                            </div>
                            <div className="match-grid-odd">
                                <span>2</span>
                                <span>{match.odds?.away || '2.00'}</span>
                            </div>
                        </div>

                        {isSelected && (
                            <div className="match-grid-analyze">
                                <span>🤖 Clique no assistente para ver análise</span>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

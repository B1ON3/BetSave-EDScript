import './MatchSelector.css';

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
    'default': '⚽'
};

function getTeamIcon(teamName) {
    for (const [team, icon] of Object.entries(teamIcons)) {
        if (teamName?.toLowerCase().includes(team.toLowerCase())) {
            return icon;
        }
    }
    return teamIcons.default;
}

function formatTime(dateStr) {
    if (!dateStr) return '--:--';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function MatchSelector({ matches, onSelectMatch }) {
    if (!matches || matches.length === 0) {
        return (
            <div className="match-selector-empty">
                <p>Nenhum jogo disponível no momento.</p>
            </div>
        );
    }

    return (
        <div className="match-selector">
            <p className="match-selector-title">Selecione um jogo para análise:</p>
            
            <div className="match-selector-list">
                {matches.slice(0, 8).map(match => {
                    const isLive = match.status === 'INPLAY';
                    
                    return (
                        <button
                            key={match.id}
                            className={`match-selector-item ${isLive ? 'live' : ''}`}
                            onClick={() => onSelectMatch(match)}
                        >
                            <div className="match-selector-league">
                                <span>{match.league}</span>
                                {isLive && <span className="live-badge">AO VIVO</span>}
                            </div>
                            
                            <div className="match-selector-teams">
                                <div className="match-selector-team">
                                    <span className="match-selector-icon">{getTeamIcon(match.home)}</span>
                                    <span className="match-selector-name">{match.home}</span>
                                </div>
                                
                                <div className="match-selector-vs">
                                    {isLive ? (
                                        <span className="match-selector-score">
                                            {match.homeScore} - {match.awayScore}
                                        </span>
                                    ) : (
                                        <span className="match-selector-time">
                                            {formatTime(match.time)}
                                        </span>
                                    )}
                                </div>
                                
                                <div className="match-selector-team">
                                    <span className="match-selector-name">{match.away}</span>
                                    <span className="match-selector-icon">{getTeamIcon(match.away)}</span>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

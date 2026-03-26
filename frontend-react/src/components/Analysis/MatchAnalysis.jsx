import './MatchAnalysis.css';

const teamIcons = {
    'Flamengo': '🔥', 'Palmeiras': '💚', 'Corinthians': '⚫',
    'São Paulo': '🔴', 'Barcelona': '🔵', 'Real Madrid': '⚪',
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

export default function MatchAnalysis({ match }) {
    if (!match) return null;

    const homeIcon = getTeamIcon(match.home);
    const awayIcon = getTeamIcon(match.away);
    const confidence = match.analysis?.confidence || 72;
    
    const summary = match.analysis?.summary || 
        'Jogo com tendência equilibrada. Ambas equipes apresentam campanhas similares.';
    
    const recentForm = match.homeStats?.recentForm || ['W', 'D', 'W', 'L', 'W'];

    return (
        <div className="analysis-match">
            <div className="analysis-match-teams">
                <div className="analysis-team">
                    <span className="analysis-team-icon">{homeIcon}</span>
                    <span className="analysis-team-name">{match.home}</span>
                </div>
                
                <div className="analysis-vs">
                    <div style={{ fontSize: '1.2rem', fontWeight: '800' }}>VS</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {match.league}
                    </div>
                </div>
                
                <div className="analysis-team">
                    <span className="analysis-team-icon">{awayIcon}</span>
                    <span className="analysis-team-name">{match.away}</span>
                </div>
            </div>

            <div className="analysis-summary">
                <p>{summary}</p>
                
                <div className="analysis-confidence">
                    <span className="analysis-confidence-label">Confiança:</span>
                    <div className="analysis-confidence-bar">
                        <div
                            className="analysis-confidence-fill"
                            style={{ width: `${confidence}%` }}
                        />
                    </div>
                    <span className="analysis-confidence-text">{confidence}%</span>
                </div>
            </div>

            <div className="analysis-form">
                <div className="analysis-form-title">Forma recente ({match.home})</div>
                <div className="analysis-form-items">
                    {recentForm.map((result, i) => (
                        <span
                            key={i}
                            className={`analysis-form-item ${result.toLowerCase()}`}
                        >
                            {result}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

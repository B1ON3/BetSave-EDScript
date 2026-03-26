import './BestBet.css';

function getRiskLevel(probability) {
    if (probability >= 70) return { level: 'low', label: 'BAIXO RISCO' };
    if (probability >= 50) return { level: 'medium', label: 'MÉDIO RISCO' };
    return { level: 'high', label: 'ALTO RISCO' };
}

export default function BestBet({ match }) {
    if (!match) return null;

    if (match.analysis?.loading) {
        return (
            <div className="best-bet">
                <div className="best-bet-header">
                    <span className="best-bet-badge">🏆 TOP OPPORTUNITY</span>
                </div>
                <div className="loading-text">Carregando análise...</div>
            </div>
        );
    }

    const bestBet = match.analysis?.bestBet || {
        market: 'Over 2.5 Gols',
        probability: 74,
        odds: '1.35',
        reason: 'Média de gols das equipes favorece o mercado'
    };

    const risk = bestBet.risk 
        ? { level: bestBet.risk.toLowerCase(), label: bestBet.riskLabel || 'RISCO' }
        : getRiskLevel(bestBet.probability);

    const odds = typeof bestBet.odds === 'string' ? bestBet.odds : bestBet.odds?.toFixed(2) || '1.00';

    return (
        <div className="best-bet">
            <div className="best-bet-header">
                <span className="best-bet-badge">🏆 TOP OPPORTUNITY</span>
                {match.analysis?.dataSource === 'real' && (
                    <span className="data-source-badge">📡 Dados Reais</span>
                )}
            </div>
            
            <div className="best-bet-title">{bestBet.market}</div>
            
            <div className="best-bet-probability">
                <div className="best-bet-bar">
                    <div
                        className="best-bet-bar-fill"
                        style={{ width: `${bestBet.probability}%` }}
                    />
                </div>
                <span className="best-bet-percent">{bestBet.probability}%</span>
            </div>
            
            <div className="best-bet-meta">
                <div className={`best-bet-risk ${risk.level}`}>
                    {risk.level === 'low' && '🟢'}
                    {risk.level === 'medium' && '🟡'}
                    {risk.level === 'high' && '🔴'}
                    <span>{risk.label}</span>
                </div>
                <div className="best-bet-odds">
                    Odd: <strong>{odds}</strong>
                </div>
            </div>
            
            {bestBet.insight && (
                <div className="best-bet-insight">{bestBet.insight}</div>
            )}
        </div>
    );
}

import './AnalysisCard.css';

function getRiskClass(prob) {
    if (prob >= 70) return 'low';
    if (prob >= 50) return 'medium';
    return 'high';
}

function getRiskLabel(risk) {
    switch (risk) {
        case 'BAIXO': return 'Risco Baixo';
        case 'MEDIO': return 'Risco Médio';
        case 'ALTO': return 'Risco Alto';
        default: return 'Risco ' + risk;
    }
}

export default function AnalysisCard({ analysis, match }) {
    if (!analysis || !analysis.summary) {
        return (
            <div className="analysis-card-empty">
                <p>Não foi possível gerar a análise.</p>
            </div>
        );
    }

    const { summary, markets, teams } = analysis;
    const confidence = summary.confidence || 50;
    const riskClass = getRiskClass(confidence);

    const bestMarkets = markets
        ?.filter(m => m.odds > 1 && m.probability > 0.4)
        .sort((a, b) => (b.probability * b.odds) - (a.probability * a.odds))
        .slice(0, 3) || [];

    return (
        <div className="analysis-card">
            <div className="analysis-intro">
                <p className="analysis-summary">{summary.tendency}</p>
                <p className="analysis-why">
                    Baseado nos dados das equipes e histórico de confrontos.
                </p>
            </div>

            {teams?.home && teams?.away && (
                <div className="analysis-teams">
                    <div className="analysis-team">
                        <span className="analysis-team-name">{teams.home.name}</span>
                        <span className="analysis-team-stat">
                            Média: {teams.home.avgGoals?.toFixed(1)} gols/partida
                        </span>
                    </div>
                    <div className="analysis-vs-small">vs</div>
                    <div className="analysis-team">
                        <span className="analysis-team-name">{teams.away.name}</span>
                        <span className="analysis-team-stat">
                            Média: {teams.away.avgGoals?.toFixed(1)} gols/partida
                        </span>
                    </div>
                </div>
            )}

            {summary.totalGoalsExpected && (
                <div className="analysis-expectation">
                    <span className="analysis-expectation-label">Gols esperados:</span>
                    <span className="analysis-expectation-value">
                        ~{summary.totalGoalsExpected.toFixed(1)} gols no jogo
                    </span>
                </div>
            )}

            {bestMarkets.length > 0 && (
                <div className="analysis-opportunities">
                    <p className="analysis-section-title">O que observar:</p>
                    
                    {bestMarkets.map((market, index) => (
                        <div key={index} className="analysis-opportunity">
                            <div className="analysis-opp-header">
                                <span className="analysis-opp-name">
                                    {market.emoji} {market.type}
                                </span>
                                <span className={`analysis-opp-risk ${getRiskClass(market.probability * 100)}`}>
                                    {getRiskLabel(market.risk)}
                                </span>
                            </div>
                            
                            <p className="analysis-opp-why">{market.insight}</p>
                            
                            <div className="analysis-opp-meta">
                                <span>Probabilidade: {Math.round(market.probability * 100)}%</span>
                                <span>Odd: {market.odds?.toFixed(2) || '1.00'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="analysis-confidence">
                <span className="analysis-confidence-label">Confiança da análise:</span>
                <div className="analysis-confidence-bar">
                    <div 
                        className={`analysis-confidence-fill ${riskClass}`}
                        style={{ width: `${confidence}%` }}
                    />
                </div>
                <span className={`analysis-confidence-value ${riskClass}`}>
                    {confidence}%
                </span>
            </div>

            <div className="analysis-disclaimer">
                <p>
                    💡 Lembre-se: análises são apenas ferramentas de apoio. 
                    Decisões são suas!
                </p>
            </div>
        </div>
    );
}

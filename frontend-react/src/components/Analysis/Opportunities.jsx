import { useState } from 'react';
import './Opportunities.css';

function getRiskLevel(probability) {
    if (probability >= 70) return { level: 'low', label: 'Baixo' };
    if (probability >= 50) return { level: 'medium', label: 'Médio' };
    return { level: 'high', label: 'Alto' };
}

const marketIcons = {
    'Over 2.5': '⚽',
    'Under 2.5': '🥅',
    'BTTS Yes': '🤝',
    'BTTS No': '❌',
    '+9 Corners': '📐',
    '-9 Corners': '📐',
    '+3 Cards': '🟨',
    '-3 Cards': '🟨',
    'Home Win': '🏠',
    'Draw': '🤝',
    'Away Win': '✈️',
    'Over 3.5': '⚽⚽',
    'Both Score': '🤝',
};

export default function Opportunities({ match }) {
    const [selectedOpportunity, setSelectedOpportunity] = useState(0);

    if (!match) return null;

    const opportunities = match.analysis?.opportunities || [
        { market: 'Over 2.5', probability: 74, risk: 'low', icon: '⚽' },
        { market: 'BTTS Yes', probability: 68, risk: 'medium', icon: '🤝' },
        { market: '+9 Corners', probability: 62, risk: 'medium', icon: '📐' },
        { market: '+3 Cards', probability: 55, risk: 'medium', icon: '🟨' },
    ];

    return (
        <div className="opportunities">
            <div className="opportunities-title">Oportunidades</div>
            
            {opportunities.map((opp, index) => {
                const risk = typeof opp.risk === 'string' 
                    ? { level: opp.risk, label: opp.risk === 'low' ? 'Baixo' : opp.risk === 'medium' ? 'Médio' : 'Alto' }
                    : getRiskLevel(opp.probability);
                
                return (
                    <div
                        key={index}
                        className={`opportunity-item ${selectedOpportunity === index ? 'selected' : ''}`}
                        onClick={() => setSelectedOpportunity(index)}
                    >
                        <div className="opportunity-icon">
                            {opp.icon || marketIcons[opp.market] || '📊'}
                        </div>
                        <div className="opportunity-name">{opp.market}</div>
                        <div className="opportunity-probability">
                            <div className="opportunity-prob-bar">
                                <div
                                    className={`opportunity-prob-fill ${risk.level}`}
                                    style={{ width: `${opp.probability}%` }}
                                />
                            </div>
                            <span className="opportunity-prob-text">{opp.probability}%</span>
                        </div>
                        <span className={`opportunity-risk ${risk.level}`}>
                            {risk.label}
                        </span>
                    </div>
                );
            })}

            <div className="insights">
                <div className="insights-title">
                    💡 Insights
                </div>
                {match.analysis?.insights?.map((insight, i) => (
                    <div key={i} className="insight-item">
                        <span className="insight-icon">
                            {insight.type === 'positive' ? '✅' : insight.type === 'warning' ? '⚠️' : '💡'}
                        </span>
                        <span className="insight-text">{insight.text}</span>
                    </div>
                )) || (
                    <>
                        <div className="insight-item">
                            <span className="insight-icon">⚽</span>
                            <span className="insight-text">
                                {match.home} marca em média 1.8 gols em casa.
                            </span>
                        </div>
                        <div className="insight-item">
                            <span className="insight-icon">🔴</span>
                            <span className="insight-text">
                                {match.away} sofreu gol em 4 dos últimos 5 jogos fora.
                            </span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

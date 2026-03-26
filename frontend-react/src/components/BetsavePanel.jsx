import { useState, useEffect, useCallback } from 'react';
import { API } from '../utils';

export default function BetsavePanel({ match, onClose }) {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchAnalysis = useCallback(async () => {
        if (!match) return;
        
        setLoading(true);
        setAnalysis(null);
        try {
            let url = `${API}/api/analyze?home=${encodeURIComponent(match.home)}&away=${encodeURIComponent(match.away)}`;
            if (match.homeId && match.awayId) {
                url = `${API}/api/analyze?homeId=${match.homeId}&awayId=${match.awayId}&leagueId=${match.leagueId || 39}&home=${encodeURIComponent(match.home)}&away=${encodeURIComponent(match.away)}`;
            }
            
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data.match || data.teamStats) {
                    setAnalysis(data);
                }
            }
        } catch (err) {
            console.error('Analysis error:', err);
        }
        setLoading(false);
    }, [match]);

    useEffect(() => {
        if (match) {
            fetchAnalysis();
        }
    }, [match, fetchAnalysis]);

    return (
        <div className="betsave-overlay">
            <div className="betsave-backdrop" onClick={onClose} />
            <div className="betsave-panel">
                <div className="betsave-header">
                    <div className="betsave-logo">
                        <span>🤖</span>
                        <span>BetSave AI</span>
                    </div>
                    <button className="betsave-close" onClick={onClose}>✕</button>
                </div>
                
                {match && (
                    <div className="betsave-match-info">
                        <span className="betsave-league">{match.league}</span>
                        <span className="betsave-teams">{match.home} vs {match.away}</span>
                    </div>
                )}

                <div className="betsave-content">
                    {loading ? (
                        <div className="betsave-loading">
                            <div className="betsave-spinner" />
                            <p>Analisando...</p>
                        </div>
                    ) : analysis ? (
                        <BetsaveAnalysis data={analysis} />
                    ) : (
                        <div className="betsave-empty">
                            <div className="betsave-empty-icon">🤖</div>
                            <h3>Bem-vindo ao BetSave!</h3>
                            <p>Selecione um jogo na lista para receber análise completa com:</p>
                            <ul>
                                <li>📊 Estatísticas dos times</li>
                                <li>⚔️ Confrontos diretos</li>
                                <li>🔮 Previsões e probabilidades</li>
                                <li>💡 Insights com explicações</li>
                                <li>🔥 Melhores oportunidades</li>
                            </ul>
                        </div>
                    )}
                </div>

                <div className="betsave-footer">
                    <p>Análises são apenas ferramentas de apoio. Decisões são suas!</p>
                </div>
            </div>
        </div>
    );
}

function BetsaveAnalysis({ data }) {
    const home = data.match?.home;
    const away = data.match?.away;
    const probs = data.probabilities || {};
    const insights = data.insights || [];
    const superOdds = data.superOdds;
    const bestPlayers = data.bestPlayers;

    return (
        <div className="betsave-analysis">
            {superOdds && (
                <div className="super-odds-card">
                    <div className="super-odds-badge">🔥 BEST OPPORTUNITY</div>
                    <div className="super-odds-main">
                        <span className="super-odds-type">{superOdds.type}</span>
                        <span className="super-odds-odd">Odd: {superOdds.odd}</span>
                    </div>
                    <p className="super-odds-reason">{superOdds.reason}</p>
                </div>
            )}

            <div className="betsave-probs">
                <div className="prob-item">
                    <span>{home?.name || 'Home'}</span>
                    <span className="prob-value">{Math.round(parseFloat(probs.home || 0) * 100)}%</span>
                </div>
                <div className="prob-item">
                    <span>Empate</span>
                    <span className="prob-value">{Math.round(parseFloat(probs.draw || 0) * 100)}%</span>
                </div>
                <div className="prob-item">
                    <span>{away?.name || 'Away'}</span>
                    <span className="prob-value">{Math.round(parseFloat(probs.away || 0) * 100)}%</span>
                </div>
            </div>

            {(bestPlayers?.home || bestPlayers?.away) && (
                <div className="betsave-players">
                    <h4>⚽ Jogadores em Destaque</h4>
                    <div className="players-row">
                        {bestPlayers?.home && (
                            <div className="player-card">
                                <span className="player-team">{home?.name}</span>
                                <span className="player-name">⚽ {bestPlayers.home.name}</span>
                                <div className="player-stats">
                                    <span>Gols: {bestPlayers.home.goals}</span>
                                    <span>Assist: {bestPlayers.home.assists}</span>
                                </div>
                            </div>
                        )}
                        {bestPlayers?.away && (
                            <div className="player-card">
                                <span className="player-team">{away?.name}</span>
                                <span className="player-name">⚽ {bestPlayers.away.name}</span>
                                <div className="player-stats">
                                    <span>Gols: {bestPlayers.away.goals}</span>
                                    <span>Assist: {bestPlayers.away.assists}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {insights.length > 0 && (
                <div className="betsave-insights">
                    <h4>💡 Insights</h4>
                    {insights.slice(0, 3).map((ins, i) => (
                        <div key={i} className="insight-item">
                            <span className="insight-text">{ins.text}</span>
                            <span className="insight-reason">Por quê: {ins.reason}</span>
                        </div>
                    ))}
                </div>
            )}

            <div className="betsave-meta">
                <span className={`confidence-badge ${data.meta?.confidence || 'medium'}`}>
                    {data.meta?.confidence === 'high' ? '✅ Dados reais' : '⚠️ Estimativas'}
                </span>
                {data.meta?.statsSource && (
                    <span className="source-badge">{data.meta.statsSource}</span>
                )}
            </div>
        </div>
    );
}

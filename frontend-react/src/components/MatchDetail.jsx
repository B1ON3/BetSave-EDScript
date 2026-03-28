import { useState, useEffect, useCallback } from 'react';
import { API, formatTime } from '../utils';
import LineupField from './LineupField';

export default function MatchDetail({ match, onClose }) {
    const [tab, setTab] = useState('overview');
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

    if (!match) return null;

    const isLive = match.status === 'INPLAY';
    const hasScore = match.homeScore != null && match.awayScore != null;

    return (
        <div className="detail-overlay">
            <div className="detail-backdrop" onClick={onClose} />
            <div className="detail-panel">
                <div className="detail-header">
                    <div className="detail-match-info">
                        <span className="detail-league">{match.league}</span>
                        <div className="detail-teams-row">
                            <span className="detail-team-name home">{match.home}</span>
                            <div className="detail-score-box">
                                {hasScore ? (
                                    <span className="detail-score">{match.homeScore} - {match.awayScore}</span>
                                ) : (
                                    <span className="detail-vs">VS</span>
                                )}
                            </div>
                            <span className="detail-team-name away">{match.away}</span>
                        </div>
                        {isLive && (
                            <span className="detail-live-badge">
                                <span className="detail-live-dot"></span>
                                AO VIVO • {formatTime(match.time)}
                            </span>
                        )}
                    </div>
                    <button className="detail-close" onClick={onClose}>✕</button>
                </div>

                <div className="detail-tabs">
                    <button 
                        className={`detail-tab ${tab === 'overview' ? 'active' : ''}`}
                        onClick={() => setTab('overview')}
                    >
                        <i className="fa fa-chart-bar"></i> Visao Geral
                    </button>
                    <button 
                        className={`detail-tab ${tab === 'lineup' ? 'active' : ''}`}
                        onClick={() => setTab('lineup')}
                    >
                        <i className="fa fa-list"></i> Escalacao
                    </button>
                    <button 
                        className={`detail-tab ${tab === 'predictions' ? 'active' : ''}`}
                        onClick={() => setTab('predictions')}
                    >
                        <i className="fa fa-magic"></i> Previsao
                    </button>
                </div>

                <div className="detail-content">
                    {tab === 'overview' && (
                        <OverviewTab match={match} analysis={analysis} loading={loading} />
                    )}
                    {tab === 'lineup' && (
                        <LineupTab match={match} analysis={analysis} loading={loading} />
                    )}
                    {tab === 'predictions' && (
                        <PredictionsTab match={match} analysis={analysis} loading={loading} />
                    )}
                </div>
            </div>
        </div>
    );
}

function OverviewTab({ match, analysis, loading }) {
    const homeStats = analysis?.teamStats?.home;
    const awayStats = analysis?.teamStats?.away;

    return (
        <div className="tab-content">
            {/* Head-to-Head */}
            <div className="h2h-section">
                <h3 className="section-title"><i className="fa fa-exchange-alt"></i> Confrontos Diretos</h3>
                <div className="h2h-grid">
                    {analysis?.h2h ? (
                        analysis.h2h.map((item, index) => (
                            <div key={index} className="h2h-item">
                                <span className="h2h-date">{item.date}</span>
                                <span className="h2h-teams">
                                    {item.home} <span className="h2h-score">{item.score}</span> {item.away}
                                </span>
                            </div>
                        ))
                    ) : (
                        <>
                            <div className="h2h-item">
                                <span className="h2h-date">2024</span>
                                <span className="h2h-teams">
                                    {match.home} <span className="h2h-score">2-1</span> {match.away}
                                </span>
                            </div>
                            <div className="h2h-item">
                                <span className="h2h-date">2023</span>
                                <span className="h2h-teams">
                                    {match.home} <span className="h2h-score">1-0</span> {match.away}
                                </span>
                            </div>
                            <div className="h2h-item">
                                <span className="h2h-date">2022</span>
                                <span className="h2h-teams">
                                    {match.home} <span className="h2h-score">0-0</span> {match.away}
                                </span>
                            </div>
                        </>
                    )}
                    <div className="h2h-summary">
                        <div className="h2h-stat">
                            <div className="h2h-stat-value">{analysis?.h2hStats?.homeWins || 2}</div>
                            <div className="h2h-stat-label">{match.home}</div>
                        </div>
                        <div className="h2h-stat">
                            <div className="h2h-stat-value">{analysis?.h2hStats?.draws || 1}</div>
                            <div className="h2h-stat-label">Empates</div>
                        </div>
                        <div className="h2h-stat">
                            <div className="h2h-stat-value">{analysis?.h2hStats?.awayWins || 0}</div>
                            <div className="h2h-stat-label">{match.away}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Comparison */}
            <div className="stats-section">
                <h3 className="section-title"><i className="fa fa-chart-bar"></i> Estatisticas</h3>
                <div className="stats-comparison">
                    <div className="stat-row">
                        <span className="stat-label">{homeStats?.played || 10} jogos</span>
                        <div className="stat-bar-container">
                            <div className="stat-bar">
                                <div className="stat-bar-fill home" style={{width: '55%'}}></div>
                            </div>
                            <span className="stat-value">55%</span>
                            <div className="stat-bar">
                                <div className="stat-bar-fill away" style={{width: '45%'}}></div>
                            </div>
                            <span className="stat-label">{awayStats?.played || 10} jogos</span>
                        </div>
                    </div>
                    <div className="stat-row">
                        <span className="stat-label">{homeStats?.wins || 6}V</span>
                        <div className="stat-bar-container">
                            <div className="stat-bar">
                                <div className="stat-bar-fill home" style={{width: '60%'}}></div>
                            </div>
                            <span className="stat-value">Vitórias</span>
                            <div className="stat-bar">
                                <div className="stat-bar-fill away" style={{width: '40%'}}></div>
                            </div>
                            <span className="stat-label">{awayStats?.wins || 4}V</span>
                        </div>
                    </div>
                    <div className="stat-row">
                        <span className="stat-label">{homeStats?.avgGoalsFor?.toFixed(1) || 1.5}</span>
                        <div className="stat-bar-container">
                            <div className="stat-bar">
                                <div className="stat-bar-fill home" style={{width: '55%'}}></div>
                            </div>
                            <span className="stat-value">Gols/Jogo</span>
                            <div className="stat-bar">
                                <div className="stat-bar-fill away" style={{width: '45%'}}></div>
                            </div>
                            <span className="stat-label">{awayStats?.avgGoalsFor?.toFixed(1) || 1.2}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="form-section">
                <h3 className="section-title"><i className="fa fa-chart-line"></i> Forma Recente</h3>
                <div className="form-list">
                    <div style={{flex: 1}}>
                        <div className="form-team">{match.home}</div>
                        <div className="form-results">
                            {(homeStats?.form || 'WWDLW').split('').slice(-5).map((r, i) => (
                                <span key={i} className={`form-result ${r.toUpperCase() === 'W' ? 'win' : r.toUpperCase() === 'D' ? 'draw' : 'loss'}`}>
                                    {r}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div style={{flex: 1}}>
                        <div className="form-team">{match.away}</div>
                        <div className="form-results">
                            {(awayStats?.form || 'LDWWL').split('').slice(-5).map((r, i) => (
                                <span key={i} className={`form-result ${r.toUpperCase() === 'W' ? 'win' : r.toUpperCase() === 'D' ? 'draw' : 'loss'}`}>
                                    {r}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function LineupTab({ match, analysis, loading }) {
    const [lineups, setLineups] = useState(null);
    const [lineupLoading, setLineupLoading] = useState(true);
    
    useEffect(() => {
        if (!match) return;
        
        const fetchLineups = async () => {
            setLineupLoading(true);
            try {
                let url;
                
                if (match.id) {
                    url = `${API}/api/lineups/${match.id}`;
                } else {
                    const params = new URLSearchParams({
                        home: match.home,
                        away: match.away
                    });
                    if (match.homeId) params.append('homeId', match.homeId);
                    if (match.awayId) params.append('awayId', match.awayId);
                    url = `${API}/api/lineups?${params}`;
                }
                
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setLineups(data);
                }
            } catch (err) {
                console.error('Lineup fetch error:', err);
            }
            setLineupLoading(false);
        };
        
        fetchLineups();
    }, [match]);
    
    if (loading || lineupLoading) {
        return (
            <div className="tab-content">
                <div className="loading">
                    <div className="loading-spinner" />
                </div>
            </div>
        );
    }
    
    const homeBestPlayer = analysis?.bestPlayers?.home;
    const awayBestPlayer = analysis?.bestPlayers?.away;

    return (
        <div className="tab-content">
            {lineups?.source && (
                <div className="lineup-source-badge">
                    Fonte: {lineups.source === 'api-football' ? 'API-Football' : 
                            lineups.source === 'csv' ? 'Dados Locais' : 
                            lineups.source === 'mock' ? 'Simulação' : lineups.source}
                </div>
            )}
            
            {lineups?.success === false && lineups?.warning && (
                <div className="lineup-warning">
                    <i className="fa fa-info-circle"></i>
                    {lineups.warning}
                </div>
            )}
            
            {lineups?.success !== false && lineups?.lineups && lineups.lineups.length > 0 ? (
                <>
                    <LineupField lineups={lineups} match={match} />
                    
                    {homeBestPlayer && (
                        <div className="best-players-section">
                            <div className="best-player-card home">
                                <div className="best-player-badge"><i className="fa fa-trophy"></i> {match.home}</div>
                                <div className="best-player-name"><i className="fa fa-futbol"></i> {homeBestPlayer.name}</div>
                                <div className="best-player-stats">
                                    <span>Gols: {homeBestPlayer.goals}</span>
                                    <span>Assist: {homeBestPlayer.assists}</span>
                                </div>
                            </div>
                            <div className="best-player-card away">
                                <div className="best-player-badge"><i className="fa fa-trophy"></i> {match.away}</div>
                                <div className="best-player-name"><i className="fa fa-futbol"></i> {awayBestPlayer.name}</div>
                                <div className="best-player-stats">
                                    <span>Gols: {awayBestPlayer.goals}</span>
                                    <span>Assist: {awayBestPlayer.assists}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="lineup-grid">
                    <div className="lineup-team">
                        <div className="lineup-team-name">{match.home}</div>
                        <div className="lineup-formation">
                            Formação: {lineups?.homeFormation || '4-3-3'}
                        </div>
                        
                        {homeBestPlayer && (
                            <div className="best-player">
                                <div className="best-player-badge"><i className="fa fa-trophy"></i> MELHOR JOGADOR</div>
                                <div className="best-player-name"><i className="fa fa-futbol"></i> {homeBestPlayer.name}</div>
                                <div className="best-player-stats">
                                    <span>Gols: {homeBestPlayer.goals}</span>
                                    <span>Assist: {homeBestPlayer.assists}</span>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="lineup-team">
                        <div className="lineup-team-name">{match.away}</div>
                        <div className="lineup-formation">
                            Formação: {lineups?.awayFormation || '4-4-2'}
                        </div>
                        
                        {awayBestPlayer && (
                            <div className="best-player">
                                <div className="best-player-badge"><i className="fa fa-trophy"></i> MELHOR JOGADOR</div>
                                <div className="best-player-name"><i className="fa fa-futbol"></i> {awayBestPlayer.name}</div>
                                <div className="best-player-stats">
                                    <span>Gols: {awayBestPlayer.goals}</span>
                                    <span>Assist: {awayBestPlayer.assists}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function PredictionsTab({ match, analysis, loading }) {
    if (loading) {
        return (
            <div className="tab-content">
                <div className="loading">
                    <div className="loading-spinner" />
                </div>
            </div>
        );
    }

    const probs = analysis?.probabilities || { home: 0.45, draw: 0.25, away: 0.30 };
    const predictions = analysis?.predictions || { over25: { prob: 0.55, tip: 'SIM' }, btts: { prob: 0.52, tip: 'SIM' } };
    const superOdds = analysis?.superOdds;

    return (
        <div className="tab-content">
            {/* Super Odds */}
            {superOdds && (
                <div className="super-odds-card">
                    <div className="super-odds-badge"><i className="fa fa-fire"></i> BEST OPPORTUNITY</div>
                    <div className="super-odds-main">
                        <span className="super-odds-type">{superOdds.type}</span>
                        <span className="super-odds-odd">Odd: {superOdds.odd}</span>
                    </div>
                    <p className="super-odds-reason">{superOdds.reason}</p>
                </div>
            )}

            {/* Probabilities */}
            <div className="predictions-section">
                <h3 className="section-title"><i className="fa fa-chart-bar"></i> Probabilidades</h3>
                <div className="predictions-grid">
                    <div className="pred-item">
                        <span className="pred-label">{match.home}</span>
                        <div className="pred-bar">
                            <div className="pred-fill" style={{width: `${Math.round(parseFloat(probs.home) * 100)}%`}}></div>
                        </div>
                        <span className="pred-value">
                            {Math.round(parseFloat(probs.home) * 100)}%
                            <i className={`fa fa-circle ${match.homeRisk?.level === 'BAIXO' ? 'text-green' : match.homeRisk?.level === 'ALTO' ? 'text-red' : 'text-yellow'}`}></i>
                        </span>
                    </div>
                    <div className="pred-item">
                        <span className="pred-label">Empate</span>
                        <div className="pred-bar">
                            <div className="pred-fill" style={{width: `${Math.round(parseFloat(probs.draw) * 100)}%`}}></div>
                        </div>
                        <span className="pred-value">{Math.round(parseFloat(probs.draw) * 100)}%</span>
                    </div>
                    <div className="pred-item">
                        <span className="pred-label">{match.away}</span>
                        <div className="pred-bar">
                            <div className="pred-fill" style={{width: `${Math.round(parseFloat(probs.away) * 100)}%`}}></div>
                        </div>
                        <span className="pred-value">
                            {Math.round(parseFloat(probs.away) * 100)}%
                            <i className={`fa fa-circle ${match.awayRisk?.level === 'BAIXO' ? 'text-green' : match.awayRisk?.level === 'ALTO' ? 'text-red' : 'text-yellow'}`}></i>
                        </span>
                    </div>
                </div>
            </div>

            {/* Markets */}
            <div className="markets-section">
                <h3 className="section-title"><i className="fa fa-bullseye"></i> Mercados</h3>
                <div className="markets-grid">
                    <div className="market-item">
                        <span className="market-name">Over 2.5</span>
                        <span className="market-prob">{Math.round(predictions.over25?.prob * 100)}%</span>
                        <i className={`fa fa-circle market-indicator ${predictions.over25?.tip === 'SIM' ? 'text-green' : 'text-red'}`}></i>
                    </div>
                    <div className="market-item">
                        <span className="market-name">Ambas Marcam (BTTS)</span>
                        <span className="market-prob">{Math.round(predictions.btts?.prob * 100)}%</span>
                        <i className={`fa fa-circle market-indicator ${predictions.btts?.tip === 'SIM' ? 'text-green' : 'text-red'}`}></i>
                    </div>
                </div>
            </div>

            {/* Insights */}
            {analysis?.insights?.length > 0 && (
                <div className="insights-section">
                    <h3 className="section-title"><i className="fa fa-lightbulb"></i> Insights</h3>
                    <div className="insights-list">
                        {analysis.insights.slice(0, 3).map((ins, i) => (
                            <div key={i} className="insight-item">
                                <span className="insight-text">{ins.text}</span>
                                <span className="insight-reason">Por que: {ins.reason}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

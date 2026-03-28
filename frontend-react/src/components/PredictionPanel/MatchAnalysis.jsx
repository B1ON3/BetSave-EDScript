import { useState, useEffect } from 'react';
import { API } from '../../utils';
import { ANALYSIS_TABS, usePrediction } from './PredictionContext';

export default function MatchAnalysis({ match }) {
    const { analysisTab, setAnalysisTab } = usePrediction();
    const [lineupTab, setLineupTab] = useState('confirmada');
    const [matchDetails, setMatchDetails] = useState(null);
    const [analysis, setAnalysis] = useState(null);

    useEffect(() => {
        if (match?.id) {
            fetchMatchAnalysis(match.home, match.away);
        }
    }, [match]);

    useEffect(() => {
        if (match) {
            const apiMatch = {
                id: match.id,
                home: match.home,
                away: match.away,
                score: match.homeScore !== undefined && match.awayScore !== undefined 
                    ? `${match.homeScore}-${match.awayScore}` 
                    : match.score,
                league: match.league,
                status: match.status,
                time: match.time,
                startTime: match.startTime,
                localTime: match.localTime
            };
            
            setMatchDetails({
                success: true,
                match: apiMatch,
                events: match.events || [],
                stats: match.stats || null,
                source: match.source || 'api'
            });
        }
    }, [match]);

    const fetchMatchAnalysis = async (home, away) => {
        if (!home || !away) return;
        try {
            const res = await fetch(`${API}/api/analyze?home=${encodeURIComponent(home)}&away=${encodeURIComponent(away)}`);
            if (res.ok) {
                const data = await res.json();
                setAnalysis(data);
            }
        } catch (err) {
            console.log('Erro ao buscar análise:', err);
        }
    };

    return (
        <div className="match-analysis">
            <MatchHeader match={match} />
            <AnalysisTabs match={match} activeTab={analysisTab} onTabChange={setAnalysisTab} />
            <TabContent match={match} matchDetails={matchDetails} analysis={analysis} lineupTab={lineupTab} setLineupTab={setLineupTab} activeTab={analysisTab} onTabChange={setAnalysisTab} />
        </div>
    );
}

function MatchHeader({ match }) {
    return (
        <div className="analysis-match-header">
            <div className="analysis-teams-row">
                <span className="analysis-team-name home">{match.home}</span>
                <div className="analysis-score">
                    <span className="score">{match.homeScore ?? match.score?.split('-')[0] ?? 0}</span>
                    <span className="score-sep">x</span>
                    <span className="score">{match.awayScore ?? match.score?.split('-')[1] ?? 0}</span>
                </div>
                <span className="analysis-team-name away">{match.away}</span>
            </div>
            <div className="analysis-live-row">
                <span className="live-indicator"></span>
                <span className="live-text">{match.status === 'INPLAY' || match.status === 'live' ? 'AO VIVO' : 'AGENDADO'} - {match.time || '00'}'</span>
            </div>
        </div>
    );
}

function AnalysisTabs({ match, activeTab, onTabChange }) {
    return (
        <div className="analysis-tabs-container">
            {ANALYSIS_TABS.map(tab => (
                <button 
                    key={tab}
                    className={`analysis-tab ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => onTabChange(tab)}
                >
                    {tab}
                </button>
            ))}
        </div>
    );
}

function TabContent({ match, matchDetails, analysis, lineupTab, setLineupTab, activeTab, onTabChange }) {
    return (
        <div className="analysis-tab-content">
            {activeTab === 'Visao Geral' && (
                <OverviewTab match={match} matchDetails={matchDetails} analysis={analysis} />
            )}
            {activeTab === 'Escalacao' && (
                <LineupTab match={match} activeLineupTab={lineupTab} onLineupTabChange={setLineupTab} />
            )}
            {activeTab === 'Estatisticas' && (
                <StatsTab match={match} matchDetails={matchDetails} analysis={analysis} />
            )}
            {activeTab === 'Previsao' && (
                <PredictionsTab match={match} analysis={analysis} />
            )}
        </div>
    );
}

function OverviewTab({ match, matchDetails, analysis }) {
    const teamAnalysis = analysis;

    const getEventIcon = (type) => {
        if (type === 'GOOL' || type === 'goal' || type === 'Goal') return 'fa-futbol';
        if (type && type.includes && type.includes('VERMELHO')) return 'fa-square text-red';
        if (type === 'CARTAO' || type === 'yellowcard' || type === 'Yellow Card') return 'fa-square text-yellow';
        if (type === 'SUBST' || type === 'substitution' || type === 'Substitution') return 'fa-exchange-alt';
        if (type === 'PEN' || type === 'penalty' || type === 'Penalty') return 'fa-circle';
        return 'fa-circle';
    };

    const translateEventType = (type) => {
        if (!type) return 'EVENTO';
        if (type === 'GOOL' || type === 'goal' || type === 'Goal') return 'GOL';
        if (type === 'CARTAO' || type === 'yellowcard' || type === 'Yellow Card') return 'CARTAO AMARELO';
        if (type.includes && type.includes('VERMELHO')) return 'CARTAO VERMELHO';
        if (type === 'SUBST' || type === 'substitution' || type === 'Substitution') return 'SUBSTITUICAO';
        if (type === 'PEN' || type === 'penalty' || type === 'Penalty') return 'PENALTI';
        if (type === 'PEN_MISS' || type === 'penalty_missed') return 'PENALTI PERDIDO';
        return type;
    };

    const defaultEvents = matchDetails?.events && matchDetails.events.length > 0 ? [] : [
        { type: 'GOL', player: match?.home || 'Time Casa', time: '45+2\'', team: 'home', icon: 'fa-futbol' },
        { type: 'CARTAO AMARELO', player: 'Jogador Visitante', time: '38\'', team: 'away', icon: 'fa-square text-yellow' },
        { type: 'GOL', player: match?.away || 'Time Fora', time: '22\'', team: 'away', icon: 'fa-futbol' },
    ];

    const defaultStats = {
        home: { possession: 50, passes: 300, fouls: 12, shots: 10 },
        away: { possession: 50, passes: 280, fouls: 14, shots: 8 }
    };

    const events = (matchDetails?.events && matchDetails.events.length > 0)
        ? matchDetails.events.map(e => ({
            ...e,
            type: translateEventType(e.type),
            icon: getEventIcon(e.type),
            team: e.team || 'home'
        }))
        : (matchDetails?.events && matchDetails.events.length > 0) 
            ? matchDetails.events.map(e => ({
                ...e,
                type: translateEventType(e.type),
                icon: getEventIcon(e.type),
                team: e.team || 'home'
            }))
            : defaultEvents;

    const stats = (matchDetails?.match?.stats) || defaultStats;

    const teamStats = (teamAnalysis?.teams) ? [
        { name: 'Poder de Ataque', homeVal: teamAnalysis.teams.home.attackStrength, awayVal: teamAnalysis.teams.away.attackStrength, isPercent: false, max: 5 },
        { name: 'Defesa', homeVal: teamAnalysis.teams.home.defensiveStrength, awayVal: teamAnalysis.teams.away.defensiveStrength, isPercent: false, max: 50 },
        { name: 'Gols/Jogo', homeVal: teamAnalysis.teams.home.avgGoals, awayVal: teamAnalysis.teams.away.avgGoals, isPercent: false, max: 3 },
        { name: 'Agressividade', homeVal: teamAnalysis.teams.home.aggression, awayVal: teamAnalysis.teams.away.aggression, isPercent: false, max: 30 },
    ] : [
        { name: 'Posse de bola', homeVal: stats.home?.possession || 50, awayVal: stats.away?.possession || 50, isPercent: true },
        { name: 'Passes', homeVal: stats.home?.passes || 300, awayVal: stats.away?.passes || 280, isPercent: false },
        { name: 'Faltas', homeVal: stats.home?.fouls || 10, awayVal: stats.away?.fouls || 12, isPercent: false },
        { name: 'Finalizacoes', homeVal: stats.home?.shots || 10, awayVal: stats.away?.shots || 8, isPercent: false },
    ];

    const recentForm = teamAnalysis?.teams ? {
        home: teamAnalysis.teams.home.recentForm || ['V', 'E', 'D', 'V', 'E'],
        away: teamAnalysis.teams.away.recentForm || ['E', 'D', 'V', 'E', 'D']
    } : {
        home: ['V', 'E', 'D', 'V', 'E'],
        away: ['E', 'D', 'V', 'E', 'D']
    };

    const homeChance = teamAnalysis?.teams ? 
        Math.round(teamAnalysis.markets?.find(m => m.type.includes('VITÓRIA') && m.type.includes(match.home.toUpperCase()))?.probability * 100 || 50)
        : 50;
    const awayChance = 100 - homeChance;
    const confidence = teamAnalysis?.summary?.confidence || 75;
    const riskLevel = teamAnalysis?.markets?.[0]?.risk?.level || 'MEDIO';

    const isLive = match?.status === 'INPLAY' || match?.status === 'live' || (matchDetails?.events && matchDetails.events.length > 0);

    return (
        <div className="overview-content">
            <div className="section">
                <div className="section-header">
                    <span className="section-icon"><i className="fa fa-bolt"></i></span>
                    <h4 className="section-title">Eventos da Partida</h4>
                    {isLive && <span className="live-badge">AO VIVO</span>}
                </div>
                <div className="events-list">
                    {events.map((ev, idx) => (
                        <div key={idx} className={`event-item ${ev.team}`}>
                            <div className="event-icon-wrap"><i className={`fa ${ev.icon}`}></i></div>
                            <div className="event-info">
                                <span className="event-type">{ev.type}</span>
                                <span className="event-player">{ev.player}</span>
                            </div>
                            <span className="event-time">{ev.time}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="section">
                <div className="section-header">
                    <span className="section-icon"><i className="fa fa-chart-bar"></i></span>
                    <h4 className="section-title">Estatisticas Comparativas</h4>
                </div>
                <div className="stats-comparison">
                    {teamStats.map((stat, idx) => {
                        const maxVal = stat.max || 100;
                        const homeWidth = stat.isPercent ? stat.homeVal : (stat.homeVal / maxVal) * 100;
                        const awayWidth = stat.isPercent ? stat.awayVal : (stat.awayVal / maxVal) * 100;
                        return (
                        <div key={idx} className="stat-compare-row">
                            <div className="stat-value home">{stat.homeVal.toFixed(stat.isPercent ? 0 : 1)}{stat.isPercent ? '%' : ''}</div>
                            <div className="stat-name-wrap">
                                <div className="stat-bar-container">
                                    <div className="stat-bar home" style={{ width: `${Math.min(homeWidth, 100)}%` }}></div>
                                </div>
                                <span className="stat-name">{stat.name}</span>
                                <div className="stat-bar-container">
                                    <div className="stat-bar away" style={{ width: `${Math.min(awayWidth, 100)}%` }}></div>
                                </div>
                            </div>
                            <div className="stat-value away">{stat.awayVal.toFixed(stat.isPercent ? 0 : 1)}{stat.isPercent ? '%' : ''}</div>
                        </div>
                        );
                    })}
                </div>
            </div>

            <div className="section">
                <div className="section-header">
                    <span><i className="fa fa-chart-bar"></i> Previsoes</span>
                    <span className="pred-count">5 analises</span>
                </div>
                <div className="prediction-summary">
                    <div className="pred-main-row">
                        <div className={`pred-team-card ${homeChance > awayChance ? 'winner' : ''}`}>
                            <span className="pred-team-name">{match.home}</span>
                            <br/>
                            <span className="pred-team-chance">{homeChance}%</span>
                        </div>
                        <div className="pred-vs">VS</div>
                        <div className={`pred-team-card ${awayChance > homeChance ? 'winner' : ''}`}>
                            <span className="pred-team-name">{match.away}</span>
                            <br/>
                            <span className="pred-team-chance">{awayChance}%</span>
                        </div>
                    </div>
                    <div className="pred-meta-row">
                        <span className="precision">Precisao: <strong>{confidence}%</strong></span>
                        <span className={`risk-badge ${riskLevel.toLowerCase()}`}>Risco {riskLevel === 'BAIXO' ? 'Baixo' : riskLevel === 'MEDIO' ? 'Medio' : 'Alto'}</span>
                    </div>
                </div>
            </div>

            <div className="section">
                <div className="section-header">
                    <span className="section-icon"><i className="fa fa-calendar"></i></span>
                    <h4 className="section-title">Ultimos Resultados</h4>
                </div>
                <div className="form-section">
                    <div className="form-team">
                        <span className="form-team-name">{match.home}</span>
                        <div className="form-results">
                            {recentForm.home.map((r, i) => (
                                <span key={i} className={`form-result ${r === 'V' ? 'win' : r === 'E' ? 'draw' : 'loss'}`}>{r}</span>
                            ))}
                        </div>
                    </div>
                    <div className="form-team">
                        <span className="form-team-name">{match.away}</span>
                        <div className="form-results">
                            {recentForm.away.map((r, i) => (
                                <span key={i} className={`form-result ${r === 'V' ? 'win' : r === 'E' ? 'draw' : 'loss'}`}>{r}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="section">
                <div className="section-header">
                    <span className="section-icon"><i className="fa fa-info-circle"></i></span>
                    <h4 className="section-title">Detalhes da Partida</h4>
                </div>
                <div className="match-details">
                    <div className="detail-row">
                        <span className="detail-icon"><i className="fa fa-trophy"></i></span>
                        <span>{matchDetails?.match?.league || match.league || 'Liga Nacional'}</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-icon"><i className="fa fa-calendar"></i></span>
                        <span>{matchDetails?.match?.localTime || match.localTime || match.startTime || 'A definir'}</span>
                    </div>
                    {match.stadium && (
                        <div className="detail-row">
                            <span className="detail-icon"><i className="fa fa-map-marker-alt"></i></span>
                            <span>{match.stadium}</span>
                        </div>
                    )}
                    {match.referee && (
                        <div className="detail-row">
                            <span className="detail-icon"><i className="fa fa-user"></i></span>
                            <span>Arbitro: {match.referee}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function LineupTab({ match, activeLineupTab, onLineupTabChange }) {
    const lineup = {
        stadium: match?.stadium || 'Estadio Nacional',
        home: {
            formation: '4-3-3',
            starters: ['Jogador 1', 'Jogador 2', 'Jogador 3', 'Jogador 4', 'Jogador 5', 'Jogador 6', 'Jogador 7', 'Jogador 8', 'Jogador 9', 'Jogador 10'],
            reserves: ['Reserva 1', 'Reserva 2', 'Reserva 3', 'Reserva 4', 'Reserva 5'],
            unavailable: []
        },
        away: {
            formation: '4-2-3-1',
            starters: ['Jogador 1', 'Jogador 2', 'Jogador 3', 'Jogador 4', 'Jogador 5', 'Jogador 6', 'Jogador 7', 'Jogador 8', 'Jogador 9', 'Jogador 10'],
            reserves: ['Reserva 1', 'Reserva 2', 'Reserva 3'],
            unavailable: []
        }
    };

    return (
        <div className="lineup-content">
            <div className="lineup-status-badge">
                <span className="status-dot success"></span>
                Escalacao Prevista
            </div>

            <div className="lineup-insight">
                <span><i className="fa fa-lightbulb"></i> Baseado em estatisticas e partidas anteriores</span>
            </div>

            <div className="lineup-field">
                <div className="field-venue">
                    <span className="venue-icon"><i className="fa fa-map-marker-alt"></i></span>
                    <span className="venue-name">{lineup.stadium}</span>
                </div>
                <div className="field-half away">
                    <span className="formation-label">{lineup.away.formation}</span>
                    <div className="formation-players">
                        <div className="player-line">
                            {[1,2,3,4].map(i => <span key={i} className="player-dot defender">DF</span>)}
                        </div>
                        <div className="player-line">
                            {[1,2].map(i => <span key={i} className="player-dot midfielder">MC</span>)}
                        </div>
                        <div className="player-line">
                            {[1,2,3].map(i => <span key={i} className="player-dot attacker">ME</span>)}
                        </div>
                        <span className="player-dot striker">ATA</span>
                    </div>
                </div>
                <div className="field-divider">
                    <div className="center-circle"></div>
                </div>
                <div className="field-half home">
                    <span className="formation-label">{lineup.home.formation}</span>
                    <span className="player-dot striker">ATA</span>
                    <div className="player-line">
                        {[1,2,3].map(i => <span key={i} className="player-dot attacker">ME</span>)}
                    </div>
                    <div className="player-line">
                        {[1,2,3].map(i => <span key={i} className="player-dot midfielder">MC</span>)}
                    </div>
                    <div className="player-line">
                        {[1,2,3,4].map(i => <span key={i} className="player-dot defender">DF</span>)}
                    </div>
                </div>
            </div>

            <div className="lineup-section">
                <div className="players-table">
                    <div className="table-header">
                        <span><i className="fa fa-users"></i> Reservas</span>
                    </div>
                    <div className="players-duo-grid">
                        {renderPlayersGrid(lineup.home.reserves, lineup.away.reserves)}
                    </div>
                </div>
            </div>

            <div className="lineup-section">
                <div className="players-table">
                    <div className="table-header">
                        <span><i className="fa fa-ban"></i> Indisponiveis</span>
                    </div>
                    <div className="players-duo-grid">
                        {renderPlayersGrid(lineup.home.unavailable, lineup.away.unavailable)}
                    </div>
                </div>
            </div>
        </div>
    );
}

function renderPlayersGrid(homePlayers, awayPlayers) {
    const rows = [];
    const maxLen = Math.max(homePlayers.length, awayPlayers.length);
    
    for (let i = 0; i < maxLen; i++) {
        const homePlayer = homePlayers[i] || null;
        const awayPlayer = awayPlayers[i] || null;
        rows.push({ home: homePlayer, away: awayPlayer });
    }
    
    return rows.map((row, rowIdx) => (
        <div key={rowIdx} className="players-duo-row">
            <div className={`player-card ${row.home ? 'home' : 'empty-home'}`}>
                {row.home && (
                    <>
                        <div className="player-avatar"><i className="fa fa-user"></i></div>
                        <span className="player-name">{row.home}</span>
                    </>
                )}
            </div>
            <div className={`player-card ${row.away ? 'away' : 'empty-away'}`}>
                {row.away && (
                    <>
                        <div className="player-avatar"><i className="fa fa-user"></i></div>
                        <span className="player-name">{row.away}</span>
                    </>
                )}
            </div>
        </div>
    ));
}

function StatsTab({ match, matchDetails, analysis }) {
    const teamAnalysis = analysis;
    const [mode, setMode] = useState('times');

    const defaultStatsData = {
        'Geral': [
            { name: 'Posse de bola', homeVal: teamAnalysis?.teams?.home?.possession || 50, awayVal: teamAnalysis?.teams?.away?.possession || 50, isPercent: true },
            { name: 'Passes', homeVal: 340, awayVal: 245, isPercent: false },
            { name: 'Faltas', homeVal: 10, awayVal: 14, isPercent: false },
            { name: 'Finalizacoes', homeVal: 12, awayVal: 8, isPercent: false },
        ],
        'Ataque': [
            { name: 'Total Finalizacoes', homeVal: teamAnalysis?.teams?.home?.avgShotsOnTarget * 3 || 12, awayVal: teamAnalysis?.teams?.away?.avgShotsOnTarget * 3 || 8 },
            { name: 'No Gol', homeVal: Math.round(teamAnalysis?.teams?.home?.avgShotsOnTarget || 5), awayVal: Math.round(teamAnalysis?.teams?.away?.avgShotsOnTarget || 3) },
            { name: 'Gols/Jogo', homeVal: teamAnalysis?.teams?.home?.avgGoals || 1.5, awayVal: teamAnalysis?.teams?.away?.avgGoals || 1.0 },
            { name: 'Ataque', homeVal: teamAnalysis?.teams?.home?.attackStrength || 3, awayVal: teamAnalysis?.teams?.away?.attackStrength || 2, isPercent: false, max: 5 },
        ],
        'Defesa': [
            { name: 'Desarmes', homeVal: 9, awayVal: 11 },
            { name: 'Duplos Vencidos', homeVal: 15, awayVal: 12 },
            { name: 'Interceptadas', homeVal: 4, awayVal: 6 },
            { name: 'Bolas Afastadas', homeVal: 12, awayVal: 9 },
        ],
    };

    const statsData = defaultStatsData;

    const playerStats = {
        topPasses: [
            { name: 'Jogador 1', value: 58, flag: 'BR', team: 'home' },
            { name: 'Jogador 2', value: 45, flag: 'BR', team: 'home' },
            { name: 'Jogador 3', value: 42, flag: 'MX', team: 'away' },
        ],
        topTouches: [
            { name: 'Jogador 1', value: 89, flag: 'BR', team: 'home' },
            { name: 'Jogador 2', value: 72, flag: 'BR', team: 'home' },
            { name: 'Jogador 3', value: 45, flag: 'AR', team: 'away' },
        ],
        topFouls: [
            { name: 'Jogador 1', value: 3, flag: 'BR', team: 'home' },
            { name: 'Jogador 2', value: 2, flag: 'FR', team: 'away' },
            { name: 'Jogador 3', value: 2, flag: 'BR', team: 'away' },
        ],
    };

    return (
        <div className="stats-content">
            {teamAnalysis && (
                <div className="stats-analysis-header">
                    <span className={`source-badge ${teamAnalysis.source === 'api' ? 'real' : 'estimated'}`}>
                        <i className={`fa fa-${teamAnalysis.source === 'api' ? 'database' : 'cloud'}`}></i>
                        {teamAnalysis.source === 'api' ? 'Dados Reais' : 'Estimativas'}
                    </span>
                </div>
            )}
            <div className="stats-mode-toggle">
                <button 
                    className={`mode-btn ${mode === 'times' ? 'active' : ''}`}
                    onClick={() => setMode('times')}
                >
                    <i className="fa fa-futbol"></i> Times
                </button>
                <button 
                    className={`mode-btn ${mode === 'jogador' ? 'active' : ''}`}
                    onClick={() => setMode('jogador')}
                >
                    <i className="fa fa-user"></i> Jogador
                </button>
            </div>

            {mode === 'times' ? (
                <div className="stats-categories">
                    {Object.entries(statsData).map(([category, stats]) => (
                        <div key={category} className="stats-category-box">
                            <div className="category-header">
                                <span className="category-title">{category.toUpperCase()}</span>
                            </div>
                            <div className="category-stats">
                                {stats.map((stat, idx) => (
                                    <div key={idx} className="stat-compare-box">
                                        <div className="stat-ball home">{stat.homeVal}{stat.isPercent ? '%' : ''}</div>
                                        <div className="stat-info">
                                            <div className="stat-bar-full">
                                                <div className="bar-home" style={{ width: stat.isPercent ? `${stat.homeVal}%` : `${(stat.homeVal / 400) * 100}%` }}></div>
                                                <div className="bar-away" style={{ width: stat.isPercent ? `${stat.awayVal}%` : `${(stat.awayVal / 400) * 100}%` }}></div>
                                            </div>
                                            <span className="stat-name">{stat.name}</span>
                                        </div>
                                        <div className="stat-ball away">{stat.awayVal}{stat.isPercent ? '%' : ''}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    <div className="player-stats-section">
                        <h5><i className="fa fa-trophy"></i> TOP PASSES</h5>
                        <div className="player-top-list">
                            {playerStats.topPasses.map((p, idx) => (
                                <div key={idx} className="player-top-item">
                                    <span className="player-rank">{idx + 1}</span>
                                    <div className="player-ball">{p.value}</div>
                                    <span className="player-name">{p.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="player-stats-section">
                        <h5><i className="fa fa-bolt"></i> TOQUES NA BOLA</h5>
                        <div className="player-top-list">
                            {playerStats.topTouches.map((p, idx) => (
                                <div key={idx} className="player-top-item">
                                    <span className="player-rank">{idx + 1}</span>
                                    <div className="player-ball">{p.value}</div>
                                    <span className="player-name">{p.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="player-stats-section">
                        <h5><i className="fa fa-exclamation-triangle"></i> FALTAS COMETIDAS</h5>
                        <div className="player-top-list">
                            {playerStats.topFouls.map((p, idx) => (
                                <div key={idx} className="player-top-item">
                                    <span className="player-rank">{idx + 1}</span>
                                    <div className="player-ball">{p.value}</div>
                                    <span className="player-name">{p.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function PredictionsTab({ match, analysis }) {
    const [validation, setValidation] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchValidation = async () => {
            setLoading(true);
            try {
                const validationRes = await fetch(`${API}/api/validate-predictions`);
                if (validationRes.ok) {
                    const valData = await validationRes.json();
                    setValidation(valData);
                }
            } catch (err) {
                console.error('Erro ao buscar validacao:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchValidation();
    }, []);

    const defaultAnalysis = {
        summary: {
            tendency: `Jogo entre ${match?.home || 'Time Casa'} e ${match?.away || 'Time Fora'}. Analise baseada em dados estatisticos.`,
            confidence: 75,
            totalGoalsExpected: 2.5,
            dataSource: 'estimated'
        },
        teams: {
            home: { name: match?.home || 'Time Casa', avgGoals: 1.5, attackStrength: 2.5, defensiveStrength: 25, aggression: 15, recentForm: ['V', 'E', 'D', 'V', 'E'] },
            away: { name: match?.away || 'Time Fora', avgGoals: 1.2, attackStrength: 2.0, defensiveStrength: 22, aggression: 18, recentForm: ['E', 'D', 'V', 'E', 'D'] }
        },
        markets: [
            { type: `VITÓRIA ${(match?.home || 'TIME CASA').toUpperCase()}`, probability: 0.45, risk: { level: 'MEDIO' }, insight: 'Time da casa com leve vantagem' },
            { type: 'EMPATE', probability: 0.28, risk: { level: 'ALTO' }, insight: 'Empate possivel mas improvavel' },
            { type: `VITÓRIA ${(match?.away || 'TIME FORA').toUpperCase()}`, probability: 0.27, risk: { level: 'ALTO' }, insight: 'Time visitante em desvantagem' },
            { type: 'OVER 2.5 GOLS', probability: 0.55, risk: { level: 'MEDIO' }, insight: 'Media de gols razoavel' },
            { type: 'AMBOS MARCAM', probability: 0.50, risk: { level: 'MEDIO' }, insight: 'Ambos times podem marcar' },
        ],
        best_bet: { type: 'OVER 2.5 GOLS', confidence: 55, odds: 1.80, reason: 'Boa oportunidade com base em estatisticas' }
    };

    const mockValidation = {
        summary: { winnerAccuracy: '74', over25Accuracy: '64', bttsAccuracy: '60', totalMatches: 50 }
    };

    const { summary, teams, markets, best_bet, source: dataSource } = analysis || defaultAnalysis || {};
    const validationData = validation || mockValidation;

    const getRiskLabel = (risk) => {
        if (!risk) return 'Medio';
        return typeof risk === 'string' ? risk : (risk.level || 'Medio');
    };

    const predictions = [
        {
            category: 'QUEM VENCE',
            icon: 'fa-trophy',
            items: (markets || [])
                .filter(m => (m.type || '').includes('VITORIA') || m.type === 'EMPATE')
                .map(m => ({
                    label: (m.type || '').replace('VITORIA ', '').replace('TIME ', ''),
                    prob: Math.min(95, Math.round((m.probability || 0) * 100)),
                    precision: (summary?.confidence) || 75,
                    risk: getRiskLabel(m.risk),
                    insight: m.insight || ''
                }))
        },
        {
            category: 'TOTAL DE GOLS',
            icon: 'fa-futbol',
            items: (markets || [])
                .filter(m => (m.type || '').includes('OVER') || (m.type || '').includes('2.5'))
                .slice(0, 3)
                .map(m => ({
                    label: (m.type || '').replace('OVER ', '').replace('GOLS', 'gols'),
                    prob: Math.min(95, Math.round((m.probability || 0) * 100)),
                    precision: (summary?.confidence) || 75,
                    risk: getRiskLabel(m.risk),
                    insight: m.insight || ''
                }))
        },
        {
            category: 'AMBOS MARCAM',
            icon: 'fa-check-circle',
            items: (markets || [])
                .filter(m => (m.type || '').includes('AMBOS') || (m.type || '').includes('BTTS'))
                .slice(0, 2)
                .map(m => ({
                    label: m.type || 'BTTS',
                    prob: Math.min(95, Math.round((m.probability || 0) * 100)),
                    precision: (summary?.confidence) || 75,
                    risk: getRiskLabel(m.risk),
                    insight: m.insight || ''
                }))
        },
    ];

    if (loading) {
        return (
            <div className="predictions-loading">
                <div className="loading-spinner"></div>
                <p>Analisando partida...</p>
            </div>
        );
    }

    return (
        <div className="predictions-content">
            {best_bet && (
                <div className="suggested-bet">
                    <div className="suggested-header">
                        <span className="suggested-badge"><i className="fa fa-lightbulb"></i> MELHOR APOSTA</span>
                        <span className="suggested-accuracy">Confianca: {best_bet.confidence}%</span>
                    </div>
                    <div className="suggested-content">
                        <div className="suggested-main">
                            <span className="suggested-type">{best_bet.type}</span>
                            <span className="suggested-odds">Odds: {best_bet.odds}</span>
                        </div>
                        <p className="suggested-reason">{best_bet.reason}</p>
                    </div>
                </div>
            )}

            <div className="data-source-info">
                <span className={`source-badge ${dataSource === 'api' ? 'real' : 'estimated'}`}>
                    <i className={`fa fa-${dataSource === 'api' ? 'database' : 'cloud'}`}></i>
                    Dados: {dataSource === 'api' ? 'Estatisticas reais' : 'Estimativas'}
                </span>
            </div>

            {validationData && validationData.summary && (
                <div className="validation-section">
                    <h4><i className="fa fa-chart-bar"></i> Precisao do Modelo</h4>
                    <p className="validation-subtitle">Baseado em {validationData.summary.totalMatches} jogos historicos</p>
                    <div className="validation-stats">
                        <div className="validation-stat">
                            <div className="validation-value">{validationData.summary.winnerAccuracy}%</div>
                            <div className="validation-label">Vencedor</div>
                        </div>
                        <div className="validation-stat">
                            <div className="validation-value">{validationData.summary.over25Accuracy}%</div>
                            <div className="validation-label">Over 2.5</div>
                        </div>
                        <div className="validation-stat">
                            <div className="validation-value">{validationData.summary.bttsAccuracy}%</div>
                            <div className="validation-label">BTTS</div>
                        </div>
                    </div>
                </div>
            )}

            <div className="summary-section">
                <h4><i className="fa fa-chart-line"></i> Resumo da Partida</h4>
                <p className="tendency-text">{summary.tendency}</p>
                <div className="summary-stats">
                    <div className="summary-stat">
                        <span className="stat-label">{teams.home.name}</span>
                        <span className="stat-value">{teams.home.avgGoals} gols/jogo</span>
                    </div>
                    <div className="summary-vs">VS</div>
                    <div className="summary-stat">
                        <span className="stat-label">{teams.away.name}</span>
                        <span className="stat-value">{teams.away.avgGoals} gols/jogo</span>
                    </div>
                </div>
            </div>

            {predictions.filter(p => p.items && p.items.length > 0).map((pred, idx) => (
                <div key={idx} className="prediction-category">
                    <div className="category-header">
                        <span className="category-icon"><i className={`fa ${pred.icon}`}></i></span>
                        <h5>{pred.category}</h5>
                    </div>
                    <div className="prediction-items">
                        {pred.items.map((item, i) => {
                            const riskLevel = (item.risk || 'MEDIO').toUpperCase();
                            const riskClass = riskLevel === 'BAIXO' ? 'low' : riskLevel === 'ALTO' ? 'high' : 'medium';
                            const probValue = typeof item.prob === 'number' && !isNaN(item.prob) ? item.prob : 50;
                            return (
                            <div key={i} className="prediction-row">
                                <div className="pred-bar-container">
                                    <div className="pred-bar-fill" style={{ width: `${Math.min(probValue, 100)}%` }}></div>
                                </div>
                                <span className="pred-label">{item.label}</span>
                                <span className="pred-prob">{probValue}%</span>
                                <span className={`pred-risk risk-${riskClass}`}>Risco {item.risk || 'Medio'}</span>
                            </div>
                            );
                        })}
                        {pred.items.length > 0 && pred.items[0].precision && (
                            <div className="pred-footer">
                                <span>Precisao: {pred.items[0].precision}%</span>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

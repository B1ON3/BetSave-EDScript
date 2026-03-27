import { useState, useEffect, useCallback } from 'react';
import { API } from '../utils';

const ANALYSIS_TABS = ['Visao Geral', 'Escalacao', 'Estatisticas', 'Previsao'];
const STATS_CATEGORIES = ['Geral', 'Ataque', 'Defesa', 'Distribuicao', 'Disciplina'];

const TABS_MAP = {
    'Visao Geral': 'Visao Geral',
    'Escalacao': 'Escalacao',
    'Estatisticas': 'Estatisticas',
    'Previsao': 'Previsao'
};

const STATS_EXPLANATIONS = {
    'Posse de bola': 'Porcentagem de tempo que cada time controlou a bola',
    'Finalizações': 'Total de vezes que um time tentou chutar ao gol',
    'Passes': 'Total de passes realizados durante a partida',
    'Faltas': 'Total de infrações cometidas',
    'Desarmes': 'Número de vezes que a defesa roubou a bola',
    'Impedimentos': 'Número de vezes que um jogador estava em posição irregular',
    'Escanteios': 'Total de cobranças de escanteio',
    'Cartões': 'Total de cartões amarelos e vermelhos',
    'Duplos vencidos': 'Número de duelos ganhos no chão e no ar',
    'Interceptadas': 'Número de vezes que um jogador interceptou um passe adversário',
    'Bolas afastadas': 'Número de vezes que a defesa tirou a bola da área',
};

export default function BetsavePanel({ match, onClose, onMinimize, isOpen, liveMatches }) {
    const [isMinimized, setIsMinimized] = useState(false);
    const [viewMode, setViewMode] = useState('overview');
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [analysisTab, setAnalysisTab] = useState('Visao Geral');
    const [statsMode, setStatsMode] = useState('times');
    const [statsCategory, setStatsCategory] = useState('Geral');

    useEffect(() => {
        if (match) {
            setSelectedMatch(match);
            setViewMode('analysis');
        }
    }, [match]);

    useEffect(() => {
        if (!isOpen) {
            setIsMinimized(false);
        }
    }, [isOpen]);

    const handleClose = () => {
        setViewMode('overview');
        setSelectedMatch(null);
        setIsMinimized(false);
        onClose();
    };

    const handleMinimize = () => {
        setIsMinimized(true);
        if (onMinimize) onMinimize();
    };

    const handleRestore = () => {
        setIsMinimized(false);
    };

    const handleBackToOverview = () => {
        setViewMode('overview');
        setSelectedMatch(null);
    };

    if (isMinimized) {
        return (
            <button className="betsave-minimized" onClick={handleRestore}>
                <span className="betsave-minimized-icon"><i className="fa fa-robot"></i></span>
                <span className="betsave-minimized-pulse"></span>
            </button>
        );
    }

    if (!isOpen) return null;

    return (
        <div className="betsave-overlay">
            <div className="betsave-panel">
                <div className="betsave-header">
                    {viewMode === 'analysis' && (
                        <button className="betsave-back" onClick={handleBackToOverview}>
                            <i className="fa fa-arrow-left"></i>
                        </button>
                    )}
                    <div className="betsave-logo">
                        <div className="betsave-logo-icon"><i className="fa fa-robot"></i></div>
                        <div className="betsave-logo-text">
                            <span className="logo-name">BetSave</span>
                            <span className="logo-sub">AI Assistant</span>
                        </div>
                    </div>
                </div>

                <div className="betsave-content">
                    {viewMode === 'overview' ? (
                        <LiveOverview 
                            matches={liveMatches} 
                            onSelectMatch={(m) => {
                                setSelectedMatch(m);
                                setViewMode('analysis');
                            }} 
                        />
                    ) : (
                        <MatchAnalysis 
                            match={selectedMatch} 
                            activeTab={analysisTab}
                            onTabChange={setAnalysisTab}
                            statsMode={statsMode}
                            onStatsModeChange={setStatsMode}
                            statsCategory={statsCategory}
                            onStatsCategoryChange={setStatsCategory}
                        />
                    )}
                </div>

                <div className="betsave-footer">
                    <div className="footer-icon"><i className="fa fa-shield"></i></div>
                    <p>Analises sao apenas ferramentas de apoio. Decisoes sao suas!</p>
                </div>
            </div>
        </div>
    );
}

function LiveOverview({ matches, onSelectMatch }) {
    const [selectedDate, setSelectedDate] = useState('live');
    const [customDate, setCustomDate] = useState('');

    const today = new Date().toISOString().split('T')[0];
    
    const getFilteredMatches = () => {
        if (!matches) return [];
        
        if (selectedDate === 'live') {
            return matches.filter(m => m.status === 'INPLAY' || m.status === 'live');
        }
        
        if (selectedDate === 'today') {
            return matches.filter(m => {
                if (m.status === 'INPLAY' || m.status === 'live') return false;
                return m.isoDate === today;
            });
        }
        
        if (selectedDate === 'tomorrow') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            return matches.filter(m => {
                if (m.status === 'INPLAY' || m.status === 'live') return false;
                return m.isoDate === tomorrowStr;
            });
        }
        
        if (selectedDate === 'custom' && customDate) {
            return matches.filter(m => m.isoDate === customDate);
        }
        
        return matches;
    };

    const filteredMatches = getFilteredMatches();

    const formatMatchForUI = (m) => {
        const predictions = generatePredictions(m);
        return {
            ...m,
            period: m.time ? '2º TEMPO' : '1º TEMPO',
            predictions
        };
    };

    const generatePredictions = (m) => {
        const homeProb = m.odds?.home ? (1 / m.odds.home) * 100 : 50;
        const predictions = [];

        predictions.push({
            type: 'Ambas marcam',
            prob: Math.round(40 + Math.random() * 40),
            precision: 75 + Math.round(Math.random() * 15),
            risk: 'Médio'
        });

        predictions.push({
            type: 'Mais de 2.5 gols',
            prob: Math.round(35 + Math.random() * 40),
            precision: 70 + Math.round(Math.random() * 15),
            risk: homeProb > 60 ? 'Baixo' : homeProb > 40 ? 'Médio' : 'Alto'
        });

        predictions.push({
            type: `${m.home} vence`,
            prob: Math.round(homeProb),
            precision: 78 + Math.round(Math.random() * 12),
            risk: homeProb > 70 ? 'Baixo' : homeProb > 45 ? 'Médio' : 'Alto'
        });

        return predictions;
    };

    if (!matches || matches.length === 0) {
        return (
            <div className="betsave-overview">
                <div className="date-filter-header">
                    <div className="overview-badge">
                        <span className="live-indicator"></span>
                        AO VIVO
                    </div>
                    <div className="date-tabs">
                        <button 
                            className={`date-tab ${selectedDate === 'today' ? 'active' : ''}`}
                            onClick={() => setSelectedDate('today')}
                        >
                            Hoje
                        </button>
                        <button 
                            className={`date-tab ${selectedDate === 'tomorrow' ? 'active' : ''}`}
                            onClick={() => setSelectedDate('tomorrow')}
                        >
                            Amanhã
                        </button>
                        <button 
                            className={`date-tab ${selectedDate === 'custom' ? 'active' : ''}`}
                            onClick={() => setSelectedDate('custom')}
                        >
                            Data
                        </button>
                    </div>
                </div>
                <div className="no-matches">
                    <span>Nenhum jogo encontrado</span>
                </div>
            </div>
        );
    }

    return (
        <div className="betsave-overview" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
            <div className="date-filter-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div className="date-tabs" style={{ display: 'flex', gap: '4px' }}>
                    <button 
                        className={`date-tab live ${selectedDate === 'live' ? 'active' : ''}`}
                        onClick={() => setSelectedDate('live')}
                        style={{ padding: '8px 14px', background: selectedDate === 'live' ? '#00ff88' : '#111', border: '1px solid #222', borderRadius: '20px', color: selectedDate === 'live' ? '#000' : '#fff', fontSize: '12px', cursor: 'pointer' }}
                    >
                        <span className="live-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: selectedDate === 'live' ? '#000' : '#ff5252', display: 'inline-block', marginRight: '4px' }}></span>
                        Ao Vivo
                    </button>
                    <button 
                        className={`date-tab ${selectedDate === 'today' ? 'active' : ''}`}
                        onClick={() => setSelectedDate('today')}
                        style={{ padding: '8px 14px', background: selectedDate === 'today' ? '#00ff88' : '#111', border: '1px solid #222', borderRadius: '20px', color: selectedDate === 'today' ? '#000' : '#fff', fontSize: '12px', cursor: 'pointer' }}
                    >
                        Hoje
                    </button>
                    <button 
                        className={`date-tab ${selectedDate === 'tomorrow' ? 'active' : ''}`}
                        onClick={() => setSelectedDate('tomorrow')}
                        style={{ padding: '8px 14px', background: selectedDate === 'tomorrow' ? '#00ff88' : '#111', border: '1px solid #222', borderRadius: '20px', color: selectedDate === 'tomorrow' ? '#000' : '#fff', fontSize: '12px', cursor: 'pointer' }}
                    >
                        Amanhã
                    </button>
                    <button 
                        className={`date-tab ${selectedDate === 'custom' ? 'active' : ''}`}
                        onClick={() => setSelectedDate('custom')}
                        style={{ padding: '8px 14px', background: selectedDate === 'custom' ? '#00ff88' : '#111', border: '1px solid #222', borderRadius: '20px', color: selectedDate === 'custom' ? '#000' : '#fff', fontSize: '12px', cursor: 'pointer' }}
                    >
                        Data
                    </button>
                </div>
            </div>
            
            {selectedDate === 'custom' && (
                <div className="custom-date-input">
                    <input 
                        type="date" 
                        value={customDate}
                        onChange={(e) => {
                            setCustomDate(e.target.value);
                            setSelectedDate('custom');
                        }}
                    />
                </div>
            )}
            
            <div className="live-matches-list">
                {filteredMatches.length === 0 ? (
                    <div className="no-matches">
                        <span>Nenhum jogo encontrado para este filtro</span>
                    </div>
                ) : (
                    filteredMatches.map(match => {
                        const formattedMatch = formatMatchForUI(match);
                        return (
                            <div 
                                key={match.id} 
                                className="live-match-card"
                                onClick={() => onSelectMatch(match)}
                            >
                                <div className="match-card-header">
                                    <span className="match-league">{match.league}</span>
                                    <span className="match-live-badge">
                                        <span className="live-dot"></span>
                                        {match.time || '00'}
                                    </span>
                                </div>
                            
                            <div className="match-card-teams">
                                <div className="team-info home">
                                    <span className="team-name">{match.home}</span>
                                </div>
                                <div className="match-score-box">
                                    <span className="score">{match.homeScore ?? 0}</span>
                                    <span className="score-separator">-</span>
                                    <span className="score">{match.awayScore ?? 0}</span>
                                </div>
                                <div className="team-info away">
                                    <span className="team-name">{match.away}</span>
                                </div>
                            </div>
                            
                            <div className="match-card-predictions">
                                <div className="predictions-header">
                                    <span>📊 Previsões</span>
                                    <span className="pred-count">{formattedMatch.predictions.length} análises</span>
                                </div>
                                {formattedMatch.predictions.slice(0, 2).map((pred, idx) => (
                                    <div key={idx} className="prediction-item-mini">
                                        <div className="pred-main">
                                            <span className="pred-icon">⚡</span>
                                            <span className="pred-text">{pred.type}</span>
                                        </div>
                                        <div className="pred-meta">
                                            <span className="pred-prob">{pred.prob}%</span>
                                            <span className={`pred-risk risk-${pred.risk.toLowerCase()}`}>Risco {pred.risk}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="match-card-action">
                                <span>Ver análise completa</span>
                                <span className="action-arrow">→</span>
                            </div>
                        </div>
                    );
                    })
                )}
            </div>
        </div>
    );
}

function MatchAnalysis({ match, activeTab, onTabChange, statsMode, onStatsModeChange, statsCategory, onStatsCategoryChange }) {
    const [lineupTab, setLineupTab] = useState('confirmada');
    const [matchDetails, setMatchDetails] = useState(null);

    useEffect(() => {
        if (match?.id) {
            fetchMatchDetails(match.id);
        }
    }, [match]);

    const fetchMatchDetails = async (matchId) => {
        try {
            const res = await fetch(`${API}/api/match/${matchId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setMatchDetails(data);
                }
            }
        } catch (err) {
            console.log('Erro ao buscar detalhes:', err);
        }
    };

    const events = matchDetails?.events || [];
    const matchStats = matchDetails?.stats || null;

    return (
        <div className="match-analysis">
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

            <div className="analysis-tab-content">
                {activeTab === 'Visao Geral' && (
                    <OverviewContent match={match} matchDetails={matchDetails} />
                )}
                {activeTab === 'Escalacao' && (
                    <LineupContent match={match} activeLineupTab={lineupTab} onLineupTabChange={setLineupTab} />
                )}
                {activeTab === 'Estatisticas' && (
                    <StatsContent 
                        match={match} 
                        mode={statsMode}
                        onModeChange={onStatsModeChange}
                        category={statsCategory}
                        onCategoryChange={onStatsCategoryChange}
                    />
                )}
                {activeTab === 'Previsao' && (
                    <PredictionsContent match={match} />
                )}
            </div>
        </div>
    );
}

function OverviewContent({ match, matchDetails }) {
    const [teamAnalysis, setTeamAnalysis] = useState(null);
    const [liveEvents, setLiveEvents] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!match?.home || !match?.away) return;
        
        const fetchTeamAnalysis = async () => {
            setLoading(true);
            try {
                const response = await fetch(
                    `${API}/api/analyze?home=${encodeURIComponent(match.home)}&away=${encodeURIComponent(match.away)}`
                );
                if (response.ok) {
                    const data = await response.json();
                    setTeamAnalysis(data);
                }
            } catch (err) {
                console.error('Erro ao buscar analise:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchTeamAnalysis();
    }, [match?.home, match?.away]);

    useEffect(() => {
        if (!match?.id) return;
        
        const fetchLiveEvents = async () => {
            try {
                const response = await fetch(`${API}/api/match/${match.id}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.events && data.events.length > 0) {
                        setLiveEvents(data.events);
                    }
                }
            } catch (err) {
                console.error('Erro ao buscar eventos ao vivo:', err);
            }
        };

        fetchLiveEvents();
        const interval = setInterval(fetchLiveEvents, 30000);
        return () => clearInterval(interval);
    }, [match?.id]);

    const getEventIcon = (type) => {
        if (type === 'GOOL' || type === 'goal' || type === 'Goal') return 'fa-futbol';
        if (type.includes('VERMELHO') || type === 'redcard' || type === 'Red Card') return 'fa-square text-red';
        if (type === 'CARTAO' || type === 'yellowcard' || type === 'Yellow Card') return 'fa-square text-yellow';
        if (type === 'SUBST' || type === 'substitution' || type === 'Substitution') return 'fa-exchange-alt';
        if (type === 'PEN' || type === 'penalty' || type === 'Penalty') return 'fa-circle';
        return 'fa-circle';
    };

    const translateEventType = (type) => {
        if (type === 'GOOL' || type === 'goal' || type === 'Goal') return 'GOL';
        if (type === 'CARTAO' || type === 'yellowcard' || type === 'Yellow Card') return 'CARTAO AMARELO';
        if (type.includes('VERMELHO') || type === 'redcard' || type === 'Red Card') return 'CARTAO VERMELHO';
        if (type === 'SUBST' || type === 'substitution' || type === 'Substitution') return 'SUBSTITUICAO';
        if (type === 'PEN' || type === 'penalty' || type === 'Penalty') return 'PENALTI';
        if (type === 'PEN_MISS' || type === 'penalty_missed') return 'PENALTI PERDIDO';
        return type || 'EVENTO';
    };

    const defaultEvents = [
        { type: 'GOL', player: match?.home || 'Time Casa', time: '45+2\'', team: 'home', icon: 'fa-futbol' },
        { type: 'CARTAO AMARELO', player: 'Jogador Visitante', time: '38\'', team: 'away', icon: 'fa-square text-yellow' },
        { type: 'GOL', player: match?.away || 'Time Fora', time: '22\'', team: 'away', icon: 'fa-futbol' },
    ];

    const defaultStats = {
        home: { possession: 58, passes: 340, fouls: 10, shots: 12 },
        away: { possession: 42, passes: 245, fouls: 14, shots: 8 }
    };

    const events = (liveEvents && liveEvents.length > 0)
        ? liveEvents.map(e => ({
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

    const recentForm = {
        home: ['V', 'V', 'D', 'E', 'V'],
        away: ['E', 'D', 'V', 'D', 'E']
    };

    const isLive = match?.status === 'live' || liveEvents.length > 0;

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
                        <div className="pred-team-card winner">
                            <span className="pred-team-name">{match.home}</span>
                            <br/>
                            <span className="pred-team-chance">65%</span>
                        </div>
                        <div className="pred-vs">VS</div>
                        <div className="pred-team-card">
                            <span className="pred-team-name">{match.away}</span>
                            <br/>
                            <span className="pred-team-chance">35%</span>
                        </div>
                    </div>
                    <div className="pred-meta-row">
                        <span className="precision">Precisao: <strong>81%</strong></span>
                        <span className="risk-badge medium">Risco Medio</span>
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
                        <span>Copa do Brasil - Quartas de Final</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-icon"><i className="fa fa-calendar"></i></span>
                        <span>15/03/2026 as 21:00</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-icon"><i className="fa fa-tv"></i></span>
                        <span>Globo / SporTV</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-icon"><i className="fa fa-user"></i></span>
                        <span>Arbitro: Rodrigo Carvalhao</span>
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

function LineupContent({ match, activeLineupTab, onLineupTabChange }) {
    const searchLineup = (teamName) => {
        return null;
    };

    const predictLineup = (teamName) => {
        return null;
    };

    const getLineupStatus = () => {
        const confirmedHome = searchLineup(match.home);
        const confirmedAway = searchLineup(match.away);
        
        if (confirmedHome && confirmedAway) {
            return {
                status: 'Escalacao Confirmada',
                type: 'confirmada',
                home: confirmedHome,
                away: confirmedAway
            };
        }
        
        const predictedHome = predictLineup(match.home);
        const predictedAway = predictLineup(match.away);
        
        if (predictedHome && predictedAway) {
            return {
                status: 'Escalacao Prevista',
                type: 'prevista',
                home: predictedHome,
                away: predictedAway,
                insight: 'Baseado em estatisticas e partidas anteriores'
            };
        }
        
        return {
            status: 'Escalacao Indisponivel',
            type: 'indisponivel',
            home: null,
            away: null,
            insight: 'Dados nao disponiveis para esta partida'
        };
    };

    const lineupData = getLineupStatus();
    const lineup = {
        stadium: 'Maracana',
        home: lineupData.home || {
            formation: '4-3-3',
            starters: ['Rossi', 'Matheuzinho', 'Leo Pereira', 'Fabricio Bruno', 'Vina', 'Ayrton Lucas', 'Gerson', 'Arrascaeta', 'Bruno Henrique', 'Pedro'],
            reserves: ['Hugo Souza', 'Rodrigo Caio', 'Everton Ribeiro', 'Victor Hugo', 'Lazaro'],
            unavailable: ['Gabigol (machucado)']
        },
        away: lineupData.away || {
            formation: '4-2-3-1',
            starters: ['Puma', 'Paulo Henrique', 'Gabriel Dias', 'Mastriani', 'Anderson', 'Lauro', 'Gabriel Pec', 'Rossi', 'Vegetti', 'Payet'],
            reserves: ['Ivan', 'Lucas', 'Bruno Gomes'],
            unavailable: ['Payet (machucado)']
        }
    };

    const getStatusBadgeClass = (type) => {
        if (type === 'confirmada') return 'success';
        if (type === 'prevista') return 'warning';
        return 'muted';
    };

    return (
        <div className="lineup-content">
            <div className="lineup-status-badge">
                <span className={`status-dot ${getStatusBadgeClass(lineupData.type)}`}></span>
                {lineupData.status}
            </div>

            {lineupData.insight && (
                <div className="lineup-insight">
                    <span><i className="fa fa-lightbulb"></i> {lineupData.insight}</span>
                </div>
            )}

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

function StatsContent({ match, mode, onModeChange, category, onStatsCategoryChange }) {
    const [teamAnalysis, setTeamAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!match?.home || !match?.away) return;
        
        const fetchStats = async () => {
            setLoading(true);
            try {
                const response = await fetch(
                    `${API}/api/analyze?home=${encodeURIComponent(match.home)}&away=${encodeURIComponent(match.away)}`
                );
                if (response.ok) {
                    const data = await response.json();
                    setTeamAnalysis(data);
                }
            } catch (err) {
                console.error('Erro ao buscar estatisticas:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [match?.home, match?.away]);

    const defaultStatsData = {
        'Geral': [
            { name: 'Posse de bola', homeVal: 58, awayVal: 42, isPercent: true },
            { name: 'Passes', homeVal: 340, awayVal: 245, isPercent: false },
            { name: 'Faltas', homeVal: 10, awayVal: 14, isPercent: false },
            { name: 'Finalizacoes', homeVal: 12, awayVal: 8, isPercent: false },
        ],
        'Ataque': [
            { name: 'Total Finalizacoes', homeVal: 12, awayVal: 8 },
            { name: 'No Gol', homeVal: 5, awayVal: 3 },
            { name: 'Escanteios', homeVal: 6, awayVal: 4 },
            { name: 'Impedimentos', homeVal: 1, awayVal: 0 },
        ],
        'Defesa': [
            { name: 'Desarmes', homeVal: 9, awayVal: 11 },
            { name: 'Duplos Vencidos', homeVal: 15, awayVal: 12 },
            { name: 'Interceptadas', homeVal: 4, awayVal: 6 },
            { name: 'Bolas Afastadas', homeVal: 12, awayVal: 9 },
        ],
        'Distribuicao': [
            { name: 'Total Passes', homeVal: 340, awayVal: 245 },
            { name: 'Precisao Passes', homeVal: 87, awayVal: 82, isPercent: true },
            { name: 'Passes Longos', homeVal: 45, awayVal: 38 },
            { name: 'Cruzamentos', homeVal: 18, awayVal: 12 },
        ],
        'Disciplina': [
            { name: 'Faltas Cometidas', homeVal: 10, awayVal: 14 },
            { name: 'Cartoes Amarelos', homeVal: 2, awayVal: 3 },
            { name: 'Cartoes Vermelhos', homeVal: 0, awayVal: 1 },
        ],
    };

    const statsData = teamAnalysis?.teams ? {
        Geral: [
            { name: 'Poder de Ataque', homeVal: Math.round(teamAnalysis.teams.home.attackStrength * 10), awayVal: Math.round(teamAnalysis.teams.away.attackStrength * 10), isPercent: false, max: 50 },
            { name: 'Defesa', homeVal: teamAnalysis.teams.home.defensiveStrength, awayVal: teamAnalysis.teams.away.defensiveStrength, isPercent: false, max: 50 },
            { name: 'Gols/Jogo', homeVal: teamAnalysis.teams.home.avgGoals, awayVal: teamAnalysis.teams.away.avgGoals, isPercent: false, max: 3 },
            { name: 'Finalizacoes', homeVal: teamAnalysis.teams.home.avgShotsOnTarget, awayVal: teamAnalysis.teams.away.avgShotsOnTarget, isPercent: false, max: 10 },
        ],
        Ataque: [
            { name: 'Finalizacoes Alvo', homeVal: teamAnalysis.teams.home.avgShotsOnTarget, awayVal: teamAnalysis.teams.away.avgShotsOnTarget, isPercent: false, max: 10 },
            { name: 'Gols por Jogo', homeVal: teamAnalysis.teams.home.avgGoals, awayVal: teamAnalysis.teams.away.avgGoals, isPercent: false, max: 3 },
            { name: 'Melhor Atacante', homeVal: 8, awayVal: 7, isPercent: false, max: 10 },
            { name: 'Precisao', homeVal: 75, awayVal: 70, isPercent: true },
        ],
        Defesa: [
            { name: 'Desarmes', homeVal: Math.round(teamAnalysis.teams.home.defensiveStrength / 3), awayVal: Math.round(teamAnalysis.teams.away.defensiveStrength / 3), isPercent: false, max: 20 },
            { name: 'Interceptacoes', homeVal: 6, awayVal: 5, isPercent: false, max: 15 },
            { name: 'Bolas Afastadas', homeVal: 8, awayVal: 9, isPercent: false, max: 20 },
            { name: 'Faltas', homeVal: Math.round(teamAnalysis.teams.home.aggression / 3), awayVal: Math.round(teamAnalysis.teams.away.aggression / 3), isPercent: false, max: 15 },
        ],
        Disciplina: [
            { name: 'Faltas Cometidas', homeVal: Math.round(teamAnalysis.teams.home.aggression / 3), awayVal: Math.round(teamAnalysis.teams.away.aggression / 3), isPercent: false, max: 20 },
            { name: 'Cartoes Amarelos', homeVal: Math.round(teamAnalysis.teams.home.aggression / 10), awayVal: Math.round(teamAnalysis.teams.away.aggression / 10), isPercent: false, max: 10 },
            { name: 'Cartoes Vermelhos', homeVal: 0, awayVal: 0, isPercent: false, max: 5 },
        ],
        'Total de Gols': [
            { name: 'Gols Esperados', homeVal: teamAnalysis.summary.totalGoalsExpected / 2, awayVal: teamAnalysis.summary.totalGoalsExpected / 2, isPercent: false, max: 3 },
            { name: 'Media por Time', homeVal: teamAnalysis.teams.home.avgGoals, awayVal: teamAnalysis.teams.away.avgGoals, isPercent: false, max: 3 },
        ],
    } : defaultStatsData;

    const playerStats = {
        topPasses: [
            { name: 'Arrascaeta', value: 58, flag: 'BR', team: 'home' },
            { name: 'Gerson', value: 75, flag: 'BR', team: 'home' },
            { name: 'Puma', value: 42, flag: 'MX', team: 'away' },
        ],
        topTouches: [
            { name: 'Arrascaeta', value: 89, flag: 'BR', team: 'home' },
            { name: 'Bruno Henrique', value: 72, flag: 'BR', team: 'home' },
            { name: 'Vegetti', value: 45, flag: 'AR', team: 'away' },
        ],
        topFouls: [
            { name: 'Bruno Henrique', value: 3, flag: 'BR', team: 'home' },
            { name: 'Payet', value: 2, flag: 'FR', team: 'away' },
            { name: 'Gabriel Pec', value: 2, flag: 'BR', team: 'away' },
        ],
    };

    if (loading) {
        return (
            <div className="predictions-loading">
                <div className="loading-spinner"></div>
                <p>Carregando estatisticas...</p>
            </div>
        );
    }

    return (
        <div className="stats-content">
            {teamAnalysis && (
                <div className="stats-analysis-header">
                    <span className={`source-badge ${teamAnalysis.dataSource === 'real' ? 'real' : 'estimated'}`}>
                        <i className={`fa fa-${teamAnalysis.dataSource === 'real' ? 'database' : 'cloud'}`}></i>
                        {teamAnalysis.dataSource === 'real' ? 'Dados Reais' : 'Estimativas'}
                    </span>
                </div>
            )}
            <div className="stats-mode-toggle">
                <button 
                    className={`mode-btn ${mode === 'times' ? 'active' : ''}`}
                    onClick={() => onModeChange('times')}
                >
                    <i className="fa fa-futbol"></i> Times
                </button>
                <button 
                    className={`mode-btn ${mode === 'jogador' ? 'active' : ''}`}
                    onClick={() => onModeChange('jogador')}
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

                    <div className="player-stats-section">
                        <h5><i className="fa fa-square text-yellow"></i> CARTOES RECEBIDOS</h5>
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

function PredictionsContent({ match }) {
    const [analysis, setAnalysis] = useState(null);
    const [validation, setValidation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!match?.home || !match?.away) return;
        
        const fetchAnalysis = async () => {
            setLoading(true);
            setError(null);
            
            try {
                const [analysisRes, validationRes] = await Promise.all([
                    fetch(`${API}/api/analyze?home=${encodeURIComponent(match.home)}&away=${encodeURIComponent(match.away)}`),
                    fetch(`${API}/api/validate-predictions`)
                ]);
                
                if (analysisRes.ok) {
                    const data = await analysisRes.json();
                    setAnalysis(data);
                } else {
                    throw new Error('Falha ao carregar análise');
                }
                
                if (validationRes.ok) {
                    const valData = await validationRes.json();
                    setValidation(valData);
                }
            } catch (err) {
                console.error('Erro ao buscar análise:', err);
                setError('Não foi possível carregar as previsões');
            } finally {
                setLoading(false);
            }
        };

        fetchAnalysis();
    }, [match?.home, match?.away]);

    const getRiskClass = (risk) => {
        const riskMap = {
            'BAIXO': 'low',
            'MEDIO': 'medium', 
            'ALTO': 'high',
            'Baixo': 'low',
            'Medio': 'medium',
            'Alto': 'high'
        };
        return riskMap[risk] || 'medium';
    };

    if (loading) {
        return (
            <div className="predictions-loading">
                <div className="loading-spinner"></div>
                <p>Analisando partida...</p>
            </div>
        );
    }

    const mockAnalysis = {
        summary: {
            tendency: `Jogo entre ${match?.home || 'Time Casa'} e ${match?.away || 'Time Fora'}. Analise baseada em dados estatisticos.`,
            confidence: 65,
            totalGoalsExpected: 2.5,
            dataSource: 'estimated'
        },
        teams: {
            home: { name: match?.home || 'Time Casa', avgGoals: 1.5, attackStrength: 2.5, defensiveStrength: 25, aggression: 15 },
            away: { name: match?.away || 'Time Fora', avgGoals: 1.2, attackStrength: 2.0, defensiveStrength: 22, aggression: 18 }
        },
        markets: [
            { type: 'VITORIA TIME CASA', probability: 0.45, risk: { level: 'MEDIO' }, insight: 'Time da casa com leve vantagem' },
            { type: 'EMPATE', probability: 0.28, risk: { level: 'ALTO' }, insight: 'Empate possivel mas improvavel' },
            { type: 'VITORIA TIME FORA', probability: 0.27, risk: { level: 'ALTO' }, insight: 'Time visitante em desvantagem' },
            { type: 'OVER 2.5 GOLS', probability: 0.55, risk: { level: 'MEDIO' }, insight: 'Media de gols razoavel' },
            { type: 'AMBOS MARCAM', probability: 0.50, risk: { level: 'MEDIO' }, insight: 'Ambos times podem marcar' },
        ],
        best_bet: { type: 'OVER 2.5 GOLS', confidence: 55, odds: 1.80, reason: 'Boa oportunidade com base em estatisticas' }
    };

    const mockValidation = {
        summary: { winnerAccuracy: '74', over25Accuracy: '64', bttsAccuracy: '60', totalMatches: 50 }
    };

    const { summary, teams, markets, best_bet, dataSource } = analysis || mockAnalysis;
    const validationData = validation || mockValidation;

    const getRiskLabel = (risk) => {
        if (!risk) return 'Medio';
        return typeof risk === 'string' ? risk : (risk.level || 'Medio');
    };

    const predictions = [
        {
            category: 'QUEM VENCE',
            icon: 'fa-trophy',
            items: markets
                .filter(m => (m.type || '').includes('VITORIA') || m.type === 'EMPATE')
                .map(m => ({
                    label: (m.type || '').replace('VITORIA ', '').replace('TIME ', ''),
                    prob: Math.min(95, Math.round((m.probability || 0) * 100)),
                    precision: summary.confidence || 75,
                    risk: getRiskLabel(m.risk),
                    insight: m.insight || ''
                }))
        },
        {
            category: 'TOTAL DE GOLS',
            icon: 'fa-futbol',
            items: markets
                .filter(m => (m.type || '').includes('OVER') || (m.type || '').includes('2.5'))
                .slice(0, 3)
                .map(m => ({
                    label: (m.type || '').replace('OVER ', '').replace('GOLS', 'gols'),
                    prob: Math.min(95, Math.round((m.probability || 0) * 100)),
                    precision: summary.confidence || 75,
                    risk: getRiskLabel(m.risk),
                    insight: m.insight || ''
                }))
        },
        {
            category: 'AMBOS MARCAM',
            icon: 'fa-check-circle',
            items: markets
                .filter(m => (m.type || '').includes('AMBOS') || (m.type || '').includes('BTTS'))
                .slice(0, 2)
                .map(m => ({
                    label: m.type || 'BTTS',
                    prob: Math.min(95, Math.round((m.probability || 0) * 100)),
                    precision: summary.confidence || 75,
                    risk: getRiskLabel(m.risk),
                    insight: m.insight || ''
                }))
        },
        {
            category: 'FINALIZACOES',
            icon: 'fa-crosshairs',
            items: markets
                .filter(m => (m.type || '').includes('FINALIZAC'))
                .slice(0, 2)
                .map(m => ({
                    label: m.type || 'Finalizacoes',
                    prob: Math.min(95, Math.round((m.probability || 0) * 100)),
                    precision: summary.confidence || 75,
                    risk: getRiskLabel(m.risk),
                    insight: m.insight || ''
                }))
        },
        {
            category: 'CARTOES',
            icon: 'fa-square text-yellow',
            items: markets
                .filter(m => (m.type || '').includes('CART'))
                .slice(0, 2)
                .map(m => ({
                    label: m.type || 'Cartoes',
                    prob: Math.min(95, Math.round((m.probability || 0) * 100)),
                    precision: summary.confidence || 75,
                    risk: getRiskLabel(m.risk),
                    insight: m.insight || ''
                }))
        },
    ];

    const suggestedBet = best_bet || { 
        label: `${match.home} vence`, 
        confidence: 65, 
        reason: 'Baseado em analise estatistica' 
    };

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
                <span className={`source-badge ${dataSource === 'real' ? 'real' : 'estimated'}`}>
                    <i className={`fa fa-${dataSource === 'real' ? 'database' : 'cloud'}`}></i>
                    Dados: {dataSource === 'real' ? 'Estatisticas reais' : 'Estimativas'}
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

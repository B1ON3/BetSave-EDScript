import { useState } from 'react';

function formatMatchForUI(m) {
    const predictions = generatePredictions(m);
    return {
        ...m,
        period: m.time ? '2º TEMPO' : '1º TEMPO',
        predictions
    };
}

function generatePredictions(m) {
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
}

export default function LiveOverview({ matches, onSelectMatch }) {
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
                                    <span><i className="fa fa-chart-bar"></i> Previsões</span>
                                    <span className="pred-count">{formattedMatch.predictions.length} análises</span>
                                </div>
                                {formattedMatch.predictions.slice(0, 2).map((pred, idx) => (
                                    <div key={idx} className="prediction-item-mini">
                                        <div className="pred-main">
                                            <span className="pred-icon"><i className="fa fa-bolt"></i></span>
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
                                <span className="action-arrow"><i className="fa fa-arrow-right"></i></span>
                            </div>
                        </div>
                    );
                    })
                )}
            </div>
        </div>
    );
}

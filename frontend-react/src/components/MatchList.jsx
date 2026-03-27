import { formatTime } from '../utils';

export default function MatchList({ matches, onSelect, favorites, onToggleFavorite, onAddToSlip, loading, onRefresh }) {
    if (loading) {
        return (
            <div className="match-list">
                <div className="loading">
                    <div className="loading-spinner" />
                </div>
            </div>
        );
    }

    if (!matches || matches.length === 0) {
        return (
            <div className="match-list-empty">
                <div className="match-list-empty-icon"><i className="fa fa-futbol"></i></div>
                <h3>Nenhum jogo encontrado</h3>
                <p>Tente selecionar outra liga ou aguarde novos jogos.</p>
                <button onClick={onRefresh}><i className="fa fa-refresh"></i> Tentar novamente</button>
            </div>
        );
    }

    return (
        <div className="match-list">
            {matches.map(match => (
                <div 
                    key={match.id}
                    className={`match-row ${match.status === 'INPLAY' ? 'live' : ''}`}
                    onClick={() => onSelect(match)}
                >
                    <MatchInfo match={match} />
                    <MatchTeams match={match} />
                    <MatchFavorite 
                        matchId={match.id} 
                        isFavorite={favorites.includes(match.id)}
                        onToggle={onToggleFavorite}
                    />
                    <MatchOdds match={match} onAddToSlip={onAddToSlip} />
                </div>
            ))}
        </div>
    );
}

function MatchInfo({ match }) {
    const isLive = match.status === 'INPLAY';
    
    return (
        <div className="match-info">
            <div className="match-time-row">
                {isLive && <span className="live-badge">AO VIVO</span>}
                <span className={`match-time ${isLive ? 'live' : ''}`}>
                    {formatTime(match.time)}
                </span>
            </div>
            <span className="league-name" title={match.league}>
                {match.league}
            </span>
        </div>
    );
}

function MatchTeams({ match }) {
    const isLive = match.status === 'INPLAY';
    const hasScore = match.homeScore != null && match.awayScore != null;
    
    return (
        <div className="match-teams">
            <span className="team home">{match.home}</span>
            
            <div className="match-center">
                {hasScore ? (
                    <div className="score">
                        <span>{match.homeScore}</span>
                        <span className="score-sep">-</span>
                        <span>{match.awayScore}</span>
                    </div>
                ) : (
                    <span className="vs">VS</span>
                )}
            </div>
            
            <span className="team away">{match.away}</span>
            
            {isLive && match.homeRisk && (
                <>
                    <span className="risk-indicator" title={`${match.homeRisk.level || 'MEDIO'} risco`}>
                        <i className={`fa fa-circle ${match.homeRisk?.level === 'BAIXO' ? 'text-green' : match.homeRisk?.level === 'ALTO' ? 'text-red' : 'text-yellow'}`}></i>
                    </span>
                    <span className="risk-indicator" title={`${match.awayRisk?.level || 'MEDIO'} risco`}>
                        <i className={`fa fa-circle ${match.awayRisk?.level === 'BAIXO' ? 'text-green' : match.awayRisk?.level === 'ALTO' ? 'text-red' : 'text-yellow'}`}></i>
                    </span>
                </>
            )}
        </div>
    );
}

function MatchFavorite({ matchId, isFavorite, onToggle }) {
    return (
        <div className="match-favorite">
            <button 
                className={`favorite-btn ${isFavorite ? 'active' : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle(matchId);
                }}
            >
                {isFavorite ? <i className="fa fa-star"></i> : <i className="fa fa-star-o"></i>}
            </button>
        </div>
    );
}

function MatchOdds({ match, onAddToSlip }) {
    const odds = match.odds || { home: 1.50, draw: 3.50, away: 2.50 };
    
    const handleAddToSlip = (market, odd, type) => {
        onAddToSlip({
            matchId: match.id,
            match: `${match.home} vs ${match.away}`,
            league: match.league,
            market,
            type,
            odd
        });
    };
    
    return (
        <div className="match-odds" onClick={(e) => e.stopPropagation()}>
            <button className="odds-btn" onClick={() => handleAddToSlip('Resultado Final', odds.home || 1.50, match.home)}>
                {typeof odds.home === 'number' ? odds.home.toFixed(2) : '1.50'}
            </button>
            <button className="odds-btn" onClick={() => handleAddToSlip('Empate', odds.draw || 3.50, 'Empate')}>
                {typeof odds.draw === 'number' ? odds.draw.toFixed(2) : '3.50'}
            </button>
            <button className="odds-btn" onClick={() => handleAddToSlip('Resultado Final', odds.away || 2.50, match.away)}>
                {typeof odds.away === 'number' ? odds.away.toFixed(2) : '2.50'}
            </button>
        </div>
    );
}

import { formatTime } from '../utils';

export default function MatchList({ matches, onSelect, favorites, onToggleFavorite, loading, onRefresh }) {
    console.log('[MatchList] Props:', { matchesCount: matches?.length, loading, favoritesCount: favorites?.length });
    
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
                <div className="match-list-empty-icon">⚽</div>
                <h3>Nenhum jogo encontrado</h3>
                <p>Tente selecionar outra liga ou aguarde novos jogos.</p>
                <button onClick={onRefresh}>🔄 Tentar novamente</button>
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
                    <MatchOdds match={match} />
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
                        {match.homeRisk.emoji || '🟡'}
                    </span>
                    <span className="risk-indicator" title={`${match.awayRisk?.level || 'MEDIO'} risco`}>
                        {match.awayRisk?.emoji || '🟡'}
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
                {isFavorite ? '⭐' : '☆'}
            </button>
        </div>
    );
}

function MatchOdds({ match }) {
    const odds = match.odds || { home: 1.50, draw: 3.50, away: 2.50 };
    
    return (
        <div className="match-odds">
            <button className="odds-btn">
                {typeof odds.home === 'number' ? odds.home.toFixed(2) : '1.50'}
            </button>
            <button className="odds-btn">
                {typeof odds.draw === 'number' ? odds.draw.toFixed(2) : '3.50'}
            </button>
            <button className="odds-btn">
                {typeof odds.away === 'number' ? odds.away.toFixed(2) : '2.50'}
            </button>
        </div>
    );
}

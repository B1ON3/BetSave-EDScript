const LEAGUES = [
    { name: 'Todos os Jogos', flag: null, filter: 'all' },
    { name: 'Brasileirão Série A', flag: '🇧🇷', filter: 'brasileirão' },
    { name: 'Copa do Brasil', flag: '🇧🇷', filter: 'copa do brasil' },
    { name: 'Libertadores', flag: '🏆', filter: 'libertadores' },
    { name: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', filter: 'premier league' },
    { name: 'La Liga', flag: '🇪🇸', filter: 'la liga' },
    { name: 'Champions League', flag: '🇪🇺', filter: 'champions' },
    { name: 'Bundesliga', flag: '🇩🇪', filter: 'bundesliga' },
    { name: 'Serie A', flag: '🇮🇹', filter: 'serie a' },
    { name: 'Ligue 1', flag: '🇫🇷', filter: 'ligue 1' },
];

export default function Sidebar({ selected, onSelect, isOpen, onClose }) {
    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            <button className="sidebar-close" onClick={onClose}>✕</button>
            
            <div className="sidebar-logo">
                <span>⚽</span>
                <span className="sidebar-logo-text">BetSave</span>
            </div>
            
            <div className="sidebar-section">
                <div className="sidebar-title">Ligas Populares</div>
                {LEAGUES.map((league, index) => (
                    <div 
                        key={index}
                        className={`sidebar-item ${selected === league.filter ? 'active' : ''}`}
                        onClick={() => {
                            onSelect(league.filter);
                            onClose();
                        }}
                    >
                        {league.flag && <span className="flag">{league.flag}</span>}
                        <span className="sidebar-item-name">{league.name}</span>
                    </div>
                ))}
            </div>
        </aside>
    );
}

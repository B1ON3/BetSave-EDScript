import { useState, useEffect, useCallback, useMemo } from 'react';
import './styles/theme.css';
import { API, classifyRisk, formatTime } from './utils';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MatchList from './components/MatchList';
import MatchDetail from './components/MatchDetail';
import BetsaveButton from './components/BetsaveButton';
import BetsavePanel from './components/BetsavePanel';
import Onboarding, { ProfileSelector, PROFILES } from './components/Onboarding';
import BetSlip from './components/BetSlip';
import './components/Onboarding.css';
import './components/BetSlip.css';

const FALLBACK_MATCHES = [
    { id: '1', home: 'Flamengo', away: 'Palmeiras', league: 'Brasileirão Série A', status: 'INPLAY', homeScore: 1, awayScore: 0, time: '71:54', odds: { home: 1.85, draw: 3.40, away: 4.20 }, homeRisk: { level: 'BAIXO', emoji: '🟢', color: '#00ff88' }, awayRisk: { level: 'ALTO', emoji: '🔴', color: '#ff5252' }, category: 'national' },
    { id: '2', home: 'Corinthians', away: 'São Paulo', league: 'Brasileirão Série A', status: 'INPLAY', homeScore: 0, awayScore: 1, time: '45:00', odds: { home: 2.50, draw: 3.20, away: 2.70 }, homeRisk: { level: 'MEDIO', emoji: '🟡', color: '#feca57' }, awayRisk: { level: 'BAIXO', emoji: '🟢', color: '#00ff88' }, category: 'national' },
    { id: '3', home: 'Manchester City', away: 'Liverpool', league: 'Premier League', status: 'INPLAY', homeScore: 2, awayScore: 1, time: '67:23', odds: { home: 1.70, draw: 3.80, away: 4.50 }, homeRisk: { level: 'BAIXO', emoji: '🟢', color: '#00ff88' }, awayRisk: { level: 'MEDIO', emoji: '🟡', color: '#feca57' }, category: 'international' },
    { id: '4', home: 'Real Madrid', away: 'Barcelona', league: 'La Liga', status: 'SCHEDULED', time: '16:00', odds: { home: 2.10, draw: 3.40, away: 3.20 }, homeRisk: { level: 'BAIXO', emoji: '🟢', color: '#00ff88' }, awayRisk: { level: 'MEDIO', emoji: '🟡', color: '#feca57' }, category: 'international' },
    { id: '5', home: 'Bayern Munich', away: 'Dortmund', league: 'Bundesliga', status: 'SCHEDULED', time: '18:30', odds: { home: 1.55, draw: 4.20, away: 5.00 }, homeRisk: { level: 'BAIXO', emoji: '🟢', color: '#00ff88' }, awayRisk: { level: 'MEDIO', emoji: '🟡', color: '#feca57' }, category: 'international' },
    { id: '6', home: 'Inter Milan', away: 'AC Milan', league: 'Serie A', status: 'INPLAY', homeScore: 2, awayScore: 2, time: '65:12', odds: { home: 2.00, draw: 3.30, away: 3.60 }, homeRisk: { level: 'MEDIO', emoji: '🟡', color: '#feca57' }, awayRisk: { level: 'MEDIO', emoji: '🟡', color: '#feca57' }, category: 'international' },
    { id: '7', home: 'Botafogo', away: 'Fluminense', league: 'Brasileirão Série A', status: 'SCHEDULED', time: '19:00', odds: { home: 1.90, draw: 3.30, away: 4.00 }, homeRisk: { level: 'BAIXO', emoji: '🟢', color: '#00ff88' }, awayRisk: { level: 'MEDIO', emoji: '🟡', color: '#feca57' }, category: 'national' },
    { id: '8', home: 'PSG', away: 'Marseille', league: 'Ligue 1', status: 'SCHEDULED', time: '22:00', odds: { home: 1.45, draw: 4.50, away: 5.50 }, homeRisk: { level: 'BAIXO', emoji: '🟢', color: '#00ff88' }, awayRisk: { level: 'MEDIO', emoji: '🟡', color: '#feca57' }, category: 'international' },
];

export default function App() {
    const [matches, setMatches] = useState([]);
    const [categories, setCategories] = useState({ national: [], international: [], esoccer: [] });
    const [counts, setCounts] = useState({ national: 0, international: 0, esoccer: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [league, setLeague] = useState('all');
    const [tab, setTab] = useState('live');
    const [liveSubTab, setLiveSubTab] = useState('all');
    const [showEsoccer, setShowEsoccer] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [betsaveOpen, setBetsaveOpen] = useState(false);
    const [betslipOpen, setBetslipOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profile, setProfile] = useState(null);
    const [bets, setBets] = useState([]);
    const [favorites, setFavorites] = useState(() => {
        try {
            const saved = localStorage.getItem('betsave_favorites');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('betsave_favorites', JSON.stringify(favorites));
        } catch {
            // localStorage not available
        }
    }, [favorites]);

    useEffect(() => {
        fetchMatches();
        
        // Restore profile from localStorage
        try {
            const savedProfile = localStorage.getItem('betsave_profile');
            if (savedProfile) {
                setProfile(JSON.parse(savedProfile));
            }
        } catch {}
    }, []);
    
    const handleProfileComplete = useCallback((selectedProfile) => {
        setProfile(selectedProfile);
        try {
            localStorage.setItem('betsave_profile', JSON.stringify(selectedProfile));
        } catch {}
    }, []);

    const fetchMatches = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const [liveRes, upcomingRes] = await Promise.all([
                fetch(`${API}/api/live`),
                fetch(`${API}/api/matches`)
            ]);
            
            const liveData = liveRes.ok ? await liveRes.json() : { matches: [], categories: { national: [], international: [], esoccer: [] }, counts: { national: 0, international: 0, esoccer: 0 } };
            const upcomingData = upcomingRes.ok ? await upcomingRes.json() : { matches: [] };
            
            const mapMatch = (m, isLive) => {
                const homeProb = m.odds?.home ? 1/m.odds.home : 0.45;
                const awayProb = m.odds?.away ? 1/m.odds.away : 0.30;
                const homeRisk = classifyRisk(homeProb);
                const awayRisk = classifyRisk(awayProb);
                
                return {
                    id: String(m.id || ''),
                    home: m.home || 'Time A',
                    away: m.away || 'Time B',
                    homeId: m.homeId,
                    awayId: m.awayId,
                    leagueId: m.leagueId,
                    homeScore: m.homeScore ?? (m.score ? parseInt(m.score.split('-')[0]) : null),
                    awayScore: m.awayScore ?? (m.score ? parseInt(m.score.split('-')[1]) : null),
                    time: m.time || m.startTime,
                    date: m.date || '',
                    isoDate: m.isoDate || '',
                    league: m.league || 'Liga',
                    country: m.country,
                    status: isLive ? 'INPLAY' : 'SCHEDULED',
                    odds: m.odds,
                    homeRisk: homeRisk,
                    awayRisk: awayRisk,
                    category: m.category || 'international'
                };
            };
            
            // Map all matches
            const allMatches = [
                ...(liveData.matches || []).map(m => mapMatch(m, true)),
                ...(upcomingData.matches || []).map(m => mapMatch(m, false))
            ];
            
            // Categorize live matches
            const nationalMatches = (liveData.categories?.national || []).map(m => mapMatch(m, true));
            const internationalMatches = (liveData.categories?.international || []).map(m => mapMatch(m, true));
            const esoccerMatches = (liveData.categories?.esoccer || []).map(m => mapMatch(m, true));
            
            setCategories({
                national: nationalMatches,
                international: internationalMatches,
                esoccer: esoccerMatches
            });
            
            setCounts({
                national: liveData.counts?.national || nationalMatches.length,
                international: liveData.counts?.international || internationalMatches.length,
                esoccer: liveData.counts?.esoccer || esoccerMatches.length
            });
            
            // Set all matches
            setMatches(allMatches);
            
        } catch (err) {
            console.log('[BetSave] API indisponível, usando fallback');
            setError('Modo demonstração - API offline');
            setMatches(FALLBACK_MATCHES);
            setCategories({
                national: FALLBACK_MATCHES.filter(m => m.category === 'national'),
                international: FALLBACK_MATCHES.filter(m => m.category === 'international'),
                esoccer: []
            });
        }
        setLoading(false);
    };

    const toggleFavorite = useCallback((matchId) => {
        setFavorites(prev => {
            if (prev.includes(matchId)) {
                return prev.filter(id => id !== matchId);
            }
            return [...prev, matchId];
        });
    }, []);
    
    const handleAddToSlip = useCallback((bet) => {
        setBets(prev => {
            const exists = prev.find(b => b.matchId === bet.matchId && b.market === bet.market);
            if (exists) return prev;
            return [...prev, bet];
        });
    }, []);
    
    const handleRemoveBet = useCallback((index) => {
        setBets(prev => prev.filter((_, i) => i !== index));
    }, []);
    
    const handleClearBets = useCallback(() => {
        setBets([]);
    }, []);

    const handleMatchClick = useCallback((match) => {
        console.log('[BetSave] Jogo selecionado:', match.home, 'vs', match.away);
        setSelectedMatch(match);
    }, []);

    const handleCloseDetail = useCallback(() => {
        setSelectedMatch(null);
    }, []);

    const liveMatches = useMemo(() => matches.filter(m => m.status === 'INPLAY'), [matches]);
    const upcomingMatches = useMemo(() => matches.filter(m => m.status === 'SCHEDULED'), [matches]);
    const favoriteMatches = useMemo(() => matches.filter(m => favorites.includes(m.id)), [matches, favorites]);
    
    const displayedLiveMatches = useMemo(() => {
        if (liveSubTab === 'national') {
            return showEsoccer 
                ? [...categories.national, ...categories.esoccer]
                : categories.national;
        }
        if (liveSubTab === 'international') {
            return showEsoccer 
                ? [...categories.international, ...categories.esoccer]
                : categories.international;
        }
        // All
        return showEsoccer 
            ? [...categories.national, ...categories.international, ...categories.esoccer]
            : [...categories.national, ...categories.international];
    }, [liveSubTab, categories, showEsoccer]);
    
    const displayedMatches = useMemo(() => {
        if (tab === 'favorites') return favoriteMatches;
        if (tab === 'live') return displayedLiveMatches;
        return upcomingMatches;
    }, [tab, displayedLiveMatches, upcomingMatches, favoriteMatches]);

    const filteredMatches = useMemo(() => {
        if (league === 'all') return displayedMatches;
        return displayedMatches.filter(m => 
            m.league && m.league.toLowerCase().includes(league.toLowerCase())
        );
    }, [displayedMatches, league]);

    return (
        <div className="layout">
            {!profile && (
                <Onboarding onComplete={handleProfileComplete} />
            )}
            
            <Sidebar 
                selected={league} 
                onSelect={setLeague}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />
            
            {sidebarOpen && <div className="sidebar-overlay open" onClick={() => setSidebarOpen(false)} />}
            
            <main className="main-content">
                <Header onMenuClick={() => setSidebarOpen(true)} />
                <ProfileSelector 
                    currentProfile={profile}
                    onChange={setProfile}
                />
                
                {error && (
                    <div className="error-banner">
                        {error}
                    </div>
                )}
                
                <div className="tabs-bar">
                    <button 
                        className={`tab-btn ${tab === 'live' ? 'active' : ''}`}
                        onClick={() => setTab('live')}
                    >
                        <span className="tab-dot live"></span>
                        Ao Vivo
                        <span className="tab-count">{liveMatches.length}</span>
                    </button>
                    <button 
                        className={`tab-btn ${tab === 'upcoming' ? 'active' : ''}`}
                        onClick={() => setTab('upcoming')}
                    >
                        <span className="tab-dot"></span>
                        Próximos
                        <span className="tab-count">{upcomingMatches.length}</span>
                    </button>
                    <button 
                        className={`tab-btn ${tab === 'favorites' ? 'active' : ''}`}
                        onClick={() => setTab('favorites')}
                    >
                        <i className="fa fa-star tab-icon"></i>
                        Favoritos
                        <span className="tab-count">{favoriteMatches.length}</span>
                    </button>
                </div>
                
                {tab === 'live' && (
                    <div className="live-subtabs">
                        <button 
                            className={`live-subtab ${liveSubTab === 'all' ? 'active' : ''}`}
                            onClick={() => setLiveSubTab('all')}
                        >
                            <i className="fa fa-globe"></i> Todos
                        </button>
                        <button 
                            className={`live-subtab ${liveSubTab === 'national' ? 'active' : ''}`}
                            onClick={() => setLiveSubTab('national')}
                        >
                            <i className="fa fa-flag"></i> Nacionais
                            <span className="tab-count">{counts.national}</span>
                        </button>
                        <button 
                            className={`live-subtab ${liveSubTab === 'international' ? 'active' : ''}`}
                            onClick={() => setLiveSubTab('international')}
                        >
                            <i className="fa fa-earth-americas"></i> Internacionais
                            <span className="tab-count">{counts.international}</span>
                        </button>
                        <button 
                            className={`live-subtab esoccer-toggle ${showEsoccer ? 'active' : ''}`}
                            onClick={() => setShowEsoccer(!showEsoccer)}
                        >
                            <i className="fa fa-gamepad"></i> E-Soccer
                            <span className="tab-count">{counts.esoccer}</span>
                        </button>
                    </div>
                )}
                
                <MatchList
                    matches={filteredMatches}
                    onSelect={handleMatchClick}
                    favorites={favorites}
                    onToggleFavorite={toggleFavorite}
                    onAddToSlip={handleAddToSlip}
                    loading={loading}
                    onRefresh={fetchMatches}
                />
            </main>

            {selectedMatch && (
                <MatchDetail
                    match={selectedMatch}
                    onClose={handleCloseDetail}
                />
            )}

            {bets.length > 0 ? (
                <div className="betslip-fixed">
                    <BetSlip
                        bets={bets}
                        onRemoveBet={handleRemoveBet}
                        onClear={handleClearBets}
                        onClose={() => setBetslipOpen(false)}
                    />
                </div>
            ) : (
                <div className="betslip-fixed">
                    <div className="betslip-empty-state">
                        <div className="betslip-header">
                            <div className="betslip-title">
                                <i className="fa fa-ticket betslip-icon"></i>
                                Bilhete
                            </div>
                        </div>
                        <div className="betslip-fixed-empty">
                            <i className="fa fa-list betslip-empty-icon"></i>
                            <span className="betslip-empty-text">
                                Adicione apostas para criar seu bilhete
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {bets.length > 0 && (
                <button 
                    className="betslip-toggle-btn"
                    onClick={() => setBetslipOpen(true)}
                >
                    <i className="fa fa-ticket"></i> Bilhete ({bets.length})
                </button>
            )}

            {betslipOpen && (
                <BetSlip
                    bets={bets}
                    onRemoveBet={handleRemoveBet}
                    onClear={handleClearBets}
                    onClose={() => setBetslipOpen(false)}
                />
            )}

            <BetsaveButton 
                onClick={() => setBetsaveOpen(!betsaveOpen)} 
                profile={profile}
                betsCount={bets.length}
            />
            
            <BetsavePanel 
                match={selectedMatch} 
                onClose={() => setBetsaveOpen(false)}
                onMinimize={() => setBetsaveOpen(false)}
                isOpen={betsaveOpen}
                liveMatches={matches}
            />
        </div>
    );
}

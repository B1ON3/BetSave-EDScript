import { useState, useEffect, useCallback } from 'react';
import './styles/theme.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MatchGrid from './components/MatchGrid';
import FloatingButton from './components/FloatingButton';
import AssistantPanel from './components/AssistantPanel';
import WelcomeModal from './components/WelcomeModal';
import { generateOdds, API_BASE } from './utils/constants';

const FALLBACK_MATCHES = [
    { home: 'Flamengo', away: 'Palmeiras', league: 'Brasileirão A', live: true },
    { home: 'Barcelona', away: 'Real Madrid', league: 'La Liga', live: false },
    { home: 'Manchester City', away: 'Liverpool', league: 'Premier League', live: false },
    { home: 'Corinthians', away: 'São Paulo', league: 'Brasileirão A', live: true },
    { home: 'Bayern Munich', away: 'Dortmund', league: 'Bundesliga', live: false },
    { home: 'Inter Milan', away: 'AC Milan', league: 'Serie A', live: false },
    { home: 'PSG', away: 'Marseille', league: 'Ligue 1', live: false },
    { home: 'Botafogo', away: 'Fluminense', league: 'Brasileirão A', live: false },
];

function App() {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLeague, setSelectedLeague] = useState('all');
    const [assistantOpen, setAssistantOpen] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [userProfile, setUserProfile] = useState(null);
    const [hasOpenedAssistant, setHasOpenedAssistant] = useState(false);

    useEffect(() => {
        const savedProfile = localStorage.getItem('betsave_profile');
        if (savedProfile) setUserProfile(JSON.parse(savedProfile));
        fetchMatches();
    }, []);

    useEffect(() => {
        const interval = setInterval(fetchMatches, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchMatches = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/matches`);
            const data = await res.json();
            const validMatches = data.matches?.filter(m => m.home && m.away);
            
            if (validMatches?.length > 0) {
                setMatches(validMatches.map(transformMatch));
            } else {
                setMatches(FALLBACK_MATCHES.map(createMatch));
            }
        } catch {
            setMatches(FALLBACK_MATCHES.map(createMatch));
        }
        setLoading(false);
    };

    const transformMatch = (match) => ({
        id: match.id,
        home: match.home,
        away: match.away,
        homeScore: match.score?.home ?? null,
        awayScore: match.score?.away ?? null,
        time: match.time || match.startTime,
        league: match.league,
        status: match.status === 'INPLAY' || match.status === 'inplay' ? 'INPLAY' : 'SCHEDULED',
        odds: match.odds || generateOdds()
    });

    const createMatch = (m, i) => ({
        id: i + 1,
        home: m.home,
        away: m.away,
        homeScore: m.live ? Math.floor(Math.random() * 4) : null,
        awayScore: m.live ? Math.floor(Math.random() * 3) : null,
        time: `${21 + i}:00`,
        league: m.league,
        status: m.live ? 'INPLAY' : 'SCHEDULED',
        minute: m.live ? `${35 + Math.floor(Math.random() * 15)}'` : null,
        odds: generateOdds()
    });

    const handleOpenAssistant = useCallback(() => {
        if (!hasOpenedAssistant && !userProfile) {
            setShowOnboarding(true);
        }
        setHasOpenedAssistant(true);
        setAssistantOpen(true);
    }, [hasOpenedAssistant, userProfile]);

    const handleSelectMatch = useCallback((match) => {
        setSelectedMatch(match);
        if (!assistantOpen) setAssistantOpen(true);
    }, [assistantOpen]);

    const handleOnboardingComplete = (profile) => {
        localStorage.setItem('betsave_profile', JSON.stringify(profile));
        setUserProfile(profile);
        setShowOnboarding(false);
    };

    const matchCounts = matches.reduce((acc, m) => {
        acc[m.league] = (acc[m.league] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="app">
            <Sidebar
                selectedLeague={selectedLeague}
                onSelectLeague={setSelectedLeague}
                matchCounts={matchCounts}
            />
            <main className="main-content">
                <Header />
                {loading ? (
                    <div className="loading"><div className="loading-spinner" /></div>
                ) : (
                    <MatchGrid
                        matches={matches}
                        selectedLeague={selectedLeague}
                        onSelectMatch={handleSelectMatch}
                        selectedMatchId={selectedMatch?.id}
                    />
                )}
            </main>
            <FloatingButton onClick={handleOpenAssistant} isOpen={assistantOpen} />
            <AssistantPanel
                isOpen={assistantOpen}
                onClose={() => setAssistantOpen(false)}
                matches={matches}
                selectedMatch={selectedMatch}
                onSelectMatch={handleSelectMatch}
            />
            {showOnboarding && <WelcomeModal onComplete={handleOnboardingComplete} />}
        </div>
    );
}

export default App;

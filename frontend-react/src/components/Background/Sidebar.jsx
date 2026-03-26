import { useState } from 'react';
import './Sidebar.css';

const leagues = {
    brasil: {
        name: 'Brasil',
        icon: 'flag',
        items: [
            { name: 'Brasileirão A', icon: 'sports_soccer', count: 10 },
            { name: 'Brasileirão B', icon: 'sports_soccer', count: 10 },
            { name: 'Copa do Brasil', icon: 'emoji_events', count: 8 },
            { name: 'Copa do Nordeste', icon: 'sports_soccer', count: 6 },
        ]
    },
    europa: {
        name: 'Europa',
        icon: 'public',
        items: [
            { name: 'Premier League', icon: 'sports_soccer', count: 6 },
            { name: 'La Liga', icon: 'sports_soccer', count: 4 },
            { name: 'Bundesliga', icon: 'sports_soccer', count: 4 },
            { name: 'Serie A', icon: 'sports_soccer', count: 4 },
            { name: 'Ligue 1', icon: 'sports_soccer', count: 3 },
        ]
    },
    competencias: {
        name: 'Competições',
        icon: 'emoji_events',
        items: [
            { name: 'Champions League', icon: 'emoji_events', count: 2 },
            { name: 'Europa League', icon: 'emoji_events', count: 2 },
            { name: 'Libertadores', icon: 'emoji_events', count: 4 },
            { name: 'Sul-Americana', icon: 'emoji_events', count: 3 },
        ]
    }
};

export default function Sidebar({ selectedLeague, onSelectLeague, matchCounts }) {
    const [expandedSections, setExpandedSections] = useState({
        brasil: true,
        europa: true,
        competencias: false
    });

    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    const totalMatches = Object.values(matchCounts || {}).reduce((a, b) => a + b, 0);

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <span className="material-symbols-outlined sidebar-logo">sports_soccer</span>
                <span className="sidebar-title">Esporte da Sorte</span>
            </div>

            <div className="sidebar-content">
                <div className="sidebar-section">
                    <div
                        className={`sidebar-item ${selectedLeague === 'all' ? 'active' : ''}`}
                        onClick={() => onSelectLeague('all')}
                    >
                        <span className="material-symbols-outlined sidebar-item-icon">globe</span>
                        <span className="sidebar-item-name">Todos os Jogos</span>
                        <span className="sidebar-item-count">{totalMatches}</span>
                    </div>
                </div>

                {Object.entries(leagues).map(([sectionId, section]) => (
                    <div key={sectionId} className="sidebar-section">
                        <div
                            className="sidebar-section-title"
                            onClick={() => toggleSection(sectionId)}
                        >
                            <span>
                                <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', marginRight: '8px', verticalAlign: 'middle' }}>{section.icon}</span>
                                {section.name}
                            </span>
                            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>
                                {expandedSections[sectionId] ? 'expand_less' : 'expand_more'}
                            </span>
                        </div>

                        {expandedSections[sectionId] && section.items.map((item) => (
                            <div
                                key={item.name}
                                className={`sidebar-item ${selectedLeague === item.name ? 'active' : ''}`}
                                onClick={() => onSelectLeague(item.name)}
                            >
                                <span className="material-symbols-outlined sidebar-item-icon">{item.icon}</span>
                                <span className="sidebar-item-name">{item.name}</span>
                                <span className="sidebar-item-count">
                                    {matchCounts?.[item.name] || item.count}
                                </span>
                            </div>
                        ))}
                    </div>
                ))}

                <div className="sidebar-section">
                    <div className="sidebar-section-title">
                        <span>
                            <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', marginRight: '8px', verticalAlign: 'middle' }}>sports_esports</span>
                            E-Sports
                        </span>
                    </div>
                    <div className="sidebar-item">
                        <span className="material-symbols-outlined sidebar-item-icon">sports_esports</span>
                        <span className="sidebar-item-name">E-Soccer</span>
                        <span className="sidebar-item-count">5</span>
                    </div>
                    <div className="sidebar-item">
                        <span className="material-symbols-outlined sidebar-item-icon">sports_esports</span>
                        <span className="sidebar-item-name">CS2</span>
                        <span className="sidebar-item-count">3</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}

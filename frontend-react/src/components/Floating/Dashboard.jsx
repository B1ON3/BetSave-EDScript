import { useState, useEffect } from 'react';
import './Dashboard.css';
import MatchAnalysis from '../Analysis/MatchAnalysis';
import BestBet from '../Analysis/BestBet';
import Opportunities from '../Analysis/Opportunities';

export default function Dashboard({ match, isOpen, onClose }) {
    const [activeTab, setActiveTab] = useState('analysis');

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <>
            <div className="dashboard-backdrop open" onClick={onClose} />
            <div className={`dashboard-panel ${isOpen ? 'open' : ''}`}>
                <div className="dashboard-header">
                    <div className="dashboard-logo">
                        <span>📊</span>
                        <span>BetSave Assistant</span>
                    </div>
                    <div className="dashboard-tabs">
                        <button
                            className={`dashboard-tab ${activeTab === 'analysis' ? 'active' : ''}`}
                            onClick={() => setActiveTab('analysis')}
                        >
                            📊 Análise
                        </button>
                        <button
                            className={`dashboard-tab ${activeTab === 'stats' ? 'active' : ''}`}
                            onClick={() => setActiveTab('stats')}
                        >
                            📈 Stats
                        </button>
                    </div>
                    <button className="dashboard-close" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className="dashboard-content">
                    {match ? (
                        <>
                            <MatchAnalysis match={match} />
                            <BestBet match={match} />
                            <Opportunities match={match} />
                        </>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-state-icon">👈</div>
                            <div className="empty-state-title">Selecione um jogo</div>
                            <div className="empty-state-text">
                                Clique em uma partida na lista para ver a análise completa.
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

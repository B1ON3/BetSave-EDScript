import { useState, useEffect } from 'react';
import { PredictionProvider } from './PredictionContext';
import LiveOverview from './LiveOverview';
import MatchAnalysis from './MatchAnalysis';

export default function PredictionPanel({ match, onClose, onMinimize, isOpen, liveMatches }) {
    const [isMinimized, setIsMinimized] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [viewMode, setViewMode] = useState('overview');

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

    const handleSelectMatch = (m) => {
        setSelectedMatch(m);
        setViewMode('analysis');
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
        <PredictionProvider>
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
                                onSelectMatch={handleSelectMatch}
                            />
                        ) : (
                            <MatchAnalysis match={selectedMatch} />
                        )}
                    </div>

                    <div className="betsave-footer">
                        <div className="footer-icon"><i className="fa fa-shield"></i></div>
                        <p>Analises sao apenas ferramentas de apoio. Decisoes sao suas!</p>
                    </div>
                </div>
            </div>
        </PredictionProvider>
    );
}

export { PredictionProvider, usePrediction, ANALYSIS_TABS, STATS_CATEGORIES, STATS_EXPLANATIONS } from './PredictionContext';
export { default as LiveOverview } from './LiveOverview';
export { default as MatchAnalysis } from './MatchAnalysis';

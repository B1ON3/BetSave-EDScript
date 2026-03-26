import { useState, useEffect } from 'react';
import './AssistantPanel.css';
import AnalysisCard from './AnalysisCard';
import MatchSelector from './MatchSelector';

const GREETING_MESSAGE = {
    type: 'assistant',
    content: `Olá! Sou o BetSave 🤝

Selecione um jogo na lista e vou te ajudar a entender as melhores opções de forma simples. Sem complicação!`
};

export default function AssistantPanel({ isOpen, onClose, matches, selectedMatch, onSelectMatch }) {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState([GREETING_MESSAGE]);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    useEffect(() => {
        if (selectedMatch) {
            fetchAnalysis(selectedMatch);
        }
    }, [selectedMatch]);

    const fetchAnalysis = async (match) => {
        setLoading(true);
        setMessages(prev => [...prev, {
            type: 'user',
            content: `Quero entender: ${match.home} vs ${match.away}`
        }]);

        try {
            const response = await fetch(
                `http://localhost:3000/api/analyze?home=${encodeURIComponent(match.home)}&away=${encodeURIComponent(match.away)}`
            );
            const data = await response.json();
            
            if (data.summary) {
                setAnalysis(data);
                setMessages(prev => [...prev, {
                    type: 'analysis',
                    content: data
                }]);
            }
        } catch (error) {
            console.error('Error fetching analysis:', error);
            setMessages(prev => [...prev, {
                type: 'assistant',
                content: 'Desculpe, tive um problema ao buscar a análise. Tente novamente!'
            }]);
        }
        
        setLoading(false);
    };

    const handleSelectMatch = (match) => {
        setAnalysis(null);
        setMessages([GREETING_MESSAGE, {
            type: 'user',
            content: `Quero entender: ${match.home} vs ${match.away}`
        }]);
        onSelectMatch(match);
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="assistant-backdrop" onClick={onClose} />
            <div className="assistant-panel">
                <div className="assistant-header">
                    <div className="assistant-logo">
                        <span className="assistant-emoji">🤖</span>
                        <span>BetSave</span>
                    </div>
                    <button className="assistant-close" onClick={onClose}>✕</button>
                </div>

                <div className="assistant-content">
                    {selectedMatch ? (
                        <>
                            <div className="assistant-match-info">
                                <span className="assistant-match-teams">
                                    {selectedMatch.home} vs {selectedMatch.away}
                                </span>
                                <span className="assistant-match-league">{selectedMatch.league}</span>
                            </div>
                            
                            {loading ? (
                                <div className="assistant-loading">
                                    <div className="assistant-spinner" />
                                    <p>Analisando o jogo...</p>
                                </div>
                            ) : analysis ? (
                                <AnalysisCard 
                                    analysis={analysis} 
                                    match={selectedMatch}
                                />
                            ) : null}
                            
                            <button 
                                className="assistant-change-match"
                                onClick={() => { setAnalysis(null); onSelectMatch(null); }}
                            >
                                ← Ver outros jogos
                            </button>
                        </>
                    ) : (
                        <MatchSelector
                            matches={matches}
                            onSelectMatch={handleSelectMatch}
                        />
                    )}
                </div>

                <div className="assistant-footer">
                    <p>BetSave ajuda você a entender jogos, não a apostar.</p>
                </div>
            </div>
        </>
    );
}

import { createContext, useContext, useState, useCallback } from 'react';

const PredictionContext = createContext(null);

export const ANALYSIS_TABS = ['Visao Geral', 'Escalacao', 'Estatisticas', 'Previsao'];
export const STATS_CATEGORIES = ['Geral', 'Ataque', 'Defesa', 'Distribuicao', 'Disciplina'];

export const STATS_EXPLANATIONS = {
    'Posse de bola': 'Porcentagem de tempo que cada time controlou a bola',
    'Finalizações': 'Total de vezes que um time tentou chutar ao gol',
    'Passes': 'Total de passes realizados durante a partida',
    'Faltas': 'Total de infrações cometidas',
    'Desarmes': 'Número de vezes que a defesa roubou a bola',
    'Impedimentos': 'Número de vezes que um jogador estava em posição irregular',
    'Escanteios': 'Total de cobranças de escanteio',
    'Cartões': 'Total de cartões amarelos e vermelhos',
    'Duplos vencidos': 'Número de duelos ganhos no chão e no ar',
    'Interceptadas': 'Número de vezes que um jogador interceptou um passe adversário',
    'Bolas afastadas': 'Número de vezes que a defesa tirou a bola da área',
};

export function PredictionProvider({ children }) {
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [analysisTab, setAnalysisTab] = useState('Visao Geral');
    const [statsMode, setStatsMode] = useState('times');
    const [statsCategory, setStatsCategory] = useState('Geral');
    const [viewMode, setViewMode] = useState('overview');

    const handleSelectMatch = useCallback((match) => {
        setSelectedMatch(match);
        setViewMode('analysis');
    }, []);

    const handleBackToOverview = useCallback(() => {
        setViewMode('overview');
        setSelectedMatch(null);
    }, []);

    const value = {
        selectedMatch,
        setSelectedMatch,
        analysisTab,
        setAnalysisTab,
        statsMode,
        setStatsMode,
        statsCategory,
        setStatsCategory,
        viewMode,
        setViewMode,
        handleSelectMatch,
        handleBackToOverview,
    };

    return (
        <PredictionContext.Provider value={value}>
            {children}
        </PredictionContext.Provider>
    );
}

export function usePrediction() {
    const context = useContext(PredictionContext);
    if (!context) {
        throw new Error('usePrediction must be used within PredictionProvider');
    }
    return context;
}

export default PredictionContext;

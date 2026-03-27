import { useState, useEffect } from 'react';
import { API } from '../utils';
import './BetSlip.css';

export default function BetSlip({ bets, onRemove, onClear, onStakeChange, userProfile }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [placingBet, setPlacingBet] = useState(false);

    const totalOdds = bets.reduce((acc, bet) => acc * (bet.odds || 1), 1);
    const potentialWin = bets.reduce((acc, bet) => {
        const stake = bet.stake || 10;
        return acc + (stake * (bet.odds || 1));
    }, 0);

    const handlePlaceBet = async () => {
        if (bets.length === 0) return;
        
        setPlacingBet(true);
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setPlacingBet(false);
        onClear();
        alert('Aposta realizada com sucesso!');
    };

    const getRiskColor = (odds) => {
        if (odds < 1.5) return 'var(--risk-low)';
        if (odds < 2.5) return 'var(--risk-medium)';
        return 'var(--risk-high)';
    };

    const getRiskLabel = (odds) => {
        if (odds < 1.5) return 'Baixo';
        if (odds < 2.5) return 'Medio';
        return 'Alto';
    };

    return (
        <div className={`bet-slip ${isExpanded ? 'expanded' : ''}`}>
            <div className="bet-slip-header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="header-left">
                    <i className="fa fa-ticket-alt"></i>
                    <span className="slip-title">Bilhete</span>
                    {bets.length > 0 && (
                        <span className="bet-count">{bets.length}</span>
                    )}
                </div>
                <div className="header-right">
                    {bets.length > 0 && (
                        <span className="total-odds">
                            {totalOdds.toFixed(2)}
                        </span>
                    )}
                    <i className={`fa fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                </div>
            </div>

            {isExpanded && (
                <div className="bet-slip-content">
                    {bets.length === 0 ? (
                        <div className="empty-slip">
                            <i className="fa fa-inbox"></i>
                            <p>Nenhuma aposta no bilhete</p>
                            <span>Clique nas odds para adicionar</span>
                        </div>
                    ) : (
                        <>
                            <div className="bets-list">
                                {bets.map((bet, idx) => (
                                    <div key={idx} className="bet-item">
                                        <div className="bet-info">
                                            <span className="bet-match">{bet.match}</span>
                                            <span className="bet-market">{bet.market}</span>
                                            <span className="bet-odd" style={{ color: getRiskColor(bet.odds) }}>
                                                {bet.odds.toFixed(2)}
                                            </span>
                                        </div>
                                        <button
                                            className="remove-bet"
                                            onClick={() => onRemove(idx)}
                                        >
                                            <i className="fa fa-times"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="stake-section">
                                <label>Valor da Aposta</label>
                                <div className="stake-input">
                                    <span className="currency">R$</span>
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        defaultValue="10"
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            onStakeChange(val);
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="potential-win">
                                <span>Premio Possivel</span>
                                <span className="win-amount">R$ {potentialWin.toFixed(2)}</span>
                            </div>

                            <button
                                className={`place-bet-btn ${placingBet ? 'placing' : ''}`}
                                onClick={handlePlaceBet}
                                disabled={placingBet}
                            >
                                {placingBet ? (
                                    <>
                                        <i className="fa fa-spinner fa-spin"></i>
                                        Apostando...
                                    </>
                                ) : (
                                    <>
                                        <i className="fa fa-check"></i>
                                        Apostar R$ 10
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export function BetSlipPanel({ match, onAddToSlip }) {
    if (!match || !match.odds) return null;

    return (
        <div className="bet-slip-panel">
            <div className="panel-header">
                <i className="fa fa-ticket-alt"></i>
                <span>Adicionar ao Bilhete</span>
            </div>
            
            <div className="odds-options">
                <div className="odds-row" onClick={() => onAddToSlip({
                    match: `${match.home} vs ${match.away}`,
                    market: `${match.home} vitoria`,
                    odds: match.odds.home,
                    selection: match.home
                })}>
                    <span className="selection">{match.home}</span>
                    <span className="odds">{match.odds.home.toFixed(2)}</span>
                </div>
                
                {match.odds.draw && (
                    <div className="odds-row" onClick={() => onAddToSlip({
                        match: `${match.home} vs ${match.away}`,
                        market: 'Empate',
                        odds: match.odds.draw,
                        selection: 'Empate'
                    })}>
                        <span className="selection">Empate</span>
                        <span className="odds">{match.odds.draw.toFixed(2)}</span>
                    </div>
                )}
                
                <div className="odds-row" onClick={() => onAddToSlip({
                    match: `${match.home} vs ${match.away}`,
                    market: `${match.away} vitoria`,
                    odds: match.odds.away,
                    selection: match.away
                })}>
                    <span className="selection">{match.away}</span>
                    <span className="odds">{match.odds.away.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
}

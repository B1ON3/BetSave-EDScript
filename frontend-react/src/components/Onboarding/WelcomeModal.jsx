import { useState } from 'react';
import './Onboarding.css';

export default function Onboarding({ onComplete }) {
    const handleSkip = () => {
        const profile = {
            level: 'skip',
            createdAt: new Date().toISOString()
        };
        localStorage.setItem('betsave_profile', JSON.stringify(profile));
        onComplete(profile);
    };

    const handleStart = () => {
        const profile = {
            level: 'started',
            createdAt: new Date().toISOString()
        };
        localStorage.setItem('betsave_profile', JSON.stringify(profile));
        onComplete(profile);
    };

    return (
        <div className="onboarding-overlay">
            <div className="onboarding-card">
                <div className="onboarding-icon">🤖</div>
                <h2 className="onboarding-title">Olá! Sou o BetSave</h2>
                <p className="onboarding-subtitle">
                    Estou aqui para ajudar você a entender jogos de futebol. 
                    Selecione qualquer partida e eu explico as probabilidades 
                    de forma simples.
                </p>

                <div className="onboarding-features">
                    <div className="onboarding-feature">
                        <span>📊</span>
                        <span>Análise baseada em dados reais</span>
                    </div>
                    <div className="onboarding-feature">
                        <span>💡</span>
                        <span>Explicações simples e claras</span>
                    </div>
                    <div className="onboarding-feature">
                        <span>🎯</span>
                        <span>Apoio à decisão, não apostas</span>
                    </div>
                </div>

                <button className="onboarding-btn" onClick={handleStart}>
                    Entendi! Vamos lá
                </button>

                <button className="onboarding-skip" onClick={handleSkip}>
                    Pular
                </button>
            </div>
        </div>
    );
}

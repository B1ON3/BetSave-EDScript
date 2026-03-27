import { useState } from 'react';
import './Onboarding.css';

export const PROFILES = {
    CONSERVADOR: {
        id: 'conservador',
        name: 'Conservador',
        description: 'Prefere apostas seguras com odds menores',
        icon: 'fa-shield-alt',
        color: '#00ff88',
        style: 'Analisa cada aposta com cuidado, minimizando riscos.'
    },
    MODERADO: {
        id: 'moderado',
        name: 'Moderado',
        description: 'Equilibra entre risco e recompensa',
        icon: 'fa-balance-scale',
        color: '#feca57',
        style: 'Aceita riscos calculados para maiores ganhos.'
    },
    AGRESSIVO: {
        id: 'agressivo',
        name: 'Agressivo',
        description: 'Busca altas odds e grandes retornos',
        icon: 'fa-rocket',
        color: '#ff5252',
        style: 'Vai atrás de odds elevadas mesmo com mais risco.'
    }
};

export default function Onboarding({ onComplete }) {
    const [step, setStep] = useState(0);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [name, setName] = useState('');

    const steps = [
        {
            title: 'Bem-vindo ao BetSave!',
            subtitle: 'Seu assistente inteligente para apostas esportivas',
            content: (
                <div className="welcome-content">
                    <div className="welcome-icon">
                        <i className="fa fa-futbol"></i>
                    </div>
                    <p>Vamos configurar sua experiência personalizada em poucos passos.</p>
                </div>
            )
        },
        {
            title: 'Como você prefere apostar?',
            subtitle: 'Escolha seu perfil de apostador',
            content: (
                <div className="profile-selection">
                    {Object.values(PROFILES).map(profile => (
                        <div
                            key={profile.id}
                            className={`profile-card ${selectedProfile === profile.id ? 'selected' : ''}`}
                            onClick={() => setSelectedProfile(profile.id)}
                            style={{ '--profile-color': profile.color }}
                        >
                            <div className="profile-icon">
                                <i className={`fa ${profile.icon}`}></i>
                            </div>
                            <h3>{profile.name}</h3>
                            <p>{profile.description}</p>
                            <span className="profile-style">{profile.style}</span>
                        </div>
                    ))}
                </div>
            )
        },
        {
            title: 'Quase pronto!',
            subtitle: 'Qual seu nome? (opcional)',
            content: (
                <div className="name-input-section">
                    <div className="input-wrapper">
                        <i className="fa fa-user"></i>
                        <input
                            type="text"
                            placeholder="Digite seu nome"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <p className="name-hint">O nome é apenas para personalização</p>
                </div>
            )
        }
    ];

    const handleNext = () => {
        if (step === 1 && !selectedProfile) return;
        
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            onComplete({
                name: name || 'Apostador',
                profile: selectedProfile || 'moderado'
            });
        }
    };

    const handleBack = () => {
        if (step > 0) {
            setStep(step - 1);
        }
    };

    const currentStep = steps[step];

    return (
        <div className="onboarding-overlay">
            <div className="onboarding-container">
                <div className="onboarding-header">
                    <div className="step-indicators">
                        {steps.map((_, idx) => (
                            <div
                                key={idx}
                                className={`step-dot ${idx === step ? 'active' : ''} ${idx < step ? 'completed' : ''}`}
                            />
                        ))}
                    </div>
                    <button className="skip-btn" onClick={() => onComplete({ name: '', profile: 'moderado' })}>
                        Pular
                    </button>
                </div>

                <div className="onboarding-content">
                    <h1>{currentStep.title}</h1>
                    <p className="subtitle">{currentStep.subtitle}</p>
                    {currentStep.content}
                </div>

                <div className="onboarding-footer">
                    {step > 0 && (
                        <button className="back-btn" onClick={handleBack}>
                            <i className="fa fa-arrow-left"></i>
                            Voltar
                        </button>
                    )}
                    <button
                        className="next-btn"
                        onClick={handleNext}
                        disabled={step === 1 && !selectedProfile}
                        style={{
                            '--btn-color': selectedProfile
                                ? PROFILES[selectedProfile.toUpperCase()]?.color || '#00ff88'
                                : '#00ff88'
                        }}
                    >
                        {step === steps.length - 1 ? 'Começar' : 'Continuar'}
                        <i className="fa fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        </div>
    );
}

export function ProfileSelector({ selected, onChange }) {
    return (
        <div className="profile-selector">
            {Object.values(PROFILES).map(profile => (
                <div
                    key={profile.id}
                    className={`selector-card ${selected === profile.id ? 'selected' : ''}`}
                    onClick={() => onChange(profile.id)}
                    style={{ '--profile-color': profile.color }}
                >
                    <i className={`fa ${profile.icon}`}></i>
                    <span>{profile.name}</span>
                </div>
            ))}
        </div>
    );
}

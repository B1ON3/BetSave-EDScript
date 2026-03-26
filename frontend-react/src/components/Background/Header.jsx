import { useState } from 'react';
import './Header.css';

export default function Header() {
    const [activeNav, setActiveNav] = useState('esportes');

    const navItems = [
        { id: 'esportes', label: 'Esportes', icon: 'sports_soccer' },
        { id: 'aovivo', label: 'Ao Vivo', icon: 'live_tv' },
        { id: 'cassino', label: 'Cassino', icon: 'casino' },
        { id: 'slots', label: 'Slots', icon: 'sports_esports' },
        { id: 'futebol', label: 'Futebol', icon: 'emoji_events' },
    ];

    return (
        <header className="header">
            <div className="header-content">
                <div className="header-logo">
                    <span className="material-symbols-outlined">sports_soccer</span>
                    <span>Esporte da Sorte</span>
                </div>

                <nav className="header-nav">
                    {navItems.map(item => (
                        <a
                            key={item.id}
                            href="#"
                            className={activeNav === item.id ? 'active' : ''}
                            onClick={(e) => {
                                e.preventDefault();
                                setActiveNav(item.id);
                            }}
                        >
                            <span className="material-symbols-outlined">{item.icon}</span>
                            <span>{item.label}</span>
                        </a>
                    ))}
                </nav>

                <div className="header-actions">
                    <a href="#" className="header-btn header-btn-outline">
                        <span className="material-symbols-outlined">person</span>
                        Entrar
                    </a>
                    <a href="#" className="header-btn header-btn-primary">
                        Cadastrar
                    </a>
                </div>
            </div>
        </header>
    );
}

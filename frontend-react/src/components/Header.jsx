export default function Header({ onMenuClick }) {
    return (
        <header className="header">
            <button className="header-menu-btn" onClick={onMenuClick}>
                ☰
            </button>
            
            <div className="header-logo">
                <span>⚽</span>
                <span className="header-logo-text">BetSave</span>
            </div>
            
            <nav className="header-nav">
                <a href="#" className="active">Esportes</a>
                <a href="#">Ao Vivo</a>
                <a href="#">Cassino</a>
                <a href="#">Slots</a>
            </nav>
            
            <div className="header-actions">
                <a href="#" className="header-btn header-btn-outline">Entrar</a>
                <a href="#" className="header-btn header-btn-primary">Cadastrar</a>
            </div>
        </header>
    );
}

import './FloatingButton.css';

export default function FloatingButton({ onClick, isOpen, hasNotification }) {
    return (
        <button
            className={`floating-button ${isOpen ? 'open' : ''}`}
            onClick={onClick}
        >
            <span className="icon">{isOpen ? '✕' : '📊'}</span>
            {hasNotification && !isOpen && <span className="badge">AI</span>}
            {!isOpen && (
                <span className="floating-tooltip">BetSave Assistant</span>
            )}
        </button>
    );
}

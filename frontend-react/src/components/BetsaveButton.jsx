export default function BetsaveButton({ onClick }) {
    return (
        <button className="betsave-fab" onClick={onClick}>
            <span className="betsave-fab-icon">🤖</span>
            <span className="betsave-fab-tooltip">BetSave AI</span>
        </button>
    );
}

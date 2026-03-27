export default function BetsaveButton({ onClick, profile, betsCount }) {
    return (
        <div className="floating-buttons-container">
            <button className="betsave-fab" onClick={onClick}>
                <span className="betsave-fab-icon"><i className="fa fa-robot"></i></span>
                <span className="betsave-fab-tooltip">I.A. BetSave</span>
                {betsCount > 0 && <span className="betsave-fab-badge">{betsCount}</span>}
            </button>
            <button className="support-fab">
                <span className="support-fab-icon"><i className="fa fa-comments"></i></span>
                <span className="betsave-fab-tooltip">Suporte</span>
            </button>
        </div>
    );
}

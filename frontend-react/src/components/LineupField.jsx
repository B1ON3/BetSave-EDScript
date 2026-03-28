import { useMemo } from 'react';

export default function LineupField({ lineups, match }) {
    if (!lineups?.lineups || lineups.lineups.length === 0) {
        return (
            <div className="lineup-not-available">
                <i className="fa fa-futbol"></i>
                <p>Escalação não disponível para esta partida</p>
                <span>A API pode não ter dados disponíveis ainda</span>
            </div>
        );
    }

    const homeTeam = lineups.lineups[0];
    const awayTeam = lineups.lineups[1];

    const homePlayersByRow = useMemo(() => organizePlayersByRow(homeTeam), [homeTeam]);
    const awayPlayersByRow = useMemo(() => organizePlayersByRow(awayTeam), [awayTeam]);

    return (
        <div className="lineup-container">
            <div className="lineup-field">
                <div className="field-venue">
                    <span className="venue-icon"><i className="fa fa-map-marker-alt"></i></span>
                    <span className="venue-name">{match?.venue || 'Estádio'}</span>
                </div>

                <div className="field-half away">
                    <div className="formation-header">
                        <img src={awayTeam.teamLogo} alt={awayTeam.team} className="team-logo-small" />
                        <span className="formation-label">{awayTeam.formation}</span>
                        <span className="coach-name">Tec. {awayTeam.coach}</span>
                    </div>
                    <div className="formation-players">
                        {awayPlayersByRow.map((row, rowIndex) => (
                            <div key={rowIndex} className="player-line">
                                {row.map((player) => (
                                    <span 
                                        key={player.id} 
                                        className={`player-dot ${getPositionClass(player.pos)}`}
                                        title={`${player.name} (${player.pos})`}
                                    >
                                        {player.number}
                                    </span>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="field-divider">
                    <div className="center-circle"></div>
                    <div className="center-line"></div>
                </div>

                <div className="field-half home">
                    <div className="formation-header">
                        <img src={homeTeam.teamLogo} alt={homeTeam.team} className="team-logo-small" />
                        <span className="formation-label">{homeTeam.formation}</span>
                        <span className="coach-name">Tec. {homeTeam.coach}</span>
                    </div>
                    <div className="formation-players">
                        {homePlayersByRow.map((row, rowIndex) => (
                            <div key={rowIndex} className="player-line">
                                {row.map((player) => (
                                    <span 
                                        key={player.id} 
                                        className={`player-dot ${getPositionClass(player.pos)}`}
                                        title={`${player.name} (${player.pos})`}
                                    >
                                        {player.number}
                                    </span>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="substitutes-section">
                <div className="substitutes-column">
                    <h4>{awayTeam.team} - Reservas</h4>
                    <div className="substitutes-list">
                        {awayTeam.substitutes?.map((p) => (
                            <span key={p.id} className="sub-player">
                                <span className="sub-num">{p.number}</span>
                                <span className="sub-name">{p.name}</span>
                                <span className="sub-pos">{p.pos}</span>
                            </span>
                        ))}
                    </div>
                </div>
                <div className="substitutes-column">
                    <h4>{homeTeam.team} - Reservas</h4>
                    <div className="substitutes-list">
                        {homeTeam.substitutes?.map((p) => (
                            <span key={p.id} className="sub-player">
                                <span className="sub-num">{p.number}</span>
                                <span className="sub-name">{p.name}</span>
                                <span className="sub-pos">{p.pos}</span>
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function organizePlayersByRow(team) {
    if (!team?.startXI) return [];

    const rows = [[], [], [], []];
    
    team.startXI.forEach(player => {
        const grid = player.grid || '';
        const [row, col] = grid.split(':').map(Number);
        
        if (row >= 1 && row <= 4) {
            const rowIndex = row - 1;
            rows[rowIndex].push(player);
        }
    });

    rows.forEach(row => {
        row.sort((a, b) => {
            const colA = parseInt((a.grid || '2:2').split(':')[1]) || 2;
            const colB = parseInt((b.grid || '2:2').split(':')[1]) || 2;
            return colA - colB;
        });
    });

    return rows.filter(row => row.length > 0);
}

function getPositionClass(pos) {
    const posMap = {
        'GOL': 'goalkeeper',
        'G': 'goalkeeper',
        'DF': 'defender',
        'D': 'defender',
        'MC': 'midfielder',
        'M': 'midfielder',
        'ATA': 'attacker',
        'A': 'attacker',
        'F': 'attacker'
    };
    return posMap[pos] || 'midfielder';
}

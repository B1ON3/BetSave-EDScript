// Team Icons - Mapa de times para emojis
export const TEAM_ICONS = {
    'Flamengo': '🔥',
    'Palmeiras': '💚',
    'Corinthians': '⚫',
    'São Paulo': '🔴',
    'Santos': '⚪',
    'Botafogo': '⚫',
    'Fluminense': '🟤',
    'Vasco': '⚫',
    'Athletico': '🔴',
    'Atlético': '⚫',
    'Cruzeiro': '🔵',
    'Bahia': '💛',
    'Fortaleza': '🔵',
    'Grêmio': '🔵',
    'Internacional': '🔴',
    'Barcelona': '🔵',
    'Real Madrid': '⚪',
    'Madrid': '🔴',
    'Manchester City': '🩵',
    'Liverpool': '🔴',
    'Arsenal': '🔴',
    'Chelsea': '🔵',
    'Bayern': '🔴',
    'Dortmund': '💛',
    'Inter Milan': '🔵',
    'AC Milan': '🔴',
    'Juventus': '⚫',
    'Napoli': '🔵',
    'PSG': '🔵',
    'Marseille': '🔵',
    'River Plate': '⚫',
    'Cruz Azul': '🔵',
    'default': '⚽'
};

export function getTeamIcon(teamName) {
    if (!teamName) return TEAM_ICONS.default;
    const lower = teamName.toLowerCase();
    for (const [team, icon] of Object.entries(TEAM_ICONS)) {
        if (lower.includes(team.toLowerCase())) {
            return icon;
        }
    }
    return TEAM_ICONS.default;
}

// Generate random odds
export function generateOdds() {
    return {
        home: (1.5 + Math.random() * 2).toFixed(2),
        draw: (2.5 + Math.random() * 1.5).toFixed(2),
        away: (1.5 + Math.random() * 2.5).toFixed(2),
    };
}

// API Configuration
export const API_BASE = 'http://localhost:3000';

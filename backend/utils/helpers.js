/**
 * BETSAVE HELPERS v2.0
 * Utility functions for odds, time, and data normalization
 */

/**
 * Convert odds to implied probability
 */
function convertOddsToProbability(odds) {
    if (!odds || odds <= 0) return null;
    return parseFloat((1 / odds).toFixed(2));
}

/**
 * Select best odds from array (highest value = best payout)
 */
function selectBestOdds(oddsArray) {
    if (!oddsArray || !Array.isArray(oddsArray)) return null;
    const validOdds = oddsArray.filter(o => o && o > 0);
    if (validOdds.length === 0) return null;
    return Math.max(...validOdds);
}

/**
 * Convert Unix timestamp to Brazil timezone (Brasília)
 */
function convertToBrazilTime(timestamp) {
    if (!timestamp) return null;
    
    const ms = parseInt(timestamp) * 1000;
    const date = new Date(ms);
    
    return {
        iso: date.toISOString(),
        local: date.toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }),
        time: date.toLocaleTimeString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit'
        }),
        date: date.toLocaleDateString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit'
        }),
        dayName: date.toLocaleDateString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            weekday: 'long'
        }),
        hour: date.getHours(),
        timestamp: ms
    };
}

/**
 * Clean team name - remove parentheses, extra spaces
 */
function cleanTeamName(name) {
    if (!name) return name;
    return name
        .replace(/\s*\([^)]*\)\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Clean league name - handle e-sports
 */
function cleanLeagueName(name) {
    if (!name) return name;
    let cleaned = name
        .replace(/Esoccer/gi, 'E-Sports')
        .replace(/Esport/gi, 'E-Sports')
        .replace(/\s*\(esports?\)\s*/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    return cleaned.includes('E-Sports') || cleaned.includes('e-sports') 
        ? '🎮 ' + cleaned 
        : cleaned;
}

/**
 * Normalize match data from API to standard format
 */
function normalizeMatch(m, includeOdds = false) {
    const time = convertToBrazilTime(m.time);
    
    return {
        id: m.id,
        home: cleanTeamName(m.home?.name),
        away: cleanTeamName(m.away?.name),
        homeId: m.home?.id,
        awayId: m.away?.id,
        startTime: time?.iso,
        localTime: time?.local,
        time: time?.time,
        date: time?.date,
        dayName: time?.dayName,
        league: cleanLeagueName(m.league?.name),
        leaguecc: m.league?.cc,
        status: m.inplay ? 'live' : 'upcoming',
        score: m.ss,
        odds: includeOdds ? m.odds : null
    };
}

/**
 * Extract 1X2 odds from odds object
 */
function extractOdds(oddsData) {
    if (!oddsData) return null;
    
    const mainOdds = oddsData['1_1']?.[0] || {};
    
    return {
        home: selectBestOdds([
            mainOdds.home_od,
            mainOdds.home_odd,
            mainOdds.odds_home
        ]),
        draw: selectBestOdds([
            mainOdds.draw_od,
            mainOdds.draw_odd,
            mainOdds.odds_draw
        ]),
        away: selectBestOdds([
            mainOdds.away_od,
            mainOdds.away_odd,
            mainOdds.odds_away
        ]),
        homeProb: convertOddsToProbability(mainOdds.home_od || mainOdds.home_odd),
        drawProb: convertOddsToProbability(mainOdds.draw_od || mainOdds.draw_odd),
        awayProb: convertOddsToProbability(mainOdds.away_od || mainOdds.away_odd)
    };
}

/**
 * Generate mock matches for fallback
 */
function generateMockMatches() {
    const now = new Date();
    
    const mockMatches = [
        {
            id: 999991,
            home: { name: 'Flamengo', id: 991 },
            away: { name: 'Palmeiras', id: 992 },
            league: { name: 'Serie A', cc: 'br' },
            time: Math.floor(new Date(now.getTime() + 86400000).setHours(21, 0, 0, 0) / 1000).toString()
        },
        {
            id: 999992,
            home: { name: 'Barcelona', id: 993 },
            away: { name: 'Real Madrid', id: 994 },
            league: { name: 'La Liga', cc: 'es' },
            time: Math.floor(new Date(now.getTime() + 86400000 * 2).setHours(22, 0, 0, 0) / 1000).toString()
        },
        {
            id: 999993,
            home: { name: 'Manchester City', id: 995 },
            away: { name: 'Liverpool', id: 996 },
            league: { name: 'Premier League', cc: 'gb' },
            time: Math.floor(new Date(now.getTime() + 86400000 * 3).setHours(18, 30, 0, 0) / 1000).toString()
        },
        {
            id: 999994,
            home: { name: 'Bayern Munich', id: 997 },
            away: { name: 'Dortmund', id: 998 },
            league: { name: 'Bundesliga', cc: 'de' },
            time: Math.floor(new Date(now.getTime() + 86400000 * 2).setHours(18, 0, 0, 0) / 1000).toString()
        },
        {
            id: 999995,
            home: { name: 'PSG', id: 999 },
            away: { name: 'Marseille', id: 1000 },
            league: { name: 'Ligue 1', cc: 'fr' },
            time: Math.floor(new Date(now.getTime() + 86400000 * 4).setHours(21, 0, 0, 0) / 1000).toString()
        }
    ];
    
    return mockMatches;
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
    if (!dateStr) return 'Hoje';
    
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Hoje';
    if (date.toDateString() === tomorrow.toDateString()) return 'Amanhã';
    
    return date.toLocaleDateString('pt-BR', { 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

module.exports = {
    convertOddsToProbability,
    selectBestOdds,
    convertToBrazilTime,
    cleanTeamName,
    cleanLeagueName,
    normalizeMatch,
    extractOdds,
    generateMockMatches,
    formatDate
};

const fs = require('fs');
const path = require('path');

const mockData = {
    matches: [
        {
            id: 123456,
            league: { id: 1, name: "Campeonato Brasileiro Série A" },
            home: { id: 101, name: "Flamengo", short_name: "FLA", image_id: 101 },
            away: { id: 102, name: "Palmeiras", short_name: "PAL", image_id: 102 },
            time: { status: "LIVE", minute: 65 },
            score: { home: 2, away: 1 },
            stats: {
                possession: { home: 55, away: 45 },
                shots: { home: 12, away: 8 },
                shotsOnTarget: { home: 6, away: 4 },
                corners: { home: 7, away: 3 },
                fouls: { home: 10, away: 14 },
                yellowCards: { home: 1, away: 2 }
            }
        },
        {
            id: 123457,
            league: { id: 2, name: "Premier League" },
            home: { id: 201, name: "Manchester City", short_name: "MCI", image_id: 201 },
            away: { id: 202, name: "Liverpool", short_name: "LIV", image_id: 202 },
            time: { status: "LIVE", minute: 32 },
            score: { home: 1, away: 1 },
            stats: {
                possession: { home: 62, away: 38 },
                shots: { home: 8, away: 5 },
                shotsOnTarget: { home: 3, away: 2 },
                corners: { home: 4, away: 2 },
                fouls: { home: 6, away: 9 },
                yellowCards: { home: 0, away: 1 }
            }
        },
        {
            id: 123458,
            league: { id: 3, name: "La Liga" },
            home: { id: 301, name: "Real Madrid", short_name: "RMA", image_id: 301 },
            away: { id: 302, name: "Barcelona", short_name: "BAR", image_id: 302 },
            time: { status: "UPCOMING", time: "21:00" },
            score: { home: 0, away: 0 },
            stats: null
        }
    ],
    players: [
        { id: 1, name: "Arrascaeta", team: "Flamengo", position: "MEIA", overall: 82, goals: 8, assists: 12, matches: 25 },
        { id: 2, name: "Gabriel Barbosa", team: "Flamengo", position: "ATA", overall: 79, goals: 15, assists: 3, matches: 28 },
        { id: 3, name: "Veiga", team: "Palmeiras", position: "MEIA", overall: 80, goals: 10, assists: 8, matches: 26 },
        { id: 4, name: "Haaland", team: "Manchester City", position: "ATA", overall: 91, goals: 28, assists: 5, matches: 30 },
        { id: 5, name: "Salah", team: "Liverpool", position: "ATA", overall: 89, goals: 22, assists: 12, matches: 29 },
        { id: 6, name: "Bellingham", team: "Real Madrid", position: "MEIA", overall: 88, goals: 14, assists: 9, matches: 27 },
        { id: 7, name: "Lewandowski", team: "Barcelona", position: "ATA", overall: 87, goals: 18, assists: 4, matches: 25 }
    ],
    historicalHeadToHead: [
        { matchId: 1, home: "Flamengo", away: "Palmeiras", homeScore: 2, awayScore: 1, date: "2025-11-15" },
        { matchId: 2, home: "Palmeiras", away: "Flamengo", homeScore: 0, awayScore: 0, date: "2025-08-10" },
        { matchId: 3, home: "Flamengo", away: "Palmeiras", homeScore: 3, awayScore: 2, date: "2025-05-20" },
        { matchId: 4, home: "Palmeiras", away: "Flamengo", homeScore: 1, awayScore: 2, date: "2024-11-30" }
    ]
};

function saveMockData() {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(
        path.join(dataDir, 'mock_matches.json'),
        JSON.stringify(mockData.matches, null, 2)
    );
    fs.writeFileSync(
        path.join(dataDir, 'mock_players.json'),
        JSON.stringify(mockData.players, null, 2)
    );
    fs.writeFileSync(
        path.join(dataDir, 'mock_h2h.json'),
        JSON.stringify(mockData.historicalHeadToHead, null, 2)
    );
    
    console.log('✅ Dados mock salvos em data/');
}

module.exports = { mockData, saveMockData };

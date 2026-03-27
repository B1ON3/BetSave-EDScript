const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');

function parseCSV(content) {
    const lines = content.split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const values = line.split(',');
        const row = {};
        headers.forEach((header, i) => {
            const val = values[i]?.trim() || '';
            row[header] = isNaN(parseFloat(val)) ? val : parseFloat(val);
        });
        return row;
    });
}

let playersCache = null;

function getPlayers() {
    if (playersCache) return playersCache;
    const csvPath = path.join(ROOT_DIR, 'data', 'players_stats', 'players_data-2025_2026.csv');
    try {
        const content = fs.readFileSync(csvPath, 'utf-8');
        playersCache = parseCSV(content);
        return playersCache;
    } catch {
        return [];
    }
}

function findTeam(teamName, players) {
    const lower = teamName.toLowerCase();
    return players.filter(p => 
        (p.Squad || '').toLowerCase() === lower ||
        (p.Squad || '').toLowerCase().includes(lower) ||
        lower.includes((p.Squad || '').toLowerCase())
    );
}

let matchesCache = null;

function loadStatsBombMatches() {
    if (matchesCache) return matchesCache;
    matchesCache = [];
    const matchesDir = path.join(ROOT_DIR, 'data', 'statsbomb', 'data', 'matches');
    
    if (!fs.existsSync(matchesDir)) return [];
    
    try {
        const seasons = fs.readdirSync(matchesDir);
        for (const season of seasons) {
            const seasonPath = path.join(matchesDir, season);
            if (!fs.statSync(seasonPath).isDirectory()) continue;
            
            const files = fs.readdirSync(seasonPath);
            for (const file of files) {
                try {
                    const content = fs.readFileSync(path.join(seasonPath, file), 'utf-8');
                    const matches = JSON.parse(content);
                    matchesCache.push(...matches);
                } catch {}
            }
        }
    } catch {}
    
    return matchesCache;
}

function findMatchesForTeam(teamName, limit = 20) {
    const allMatches = loadStatsBombMatches();
    const lower = teamName.toLowerCase();
    
    const teamMatches = allMatches.filter(m => {
        const home = (m.home_team?.home_team_name || '').toLowerCase();
        const away = (m.away_team?.away_team_name || '').toLowerCase();
        return home.includes(lower) || away.includes(lower) || 
               lower.includes(home) || lower.includes(away);
    });
    
    return teamMatches.slice(0, limit).map(m => ({
        date: m.match_date,
        home: m.home_team?.home_team_name || 'Unknown',
        away: m.away_team?.away_team_name || 'Unknown',
        homeScore: m.home_score,
        awayScore: m.away_score,
        league: m.competition?.competition_name || 'Unknown',
        season: m.season?.season_name || ''
    }));
}

function findHeadToHead(team1, team2, limit = 15) {
    const allMatches = loadStatsBombMatches();
    const lower1 = team1.toLowerCase();
    const lower2 = team2.toLowerCase();
    
    const h2h = allMatches.filter(m => {
        const home = (m.home_team?.home_team_name || '').toLowerCase();
        const away = (m.away_team?.away_team_name || '').toLowerCase();
        
        const t1Home = home.includes(lower1) || away.includes(lower1);
        const t2Home = home.includes(lower2) || away.includes(lower2);
        const t1Name = home.includes(lower1) || away.includes(lower1);
        const t2Name = home.includes(lower2) || away.includes(lower2);
        
        return t1Name && t2Name;
    });
    
    return h2h.slice(0, limit).map(m => {
        const home = m.home_team?.home_team_name || '';
        const away = m.away_team?.away_team_name || '';
        
        return {
            date: m.match_date,
            home,
            away,
            homeScore: m.home_score,
            awayScore: m.away_score,
            league: m.competition?.competition_name || 'Unknown',
            season: m.season?.season_name || '',
            winner: m.home_score > m.away_score ? 'home' : 
                   m.home_score < m.away_score ? 'away' : 'draw'
        };
    });
}

function calculateTeamRatings(teamPlayers) {
    const getStat = (arr, field) => arr.reduce((s, p) => s + (parseFloat(p[field]) || 0), 0);
    const getAvg = (arr, field) => arr.length > 0 ? getStat(arr, field) / arr.length : 0;
    
    const goals = getStat(teamPlayers, 'Gls');
    const assists = getStat(teamPlayers, 'Ast');
    const shots = getStat(teamPlayers, 'Sh');
    const tackles = getStat(teamPlayers, 'TklW');
    const interceptions = getStat(teamPlayers, 'Int');
    const passes = getStat(teamPlayers, 'Cmp');
    const cards = getStat(teamPlayers, 'CrdY');
    const redCards = getStat(teamPlayers, 'CrdR');
    const saves = getStat(teamPlayers, 'Save');
    
    const attackRating = Math.min(100, Math.round(
        (goals * 3) + (assists * 2) + (shots * 0.5) + (passes * 0.1)
    ));
    
    const defenseRating = Math.min(100, Math.round(
        (tackles * 1.5) + (interceptions * 1.2) + (saves * 0.5) + (100 - cards)
    ));
    
    const disciplineRating = Math.max(0, Math.min(100, Math.round(
        100 - (cards * 2) - (redCards * 10)
    )));
    
    const formRating = Math.round((attackRating + defenseRating + disciplineRating) / 3);
    
    return {
        attack: attackRating,
        defense: defenseRating,
        discipline: disciplineRating,
        overall: formRating,
        goals,
        assists,
        shots,
        tackles,
        interceptions,
        cards,
        passes
    };
}

function loadAllMatches() {
    return loadStatsBombMatches();
}

module.exports = {
    getPlayers,
    findTeam,
    findMatchesForTeam,
    findHeadToHead,
    calculateTeamRatings,
    loadAllMatches,
    loadStatsBombMatches
};

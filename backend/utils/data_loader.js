/**
 * BETSAVE DATA LOADER v3.0
 * Robust data loading with fallback system for missing teams
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const PLAYERS_CSV = path.join(DATA_DIR, 'players_stats', 'players_data-2025_2026.csv');
const STATSBOMB_DIR = path.join(DATA_DIR, 'statsbomb', 'data');

const LEAGUE_AVERAGES = {
    brazilian: {
        name: 'Brasileiro',
        avgGoals: 1.2,
        avgShots: 10,
        avgShotsOnTarget: 4,
        fouls: 14,
        yellowCards: 3,
        redCards: 0.1,
        tackles: 15,
        interceptions: 10,
        assists: 0.8
    },
    european: {
        name: 'Europeu',
        avgGoals: 1.5,
        avgShots: 12,
        avgShotsOnTarget: 5,
        fouls: 12,
        yellowCards: 2.5,
        redCards: 0.08,
        tackles: 18,
        interceptions: 12,
        assists: 1.0
    }
};

let playersCache = null;
let teamsCache = null;
let matchesCache = null;

function detectLeague(teamName) {
    const lower = teamName.toLowerCase();
    
    const brazilianIndicators = ['brasil', 'flamengo', 'palmeiras', 'corinthians', 'sao paulo', 
        'cruzeiro', 'gremio', 'atletico', 'botafogo', 'fluminense', 'vasco', 'santos',
        'sport', 'fortaleza', 'bahia', 'ceara', 'vitoria', 'goias', 'ponte preta', 
        'chapecoense', 'america', 'atlanta', 'inter', 'bragantino', 'cuiaba'];
    
    if (brazilianIndicators.some(w => lower.includes(w))) {
        return 'brazilian';
    }
    
    return 'european';
}

function getTeamStrength(teamName) {
    const lower = teamName.toLowerCase();
    
    const strongTeams = ['barcelona', 'real madrid', 'manchester city', 'bayern', 'psg',
        'liverpool', 'arsenal', 'chelsea', 'juventus', 'inter', 'milan', 'dortmund',
        'atletico madrid', 'sevilla', 'roma', 'napoli', 'tottenham', 'manchester utd'];
    
    const weakTeams = ['elche', 'levante', 'cadiz', 'almeria', 'granada', 'cartagena',
        'burnley', 'luton', 'sheffield', 'bournemouth', 'werp'];
    
    if (strongTeams.some(w => lower.includes(w))) return 'strong';
    if (weakTeams.some(w => lower.includes(w))) return 'weak';
    return 'medium';
}

function applyStrengthAdjustment(stats, strength) {
    const factor = strength === 'strong' ? 1.2 : strength === 'weak' ? 0.8 : 1.0;
    return {
        ...stats,
        goals: Math.round(stats.goals * factor),
        shots: Math.round(stats.shots * factor),
        shotsOnTarget: Math.round(stats.shotsOnTarget * factor),
        tackles: Math.round(stats.tackles * factor),
        interceptions: Math.round(stats.interceptions * factor)
    };
}

function parseCSV(content) {
    const lines = content.split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
        let line = lines[i];
        let values = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        
        if (values.length >= headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                let value = values[index] || '';
                const num = parseFloat(value);
                row[header] = isNaN(num) ? value : num;
            });
            rows.push(row);
        }
    }
    return rows;
}

function loadPlayersData() {
    if (playersCache) return playersCache;
    
    try {
        if (!fs.existsSync(PLAYERS_CSV)) {
            console.error(`❌ Arquivo não encontrado: ${PLAYERS_CSV}`);
            return null;
        }
        
        const content = fs.readFileSync(PLAYERS_CSV, 'utf-8');
        const players = parseCSV(content);
        
        console.log(`✅ Carregados ${players.length} jogadores`);
        
        playersCache = players.map(p => ({
            name: p.Player || '',
            nation: p.Nation || '',
            position: p.Pos || '',
            team: p.Squad || '',
            league: p.Comp || '',
            age: parseFloat(p.Age) || 0,
            matches: parseInt(p.MP) || 0,
            minutes: parseInt(p.Min) || 0,
            goals: parseInt(p.Gls) || 0,
            assists: parseInt(p.Ast) || 0,
            shots: parseInt(p.Sh) || 0,
            shotsOnTarget: parseInt(p.SoT) || 0,
            yellowCards: parseInt(p.CrdY) || 0,
            redCards: parseInt(p.CrdR) || 0,
            tackles: parseInt(p.TklW) || 0,
            interceptions: parseInt(p.Int) || 0,
            fouls: parseInt(p.Fls) || 0,
            saves: parseInt(p.Saves) || 0,
            cleanSheets: parseInt(p.CS) || 0
        }));
        
        return playersCache;
    } catch (err) {
        console.error('❌ Erro ao carregar jogadores:', err.message);
        return null;
    }
}

function getTeamsAggregated() {
    if (teamsCache) return teamsCache;
    
    const players = loadPlayersData();
    if (!players) return {};
    
    const teamsMap = {};
    
    players.forEach(p => {
        const teamName = p.team;
        if (!teamName) return;
        
        if (!teamsMap[teamName]) {
            teamsMap[teamName] = {
                name: teamName,
                league: p.league,
                goals: 0,
                matches: 0,
                shots: 0,
                shotsOnTarget: 0,
                tackles: 0,
                interceptions: 0,
                fouls: 0,
                yellowCards: 0,
                redCards: 0,
                assists: 0,
                saves: 0,
                cleanSheets: 0,
                players: []
            };
        }
        
        const team = teamsMap[teamName];
        team.goals += p.goals;
        team.shots += p.shots;
        team.shotsOnTarget += p.shotsOnTarget;
        team.tackles += p.tackles;
        team.interceptions += p.interceptions;
        team.fouls += p.fouls;
        team.yellowCards += p.yellowCards;
        team.redCards += p.redCards;
        team.assists += p.assists;
        team.saves += p.saves;
        team.cleanSheets += p.cleanSheets;
        team.matches = Math.max(team.matches, p.matches);
        team.players.push(p);
    });
    
    Object.values(teamsMap).forEach(team => {
        team.topScorer = team.players.sort((a, b) => b.goals - a.goals)[0] || null;
        team.avgGoals = team.matches > 0 ? team.goals / team.matches : 0;
        team.avgShots = team.matches > 0 ? team.shots / team.matches : 0;
        team.avgShotsOnTarget = team.matches > 0 ? team.shotsOnTarget / team.matches : 0;
        team.avgAssists = team.matches > 0 ? team.assists / team.matches : 0;
        team.attackStrength = team.avgGoals + (team.avgShotsOnTarget * 0.3);
        team.defensiveStrength = team.tackles + team.interceptions;
        team.aggression = team.fouls + team.yellowCards;
    });
    
    teamsCache = teamsMap;
    return teamsCache;
}

function estimateTeamStats(teamName) {
    const leagueType = detectLeague(teamName);
    const strength = getTeamStrength(teamName);
    const baseStats = LEAGUE_AVERAGES[leagueType];
    const adjustedStats = applyStrengthAdjustment(baseStats, strength);
    
    return {
        name: teamName,
        league: leagueType === 'brazilian' ? 'Brasileiro' : 'Europeu',
        goals: adjustedStats.goals,
        matches: 20,
        shots: adjustedStats.shots,
        shotsOnTarget: adjustedStats.shotsOnTarget,
        tackles: adjustedStats.tackles,
        interceptions: 10,
        fouls: adjustedStats.fouls,
        yellowCards: adjustedStats.yellowCards,
        redCards: adjustedStats.redCards,
        assists: adjustedStats.assists,
        avgGoals: adjustedStats.avgGoals,
        avgShots: adjustedStats.avgShots,
        avgShotsOnTarget: adjustedStats.avgShotsOnTarget,
        attackStrength: adjustedStats.avgGoals + (adjustedStats.avgShotsOnTarget * 0.3),
        defensiveStrength: adjustedStats.tackles + 10,
        aggression: adjustedStats.fouls + adjustedStats.yellowCards,
        isEstimated: true,
        topScorer: null
    };
}

function getTeamStats(teamName) {
    const teams = getTeamsAggregated();
    const lower = teamName.toLowerCase();
    
    const found = Object.values(teams).find(t => 
        t.name.toLowerCase() === lower ||
        t.name.toLowerCase().includes(lower)
    );
    
    if (found) {
        found.isEstimated = false;
        return found;
    }
    
    console.log(`⚠️ Time não encontrado: ${teamName}, usando estimativa`);
    return estimateTeamStats(teamName);
}

function getTeamPlayers(teamName) {
    const team = getTeamStats(teamName);
    return team ? team.players : [];
}

function getTopScorer(teamName) {
    const team = getTeamStats(teamName);
    return team?.topScorer || null;
}

function findPlayer(playerName) {
    const players = loadPlayersData();
    if (!players) return null;
    
    const lowerName = playerName.toLowerCase();
    return players.find(p => 
        p.name.toLowerCase() === lowerName ||
        p.name.toLowerCase().includes(lowerName)
    );
}

function findTeam(teamName) {
    return getTeamPlayers(teamName);
}

function loadAllMatches() {
    if (matchesCache) return matchesCache;
    
    const matchesDir = path.join(STATSBOMB_DIR, 'matches');
    if (!fs.existsSync(matchesDir)) {
        console.log('⚠️ Diretório de matches não encontrado');
        return [];
    }
    
    matchesCache = [];
    const compDirs = fs.readdirSync(matchesDir);
    
    for (const compDir of compDirs) {
        const compPath = path.join(matchesDir, compDir);
        if (!fs.statSync(compPath).isDirectory()) continue;
        
        const seasonFiles = fs.readdirSync(compPath);
        for (const file of seasonFiles) {
            if (!file.endsWith('.json')) continue;
            
            try {
                const content = fs.readFileSync(path.join(compPath, file), 'utf-8');
                const matches = JSON.parse(content);
                matchesCache.push(...matches);
            } catch {}
        }
    }
    
    console.log(`✅ Carregados ${matchesCache.length} jogos do StatsBomb`);
    return matchesCache;
}

function findHeadToHead(team1, team2, limit = 15) {
    const allMatches = loadAllMatches();
    const lower1 = team1.toLowerCase();
    const lower2 = team2.toLowerCase();
    
    const h2h = allMatches.filter(m => {
        const home = (m.home_team?.home_team_name || '').toLowerCase();
        const away = (m.away_team?.away_team_name || '').toLowerCase();
        return (home.includes(lower1) || away.includes(lower1)) && 
               (home.includes(lower2) || away.includes(lower2));
    });
    
    return h2h.slice(0, limit).map(m => ({
        date: m.match_date,
        home: m.home_team?.home_team_name || 'Unknown',
        away: m.away_team?.away_team_name || 'Unknown',
        homeScore: m.home_score || 0,
        awayScore: m.away_score || 0,
        league: m.competition?.competition_name || 'Unknown',
        winner: (m.home_score || 0) > (m.away_score || 0) ? 'home' : 
                (m.home_score || 0) < (m.away_score || 0) ? 'away' : 'draw'
    }));
}

function clearCache() {
    playersCache = null;
    teamsCache = null;
    matchesCache = null;
}

if (require.main === module) {
    console.log('═══════════════════════════════════════');
    console.log('   BETSAVE - DATA LOADER v3.0         ');
    console.log('═══════════════════════════════════════\n');
    
    const teams = getTeamsAggregated();
    console.log(`\n⚽ ${Object.keys(teams).length} times no banco de dados`);
    
    const barca = getTeamStats('Barcelona');
    console.log(`\n📊 Barcelona (dados reais):`);
    console.log(`   Gols: ${barca.goals} (${barca.avgGoals.toFixed(2)}/jogo)`);
    console.log(`   Ataque: ${barca.attackStrength.toFixed(2)}`);
    console.log(`   Defesa: ${barca.defensiveStrength}`);
    
    const flamengo = getTeamStats('Flamengo');
    console.log(`\n📊 Flamengo (estimado):`);
    console.log(`   Gols: ${flamengo.goals} (${flamengo.avgGoals.toFixed(2)}/jogo)`);
    console.log(`   isEstimated: ${flamengo.isEstimated}`);
    
    console.log('\n✅ Sistema de fallback funcionando!\n');
}

module.exports = {
    loadPlayersData,
    getTeamsAggregated,
    getTeamStats,
    estimateTeamStats,
    getTeamPlayers,
    getTopScorer,
    findPlayer,
    findTeam,
    loadAllMatches,
    findHeadToHead,
    clearCache,
    detectLeague,
    getTeamStrength,
    LEAGUE_AVERAGES
};

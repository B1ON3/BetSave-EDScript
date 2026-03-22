const fs = require('fs');
const path = require('path');
const { parse } = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const PLAYERS_CSV = path.join(DATA_DIR, 'players_stats', 'players_data-2025_2026.csv');

function parseCSV(content) {
    const lines = content.split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length !== headers.length) continue;
        
        const row = {};
        headers.forEach((header, index) => {
            let value = values[index]?.trim() || '';
            const num = parseFloat(value);
            row[header] = isNaN(num) ? value : num;
        });
        rows.push(row);
    }
    return rows;
}

function loadPlayersData() {
    try {
        const content = fs.readFileSync(PLAYERS_CSV, 'utf-8');
        const players = parseCSV(content);
        
        console.log(`✅ Carregados ${players.length} jogadores`);
        
        const simplified = players.slice(0, 100).map(p => ({
            name: p.Player || p.player_name || 'Unknown',
            team: p.Squad || p.team_name || 'Unknown',
            position: p.Pos || p.position || 'Unknown',
            league: p.Comp || p.league || 'Unknown',
            nation: p.Nation || p.nation || 'Unknown',
            age: p.Age || 0,
            goals: p.Gls || 0,
            assists: p.Ast || 0,
            matches: p.MP || 0,
            minutes: p.Min || 0,
            yellowCards: p.CrdY || 0,
            redCards: p.CrdR || 0,
            shots: p.Sh || 0,
            shotsOnTarget: p.SoT || 0,
            passes: p.Pass || 0,
            tackles: p.Tkl || 0,
            interceptions: p.Int || 0
        }));
        
        const teams = {};
        simplified.forEach(p => {
            if (!teams[p.team]) {
                teams[p.team] = {
                    name: p.team,
                    league: p.league,
                    players: []
                };
            }
            teams[p.team].players.push(p);
        });
        
        console.log(`✅ ${Object.keys(teams).length} times identificados`);
        
        return { players: simplified, teams };
    } catch (err) {
        console.error('Erro ao carregar jogadores:', err.message);
        return null;
    }
}

function analyzeTeam(teamName, data) {
    const team = data.teams[teamName];
    if (!team) return null;
    
    const players = team.players;
    const totalGoals = players.reduce((sum, p) => sum + (p.goals || 0), 0);
    const totalAssists = players.reduce((sum, p) => sum + (p.assists || 0), 0);
    const totalMatches = players.reduce((sum, p) => sum + (p.matches || 0), 0);
    const avgAge = players.reduce((sum, p) => sum + (p.age || 0), 0) / players.length;
    
    const attackers = players.filter(p => 
        (p.position || '').toUpperCase().includes('FW') || 
        (p.position || '').toUpperCase().includes('ATTACK')
    );
    const midfielders = players.filter(p => 
        (p.position || '').toUpperCase().includes('MF') || 
        (p.position || '').toUpperCase().includes('MID')
    );
    const defenders = players.filter(p => 
        (p.position || '').toUpperCase().includes('DF') || 
        (p.position || '').toUpperCase().includes('DEF')
    );
    
    return {
        team: teamName,
        league: team.league,
        totalPlayers: players.length,
        attackers: attackers.length,
        midfielders: midfielders.length,
        defenders: defenders.length,
        totalGoals,
        totalAssists,
        totalMatches,
        avgAge: avgAge.toFixed(1),
        avgGoalsPerMatch: totalMatches > 0 ? (totalGoals / totalMatches).toFixed(2) : '0',
        topScorers: players.sort((a, b) => (b.goals || 0) - (a.goals || 0)).slice(0, 3)
    };
}

function compareTeams(team1Name, team2Name, data) {
    const team1 = analyzeTeam(team1Name, data);
    const team2 = analyzeTeam(team2Name, data);
    
    if (!team1 || !team2) return null;
    
    let score1 = 0;
    let score2 = 0;
    const factors = [];
    
    if (team1.totalGoals > team2.totalGoals) {
        score1 += 2;
        factors.push(`Gols: ${team1.totalGoals} vs ${team2.totalGoals}`);
    } else if (team2.totalGoals > team1.totalGoals) {
        score2 += 2;
        factors.push(`Gols: ${team2.totalGoals} vs ${team1.totalGoals}`);
    }
    
    if (team1.totalAssists > team2.totalAssists) {
        score1 += 1;
        factors.push(`Assistências: ${team1.totalAssists} vs ${team2.totalAssists}`);
    } else if (team2.totalAssists > team1.totalAssists) {
        score2 += 1;
        factors.push(`Assistências: ${team2.totalAssists} vs ${team1.totalAssists}`);
    }
    
    const ageDiff = parseFloat(team2.avgAge) - parseFloat(team1.avgAge);
    if (ageDiff > 1) {
        score1 += 1;
        factors.push(`Média de idade: ${team1.avgAge} vs ${team2.avgAge}`);
    } else if (ageDiff < -1) {
        score2 += 1;
        factors.push(`Média de idade: ${team2.avgAge} vs ${team1.avgAge}`);
    }
    
    let winner = 'EMPATE';
    if (score1 > score2) winner = team1Name;
    else if (score2 > score1) winner = team2Name;
    
    return {
        team1,
        team2,
        score: `${score1} - ${score2}`,
        factors,
        prediction: winner,
        confidence: Math.abs(score1 - score2) === 0 ? 'BAIXA' : Math.abs(score1 - score2) >= 2 ? 'ALTA' : 'MEDIA'
    };
}

function getAvailableTeams(data) {
    return Object.keys(data.teams).sort();
}

function getTeamsByLeague(league, data) {
    return Object.values(data.teams)
        .filter(t => (t.league || '').toLowerCase().includes(league.toLowerCase()))
        .map(t => t.name);
}

if (require.main === module) {
    console.log('═══════════════════════════════════════');
    console.log('   BETSAVE - CARREGANDO DADOS REAIS   ');
    console.log('═══════════════════════════════════════\n');
    
    const data = loadPlayersData();
    
    if (data) {
        console.log('\n📊 Times Disponíveis (exemplos):');
        const teams = getAvailableTeams(data).slice(0, 10);
        teams.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
        
        console.log('\n═══════════════════════════════════════');
        
        const testComparisons = [
            ['Manchester City', 'Liverpool'],
            ['Real Madrid', 'Barcelona'],
            ['PSG', 'Marseille']
        ];
        
        testComparisons.forEach(([t1, t2]) => {
            const comparison = compareTeams(t1, t2, data);
            if (comparison) {
                console.log(`\n⚽ ${t1} vs ${t2}`);
                console.log(`   Previsão: ${comparison.prediction} (Confiança: ${comparison.confidence})`);
                comparison.factors.forEach(f => console.log(`   • ${f}`));
            } else {
                console.log(`\n⚽ ${t1} vs ${t2}: Times não encontrados nos dados`);
            }
        });
    }
}

module.exports = { loadPlayersData, analyzeTeam, compareTeams, getAvailableTeams, getTeamsByLeague };

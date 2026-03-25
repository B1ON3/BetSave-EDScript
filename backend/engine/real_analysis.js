const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', '..', 'data');
const PLAYERS_CSV = path.join(DATA_DIR, 'players_stats', 'players_data-2025_2026.csv');
const STATSBOMB_DIR = path.join(DATA_DIR, 'statsbomb', 'data');

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

function loadPlayers() {
    const content = fs.readFileSync(PLAYERS_CSV, 'utf-8');
    return parseCSV(content);
}

function findTeam(teamName, players) {
    const lowerName = teamName.toLowerCase();
    return players.filter(p => 
        (p.Squad || '').toLowerCase() === lowerName ||
        (p.Squad || '').toLowerCase().includes(lowerName) ||
        lowerName.includes((p.Squad || '').toLowerCase())
    );
}

function classifyRisk(probability) {
    if (probability >= 0.71) return { level: 'BAIXO', emoji: '🟢', percentage: Math.round(probability * 100) };
    if (probability >= 0.41) return { level: 'MEDIO', emoji: '🟡', percentage: Math.round(probability * 100) };
    return { level: 'ALTO', emoji: '🔴', percentage: Math.round(probability * 100) };
}

function analyzeMatchReal(homeTeam, awayTeam) {
    const players = loadPlayers();
    const homePlayers = findTeam(homeTeam, players);
    const awayPlayers = findTeam(awayTeam, players);
    
    if (homePlayers.length === 0 && awayPlayers.length === 0) {
        return { error: `Times não encontrados: ${homeTeam} ou ${awayTeam}` };
    }
    
    const getStat = (arr, field) => arr.reduce((sum, p) => sum + (parseFloat(p[field]) || 0), 0);
    const getAvg = (arr, field) => arr.length > 0 ? getStat(arr, field) / arr.length : 0;
    
    const homeGoals = getStat(homePlayers, 'Gls');
    const awayGoals = getStat(awayPlayers, 'Gls');
    const homeAssists = getStat(homePlayers, 'Ast');
    const awayAssists = getStat(awayPlayers, 'Ast');
    const homeShots = getStat(homePlayers, 'Sh');
    const awayShots = getStat(awayPlayers, 'Sh');
    const homeAge = getAvg(homePlayers, 'Age');
    const awayAge = getAvg(awayPlayers, 'Age');
    
    let homeProb = 0.33;
    let reasons = [];
    
    const goalDiff = homeGoals - awayGoals;
    if (goalDiff > 10) {
        homeProb += 0.2;
        reasons.push(`Ataque superior: ${homeGoals} gols vs ${awayGoals} gols`);
    } else if (goalDiff < -10) {
        homeProb -= 0.2;
        reasons.push(`Ataque inferior: ${awayGoals} gols vs ${homeGoals} gols`);
    }
    
    const shotsDiff = homeShots - awayShots;
    if (shotsDiff > 50) {
        homeProb += 0.1;
        reasons.push(`Finalizações: ${homeShots} vs ${awayShots}`);
    }
    
    const assistDiff = homeAssists - awayAssists;
    if (assistDiff > 5) {
        homeProb += 0.08;
        reasons.push(`Criações de jogo: ${homeAssists} assistências vs ${awayAssists}`);
    }
    
    if (homeAge < awayAge - 2) {
        homeProb += 0.05;
        reasons.push(`Elenco mais jovem: ${homeAge.toFixed(1)} anos vs ${awayAge.toFixed(1)} anos`);
    } else if (awayAge < homeAge - 2) {
        homeProb -= 0.05;
        reasons.push(`Adversário mais jovem: ${awayAge.toFixed(1)} anos vs ${homeAge.toFixed(1)} anos`);
    }
    
    const h2hBonus = (Math.random() - 0.5) * 0.1;
    homeProb += h2hBonus;
    
    homeProb = Math.min(homeProb, 0.85);
    homeProb = Math.max(homeProb, 0.15);
    
    const awayProb = (1 - homeProb) * 0.7;
    const drawProb = 1 - homeProb - awayProb;
    
    const homeRisk = classifyRisk(homeProb);
    const awayRisk = classifyRisk(awayProb);
    const drawRisk = classifyRisk(drawProb);
    
    const recommendations = [];
    if (homeRisk.level !== 'ALTO') {
        recommendations.push({
            type: `VITÓRIA ${homeTeam.toUpperCase()}`,
            odd: (1/homeProb).toFixed(2),
            risk: homeRisk,
            probability: `${homeRisk.percentage}%`
        });
    }
    if (awayRisk.level !== 'ALTO') {
        recommendations.push({
            type: `VITÓRIA ${awayTeam.toUpperCase()}`,
            odd: (1/awayProb).toFixed(2),
            risk: awayRisk,
            probability: `${awayRisk.percentage}%`
        });
    }
    
    return {
        match: { home: homeTeam, away: awayTeam },
        probabilities: {
            home: homeProb.toFixed(2),
            draw: drawProb.toFixed(2),
            away: awayProb.toFixed(2)
        },
        risks: {
            home: homeRisk,
            draw: drawRisk,
            away: awayRisk
        },
        stats: {
            goals: { home: homeGoals, away: awayGoals },
            assists: { home: homeAssists, away: awayAssists },
            shots: { home: homeShots, away: awayShots },
            avgAge: { home: homeAge.toFixed(1), away: awayAge.toFixed(1) }
        },
        insights: reasons,
        recommendations
    };
}

function formatAnalysisReal(analysis) {
    if (analysis.error) return `❌ ${analysis.error}`;
    
    const { match, probabilities, risks, stats, insights, recommendations } = analysis;
    
    let output = `
═══════════════════════════════════════
⚽ ANÁLISE BETSAVE (DADOS REAIS)
═══════════════════════════════════════

${match.home} vs ${match.away}

───────────────────────────────────────
📊 PROBABILIDADES
───────────────────────────────────────
${match.home}: ${probabilities.home} ${risks.home.emoji} (${risks.home.level})
Empate:      ${probabilities.draw} ${risks.draw.emoji} (${risks.draw.level})
${match.away}: ${probabilities.away} ${risks.away.emoji} (${risks.away.level})

───────────────────────────────────────
📈 ESTATÍSTICAS
───────────────────────────────────────
Gols (temporada):    ${stats.goals.home} vs ${stats.goals.away}
Assistências:        ${stats.assists.home} vs ${stats.assists.away}
Finalizações:        ${stats.shots.home} vs ${stats.shots.away}
Média de idade:      ${stats.avgAge.home} vs ${stats.avgAge.away}

───────────────────────────────────────
💡 INSIGHTS
───────────────────────────────────────
`;
    insights.forEach((insight, i) => {
        output += `${i + 1}. ${insight}\n`;
    });
    
    output += `
───────────────────────────────────────
🎯 RECOMENDAÇÕES
───────────────────────────────────────
`;
    if (recommendations.length > 0) {
        recommendations.forEach(rec => {
            output += `${rec.risk.emoji} ${rec.type}\n`;
            output += `   Odds: ${rec.odd} | Risco: ${rec.risk.level}\n\n`;
        });
    } else {
        output += '⚠️ Nenhuma aposta recomendada\n';
    }
    
    output += `═══════════════════════════════════════`;
    
    return output;
}

module.exports = { analyzeMatchReal, formatAnalysisReal, loadPlayers, findTeam };

if (require.main === module) {
    const args = process.argv.slice(2);
    const home = args[0] || 'Manchester City';
    const away = args[1] || 'Liverpool';
    
    console.log(formatAnalysisReal(analyzeMatchReal(home, away)));
}

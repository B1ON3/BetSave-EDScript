const { loadPlayersData, getTeamsByLeague } = require('../utils/data_loader');

function classifyRisk(probability) {
    if (probability >= 0.71) return { level: 'BAIXO', emoji: '🟢', percentage: Math.round(probability * 100) };
    if (probability >= 0.41) return { level: 'MEDIO', emoji: '🟡', percentage: Math.round(probability * 100) };
    return { level: 'ALTO', emoji: '🔴', percentage: Math.round(probability * 100) };
}

function aggregateTeamStats(players) {
    const getStat = (arr, field) => arr.reduce((s, p) => s + (parseInt(p[field]) || 0), 0);
    
    return {
        goals: getStat(players, 'goals'),
        assists: getStat(players, 'assists'),
        shots: getStat(players, 'shots'),
        shotsOnTarget: getStat(players, 'shotsOnTarget'),
        tackles: getStat(players, 'tackles'),
        interceptions: getStat(players, 'interceptions'),
        fouls: getStat(players, 'fouls'),
        yellowCards: getStat(players, 'yellowCards'),
        redCards: getStat(players, 'redCards'),
        saves: getStat(players, 'saves'),
        cleanSheets: getStat(players, 'cleanSheets'),
        matches: Math.max(...players.map(p => parseInt(p.matches) || 1)),
        playerCount: players.length
    };
}

function getAllTeamsStats() {
    const players = loadPlayersData();
    if (!players) return [];
    
    const teamsMap = new Map();
    
    players.forEach(p => {
        const teamName = p.team || p.Squad;
        if (!teamName) return;
        
        if (!teamsMap.has(teamName)) {
            teamsMap.set(teamName, []);
        }
        teamsMap.get(teamName).push(p);
    });
    
    const teamsStats = [];
    
    teamsMap.forEach((teamPlayers, teamName) => {
        const stats = aggregateTeamStats(teamPlayers);
        const league = teamPlayers[0]?.league || teamPlayers[0]?.Comp || 'Desconhecida';
        
        const xg = stats.shots * 0.12 + stats.shotsOnTarget * 0.38;
        const defensiveActions = stats.tackles + stats.interceptions;
        const disciplineScore = 100 - (stats.yellowCards * 2) - (stats.redCards * 10);
        
        teamsStats.push({
            name: teamName,
            league,
            ...stats,
            xg: xg.toFixed(1),
            defensiveActions,
            disciplineScore,
            goalsPerMatch: (stats.goals / stats.matches).toFixed(2),
            xgPerMatch: (xg / stats.matches).toFixed(2),
            powerScore: (stats.goals * 2) + (stats.assists * 1.5) + (defensiveActions * 0.5)
        });
    });
    
    return teamsStats;
}

function getBestAttacks(limit = 10) {
    const teams = getAllTeamsStats();
    
    return teams
        .sort((a, b) => b.goals - a.goals)
        .slice(0, limit)
        .map((t, i) => ({
            rank: i + 1,
            name: t.name,
            league: t.league,
            goals: t.goals,
            assists: t.assists,
            shots: t.shots,
            xg: t.xg,
            goalsPerMatch: t.goalsPerMatch,
            powerScore: t.powerScore
        }));
}

function getBestDefenses(limit = 10) {
    const teams = getAllTeamsStats();
    
    const teamsWithDefense = teams.map(t => ({
        ...t,
        defenseScore: t.defensiveActions + (parseInt(t.cleanSheets) * 5)
    }));
    
    return teamsWithDefense
        .sort((a, b) => b.defenseScore - a.defenseScore)
        .slice(0, limit)
        .map((t, i) => ({
            rank: i + 1,
            name: t.name,
            league: t.league,
            tackles: t.tackles,
            interceptions: t.interceptions,
            defensiveActions: t.defensiveActions,
            cleanSheets: t.cleanSheets,
            yellowCards: t.yellowCards,
            defenseScore: t.defenseScore
        }));
}

function getMostDisciplinedTeams(limit = 10) {
    const teams = getAllTeamsStats();
    
    return teams
        .filter(t => t.matches >= 5)
        .sort((a, b) => b.disciplineScore - a.disciplineScore)
        .slice(0, limit)
        .map((t, i) => ({
            rank: i + 1,
            name: t.name,
            league: t.league,
            yellowCards: t.yellowCards,
            redCards: t.redCards,
            fouls: t.fouls,
            disciplineScore: t.disciplineScore,
            rating: t.disciplineScore > 90 ? 'EXCELENTE' :
                    t.disciplineScore > 75 ? 'BOM' :
                    t.disciplineScore > 60 ? 'REGULAR' : 'RUIM'
        }));
}

function getMostAggressiveTeams(limit = 10) {
    const teams = getAllTeamsStats();
    
    return teams
        .filter(t => t.matches >= 5)
        .sort((a, b) => b.fouls - a.fouls)
        .slice(0, limit)
        .map((t, i) => ({
            rank: i + 1,
            name: t.name,
            league: t.league,
            fouls: t.fouls,
            yellowCards: t.yellowCards,
            redCards: t.redCards,
            foulsPerMatch: (t.fouls / t.matches).toFixed(1),
            aggressionLevel: t.fouls / t.matches > 3 ? 'MUITO AGRESSIVO' :
                            t.fouls / t.matches > 2 ? 'AGRESSIVO' : 'MODERADO'
        }));
}

function getLeagueInsights(leagueName) {
    const players = loadPlayersData();
    if (!players) return { error: 'Erro ao carregar dados' };
    
    const leaguePlayers = players.filter(p => 
        (p.league || p.Comp || '').toLowerCase().includes(leagueName.toLowerCase())
    );
    
    if (leaguePlayers.length === 0) {
        return { error: `Liga não encontrada: ${leagueName}` };
    }
    
    const teamsMap = new Map();
    leaguePlayers.forEach(p => {
        const teamName = p.team || p.Squad;
        if (!teamsMap.has(teamName)) {
            teamsMap.set(teamName, []);
        }
        teamsMap.get(teamName).push(p);
    });
    
    const teams = [];
    teamsMap.forEach((teamPlayers, teamName) => {
        const stats = aggregateTeamStats(teamPlayers);
        const xg = stats.shots * 0.12 + stats.shotsOnTarget * 0.38;
        teams.push({
            name: teamName,
            ...stats,
            xg: parseFloat(xg.toFixed(1)),
            defensiveActions: stats.tackles + stats.interceptions,
            goalsPerMatch: stats.goals / stats.matches,
            powerScore: (stats.goals * 2) + (stats.assists * 1.5)
        });
    });
    
    const sortedByGoals = [...teams].sort((a, b) => b.goals - a.goals);
    const sortedByDefense = [...teams].sort((a, b) => (b.tackles + b.interceptions) - (a.tackles + a.interceptions));
    const sortedByPower = [...teams].sort((a, b) => b.powerScore - a.powerScore);
    
    const totalGoals = teams.reduce((sum, t) => sum + t.goals, 0);
    const avgGoalsPerTeam = totalGoals / teams.length;
    const avgGoalsPerMatch = avgGoalsPerTeam / 2;
    
    const topScorers = leaguePlayers
        .filter(p => (p.goals || p.Gls) > 0)
        .sort((a, b) => ((b.goals || b.Gls) || 0) - ((a.goals || a.Gls) || 0))
        .slice(0, 5)
        .map((p, i) => ({
            rank: i + 1,
            name: p.name || p.Player,
            team: p.team || p.Squad,
            goals: p.goals || p.Gls,
            assists: p.assists || p.Ast,
            matches: p.matches || p.MP
        }));
    
    const bestAttack = sortedByGoals[0];
    const bestDefense = sortedByDefense[0];
    const bestTeam = sortedByPower[0];
    
    return {
        league: leagueName,
        totalTeams: teams.length,
        totalPlayers: leaguePlayers.length,
        statistics: {
            totalGoals,
            avgGoalsPerTeam: avgGoalsPerTeam.toFixed(1),
            avgGoalsPerMatch: avgGoalsPerMatch.toFixed(1)
        },
        bestAttack: {
            team: bestAttack.name,
            goals: bestAttack.goals,
            goalsPerMatch: bestAttack.goalsPerMatch.toFixed(2)
        },
        bestDefense: {
            team: bestDefense.name,
            tackles: bestDefense.tackles,
            interceptions: bestDefense.interceptions,
            cleanSheets: bestDefense.cleanSheets
        },
        bestOverall: {
            team: bestTeam.name,
            powerScore: bestTeam.powerScore,
            goals: bestTeam.goals,
            assists: bestTeam.assists
        },
        topScorers,
        topTeams: sortedByPower.slice(0, 5).map((t, i) => ({
            rank: i + 1,
            name: t.name,
            goals: t.goals,
            assists: t.assists,
            powerScore: t.powerScore
        })),
        allTeams: teams.sort((a, b) => b.powerScore - a.powerScore)
    };
}

function generateMatchInsight(homeTeam, awayTeam) {
    const teams = getAllTeamsStats();
    
    const home = teams.find(t => t.name.toLowerCase() === homeTeam.toLowerCase());
    const away = teams.find(t => t.name.toLowerCase() === awayTeam.toLowerCase());
    
    if (!home || !away) {
        return { error: 'Times não encontrados' };
    }
    
    const insights = [];
    const factors = [];
    let homeAdvantage = 0.15;
    
    if (home.goals > away.goals * 1.2) {
        factors.push({ team: home.name, factor: 'Ataque superior', bonus: 0.1 });
        insights.push(`${home.name} tem ataque mais forte (${home.goals} vs ${away.goals} gols)`);
    }
    
    if (home.xg > away.xg * 1.2) {
        factors.push({ team: home.name, factor: 'xG superior', bonus: 0.08 });
        insights.push(`${home.name} cria mais chances (xG: ${home.xg} vs ${away.xg})`);
    }
    
    if (home.defensiveActions > away.defensiveActions * 1.3) {
        factors.push({ team: home.name, factor: 'Defesa superior', bonus: 0.08 });
        insights.push(`${home.name} tem defesa mais sólida`);
    }
    
    if (away.defensiveActions > home.defensiveActions * 1.3) {
        factors.push({ team: away.name, factor: 'Defesa visitante superior', bonus: 0.05 });
        insights.push(`${away.name} tem defesa forte (pode surpreender)`);
    }
    
    if (home.goalsPerMatch > away.goalsPerMatch * 1.5) {
        factors.push({ team: home.name, factor: 'Média de gols alta', bonus: 0.05 });
        insights.push(`${home.name} marca em média ${home.goalsPerMatch} gol/jogo`);
    }
    
    if (home.disciplineScore > away.disciplineScore + 20) {
        factors.push({ team: home.name, factor: 'Melhor disciplina', bonus: 0.03 });
        insights.push(`${home.name} é mais disciplinado`);
    } else if (away.disciplineScore > home.disciplineScore + 20) {
        factors.push({ team: away.name, factor: 'Melhor disciplina visitante', bonus: 0.02 });
        insights.push(`${away.name} é mais disciplinado`);
    }
    
    const homeBonus = factors.filter(f => f.team === home.name).reduce((sum, f) => sum + f.bonus, 0);
    const awayBonus = factors.filter(f => f.team === away.name).reduce((sum, f) => sum + f.bonus, 0);
    
    let homeProb = 0.33 + homeAdvantage + homeBonus - awayBonus;
    homeProb = Math.max(0.2, Math.min(0.75, homeProb));
    
    const awayProb = (1 - homeProb) * 0.7;
    const drawProb = 1 - homeProb - awayProb;
    
    const homeRisk = classifyRisk(homeProb);
    const awayRisk = classifyRisk(awayProb);
    const drawRisk = classifyRisk(drawProb);
    
    const recommendations = [];
    if (homeRisk.level !== 'ALTO') {
        recommendations.push({
            type: `VITÓRIA ${home.name.toUpperCase()}`,
            odd: (1 / homeProb).toFixed(2),
            risk: homeRisk,
            reason: 'Vantagem de casa e estatísticas favoráveis'
        });
    }
    if (awayRisk.level !== 'ALTO') {
        recommendations.push({
            type: `VITÓRIA ${away.name.toUpperCase()}`,
            odd: (1 / awayProb).toFixed(2),
            risk: awayRisk,
            reason: 'Estatísticas competitivas'
        });
    }
    if (drawRisk.level !== 'ALTO' && drawProb > 0.28) {
        recommendations.push({
            type: 'EMPATE',
            odd: (1 / drawProb).toFixed(2),
            risk: drawRisk,
            reason: 'Times equilibrados'
        });
    }
    
    return {
        match: { home: home.name, away: away.name },
        teams: {
            home: {
                goals: home.goals,
                assists: home.assists,
                xg: home.xg,
                goalsPerMatch: home.goalsPerMatch,
                defensiveActions: home.defensiveActions,
                disciplineScore: home.disciplineScore,
                powerScore: home.powerScore
            },
            away: {
                goals: away.goals,
                assists: away.assists,
                xg: away.xg,
                goalsPerMatch: away.goalsPerMatch,
                defensiveActions: away.defensiveActions,
                disciplineScore: away.disciplineScore,
                powerScore: away.powerScore
            }
        },
        probabilities: {
            home: (homeProb * 100).toFixed(0) + '%',
            draw: (drawProb * 100).toFixed(0) + '%',
            away: (awayProb * 100).toFixed(0) + '%'
        },
        risks: { home: homeRisk, draw: drawRisk, away: awayRisk },
        insights,
        recommendations: recommendations.sort((a, b) => b.risk.percentage - a.risk.percentage)
    };
}

function formatInsights(insights) {
    if (insights.error) return `❌ ${insights.error}`;
    
    const { league, totalTeams, statistics, bestAttack, bestDefense, bestOverall, topScorers } = insights;
    
    let output = `
══════════════════════════════════════
📊 INSIGHTS DA LIGA
══════════════════════════════════════

🏆 ${league}
Times: ${totalTeams} | Jogadores: ${insights.totalPlayers}

──────────────────────────────────────
📈 ESTATÍSTICAS DA LIGA
──────────────────────────────────────
Total de gols: ${statistics.totalGoals}
Média por time: ${statistics.avgGoalsPerTeam}
Média por jogo: ${statistics.avgGoalsPerMatch}

──────────────────────────────────────
⚔️ MELHOR ATAQUE
──────────────────────────────────────
${bestAttack.team}
Gols: ${bestAttack.goals} | Gols/Jogo: ${bestAttack.goalsPerMatch}

──────────────────────────────────────
🛡️ MELHOR DEFESA
──────────────────────────────────────
${bestDefense.team}
Desarmes: ${bestDefense.tackles} | Interceptações: ${bestDefense.interceptions}
Clean Sheets: ${bestDefense.cleanSheets}

──────────────────────────────────────
🏆 MELHOR TIME GERAL
──────────────────────────────────────
${bestOverall.team}
Power Score: ${bestOverall.powerScore}
Gols: ${bestOverall.goals} | Assistências: ${bestOverall.assists}

──────────────────────────────────────
👑 TOP ARTILHEIROS
──────────────────────────────────────
`;
    topScorers.forEach(s => {
        output += `${s.rank}. ${s.name} (${s.team}) - ${s.goals} gols\n`;
    });
    
    output += `
═══════════════════════════════════════`;
    
    return output;
}

function formatMatchInsight(insight) {
    if (insight.error) return `❌ ${insight.error}`;
    
    const { match, teams, probabilities, risks, insights, recommendations } = insight;
    
    let output = `
══════════════════════════════════════
💡 INSIGHT DO JOGO
══════════════════════════════════════

${match.home} vs ${match.away}

──────────────────────────────────────
📊 COMPARAÇÃO
──────────────────────────────────────
                    ${match.home.padEnd(20)} ${match.away}
Gols:               ${String(teams.home.goals).padEnd(20)} ${teams.away.goals}
Assistências:       ${String(teams.home.assists).padEnd(20)} ${teams.away.assists}
xG:                 ${String(teams.home.xg).padEnd(20)} ${teams.away.xg}
Gols/Jogo:          ${String(teams.home.goalsPerMatch).padEnd(20)} ${teams.away.goalsPerMatch}
Ações Defensivas:   ${String(teams.home.defensiveActions).padEnd(20)} ${teams.away.defensiveActions}
Disciplina:         ${String(teams.home.disciplineScore).padEnd(20)} ${teams.away.disciplineScore}

──────────────────────────────────────
📈 PROBABILIDADES
──────────────────────────────────────
${match.home}: ${probabilities.home} ${risks.home.emoji}
Empate:      ${probabilities.draw} ${risks.draw.emoji}
${match.away}: ${probabilities.away} ${risks.away.emoji}

──────────────────────────────────────
💡 INSIGHTS
──────────────────────────────────────
`;
    insights.forEach((insight, i) => {
        output += `${i + 1}. ${insight}\n`;
    });
    
    if (recommendations.length > 0) {
        output += `
──────────────────────────────────────
🎯 RECOMENDAÇÕES
──────────────────────────────────────
`;
        recommendations.forEach(rec => {
            output += `${rec.risk.emoji} ${rec.type}\n`;
            output += `   Odds: ${rec.odd} | Motivo: ${rec.reason}\n\n`;
        });
    }
    
    output += `═══════════════════════════════════════`;
    
    return output;
}

if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Uso: node insights.js <comando> [args]');
        console.log('Comandos:');
        console.log('  attacks [n]     - Top ataques (padrão: 10)');
        console.log('  defenses [n]   - Top defesas (padrão: 10)');
        console.log('  discipline [n] - Times mais disciplinados (padrão: 10)');
        console.log('  league <nome>  - Insights de uma liga');
        console.log('  match <h> <a>  - Insights de um jogo');
        return;
    }
    
    const cmd = args[0];
    
    if (cmd === 'attacks') {
        const limit = parseInt(args[1]) || 10;
        const attacks = getBestAttacks(limit);
        console.log(`\n🏆 TOP ${limit} MELHORES ATAQUES\n`);
        attacks.forEach(t => {
            console.log(`${t.rank}. ${t.name} (${t.league}) - ${t.goals} gols, xG: ${t.xg}`);
        });
    } else if (cmd === 'defenses') {
        const limit = parseInt(args[1]) || 10;
        const defenses = getBestDefenses(limit);
        console.log(`\n🛡️ TOP ${limit} MELHORES DEFESAS\n`);
        defenses.forEach(t => {
            console.log(`${t.rank}. ${t.name} (${t.league}) - ${t.defensiveActions} ações, ${t.cleanSheets} clean sheets`);
        });
    } else if (cmd === 'discipline') {
        const limit = parseInt(args[1]) || 10;
        const teams = getMostDisciplinedTeams(limit);
        console.log(`\n📋 TOP ${limit} TIMES MAIS DISCIPLINADOS\n`);
        teams.forEach(t => {
            console.log(`${t.rank}. ${t.name} (${t.league}) - Score: ${t.disciplineScore} (${t.rating})`);
        });
    } else if (cmd === 'league' && args[1]) {
        const leagueName = args.slice(1).join(' ');
        const insights = getLeagueInsights(leagueName);
        console.log(formatInsights(insights));
    } else if (cmd === 'match' && args.length > 2) {
        const home = args[1];
        const away = args.slice(2).join(' ');
        const insight = generateMatchInsight(home, away);
        console.log(formatMatchInsight(insight));
    } else {
        console.log('Comando inválido');
    }
}

module.exports = {
    getAllTeamsStats,
    getBestAttacks,
    getBestDefenses,
    getMostDisciplinedTeams,
    getMostAggressiveTeams,
    getLeagueInsights,
    generateMatchInsight,
    formatInsights,
    formatMatchInsight
};

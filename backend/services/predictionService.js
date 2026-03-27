const { getPlayers, findTeam, calculateTeamRatings } = require('./dataService');

function classifyRisk(prob) {
    if (prob >= 0.71) return { level: 'BAIXO', emoji: '🟢', percentage: Math.round(prob * 100), riskLabel: 'Risco Baixo' };
    if (prob >= 0.41) return { level: 'MEDIO', emoji: '🟡', percentage: Math.round(prob * 100), riskLabel: 'Risco Médio' };
    return { level: 'ALTO', emoji: '🔴', percentage: Math.round(prob * 100), riskLabel: 'Risco Alto' };
}

function analyzeMatchFull(homeTeam, awayTeam) {
    const players = getPlayers();
    const homePlayers = findTeam(homeTeam, players);
    const awayPlayers = findTeam(awayTeam, players);
    
    if (homePlayers.length === 0 && awayPlayers.length === 0) {
        return { error: 'Times não encontrados no banco de dados' };
    }
    
    const getStat = (arr, field) => arr.reduce((s, p) => s + (parseFloat(p[field]) || 0), 0);
    const getAvg = (arr, field) => arr.length > 0 ? getStat(arr, field) / arr.length : 0;
    
    const homeGoals = getStat(homePlayers, 'Gls');
    const awayGoals = getStat(awayPlayers, 'Gls');
    const homeAssists = getStat(homePlayers, 'Ast');
    const awayAssists = getStat(awayPlayers, 'Ast');
    const homeShots = getStat(homePlayers, 'Sh');
    const awayShots = getStat(awayPlayers, 'Sh');
    const homeAge = getAvg(homePlayers, 'Age');
    const awayAge = getAvg(homePlayers, 'Age');
    const homeFouls = getStat(homePlayers, 'Fls');
    const awayFouls = getStat(awayPlayers, 'Fls');
    const homeCards = getStat(homePlayers, 'CrdY');
    const awayCards = getStat(awayPlayers, 'CrdY');
    const homeTackles = getStat(homePlayers, 'TklW');
    const awayTackles = getStat(awayPlayers, 'TklW');
    const homeInterceptions = getStat(homePlayers, 'Int');
    const awayInterceptions = getStat(awayPlayers, 'Int');
    const homePasses = getStat(homePlayers, 'Cmp');
    const awayPasses = getStat(awayPlayers, 'Cmp');
    const homeSaves = getStat(homePlayers, 'Save');
    const awaySaves = getStat(awayPlayers, 'Save');
    
    const homeXG = homeShots * 0.12;
    const awayXG = awayShots * 0.12;
    const homePerformanceScore = (homeGoals * 2) + (homeAssists * 1.5) + (homeTackles * 0.3) + (homePasses * 0.02);
    const awayPerformanceScore = (awayGoals * 2) + (awayAssists * 1.5) + (awayTackles * 0.3) + (awayPasses * 0.02);
    
    let homeProb = 0.33;
    let insights = [];
    let predictions = {
        corners: { home: Math.round(4 + (homeShots / 50)), away: Math.round(4 + (awayShots / 50)) },
        cards: { home: Math.round(1 + (homeFouls / 80)), away: Math.round(1 + (awayFouls / 80)) },
        fouls: { home: Math.round(12 + (homeFouls / 30)), away: Math.round(12 + (awayFouls / 30)) },
        goals: { home: Math.round(homeXG / 2), away: Math.round(awayXG / 2) }
    };
    
    if (homeGoals > awayGoals + 5) { homeProb += 0.15; insights.push(`Ataque superior (${homeGoals} vs ${awayGoals} gols)`); }
    else if (homeGoals > awayGoals + 2) { homeProb += 0.08; insights.push(`Melhor ataque (${homeGoals} gols)`); }
    
    if (homeShots > awayShots + 30) { homeProb += 0.08; insights.push(`Mais finalizações (${homeShots} vs ${awayShots})`); }
    if (homeAssists > awayAssists + 5) { homeProb += 0.05; insights.push(`Melhor criação de jogo`); }
    if (awayAge - homeAge > 1.5) { homeProb += 0.05; insights.push(`Elenco mais jovem (${homeAge.toFixed(1)} vs ${awayAge.toFixed(1)} anos)`); }
    
    if (homePerformanceScore > awayPerformanceScore * 1.2) {
        homeProb += 0.06;
        insights.push(`Performance superior (score: ${homePerformanceScore.toFixed(0)})`);
    }
    
    if (homeTackles + homeInterceptions > awayTackles + awayInterceptions + 30) {
        homeProb += 0.04;
        insights.push(`Melhor defesa (${homeTackles + homeInterceptions} desarmes)`);
    }
    
    if (homeCards < awayCards - 10) {
        homeProb += 0.03;
        insights.push(`Melhor disciplina`);
    }
    
    homeProb = Math.min(homeProb, 0.78);
    homeProb = Math.max(homeProb, 0.18);
    
    const awayProb = (1 - homeProb) * 0.78;
    const drawProb = 1 - homeProb - awayProb;
    
    const homeTop = homePlayers.sort((a, b) => (b.Gls || 0) - (a.Gls || 0)).slice(0, 5);
    const awayTop = awayPlayers.sort((a, b) => (b.Gls || 0) - (a.Gls || 0)).slice(0, 5);
    
    return {
        match: { home: homeTeam, away: awayTeam },
        probabilities: {
            home: homeProb.toFixed(2),
            draw: drawProb.toFixed(2),
            away: awayProb.toFixed(2)
        },
        risks: {
            home: classifyRisk(homeProb),
            draw: classifyRisk(drawProb),
            away: classifyRisk(awayProb)
        },
        teamStats: {
            home: {
                goals: homeGoals, assists: homeAssists, shots: homeShots,
                fouls: homeFouls, cards: homeCards, avgAge: homeAge.toFixed(1),
                tackles: homeTackles, interceptions: homeInterceptions, xg: homeXG.toFixed(1),
                performance: homePerformanceScore.toFixed(0)
            },
            away: {
                goals: awayGoals, assists: awayAssists, shots: awayShots,
                fouls: awayFouls, cards: awayCards, avgAge: awayAge.toFixed(1),
                tackles: awayTackles, interceptions: awayInterceptions, xg: awayXG.toFixed(1),
                performance: awayPerformanceScore.toFixed(0)
            }
        },
        lineup: {
            home: homeTop.map(p => ({ name: p.Player || p.Squad, position: p.Pos || '?', goals: p.Gls || 0, assists: p.Ast || 0 })),
            away: awayTop.map(p => ({ name: p.Player || p.Squad, position: p.Pos || '?', goals: p.Gls || 0, assists: p.Ast || 0 }))
        },
        predictions,
        insights,
        recommendations: [
            homeProb > 0.42 ? { type: `VITÓRIA ${homeTeam.toUpperCase()}`, odd: (1/homeProb).toFixed(2), risk: classifyRisk(homeProb) } : null,
            awayProb > 0.32 ? { type: `VITÓRIA ${awayTeam.toUpperCase()}`, odd: (1/awayProb).toFixed(2), risk: classifyRisk(awayProb) } : null,
            drawProb > 0.28 ? { type: 'EMPATE', odd: (1/drawProb).toFixed(2), risk: classifyRisk(drawProb) } : null
        ].filter(Boolean)
    };
}

const mockData = require('../data/mock');

function getMockMatches(count = 20) {
    return mockData.generateMockMatches(count);
}

module.exports = {
    classifyRisk,
    analyzeMatchFull,
    getMockMatches
};

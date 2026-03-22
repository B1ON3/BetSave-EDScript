const { mockData } = require('./mock_data');

function classifyRisk(probability) {
    if (probability >= 0.71) return { level: 'BAIXO', emoji: '🟢', percentage: Math.round(probability * 100) };
    if (probability >= 0.41) return { level: 'MEDIO', emoji: '🟡', percentage: Math.round(probability * 100) };
    return { level: 'ALTO', emoji: '🔴', percentage: Math.round(probability * 100) };
}

function analyzeMatch(match, players, h2h) {
    const homeTeam = match.home.name;
    const awayTeam = match.away.name;
    
    let homeAdvantage = 0.1;
    let formBonus = 0;
    let statsBonus = 0;
    let h2hBonus = 0;
    let reasons = [];
    
    if (match.stats) {
        if (match.stats.possession.home > match.stats.possession.away) {
            statsBonus += 0.05;
            reasons.push(`Posse de bola: ${match.stats.possession.home}% vs ${match.stats.possession.away}%`);
        }
        if (match.stats.shotsOnTarget.home > match.stats.shotsOnTarget.away) {
            statsBonus += 0.08;
            reasons.push(`Chutes no gol: ${match.stats.shotsOnTarget.home} vs ${match.stats.shotsOnTarget.away}`);
        }
        if (match.stats.corners.home > match.stats.corners.away) {
            statsBonus += 0.03;
            reasons.push(`Escanteios: ${match.stats.corners.home} vs ${match.stats.corners.away}`);
        }
    }
    
    const teamH2H = h2h.filter(m => 
        (m.home === homeTeam && m.away === awayTeam) ||
        (m.home === awayTeam && m.away === homeTeam)
    );
    
    if (teamH2H.length > 0) {
        const homeWins = teamH2H.filter(m => m.homeScore > m.awayScore).length;
        const awayWins = teamH2H.filter(m => m.homeScore < m.awayScore).length;
        const draws = teamH2H.filter(m => m.homeScore === m.awayScore).length;
        
        const homeWinRate = homeWins / teamH2H.length;
        if (homeWinRate > 0.5) {
            h2hBonus += 0.1;
            reasons.push(`Confronto direto: ${homeWins}V ${draws}E ${awayWins}D nos últimos jogos`);
        }
    }
    
    const homePlayers = players.filter(p => p.team === homeTeam);
    const awayPlayers = players.filter(p => p.team === awayTeam);
    const homeAvgOverall = homePlayers.reduce((sum, p) => sum + p.overall, 0) / (homePlayers.length || 1);
    const awayAvgOverall = awayPlayers.reduce((sum, p) => sum + p.overall, 0) / (awayPlayers.length || 1);
    
    if (homeAvgOverall > awayAvgOverall + 3) {
        formBonus += 0.08;
        reasons.push(`Elenco superior (${Math.round(homeAvgOverall)} vs ${Math.round(awayAvgOverall)})`);
    }
    
    let homeProbability = 0.33 + homeAdvantage + formBonus + statsBonus + h2hBonus;
    homeProbability = Math.min(homeProbability, 0.85);
    homeProbability = Math.max(homeProbability, 0.15);
    
    let awayProbability = 0.33 - formBonus - statsBonus - h2hBonus;
    awayProbability = Math.min(awayProbability, 0.65);
    awayProbability = Math.max(awayProbability, 0.15);
    
    const drawProbability = 1 - homeProbability - awayProbability;
    
    const homeRisk = classifyRisk(homeProbability);
    const awayRisk = classifyRisk(awayProbability);
    const drawRisk = classifyRisk(drawProbability);
    
    const recommendations = [];
    if (homeRisk.level === 'BAIXO') {
        recommendations.push({ type: 'VITÓRIA DO MANDANTE', odd: (1/homeProbability).toFixed(2), risk: homeRisk, reason: 'Alta probabilidade baseada em dados' });
    }
    if (awayRisk.level === 'BAIXO') {
        recommendations.push({ type: 'VITÓRIA DO VISITANTE', odd: (1/awayProbability).toFixed(2), risk: awayRisk, reason: 'Elenco e momento favoráveis' });
    }
    if (drawRisk.level !== 'ALTO' && drawProbability > 0.25) {
        recommendations.push({ type: 'EMPATE', odd: (1/drawProbability).toFixed(2), risk: drawRisk, reason: 'Equilíbrio no confronto' });
    }
    
    recommendations.sort((a, b) => b.risk.percentage - a.risk.percentage);
    
    return {
        match: {
            id: match.id,
            league: match.league.name,
            home: homeTeam,
            away: awayTeam,
            score: match.score.home + ' - ' + match.score.away,
            time: match.time.status === 'LIVE' ? `${match.time.minute}'` : match.time.time
        },
        probabilities: {
            home: { value: homeProbability.toFixed(2), risk: homeRisk },
            draw: { value: drawProbability.toFixed(2), risk: drawRisk },
            away: { value: awayProbability.toFixed(2), risk: awayRisk }
        },
        insights: reasons,
        recommendations: recommendations
    };
}

function getAnalysis(matchId) {
    const match = mockData.matches.find(m => m.id === matchId);
    if (!match) return null;
    
    return analyzeMatch(match, mockData.players, mockData.historicalHeadToHead);
}

function getAllMatches() {
    return mockData.matches.map(m => analyzeMatch(m, mockData.players, mockData.historicalHeadToHead));
}

function formatAnalysis(analysis) {
    if (!analysis) return 'Partida não encontrada';
    
    const { match, probabilities, insights, recommendations } = analysis;
    
    let output = `
═══════════════════════════════════════
⚽ ANÁLISE BETSAVE
═══════════════════════════════════════

📅 ${match.league}
${match.home} ${match.score} ${match.away}
⏱️ ${match.time}

───────────────────────────────────────
📊 PROBABILIDADES
───────────────────────────────────────
`;
    
    output += `${match.home}: ${probabilities.home.value} ${probabilities.home.risk.emoji} (${probabilities.home.risk.level})\n`;
    output += `Empate:  ${probabilities.draw.value} ${probabilities.draw.risk.emoji} (${probabilities.draw.risk.level})\n`;
    output += `${match.away}: ${probabilities.away.value} ${probabilities.away.risk.emoji} (${probabilities.away.risk.level})\n`;
    
    output += `
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
            output += `   Odds: ${rec.odd} | Risco: ${rec.risk.level} (${rec.risk.percentage}%)\n`;
            output += `   Motivo: ${rec.reason}\n\n`;
        });
    } else {
        output += '⚠️ Nenhuma aposta recomendada com baixo risco\n';
    }
    
    output += `═══════════════════════════════════════`;
    
    return output;
}

module.exports = { analyzeMatch, getAnalysis, getAllMatches, formatAnalysis };

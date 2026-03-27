function classifyRisk(prob) {
    if (prob >= 0.71) return { level: 'BAIXO', emoji: '🟢', percentage: Math.round(prob * 100), riskLabel: 'Risco Baixo' };
    if (prob >= 0.41) return { level: 'MEDIO', emoji: '🟡', percentage: Math.round(prob * 100), riskLabel: 'Risco Médio' };
    return { level: 'ALTO', emoji: '🔴', percentage: Math.round(prob * 100), riskLabel: 'Risco Alto' };
}

const realisticOdds = {
    favorite: { min: 1.30, max: 1.80 },
    draw: { min: 3.20, max: 4.00 },
    underdog: { min: 3.50, max: 12.00 },
    over25: { min: 1.50, max: 2.20 },
    btts_yes: { min: 1.60, max: 2.50 },
    btts_no: { min: 1.80, max: 2.80 }
};

function generateOdds(homeProb, drawProb, awayProb) {
    const homeOdds = (1 / homeProb).toFixed(2);
    const drawOdds = (1 / drawProb).toFixed(2);
    const awayOdds = (1 / awayProb).toFixed(2);
    
    return {
        home: parseFloat(homeOdds),
        draw: parseFloat(drawOdds),
        away: parseFloat(awayOdds)
    };
}

function generatePredictionForMatch(homeTeam, awayTeam, marketOdds = null) {
    const homeProb = 0.30 + Math.random() * 0.40;
    const drawProb = 0.20 + Math.random() * 0.15;
    const awayProb = 1 - homeProb - drawProb;
    
    const totalGoalsExpected = 2.0 + Math.random() * 2.5;
    const bttsProb = 0.40 + Math.random() * 0.35;
    
    const odds = marketOdds || generateOdds(homeProb, drawProb, awayProb);
    
    const insights = [];
    
    if (homeProb > 0.55) {
        insights.push(`${homeTeam} é favorito com base no desempenho recente`);
    } else if (awayProb > 0.45) {
        insights.push(`${awayTeam} pode surpreender jogando fora de casa`);
    }
    
    if (totalGoalsExpected > 3.0) {
        insights.push(`Expectativa de jogo aberto com muitas oportunidades`);
    } else if (totalGoalsExpected < 2.5) {
        insights.push(`Times devem adotar postura mais defensiva`);
    }
    
    if (bttsProb > 0.55) {
        insights.push(`Ambos times têm ataque consistente`);
    }
    
    const markets = [
        {
            type: `VITÓRIA ${homeTeam.toUpperCase()}`,
            probability: homeProb,
            risk: classifyRisk(homeProb),
            insight: homeProb > 0.5 ? `${homeTeam} com favoritismo` : 'Chance moderada',
            odds: odds.home
        },
        {
            type: 'EMPATE',
            probability: drawProb,
            risk: classifyRisk(drawProb),
            insight: 'Resultado possível mas imprevisível',
            odds: odds.draw
        },
        {
            type: `VITÓRIA ${awayTeam.toUpperCase()}`,
            probability: awayProb,
            risk: classifyRisk(awayProb),
            insight: awayProb > 0.35 ? `${awayTeam} com chances reais` : 'Zona de risco',
            odds: odds.away
        },
        {
            type: 'OVER 2.5 GOLS',
            probability: totalGoalsExpected / 4.5,
            risk: classifyRisk(totalGoalsExpected / 4.5),
            insight: totalGoalsExpected > 2.5 ? 'Mercado com boa вероятность' : 'Jogo pode ser truncado',
            odds: (1.70 + Math.random() * 0.50).toFixed(2)
        },
        {
            type: 'AMBOS MARCAM',
            probability: bttsProb,
            risk: classifyRisk(bttsProb),
            insight: bttsProb > 0.5 ? 'Ambos times devem marcar' : 'Um dos times pode ficar zerado',
            odds: (1.70 + Math.random() * 0.60).toFixed(2)
        }
    ];
    
    const over25Prob = totalGoalsExpected / 4.5;
    markets.push({
        type: 'UNDER 2.5 GOLS',
        probability: 1 - over25Prob,
        risk: classifyRisk(1 - over25Prob),
        insight: 'Aposta de baixo risco mas odd menor',
        odds: (1.50 + Math.random() * 0.40).toFixed(2)
    });
    
    const bttsYesProb = bttsProb;
    markets.push({
        type: 'SIM PARA AMBOS MARCAM',
        probability: bttsYesProb,
        risk: classifyRisk(bttsYesProb),
        insight: bttsYesProb > 0.5 ? 'Alta probabilidade de gol para ambos' : 'Risco elevado',
        odds: (1.60 + Math.random() * 0.50).toFixed(2)
    });
    
    const homeGoalsAvg = homeProb * totalGoalsExpected;
    const awayGoalsAvg = awayProb * totalGoalsExpected;
    
    const teamStats = {
        home: {
            name: homeTeam,
            avgGoals: parseFloat(homeGoalsAvg.toFixed(2)),
            attackStrength: parseFloat((homeProb * 5).toFixed(1)),
            defensiveStrength: parseFloat((25 + Math.random() * 25).toFixed(1)),
            aggression: parseFloat((10 + Math.random() * 20).toFixed(1)),
            avgShotsOnTarget: parseFloat((3 + Math.random() * 4).toFixed(1)),
            possession: parseFloat((45 + Math.random() * 20).toFixed(1)),
            recentForm: ['V', 'D', 'E', 'V', 'V'].map(r => {
                const rand = Math.random();
                return rand > 0.6 ? 'V' : rand > 0.35 ? 'E' : 'D';
            })
        },
        away: {
            name: awayTeam,
            avgGoals: parseFloat(awayGoalsAvg.toFixed(2)),
            attackStrength: parseFloat((awayProb * 5).toFixed(1)),
            defensiveStrength: parseFloat((25 + Math.random() * 25).toFixed(1)),
            aggression: parseFloat((10 + Math.random() * 20).toFixed(1)),
            avgShotsOnTarget: parseFloat((2 + Math.random() * 4).toFixed(1)),
            possession: parseFloat((35 + Math.random() * 20).toFixed(1)),
            recentForm: ['V', 'D', 'E', 'V', 'D'].map(r => {
                const rand = Math.random();
                return rand > 0.5 ? 'V' : rand > 0.25 ? 'E' : 'D';
            })
        }
    };
    
    const bestBet = markets.reduce((best, market) => {
        if (market.probability > 0.45 && market.probability < 0.70) {
            const value = market.probability * parseFloat(market.odds);
            if (value > best.value) {
                return {
                    type: market.type,
                    confidence: Math.round(market.probability * 100),
                    odds: parseFloat(market.odds),
                    reason: market.insight,
                    value: value
                };
            }
        }
        return best;
    }, { type: markets[0].type, confidence: 55, odds: 1.85, reason: 'Aposta principal', value: 1.0 });
    
    return {
        match: { home: homeTeam, away: awayTeam },
        summary: {
            tendency: `Análise para ${homeTeam} vs ${awayTeam}. ${insights[0] || 'Jogo equilibrado.'}`,
            confidence: parseFloat(((homeProb + (1 - drawProb) + awayProb) / 3 * 100).toFixed(1)),
            totalGoalsExpected: parseFloat(totalGoalsExpected.toFixed(1)),
            dataSource: 'estimated'
        },
        teams: teamStats,
        markets,
        best_bet: bestBet,
        insights,
        odds: {
            home: odds.home,
            draw: odds.draw,
            away: odds.away,
            over25: (1.50 + Math.random() * 0.70).toFixed(2),
            under25: (1.80 + Math.random() * 0.50).toFixed(2),
            btts_yes: (1.60 + Math.random() * 0.60).toFixed(2),
            btts_no: (1.90 + Math.random() * 0.40).toFixed(2)
        }
    };
}

function generateMatchStats(homeTeam, awayTeam) {
    const homePossession = 45 + Math.random() * 25;
    const awayPossession = 100 - homePossession;
    
    return {
        home: {
            possession: Math.round(homePossession),
            passes: Math.floor(300 + Math.random() * 200),
            passesAccuracy: Math.floor(75 + Math.random() * 15),
            shots: Math.floor(8 + Math.random() * 12),
            shotsOnTarget: Math.floor(3 + Math.random() * 6),
            corners: Math.floor(3 + Math.random() * 6),
            fouls: Math.floor(8 + Math.random() * 10),
            yellowCards: Math.floor(Math.random() * 3),
            redCards: Math.random() > 0.9 ? 1 : 0,
            offsides: Math.floor(Math.random() * 3),
            attacks: Math.floor(80 + Math.random() * 40),
            dangerousAttacks: Math.floor(30 + Math.random() * 30)
        },
        away: {
            possession: Math.round(awayPossession),
            passes: Math.floor(250 + Math.random() * 180),
            passesAccuracy: Math.floor(72 + Math.random() * 15),
            shots: Math.floor(6 + Math.random() * 10),
            shotsOnTarget: Math.floor(2 + Math.random() * 5),
            corners: Math.floor(2 + Math.random() * 5),
            fouls: Math.floor(10 + Math.random() * 12),
            yellowCards: Math.floor(1 + Math.random() * 3),
            redCards: Math.random() > 0.95 ? 1 : 0,
            offsides: Math.floor(Math.random() * 4),
            attacks: Math.floor(60 + Math.random() * 40),
            dangerousAttacks: Math.floor(25 + Math.random() * 25)
        }
    };
}

function generateMatchEvents(homeTeam, awayTeam) {
    const events = [];
    const homeScore = Math.floor(Math.random() * 4);
    const awayScore = Math.floor(Math.random() * 3);
    
    const minuteGoalHome = [12, 28, 45, 67, 78].slice(0, homeScore);
    const minuteGoalAway = [23, 55, 72, 89].slice(0, awayScore);
    
    minuteGoalHome.forEach(minute => {
        events.push({
            type: 'goal',
            player: `${homeTeam} striker`,
            time: `${minute}'`,
            team: 'home'
        });
    });
    
    minuteGoalAway.forEach(minute => {
        events.push({
            type: 'goal',
            player: `${awayTeam} forward`,
            time: `${minute}'`,
            team: 'away'
        });
    });
    
    const yellowCards = Math.floor(2 + Math.random() * 4);
    for (let i = 0; i < yellowCards; i++) {
        const minute = Math.floor(Math.random() * 90);
        const team = Math.random() > 0.5 ? 'home' : 'away';
        events.push({
            type: 'yellowcard',
            player: `${team === 'home' ? homeTeam : awayTeam} player`,
            time: `${minute}'`,
            team: team
        });
    }
    
    return events.sort((a, b) => parseInt(a.time) - parseInt(b.time));
}

module.exports = {
    classifyRisk,
    realisticOdds,
    generateOdds,
    generatePredictionForMatch,
    generateMatchStats,
    generateMatchEvents
};

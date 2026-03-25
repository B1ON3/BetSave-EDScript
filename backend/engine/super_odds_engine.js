/**
 * SUPER ODDS ANALYSIS ENGINE v3.0
 * Production-ready betting analysis with proper probability calculations
 * 
 * Formula specifications:
 * - attackStrength = avgGoals + (avgShotsOnTarget * 0.3)
 * - defenseStrength = tackles + interceptions
 * - aggression = fouls + yellowCards
 * 
 * Market formulas:
 * - Over 2.5: clamp(totalGoals / 3.2, 0, 1)
 * - BTTS: clamp(avgGoalsA * avgGoalsB / 2, 0, 1)
 * - Cards: clamp(totalAggression / 12, 0, 1)
 * - Shots on Target: clamp(totalShotsOnTarget / 10, 0, 1)
 * 
 * Final probability = modelProb * 0.6 + oddsProb * 0.4
 */

const { getTeamStats, getTopScorer, findHeadToHead, detectLeague } = require('../utils/data_loader');

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function classifyRisk(prob) {
    if (prob <= 0.4) return { level: 'ALTO', emoji: '🔴', label: 'Risco Alto' };
    if (prob <= 0.7) return { level: 'MEDIO', emoji: '🟡', label: 'Risco Médio' };
    return { level: 'BAIXO', emoji: '🟢', label: 'Risco Baixo' };
}

function calculateOdds(probability) {
    if (probability <= 0) return 0;
    return parseFloat((1 / probability).toFixed(2));
}

function combineProbability(modelProb, oddsProb) {
    if (oddsProb && oddsProb > 0 && oddsProb <= 1) {
        return (modelProb * 0.6) + (oddsProb * 0.4);
    }
    return modelProb;
}

function calculateMatchFeatures(teamA, teamB) {
    return {
        totalGoals: teamA.avgGoals + teamB.avgGoals,
        totalShotsOnTarget: teamA.avgShotsOnTarget + teamB.avgShotsOnTarget,
        totalAggression: teamA.aggression + teamB.aggression,
        goalDifference: teamA.avgGoals - teamB.avgGoals,
        defenseDifference: teamA.defensiveStrength - teamB.defensiveStrength,
        attackDifference: teamA.attackStrength - teamB.attackStrength
    };
}

function analyzeOver25Goals(features, teamA, teamB, marketOdds) {
    const modelProb = clamp(features.totalGoals / 3.2, 0, 1);
    const oddsProb = marketOdds?.over25 ? (1 / marketOdds.over25) : null;
    const finalProb = combineProbability(modelProb, oddsProb);
    
    let insight;
    if (finalProb >= 0.7) {
        insight = `Alta chance de +2.5 gols. Ataques produtivos: ${teamA.name} (${teamA.avgGoals.toFixed(2)}) e ${teamB.name} (${teamB.avgGoals.toFixed(2)})`;
    } else if (finalProb >= 0.5) {
        insight = `Probabilidade moderada para +2.5 gols. Média combinada de ${features.totalGoals.toFixed(2)} gols por jogo`;
    } else {
        insight = `Baixa probabilidade de +2.5 gols. Jogos com poucos tentos esperados`;
    }
    
    return {
        type: 'OVER 2.5 GOLS',
        probability: parseFloat(finalProb.toFixed(2)),
        odds: calculateOdds(finalProb),
        risk: classifyRisk(finalProb),
        insight
    };
}

function analyzeBTTS(features, teamA, teamB, marketOdds) {
    const modelProb = clamp((teamA.avgGoals * teamB.avgGoals) / 2, 0, 1);
    const oddsProb = marketOdds?.btts_yes ? (1 / marketOdds.btts_yes) : null;
    const finalProb = combineProbability(modelProb, oddsProb);
    
    let insight;
    if (teamA.avgGoals >= 1.0 && teamB.avgGoals >= 1.0) {
        insight = `Ambos times marcam. ${teamA.name}: ${teamA.avgGoals.toFixed(2)} | ${teamB.name}: ${teamB.avgGoals.toFixed(2)} gols/jogo`;
    } else if (teamA.avgGoals >= 1.0 || teamB.avgGoals >= 1.0) {
        insight = `Um dos times tem bom ataque. Outro pode ter dificuldades para marcar`;
    } else {
        insight = `Ambos ataques fracos. BTTS improvável`;
    }
    
    return {
        type: 'AMBOS MARCAM',
        probability: parseFloat(finalProb.toFixed(2)),
        odds: calculateOdds(finalProb),
        risk: classifyRisk(finalProb),
        insight
    };
}

function analyzeCards(features, teamA, teamB, marketOdds) {
    const modelProb = clamp(features.totalAggression / 12, 0, 1);
    const oddsProb = marketOdds?.cards ? (1 / marketOdds.cards) : null;
    const finalProb = combineProbability(modelProb, oddsProb);
    
    let insight;
    if (finalProb >= 0.65) {
        insight = `Jogo deve ser agressivo com muitos cartões. Times com alta físico: ${teamA.name} e ${teamB.name}`;
    } else if (finalProb >= 0.45) {
        insight = `Disputa moderada com cartões esperados`;
    } else {
        insight = `Jogo limpo previsto com poucos cartões`;
    }
    
    return {
        type: 'CARTÕES OVER 4.5',
        probability: parseFloat(finalProb.toFixed(2)),
        odds: calculateOdds(finalProb),
        risk: classifyRisk(finalProb),
        insight
    };
}

function analyzeShotsOnTarget(features, teamA, teamB, marketOdds) {
    const modelProb = clamp(features.totalShotsOnTarget / 10, 0, 1);
    const oddsProb = marketOdds?.shots ? (1 / marketOdds.shots) : null;
    const finalProb = combineProbability(modelProb, oddsProb);
    
    let insight;
    if (finalProb >= 0.7) {
        insight = `Muitas finalizações no alvo esperadas. ${features.totalShotsOnTarget.toFixed(1)} finalizações/jogo combinadas`;
    } else if (finalProb >= 0.5) {
        insight = `Número moderado de finalizações esperado`;
    } else {
        insight = `Poucas finalizações esperadas, defesas devem prevalecer`;
    }
    
    return {
        type: 'FINALIZAÇÕES OVER 10.5',
        probability: parseFloat(finalProb.toFixed(2)),
        odds: calculateOdds(finalProb),
        risk: classifyRisk(finalProb),
        insight
    };
}

function analyzeWinDrawWin(teamA, teamB, features, marketOdds) {
    const attackDiff = teamA.attackStrength - teamB.attackStrength;
    const defenseDiff = (teamA.defensiveStrength - teamB.defensiveStrength) / 100;
    const homeBonus = 0.08;
    
    let homeProb = 0.40 + (attackDiff * 0.15) + (defenseDiff * 0.1) + homeBonus;
    let awayProb = 0.35 - (attackDiff * 0.15) - (defenseDiff * 0.1);
    let drawProb = 0.25;
    
    homeProb = clamp(homeProb, 0.18, 0.65);
    awayProb = clamp(awayProb, 0.15, 0.60);
    drawProb = clamp(drawProb, 0.15, 0.35);
    
    const total = homeProb + awayProb + drawProb;
    homeProb /= total;
    awayProb /= total;
    drawProb /= total;
    
    const homeOddsProb = marketOdds?.home ? (1 / marketOdds.home) : null;
    const awayOddsProb = marketOdds?.away ? (1 / marketOdds.away) : null;
    const drawOddsProb = marketOdds?.draw ? (1 / marketOdds.draw) : null;
    
    const finalHome = combineProbability(homeProb, homeOddsProb);
    const finalAway = combineProbability(awayProb, awayOddsProb);
    const finalDraw = combineProbability(drawProb, drawOddsProb);
    
    const homeInsight = finalHome > 0.45 ? `${teamA.name} favorito para vencer` :
                        finalHome > 0.35 ? `${teamA.name} com leve vantagem em casa` :
                        `${teamA.name} não é favorito`;
    
    const awayInsight = finalAway > 0.35 ? `${teamB.name} pode surpreender fora de casa` :
                        `${teamB.name} em desvantagem`;
    
    const drawInsight = finalDraw > 0.28 ? `Empate é possibilidade real` :
                       `Empate improvável`;
    
    return [
        {
            type: `VITÓRIA ${teamA.name.toUpperCase()}`,
            probability: parseFloat(finalHome.toFixed(2)),
            odds: calculateOdds(finalHome),
            risk: classifyRisk(finalHome),
            insight: homeInsight
        },
        {
            type: 'EMPATE',
            probability: parseFloat(finalDraw.toFixed(2)),
            odds: calculateOdds(finalDraw),
            risk: classifyRisk(finalDraw),
            insight: drawInsight
        },
        {
            type: `VITÓRIA ${teamB.name.toUpperCase()}`,
            probability: parseFloat(finalAway.toFixed(2)),
            odds: calculateOdds(finalAway),
            risk: classifyRisk(finalAway),
            insight: awayInsight
        }
    ];
}

function analyzePlayerToScore(teamA, teamB, marketOdds) {
    const results = [];
    
    [teamA, teamB].forEach((team, idx) => {
        const top = team.topScorer || {
            name: `${team.name} Player`,
            goals: Math.round(team.avgGoals * 5),
            matches: team.matches
        };
        
        const playerChance = team.matches > 0 ? top.goals / team.matches : 0.15;
        const modelProb = clamp(0.08 + playerChance * 0.12, 0.05, 0.35);
        
        const oddsProb = marketOdds?.player_to_score ? (1 / marketOdds.player_to_score) : null;
        const finalProb = combineProbability(modelProb, oddsProb);
        
        results.push({
            type: `MARCA: ${top.name.toUpperCase()}`,
            probability: parseFloat(finalProb.toFixed(2)),
            odds: calculateOdds(finalProb),
            risk: classifyRisk(finalProb),
            insight: `${top.name} (${team.name}). ${top.goals} gols em ${team.matches} jogos. Média: ${playerChance.toFixed(2)}/jogo`
        });
    });
    
    return results;
}

function generateSummary(features, teamA, teamB) {
    let tendency;
    let confidence;
    
    if (features.totalGoals > 4) {
        tendency = 'Jogo aberto com alta probabilidade de muitos gols';
        confidence = 75;
    } else if (features.totalGoals > 3) {
        tendency = 'Jogo ativo com tendência de gol em ambas equipes';
        confidence = 65;
    } else if (features.totalGoals > 2.5) {
        tendency = 'Jogo equilibrado com chances moderadas de gol';
        confidence = 55;
    } else if (features.totalGoals > 1.5) {
        tendency = 'Jogo fechado com poucos gols esperados';
        confidence = 50;
    } else {
        tendency = 'Jogo muito defensivo, poucos ataques';
        confidence = 45;
    }
    
    if (Math.abs(features.attackDifference) > 0.5) {
        const fav = features.attackDifference > 0 ? teamA.name : teamB.name;
        tendency += `. ${fav} tem superioridade ofensiva`;
    }
    
    return { tendency, confidence };
}

function findBestBet(markets) {
    const validMarkets = markets.filter(m => 
        m.probability >= 0.5 && 
        m.probability <= 0.85 &&
        !m.type.includes('VITÓRIA') && 
        !m.type.includes('EMPATE')
    );
    
    if (validMarkets.length === 0) {
        const wdw = markets.filter(m => m.type.includes('VITÓRIA') || m.type.includes('EMPATE'));
        const best = wdw.sort((a, b) => b.probability - a.probability)[0];
        if (best && best.probability >= 0.4) {
            return {
                type: best.type,
                confidence: Math.round(best.probability * 100),
                odds: best.odds,
                reason: best.insight
            };
        }
        return markets[0] ? {
            type: markets[0].type,
            confidence: Math.round(markets[0].probability * 100),
            odds: markets[0].odds,
            reason: markets[0].insight
        } : null;
    }
    
    const best = validMarkets.sort((a, b) => b.probability - a.probability)[0];
    
    let reason;
    if (best.probability >= 0.65) {
        reason = `Alta confiança (${Math.round(best.probability * 100)}%). ${best.insight}`;
    } else if (best.probability >= 0.55) {
        reason = `Boa oportunidade (${Math.round(best.probability * 100)}%). ${best.insight}`;
    } else {
        reason = `Valor identificado (${Math.round(best.probability * 100)}%). ${best.insight}`;
    }
    
    return {
        type: best.type,
        confidence: Math.round(best.probability * 100),
        odds: best.odds,
        reason
    };
}

function analyzeMatch(teamA_name, teamB_name, marketOdds = null) {
    const teamA = getTeamStats(teamA_name);
    const teamB = getTeamStats(teamB_name);
    const features = calculateMatchFeatures(teamA, teamB);
    
    const markets = [];
    
    markets.push(analyzeOver25Goals(features, teamA, teamB, marketOdds));
    markets.push(analyzeBTTS(features, teamA, teamB, marketOdds));
    markets.push(analyzeCards(features, teamA, teamB, marketOdds));
    markets.push(analyzeShotsOnTarget(features, teamA, teamB, marketOdds));
    
    const wdw = analyzeWinDrawWin(teamA, teamB, features, marketOdds);
    markets.push(...wdw);
    
    const playerBets = analyzePlayerToScore(teamA, teamB, marketOdds);
    markets.push(...playerBets);
    
    const summary = generateSummary(features, teamA, teamB);
    const bestBet = findBestBet(markets);
    
    let h2hData = null;
    try {
        const h2h = findHeadToHead(teamA_name, teamB_name);
        if (h2h && h2h.length > 0) {
            const winsA = h2h.filter(m => 
                (m.winner === 'home' && m.home.toLowerCase().includes(teamA_name.toLowerCase())) ||
                (m.winner === 'away' && m.away.toLowerCase().includes(teamA_name.toLowerCase()))
            ).length;
            const winsB = h2h.filter(m => 
                (m.winner === 'home' && m.home.toLowerCase().includes(teamB_name.toLowerCase())) ||
                (m.winner === 'away' && m.away.toLowerCase().includes(teamB_name.toLowerCase()))
            ).length;
            const draws = h2h.length - winsA - winsB;
            
            h2hData = {
                totalMatches: h2h.length,
                summary: `${winsA}V ${draws}E ${winsB}V`,
                recentMatches: h2h.slice(0, 5).map(m => ({
                    date: m.date,
                    score: `${m.homeScore}-${m.awayScore}`,
                    teams: `${m.home} vs ${m.away}`,
                    league: m.league
                }))
            };
        }
    } catch (e) {
        console.log('H2H error:', e.message);
    }
    
    return {
        summary: {
            tendency: summary.tendency,
            confidence: summary.confidence,
            totalGoalsExpected: parseFloat(features.totalGoals.toFixed(2)),
            dataSource: teamA.isEstimated || teamB.isEstimated ? 'estimated' : 'real',
            h2h: h2hData
        },
        teams: {
            home: {
                name: teamA.name,
                league: teamA.league,
                avgGoals: parseFloat(teamA.avgGoals.toFixed(2)),
                avgShotsOnTarget: parseFloat(teamA.avgShotsOnTarget.toFixed(2)),
                attackStrength: parseFloat(teamA.attackStrength.toFixed(2)),
                defensiveStrength: teamA.defensiveStrength,
                aggression: teamA.aggression,
                topScorer: teamA.topScorer?.name || 'N/A',
                isEstimated: teamA.isEstimated || false
            },
            away: {
                name: teamB.name,
                league: teamB.league,
                avgGoals: parseFloat(teamB.avgGoals.toFixed(2)),
                avgShotsOnTarget: parseFloat(teamB.avgShotsOnTarget.toFixed(2)),
                attackStrength: parseFloat(teamB.attackStrength.toFixed(2)),
                defensiveStrength: teamB.defensiveStrength,
                aggression: teamB.aggression,
                topScorer: teamB.topScorer?.name || 'N/A',
                isEstimated: teamB.isEstimated || false
            }
        },
        markets: markets.map(m => ({
            type: m.type,
            probability: m.probability,
            odds: m.odds,
            risk: m.risk.level,
            riskLabel: m.risk.label,
            emoji: m.risk.emoji,
            insight: m.insight
        })),
        best_bet: bestBet ? {
            type: bestBet.type,
            confidence: bestBet.confidence,
            odds: bestBet.odds,
            reason: bestBet.reason
        } : null
    };
}

if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log('Uso: node super_odds_engine.js <Time A> <Time B>');
        console.log('Exemplo: node super_odds_engine.js Barcelona Real Madrid');
        process.exit(1);
    }
    
    const result = analyzeMatch(args[0], args[1]);
    console.log(JSON.stringify(result, null, 2));
}

module.exports = { analyzeMatch };

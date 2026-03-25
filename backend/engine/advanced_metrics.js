const { loadPlayersData, findTeam } = require('../utils/data_loader');

function classifyRisk(probability) {
    if (probability >= 0.71) return { level: 'BAIXO', emoji: '🟢', percentage: Math.round(probability * 100) };
    if (probability >= 0.41) return { level: 'MEDIO', emoji: '🟡', percentage: Math.round(probability * 100) };
    return { level: 'ALTO', emoji: '🔴', percentage: Math.round(probability * 100) };
}

function calculateXG(player, position) {
    if (position.includes('FW') || position.includes('GK')) return 0;
    
    const shots = parseInt(player.shots) || 0;
    const shotsOnTarget = parseInt(player.shotsOnTarget) || 0;
    const goals = parseInt(player.goals) || 0;
    const matches = parseInt(player.matches) || 1;
    
    const xgPerShot = 0.12;
    const xgPerShotOnTarget = 0.38;
    
    const estimatedXg = (shots * xgPerShot) + (shotsOnTarget * xgPerShotOnTarget);
    const conversionRate = goals / (shots || 1);
    
    return {
        estimated: estimatedXg.toFixed(1),
        actual: goals,
        difference: (goals - estimatedXg).toFixed(1),
        efficiency: conversionRate.toFixed(2),
        shots,
        shotsOnTarget,
        shotsPerMatch: (shots / matches).toFixed(1)
    };
}

function calculatePressureMetrics(player) {
    const tackles = parseInt(player.tackles) || 0;
    const interceptions = parseInt(player.interceptions) || 0;
    const fouls = parseInt(player.fouls) || 0;
    const offsides = parseInt(player.offsides) || 0;
    const crosses = parseInt(player.crosses) || 0;
    const yellowCards = parseInt(player.yellowCards) || 0;
    const redCards = parseInt(player.redCards) || 0;
    const matches = parseInt(player.matches) || 1;
    
    const pressureScore = (tackles * 0.3) + (interceptions * 0.4) + (fouls * -0.1) + (yellowCards * -0.2);
    
    return {
        tackles: tackles,
        tacklesPerMatch: (tackles / matches).toFixed(2),
        interceptions: interceptions,
        interceptionsPerMatch: (interceptions / matches).toFixed(2),
        fouls: fouls,
        foulsPerMatch: (fouls / matches).toFixed(2),
        offsides: offsides,
        crosses: crosses,
        yellowCards: yellowCards,
        redCards: redCards,
        pressureScore: Math.round(Math.max(0, pressureScore)),
        aggressionLevel: fouls > matches * 2 ? 'ALTA' : fouls > matches ? 'MÉDIA' : 'BAIXA',
        disciplineRating: redCards > 0 ? 'RUIM' : yellowCards > matches * 1.5 ? 'REGULAR' : 'BOM'
    };
}

function calculatePossessionMetrics(player) {
    const position = (player.position || player.Pos || '').toUpperCase();
    
    if (position.includes('GK')) {
        return {
            saves: parseInt(player.saves) || 0,
            goalsConceded: parseInt(player.goalsConceded) || 0,
            cleanSheets: parseInt(player.cleanSheets) || 0,
            savePercentage: 0,
            penaltiesSaved: 0,
            rating: 'Goleiro'
        };
    }
    
    const goals = parseInt(player.goals) || 0;
    const assists = parseInt(player.assists) || 0;
    const passes = parseInt(player.minutes) || 0;
    const shots = parseInt(player.shots) || 0;
    const tackles = parseInt(player.tackles) || 0;
    const interceptions = parseInt(player.interceptions) || 0;
    
    const positionType = position.includes('FW') ? 'ATACANTE' :
                         position.includes('MF') ? 'MEIA' :
                         position.includes('DF') ? 'ZAGUEIRO' : 'DESCONHECIDO';
    
    let possessionRating = 0;
    
    if (positionType === 'ATACANTE') {
        possessionRating = (goals * 3) + (assists * 2) + (shots * 0.5);
    } else if (positionType === 'MEIA') {
        possessionRating = (assists * 3) + (passes * 0.1) + (goals * 2);
    } else {
        possessionRating = (tackles * 2) + (interceptions * 2) + (goals * 1);
    }
    
    return {
        positionType,
        goals,
        assists,
        shots,
        tackles,
        interceptions,
        possessionRating: Math.round(possessRating),
        playStyle: possessionRating > 100 ? 'DOMINANTE' :
                   possessionRating > 50 ? 'EQUILIBRADO' : 'REATIVO'
    };
}

function analyzeTeamAdvanced(teamName) {
    const players = findTeam(teamName);
    
    if (players.length === 0) return { error: `Time não encontrado: ${teamName}` };
    
    const getStat = (arr, field) => arr.reduce((s, p) => s + (parseInt(p[field]) || 0), 0);
    
    const goals = getStat(players, 'goals');
    const assists = getStat(players, 'assists');
    const shots = getStat(players, 'shots');
    const shotsOnTarget = getStat(players, 'shotsOnTarget');
    const tackles = getStat(players, 'tackles');
    const interceptions = getStat(players, 'interceptions');
    const fouls = getStat(players, 'fouls');
    const yellowCards = getStat(players, 'yellowCards');
    const redCards = getStat(players, 'redCards');
    const matches = Math.max(...players.map(p => parseInt(p.matches) || 1));
    
    const xgEstimate = shots * 0.12 + shotsOnTarget * 0.38;
    
    const attackers = players.filter(p => (p.position || '').toUpperCase().includes('FW'));
    const midfielders = players.filter(p => (p.position || '').toUpperCase().includes('MF'));
    const defenders = players.filter(p => (p.position || '').toUpperCase().includes('DF'));
    const goalkeepers = players.filter(p => (p.position || '').toUpperCase().includes('GK'));
    
    const xgByPosition = {
        attackers: attackers.reduce((sum, p) => sum + parseFloat(calculateXG(p, 'FW').estimated), 0),
        midfielders: midfielders.reduce((sum, p) => sum + parseFloat(calculateXG(p, 'MF').estimated), 0)
    };
    
    const attackPower = (goals * 2) + (assists * 1.5) + (shots * 0.5);
    const defensePower = (tackles * 1.5) + (interceptions * 1) - (fouls * 0.2);
    const disciplineScore = 100 - (yellowCards * 2) - (redCards * 10);
    
    const possessionEstimate = attackPower / (attackPower + defensePower);
    const pressingIntensity = (tackles + interceptions) / matches;
    
    return {
        team: teamName,
        league: players[0]?.league || 'Desconhecida',
        composition: {
            attackers: attackers.length,
            midfielders: midfielders.length,
            defenders: defenders.length,
            goalkeepers: goalkeepers.length
        },
        attack: {
            goals,
            assists,
            shots,
            shotsOnTarget,
            xg: xgEstimate.toFixed(1),
            xgByPosition,
            conversionRate: ((goals / shots) * 100).toFixed(1) + '%',
            goalsPerMatch: (goals / matches).toFixed(2)
        },
        defense: {
            tackles,
            interceptions,
            tacklesPerMatch: (tackles / matches).toFixed(1),
            interceptionsPerMatch: (interceptions / matches).toFixed(1),
            defensiveActions: tackles + interceptions,
            defensePower: Math.round(defensePower)
        },
        discipline: {
            yellowCards,
            redCards,
            fouls,
            foulsPerMatch: (fouls / matches).toFixed(1),
            disciplineScore,
            rating: disciplineScore > 90 ? 'EXCELENTE' :
                    disciplineScore > 75 ? 'BOM' :
                    disciplineScore > 60 ? 'REGULAR' : 'RUIM'
        },
        advanced: {
            possessionEstimate: (possessionEstimate * 100).toFixed(0) + '%',
            pressingIntensity: pressingIntensity.toFixed(1),
            overallPower: Math.round(attackPower + defensePower),
            attackRating: attackPower > 200 ? 'ELITE' :
                          attackPower > 100 ? 'FORTE' :
                          attackPower > 50 ? 'MODERADO' : 'FRACO',
            defenseRating: defensePower > 150 ? 'ELITE' :
                           defensePower > 80 ? 'FORTE' :
                           defensePower > 40 ? 'MODERADO' : 'FRACO'
        }
    };
}

function compareTeamsAdvanced(team1Name, team2Name) {
    const team1 = analyzeTeamAdvanced(team1Name);
    const team2 = analyzeTeamAdvanced(team2Name);
    
    if (team1.error || team2.error) {
        return { error: 'Um ou ambos os times não foram encontrados' };
    }
    
    const comparison = {
        match: { team1: team1Name, team2: team2Name },
        xg: {
            team1: parseFloat(team1.attack.xg),
            team2: parseFloat(team2.attack.xg),
            favorite: team1.attack.xg > team2.attack.xg ? team1Name : team2Name,
            difference: Math.abs(parseFloat(team1.attack.xg) - parseFloat(team2.attack.xg)).toFixed(1)
        },
        attack: {
            team1Goals: team1.attack.goals,
            team2Goals: team2.attack.goals,
            team1Shots: team1.attack.shots,
            team2Shots: team2.attack.shots,
            advantage: team1.attack.goals > team2.attack.goals ? team1Name : team2Name
        },
        defense: {
            team1Tackles: team1.defense.tackles,
            team2Tackles: team2.defense.tackles,
            team1Interceptions: team1.defense.interceptions,
            team2Interceptions: team2.defense.interceptions,
            betterDefense: team1.defense.defensiveActions > team2.defense.defensiveActions ? team1Name : team2Name
        },
        discipline: {
            team1Score: team1.discipline.disciplineScore,
            team2Score: team2.discipline.disciplineScore,
            betterDiscipline: team1.discipline.disciplineScore > team2.discipline.disciplineScore ? team1Name : team2Name
        },
        overall: {
            team1Power: team1.advanced.overallPower,
            team2Power: team2.advanced.overallPower,
            favorite: team1.advanced.overallPower > team2.advanced.overallPower ? team1Name : team2Name
        }
    };
    
    let team1Prob = 0.5;
    const powerDiff = comparison.overall.team1Power - comparison.overall.team2Power;
    team1Prob += (powerDiff / (comparison.overall.team1Power + comparison.overall.team2Power)) * 0.3;
    
    team1Prob = Math.max(0.2, Math.min(0.8, team1Prob));
    const team2Prob = 1 - team1Prob;
    
    const team1Risk = classifyRisk(team1Prob);
    const team2Risk = classifyRisk(team2Prob);
    
    comparison.prediction = {
        team1Probability: (team1Prob * 100).toFixed(0) + '%',
        team2Probability: (team2Prob * 100).toFixed(0) + '%',
        team1Risk,
        team2Risk,
        recommended: team1Risk.level !== 'ALTO' ? team1Name : team2Risk.level !== 'ALTO' ? team2Name : 'NENHUM',
        recommendedOdds: team1Risk.level !== 'ALTO' ? (1 / team1Prob).toFixed(2) : (1 / team2Prob).toFixed(2)
    };
    
    return comparison;
}

function formatAdvancedAnalysis(analysis) {
    if (analysis.error) return `❌ ${analysis.error}`;
    
    const { team, composition, attack, defense, discipline, advanced } = analysis;
    
    let output = `
══════════════════════════════════════
📊 MÉTRICAS AVANÇADAS
══════════════════════════════════════

⚽ ${team} | ${team.league}

──────────────────────────────────────
👥 COMPOSIÇÃO
──────────────────────────────────────
Atacantes: ${composition.attackers}
Meias: ${composition.midfielders}
Zagueiros: ${composition.defenders}
Goleiros: ${composition.goalkeepers}

──────────────────────────────────────
⚔️ ATAQUE
──────────────────────────────────────
Gols: ${attack.goals}
Assistências: ${attack.assists}
Finalizações: ${attack.shots}
Finalizações no gol: ${attack.shotsOnTarget}
xG Estimado: ${attack.xg}
Conversão: ${attack.conversionRate}
Gols/Jogo: ${attack.goalsPerMatch}
Rating: ${advanced.attackRating}

──────────────────────────────────────
🛡️ DEFESA
──────────────────────────────────────
Desarmes: ${defense.tackles}
Interceptações: ${defense.interceptions}
Ações defensivas: ${defense.defensiveActions}
Desarmes/Jogo: ${defense.tacklesPerMatch}
Rating: ${advanced.defenseRating}

──────────────────────────────────────
📋 DISCIPLINA
──────────────────────────────────────
Cartões amarelos: ${discipline.yellowCards}
Cartões vermelhos: ${discipline.redCards}
Faltas: ${discipline.fouls}
Score: ${discipline.disciplineScore}
Avaliação: ${discipline.rating}

──────────────────────────────────────
📈 MÉTRICAS AVANÇADAS
──────────────────────────────────────
xG Estimado Total: ${attack.xg}
Posse Estimada: ${advanced.possessionEstimate}
Intensidade de Pressão: ${advanced.pressingIntensity}
Poder Total: ${advanced.overallPower}
`;
    
    output += `═══════════════════════════════════════`;
    
    return output;
}

function formatComparison(comparison) {
    if (comparison.error) return `❌ ${comparison.error}`;
    
    let output = `
══════════════════════════════════════
📊 COMPARAÇÃO AVANÇADA
══════════════════════════════════════

⚽ ${comparison.match.team1} vs ${comparison.match.team2}

──────────────────────────────────────
🎯 xG (Gols Esperados)
──────────────────────────────────────
${comparison.match.team1}: ${comparison.xg.team1}
${comparison.match.team2}: ${comparison.xg.team2}
Diferença: ${comparison.xg.difference}
Favorito: ${comparison.xg.favorite}

──────────────────────────────────────
⚔️ ATAQUE
──────────────────────────────────────
Gols: ${comparison.attack.team1Goals} vs ${comparison.attack.team2Goals}
Finalizações: ${comparison.attack.team1Shots} vs ${comparison.attack.team2Shots}
Melhor ataque: ${comparison.attack.advantage}

──────────────────────────────────────
🛡️ DEFESA
──────────────────────────────────────
Desarmes: ${comparison.defense.team1Tackles} vs ${comparison.defense.team2Tackles}
Interceptações: ${comparison.defense.team1Interceptions} vs ${comparison.defense.team2Interceptions}
Melhor defesa: ${comparison.defense.betterDefense}

──────────────────────────────────────
📋 DISCIPLINA
──────────────────────────────────────
Score: ${comparison.discipline.team1Score} vs ${comparison.discipline.team2Score}
Melhor disciplina: ${comparison.discipline.betterDiscipline}

──────────────────────────────────────
🏆 PREVISÃO
──────────────────────────────────────
${comparison.match.team1}: ${comparison.prediction.team1Probability} ${comparison.prediction.team1Risk.emoji}
${comparison.match.team2}: ${comparison.prediction.team2Probability} ${comparison.prediction.team2Risk.emoji}
Recomendado: ${comparison.prediction.recommended}
Odds: ${comparison.prediction.recommendedOdds}
`;
    
    output += `═══════════════════════════════════════`;
    
    return output;
}

if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Uso: node advanced_metrics.js <comando> [args]');
        console.log('Comandos:');
        console.log('  team <nome_time>       - Análise avançada do time');
        console.log('  compare <time1> <time2> - Comparar dois times');
        return;
        return;
    }
    
    const cmd = args[0];
    
    if (cmd === 'team' && args.length > 1) {
        const teamName = args.slice(1).join(' ');
        const analysis = analyzeTeamAdvanced(teamName);
        console.log(formatAdvancedAnalysis(analysis));
    } else if (cmd === 'compare' && args.length > 2) {
        const team1 = args[1];
        const team2 = args.slice(2).join(' ');
        const comparison = compareTeamsAdvanced(team1, team2);
        console.log(formatComparison(comparison));
    } else {
        console.log('Comando inválido ou argumentos insuficientes');
    }
}

module.exports = {
    calculateXG,
    calculatePressureMetrics,
    calculatePossessionMetrics,
    analyzeTeamAdvanced,
    compareTeamsAdvanced,
    formatAdvancedAnalysis,
    formatComparison
};

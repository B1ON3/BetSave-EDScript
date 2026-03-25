const { loadPlayersData, findTeam, findPlayer } = require('../utils/data_loader');

function classifyRisk(probability) {
    if (probability >= 0.71) return { level: 'BAIXO', emoji: '🟢', percentage: Math.round(probability * 100) };
    if (probability >= 0.41) return { level: 'MEDIO', emoji: '🟡', percentage: Math.round(probability * 100) };
    return { level: 'ALTO', emoji: '🔴', percentage: Math.round(probability * 100) };
}

function calculatePerformanceScore(player) {
    const goalWeight = 3;
    const assistWeight = 2;
    const matchWeight = 0.5;
    
    const goalsPer90 = player.matches > 0 ? (player.goals / player.matches) : 0;
    const assistsPer90 = player.matches > 0 ? (player.assists / player.matches) : 0;
    const minutesPerMatch = player.matches > 0 ? (player.minutes / player.matches) : 0;
    
    const rawScore = (goalsPer90 * goalWeight) + (assistsPer90 * assistWeight) + (minutesPerMatch * matchWeight);
    
    const maxScore = (3 * goalWeight) + (2 * assistWeight) + (90 * matchWeight);
    
    return Math.min(Math.round((rawScore / maxScore) * 100), 100);
}

function analyzePlayer(playerName) {
    const players = loadPlayersData();
    if (!players) return { error: 'Erro ao carregar dados' };
    
    const player = findPlayer(playerName);
    if (!player) return { error: `Jogador não encontrado: ${playerName}` };
    
    const teamPlayers = findTeam(player.team);
    
    const performanceScore = calculatePerformanceScore(player);
    
    const position = player.position.toUpperCase();
    let roleBonus = 0;
    let roleInsight = '';
    
    if (position.includes('FW') || position.includes('ATTACK')) {
        roleBonus = 0.1;
        roleInsight = 'Atacante - métricas de finalização são prioridade';
    } else if (position.includes('MF')) {
        roleBonus = 0.05;
        roleInsight = 'Meia - métricas de criação e passes são prioridade';
    } else if (position.includes('DF')) {
        roleBonus = -0.05;
        roleInsight = 'Zagueiro - métricas defensivas são prioridade';
    } else if (position.includes('GK')) {
        roleBonus = -0.1;
        roleInsight = 'Goleiro - métricas de defesa são prioridade';
    }
    
    const teammatesByGoals = [...teamPlayers].sort((a, b) => b.goals - a.goals);
    const rankInTeam = teammatesByGoals.findIndex(p => p.name === player.name) + 1;
    
    const leaguePlayers = players.filter(p => p.league === player.league);
    const leagueByGoals = [...leaguePlayers].sort((a, b) => b.goals - a.goals);
    const rankInLeague = leagueByGoals.findIndex(p => p.name === player.name) + 1;
    
    const riskScore = performanceScore / 100;
    const adjustedRisk = Math.max(0.15, Math.min(0.85, 0.5 + roleBonus + (riskScore - 0.5) * 0.3));
    
    const risk = classifyRisk(adjustedRisk);
    const estimatedOdds = (1 / adjustedRisk).toFixed(2);
    
    return {
        player: {
            name: player.name,
            team: player.team,
            league: player.league,
            position: player.position,
            age: player.age,
            nationality: player.nation
        },
        performance: {
            score: performanceScore,
            goals: player.goals,
            assists: player.assists,
            matches: player.matches,
            minutes: player.minutes,
            goalsPerMatch: player.matches > 0 ? (player.goals / player.matches).toFixed(2) : '0',
            assistsPerMatch: player.matches > 0 ? (player.assists / player.matches).toFixed(2) : '0',
            minutesPerMatch: player.matches > 0 ? Math.round(player.minutes / player.matches) : 0
        },
        rankings: {
            inTeam: { position: rankInTeam, total: teamPlayers.length },
            inLeague: { position: rankInLeague, total: leaguePlayers.length }
        },
        disciplinary: {
            yellowCards: player.yellowCards,
            redCards: player.redCards,
            fouls: player.fouls
        },
        betting: {
            risk,
            estimatedOdds,
            recommendation: adjustedRisk >= 0.6 ? 'APOSTA SEGURA' : adjustedRisk >= 0.45 ? 'APOSTA MODERADA' : 'RISCO ALTO'
        },
        insights: [
            roleInsight,
            rankInTeam <= 3 ? `Top ${rankInTeam} artilheiro do time` : `Artilheiro ${rankInTeam}º do time`,
            rankInLeague <= 20 ? `Entre os top 20 da liga` : `${rankInLeague}º na liga`,
            player.age < 24 ? 'Jogador jovem em desenvolvimento' : player.age > 30 ? 'Jogador experiente' : 'Jogador no auge'
        ]
    };
}

function comparePlayers(player1Name, player2Name) {
    const p1Analysis = analyzePlayer(player1Name);
    const p2Analysis = analyzePlayer(player2Name);
    
    if (p1Analysis.error || p2Analysis.error) {
        return { error: 'Um ou ambos os jogadores não foram encontrados' };
    }
    
    const comparison = {
        player1: p1Analysis.player,
        player2: p2Analysis.player,
        stats: {
            goals: {
                p1: p1Analysis.performance.goals,
                p2: p2Analysis.performance.goals,
                winner: p1Analysis.performance.goals > p2Analysis.performance.goals ? 1 : 2
            },
            assists: {
                p1: p1Analysis.performance.assists,
                p2: p2Analysis.performance.assists,
                winner: p1Analysis.performance.assists > p2Analysis.performance.assists ? 1 : 2
            },
            performance: {
                p1: p1Analysis.performance.score,
                p2: p2Analysis.performance.score,
                winner: p1Analysis.performance.score > p2Analysis.performance.score ? 1 : 2
            },
            matches: {
                p1: p1Analysis.performance.matches,
                p2: p2Analysis.performance.matches
            },
            minutes: {
                p1: p1Analysis.performance.minutes,
                p2: p2Analysis.performance.minutes
            }
        },
        winner: {
            score: p1Analysis.performance.score > p2Analysis.performance.score ? player1Name : player2Name,
            goals: p1Analysis.performance.goals > p2Analysis.performance.goals ? player1Name : player2Name,
            assists: p1Analysis.performance.assists > p2Analysis.performance.assists ? player1Name : player2Name
        }
    };
    
    return comparison;
}

function getTeamTopPlayers(teamName, limit = 5) {
    const teamPlayers = findTeam(teamName);
    
    if (teamPlayers.length === 0) return { error: `Time não encontrado: ${teamName}` };
    
    const byGoals = [...teamPlayers].sort((a, b) => b.goals - a.goals);
    const byAssists = [...teamPlayers].sort((a, b) => b.assists - a.assists);
    const byPerformance = [...teamPlayers].sort((a, b) => calculatePerformanceScore(b) - calculatePerformanceScore(a));
    
    return {
        team: teamName,
        league: teamPlayers[0]?.league || 'Desconhecida',
        topScorers: byGoals.slice(0, limit).map((p, i) => ({
            rank: i + 1,
            name: p.name,
            position: p.position,
            goals: p.goals,
            assists: p.assists,
            matches: p.matches
        })),
        topAssists: byAssists.slice(0, limit).map((p, i) => ({
            rank: i + 1,
            name: p.name,
            position: p.position,
            assists: p.assists,
            goals: p.goals,
            matches: p.matches
        })),
        bestPerformance: byPerformance.slice(0, limit).map((p, i) => ({
            rank: i + 1,
            name: p.name,
            position: p.position,
            score: calculatePerformanceScore(p),
            goals: p.goals,
            assists: p.assists
        }))
    };
}

function getPlayersByPosition(position, league = null, limit = 20) {
    const players = loadPlayersData();
    if (!players) return [];
    
    let filtered = players.filter(p => 
        p.position.toUpperCase().includes(position.toUpperCase())
    );
    
    if (league) {
        filtered = filtered.filter(p => 
            p.league.toLowerCase().includes(league.toLowerCase())
        );
    }
    
    return filtered
        .sort((a, b) => b.goals - a.goals)
        .slice(0, limit)
        .map((p, i) => ({
            rank: i + 1,
            name: p.name,
            team: p.team,
            league: p.league,
            position: p.position,
            goals: p.goals,
            assists: p.assists,
            matches: p.matches,
            score: calculatePerformanceScore(p)
        }));
}

function formatPlayerAnalysis(analysis) {
    if (analysis.error) return `❌ ${analysis.error}`;
    
    const { player, performance, rankings, betting, insights } = analysis;
    
    let output = `
══════════════════════════════════════
⚽ ANÁLISE DE JOGADOR
══════════════════════════════════════

👤 ${player.name}
🏠 ${player.team} | ${player.league}
📍 ${player.position} | ${player.age} anos

──────────────────────────────────────
📊 DESEMPENHO
──────────────────────────────────────
Gols: ${performance.goals} | Assistências: ${performance.assists}
Partidas: ${performance.matches} | Minutos: ${performance.minutes}
Gols/Jogo: ${performance.goalsPerMatch} | Assists/Jogo: ${performance.assistsPerMatch}

──────────────────────────────────────
🏆 RANKINGS
──────────────────────────────────────
No time: ${rankings.inTeam.position}º de ${rankings.inTeam.total}
Na liga: ${rankings.inLeague.position}º de ${rankings.inLeague.total}
Score: ${performance.score}/100

──────────────────────────────────────
🎯 APOSTA
──────────────────────────────────────
${betting.risk.emoji} Risco: ${betting.risk.level} (${betting.risk.percentage}%)
📈 Odds estimada: ${betting.estimatedOdds}
💡 Recomendação: ${betting.recommendation}

──────────────────────────────────────
💡 INSIGHTS
──────────────────────────────────────
`;
    insights.forEach((insight, i) => {
        output += `${i + 1}. ${insight}\n`;
    });
    
    output += `═══════════════════════════════════════`;
    
    return output;
}

if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Uso: node player_analysis.js <nome_do_jogador>');
        console.log('Exemplo: node player_analysis.js Haaland');
        return;
    }
    
    const playerName = args.join(' ');
    const analysis = analyzePlayer(playerName);
    
    if (analysis.error) {
        console.log(`❌ ${analysis.error}`);
    } else {
        console.log(formatPlayerAnalysis(analysis));
    }
}

module.exports = {
    analyzePlayer,
    comparePlayers,
    getTeamTopPlayers,
    getPlayersByPosition,
    calculatePerformanceScore,
    formatPlayerAnalysis
};

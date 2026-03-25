const { loadAllMatches, loadMatchEvents, findTeam } = require('../utils/data_loader');

function classifyRisk(probability) {
    if (probability >= 0.71) return { level: 'BAIXO', emoji: '🟢', percentage: Math.round(probability * 100) };
    if (probability >= 0.41) return { level: 'MEDIO', emoji: '🟡', percentage: Math.round(probability * 100) };
    return { level: 'ALTO', emoji: '🔴', percentage: Math.round(probability * 100) };
}

function findMatchesBetweenTeams(team1Name, team2Name) {
    const allMatches = loadAllMatches();
    if (!allMatches || allMatches.length === 0) return [];
    
    const lower1 = team1Name.toLowerCase();
    const lower2 = team2Name.toLowerCase();
    
    return allMatches.filter(match => {
        const homeName = (match.home_team_name || '').toLowerCase();
        const awayName = (match.away_team_name || '').toLowerCase();
        
        const team1Home = homeName.includes(lower1) || lower1.includes(homeName);
        const team1Away = awayName.includes(lower1) || lower1.includes(awayName);
        const team2Home = homeName.includes(lower2) || lower2.includes(homeName);
        const team2Away = awayName.includes(lower2) || lower2.includes(awayName);
        
        return (team1Home && team2Away) || (team1Away && team2Home);
    });
}

function analyzeHeadToHead(team1Name, team2Name) {
    const matches = findMatchesBetweenTeams(team1Name, team2Name);
    
    if (matches.length === 0) {
        const team1Players = findTeam(team1Name);
        const team2Players = findTeam(team2Name);
        
        if (team1Players.length === 0 && team2Players.length === 0) {
            return { error: `Times não encontrados: ${team1Name}, ${team2Name}` };
        }
        
        return generatePredictionFromStats(team1Name, team2Name, team1Players, team2Players);
    }
    
    const sortedMatches = matches.sort((a, b) => {
        const dateA = new Date(a.match_date || a.datetime || 0);
        const dateB = new Date(b.match_date || b.datetime || 0);
        return dateB - dateA;
    });
    
    const recentMatches = sortedMatches.slice(0, 10);
    
    let team1Wins = 0;
    let team2Wins = 0;
    let draws = 0;
    let team1Goals = 0;
    let team2Goals = 0;
    let totalMatches = 0;
    
    const matchDetails = [];
    
    for (const match of recentMatches) {
        const homeName = (match.home_team_name || '').toLowerCase();
        const awayName = (match.away_team_name || '').toLowerCase();
        const lower1 = team1Name.toLowerCase();
        const lower2 = team2Name.toLowerCase();
        
        const isTeam1Home = homeName.includes(lower1) || lower1.includes(homeName);
        
        const homeScore = match.home_score ?? match.score?.home ?? 0;
        const awayScore = match.away_score ?? match.score?.away ?? 0;
        
        if (isTeam1Home) {
            team1Goals += homeScore;
            team2Goals += awayScore;
        } else {
            team1Goals += awayScore;
            team2Goals += homeScore;
        }
        
        if (homeScore > awayScore) {
            if (isTeam1Home) team1Wins++;
            else team2Wins++;
        } else if (awayScore > homeScore) {
            if (isTeam1Home) team2Wins++;
            else team1Wins++;
        } else {
            draws++;
        }
        
        totalMatches++;
        
        matchDetails.push({
            date: match.match_date || match.datetime || 'Desconhecida',
            competition: match.competition?.competition_name || match.competition_name || 'Desconhecida',
            home: match.home_team_name,
            away: match.away_team_name,
            score: `${homeScore} - ${awayScore}`,
            team1AtHome: isTeam1Home
        });
    }
    
    const team1WinRate = team1Wins / totalMatches;
    const team2WinRate = team2Wins / totalMatches;
    const drawRate = draws / totalMatches;
    
    const avgGoals = (team1Goals + team2Goals) / totalMatches;
    const team1HomeAdvantage = recentMatches.filter(m => m.home_team_name?.toLowerCase().includes(team1Name.toLowerCase())).length;
    const team2HomeAdvantage = recentMatches.filter(m => m.home_team_name?.toLowerCase().includes(team2Name.toLowerCase())).length;
    
    let team1Prob = team1WinRate + (drawRate * 0.3);
    let team2Prob = team2WinRate + (drawRate * 0.3);
    
    if (team1Goals > team2Goals + 5) team1Prob += 0.1;
    if (team2Goals > team1Goals + 5) team2Prob += 0.1;
    
    const normalize = team1Prob + team2Prob;
    if (normalize > 0) {
        team1Prob = team1Prob / (team1Prob + team2Prob) * 0.85;
        team2Prob = team2Prob / (team1Prob + team2Prob) * 0.85;
    }
    
    const drawProb = 1 - team1Prob - team2Prob;
    
    team1Prob = Math.max(0.15, Math.min(0.70, team1Prob));
    team2Prob = Math.max(0.15, Math.min(0.70, team2Prob));
    
    const team1Risk = classifyRisk(team1Prob);
    const team2Risk = classifyRisk(team2Prob);
    const drawRisk = classifyRisk(drawProb);
    
    const insights = [];
    insights.push(`${team1Name} venceu ${team1Wins} vezes`);
    insights.push(`${team2Name} venceu ${team2Wins} vezes`);
    insights.push(`${draws} empates em ${totalMatches} jogos`);
    insights.push(`Média de ${avgGoals.toFixed(1)} gols por jogo`);
    if (team1Goals > team2Goals) {
        insights.push(`${team1Name} marcou mais gols (${team1Goals} vs ${team2Goals})`);
    } else if (team2Goals > team1Goals) {
        insights.push(`${team2Name} marcou mais gols (${team2Goals} vs ${team1Goals})`);
    }
    
    const recommendations = [];
    if (team1Risk.level !== 'ALTO') {
        recommendations.push({
            type: `VITÓRIA ${team1Name.toUpperCase()}`,
            odd: (1 / team1Prob).toFixed(2),
            risk: team1Risk,
            probability: `${Math.round(team1Prob * 100)}%`
        });
    }
    if (team2Risk.level !== 'ALTO') {
        recommendations.push({
            type: `VITÓRIA ${team2Name.toUpperCase()}`,
            odd: (1 / team2Prob).toFixed(2),
            risk: team2Risk,
            probability: `${Math.round(team2Prob * 100)}%`
        });
    }
    if (drawRisk.level !== 'ALTO' && drawProb > 0.25) {
        recommendations.push({
            type: 'EMPATE',
            odd: (1 / drawProb).toFixed(2),
            risk: drawRisk,
            probability: `${Math.round(drawProb * 100)}%`
        });
    }
    
    return {
        match: { home: team1Name, away: team2Name },
        summary: {
            totalMatches,
            team1Wins,
            team2Wins,
            draws,
            goals: { team1: team1Goals, team2: team2Goals },
            avgGoalsPerMatch: avgGoals.toFixed(1)
        },
        probabilities: {
            team1: team1Prob.toFixed(2),
            draw: drawProb.toFixed(2),
            team2: team2Prob.toFixed(2)
        },
        risks: {
            team1: team1Risk,
            draw: drawRisk,
            team2: team2Risk
        },
        recentMatches: matchDetails,
        insights,
        recommendations: recommendations.sort((a, b) => b.risk.percentage - a.risk.percentage)
    };
}

function generatePredictionFromStats(team1Name, team2Name, team1Players, team2Players) {
    const getStat = (arr, field) => arr.reduce((s, p) => s + (parseInt(p[field]) || 0), 0);
    
    const t1Goals = getStat(team1Players, 'goals');
    const t2Goals = getStat(team2Players, 'goals');
    const t1Assists = getStat(team1Players, 'assists');
    const t2Assists = getStat(team2Players, 'assists');
    
    let t1Prob = 0.33;
    
    if (t1Goals > t2Goals + 10) t1Prob += 0.2;
    if (t1Assists > t2Assists + 5) t1Prob += 0.1;
    
    t1Prob = Math.max(0.2, Math.min(0.7, t1Prob));
    const t2Prob = (1 - t1Prob) * 0.7;
    const drawProb = 1 - t1Prob - t2Prob;
    
    return {
        match: { home: team1Name, away: team2Name },
        summary: {
            totalMatches: 'N/A (dados simulados)',
            team1Wins: 'N/A',
            team2Wins: 'N/A',
            draws: 'N/A',
            goals: { team1: t1Goals, team2: t2Goals },
            avgGoalsPerMatch: ((t1Goals + t2Goals) / Math.max(team1Players.length, 1)).toFixed(1)
        },
        probabilities: {
            team1: t1Prob.toFixed(2),
            draw: drawProb.toFixed(2),
            team2: t2Prob.toFixed(2)
        },
        risks: {
            team1: classifyRisk(t1Prob),
            draw: classifyRisk(drawProb),
            team2: classifyRisk(t2Prob)
        },
        recentMatches: [],
        insights: [
            `Baseado em estatísticas da temporada`,
            `${team1Name}: ${t1Goals} gols, ${t1Assists} assistências`,
            `${team2Name}: ${t2Goals} gols, ${t2Assists} assistências`
        ],
        recommendations: [],
        note: 'Dados simulados - sem histórico de confrontos disponível'
    };
}

function getTeamHistoryVs(teamName, opponentName, limit = 10) {
    const matches = findMatchesBetweenTeams(teamName, opponentName);
    
    if (matches.length === 0) return { error: 'Nenhum confronto encontrado' };
    
    const sorted = matches.sort((a, b) => {
        const dateA = new Date(a.match_date || a.datetime || 0);
        const dateB = new Date(b.match_date || b.datetime || 0);
        return dateB - dateA;
    });
    
    const recent = sorted.slice(0, limit);
    
    const wins = recent.filter(m => {
        const isHome = m.home_team_name?.toLowerCase().includes(teamName.toLowerCase());
        const score = m.home_score - m.away_score;
        return isHome ? score > 0 : score < 0;
    }).length;
    
    const losses = recent.filter(m => {
        const isHome = m.home_team_name?.toLowerCase().includes(teamName.toLowerCase());
        const score = m.home_score - m.away_score;
        return isHome ? score < 0 : score > 0;
    }).length;
    
    const draws = recent.length - wins - losses;
    
    return {
        team: teamName,
        opponent: opponentName,
        totalMatches: recent.length,
        record: { wins, draws, losses },
        recentMatches: recent.map(m => ({
            date: m.match_date || 'Desconhecida',
            competition: m.competition?.competition_name || 'Desconhecida',
            home: m.home_team_name,
            away: m.away_team_name,
            score: `${m.home_score} - ${m.away_score}`
        }))
    };
}

function formatHeadToHead(analysis) {
    if (analysis.error) return `❌ ${analysis.error}`;
    
    const { match, summary, probabilities, risks, insights, recommendations } = analysis;
    
    let output = `
══════════════════════════════════════
⚽ HEAD-TO-HEAD
══════════════════════════════════════

${match.home} vs ${match.away}

──────────────────────────────────────
📊 HISTÓRICO
──────────────────────────────────────
Total de jogos: ${summary.totalMatches}
${match.home}: ${summary.team1Wins} vitórias
${match.away}: ${summary.team2Wins} vitórias
Empates: ${summary.draws}
Gols: ${summary.goals.team1} - ${summary.goals.team2}
Média de gols: ${summary.avgGoalsPerMatch}/jogo

──────────────────────────────────────
📈 PROBABILIDADES
──────────────────────────────────────
${match.home}: ${probabilities.team1} ${risks.team1.emoji} (${risks.team1.level})
Empate:      ${probabilities.draw} ${risks.draw.emoji} (${risks.draw.level})
${match.away}: ${probabilities.team2} ${risks.team2.emoji} (${risks.team2.level})

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
            output += `   Odds: ${rec.odd} | Prob: ${rec.probability}\n\n`;
        });
    }
    
    if (analysis.note) {
        output += `\n⚠️ ${analysis.note}\n`;
    }
    
    if (analysis.recentMatches && analysis.recentMatches.length > 0) {
        output += `
──────────────────────────────────────
📅 ÚLTIMOS CONFRONTOS
──────────────────────────────────────
`;
        analysis.recentMatches.slice(0, 5).forEach(m => {
            output += `${m.date} | ${m.home} ${m.score} ${m.away}\n`;
        });
    }
    
    output += `═══════════════════════════════════════`;
    
    return output;
}

if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log('Uso: node head_to_head.js <time1> <time2>');
        console.log('Exemplo: node head_to_head.js "Manchester City" "Liverpool"');
        return;
    }
    
    const team1 = args[0];
    const team2 = args.slice(1).join(' ');
    const analysis = analyzeHeadToHead(team1, team2);
    
    console.log(formatHeadToHead(analysis));
}

module.exports = {
    analyzeHeadToHead,
    getTeamHistoryVs,
    findMatchesBetweenTeams,
    formatHeadToHead
};

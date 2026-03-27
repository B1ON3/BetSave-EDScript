const url = require('url');
const { 
    fetchUpcomingMatches, 
    fetchLiveMatches, 
    fetchMatchDetails, 
    fetchMatchOdds,
    searchMatch 
} = require('../services/betsApiService');
const { 
    getPlayers, 
    findTeam, 
    findMatchesForTeam, 
    findHeadToHead, 
    calculateTeamRatings,
    loadAllMatches 
} = require('../services/dataService');
const { 
    analyzeMatchFull, 
    getMockMatches,
    classifyRisk 
} = require('../services/predictionService');
const { analyzeMatch } = require('../engine/super_odds_engine');
const mockData = require('../data/mock');
const { 
    cleanTeamName, 
    cleanLeagueName, 
    normalizeMatch, 
    extractOdds, 
    convertToBrazilTime 
} = require('../utils/helpers');

function handleMatches(req, res) {
    const token = req.token;
    
    fetchUpcomingMatches(token).then(data => {
        const matches = (data?.results || []).map(m => normalizeMatch(m));
        
        res.end(JSON.stringify({
            matches,
            source: data?.results?.length > 0 ? 'api' : 'mock',
            total: matches.length,
            warning: data?.warning || null
        }));
    });
}

function handleLive(req, res) {
    const token = req.token;
    
    fetchLiveMatches(token).then(data => {
        if (data?.results && data.results.length > 0) {
            const matches = data.results.map(m => normalizeMatch(m));
            res.end(JSON.stringify({ 
                matches, 
                source: 'api', 
                total: matches.length 
            }));
        } else {
            const mockLive = mockData.generateMockMatches(5, true);
            res.end(JSON.stringify({ 
                matches: mockLive.map(m => normalizeMatch(m)), 
                source: 'mock', 
                total: mockLive.length,
                warning: 'Nenhum jogo ao vivo disponivel - usando dados simulados'
            }));
        }
    });
}

function handleMatchById(req, res, matchId) {
    const token = req.token;
    
    fetchMatchDetails(matchId, token).then(data => {
        if (data?.results) {
            const match = normalizeMatch(data.results);
            const events = data.results.incidents || [];
            
            const formattedEvents = events.map(e => ({
                type: e.type === 'goal' ? 'GOOL' : e.type === 'yellowcard' ? 'CARTÃO' : e.type === 'redcard' ? 'CARTÃO VERMELHO' : 'EVENTO',
                player: e.player || e.name,
                time: e.time,
                team: e.side === 'home' ? 'home' : 'away'
            }));
            
            res.end(JSON.stringify({
                success: true,
                match,
                events: formattedEvents,
                stats: data.results.stats || null,
                source: 'api'
            }));
        } else {
            const mockMatch = mockData.generateLiveMatch(parseInt(matchId) || 1234567);
            const mockStats = mockData.generateMatchStats(mockMatch.home.name, mockMatch.away.name);
            const mockEvents = mockData.generateMatchEvents(mockMatch.home.name, mockMatch.away.name);
            
            res.end(JSON.stringify({
                success: true,
                match: normalizeMatch(mockMatch),
                events: mockEvents,
                stats: mockStats,
                source: 'mock',
                warning: 'Dados simulados para demonstracao'
            }));
        }
    });
}

function handleOdds(req, res, matchId) {
    const token = req.token;
    
    fetchMatchOdds(matchId, token).then(data => {
        const odds = data?.results?.odds ? extractOdds(data.results.odds) : null;
        const bttsOdds = data?.results?.odds?.['17_1']?.[0] || {};
        
        console.log('📊 Odds debug:', { odds, hasData: odds?.home || odds?.draw || odds?.away });
        
        const hasValidOdds = odds && (odds.home !== null || odds.draw !== null || odds.away !== null);
        
        if (hasValidOdds) {
            res.end(JSON.stringify({
                success: true,
                odds,
                btts: { yes: bttsOdds.yes, no: bttsOdds.no },
                source: 'api'
            }));
        } else {
            const mockOdds = {
                home: (1.80 + Math.random() * 1.5).toFixed(2),
                draw: (3.00 + Math.random() * 1.0).toFixed(2),
                away: (2.50 + Math.random() * 3.0).toFixed(2),
                over25: (1.65 + Math.random() * 0.5).toFixed(2),
                under25: (2.00 + Math.random() * 0.5).toFixed(2)
            };
            
            res.end(JSON.stringify({
                success: true,
                odds: mockOdds,
                btts: {
                    yes: (1.70 + Math.random() * 0.5).toFixed(2),
                    no: (1.90 + Math.random() * 0.4).toFixed(2)
                },
                source: 'mock',
                warning: 'Odds simuladas'
            }));
        }
    });
}

async function handleAnalyze(req, res, home, away) {
    const token = req.token;
    
    if (!home || !away) {
        res.end(JSON.stringify({ error: 'Parâmetros necessários: home, away' }));
        return;
    }
    
    const homeDec = decodeURIComponent(home);
    const awayDec = decodeURIComponent(away);
    
    let marketOdds = null;
    let matchInfo = null;
    
    console.log('═'.repeat(50));
    console.log(`🔍 Analisando: ${homeDec} vs ${awayDec}`);
    
    try {
        matchInfo = await searchMatch(homeDec, awayDec, token);
        if (matchInfo) {
            console.log(`✅ Jogo encontrado: ${matchInfo.home?.name} vs ${matchInfo.away?.name}`);
            const oddsData = await fetchMatchOdds(matchInfo.id, token);
            if (oddsData?.results?.odds) {
                marketOdds = extractOdds(oddsData.results.odds);
                if (marketOdds) {
                    console.log(`✅ Odds: Casa ${marketOdds.home} | Empate ${marketOdds.draw} | Fora ${marketOdds.away}`);
                }
            }
        } else {
            console.log('⚠️ Jogo não encontrado na API');
        }
    } catch (e) {
        console.log(`⚠️ Erro ao buscar odds: ${e.message}`);
    }
    
    let analysis;
    
    if (matchInfo && marketOdds) {
        analysis = analyzeMatch(homeDec, awayDec, marketOdds);
        analysis.source = 'api';
    } else {
        console.log('📊 Usando dados mock realistas...');
        analysis = mockData.generatePredictionForMatch(homeDec, awayDec, marketOdds);
        analysis.source = 'mock';
    }
    
    if (matchInfo) {
        const time = convertToBrazilTime(matchInfo.time);
        analysis.match_info = {
            id: matchInfo.id,
            startTime: time?.iso,
            localTime: time?.local,
            time: time?.time,
            league: cleanLeagueName(matchInfo.league?.name || 'Unknown')
        };
    }
    
    console.log('═'.repeat(50));
    res.end(JSON.stringify(analysis));
}

function handleTeams(req, res) {
    const players = getPlayers();
    const teams = [...new Set(players.map(p => p.Squad).filter(Boolean))].sort();
    res.end(JSON.stringify({ teams }));
}

function handleHealth(req, res) {
    res.end(JSON.stringify({ status: 'ok', players: getPlayers().length }));
}

function handleTeamProfile(req, res, teamName) {
    if (!teamName) {
        res.end(JSON.stringify({ error: 'Nome do time necessário' }));
        return;
    }
    
    const players = getPlayers();
    const teamPlayers = players.filter(p => 
        (p.Squad || '').toLowerCase() === teamName.toLowerCase() ||
        (p.Squad || '').toLowerCase().includes(teamName.toLowerCase())
    );
    
    if (teamPlayers.length === 0) {
        res.end(JSON.stringify({ error: 'Time não encontrado' }));
        return;
    }
    
    const getStat = (arr, field) => arr.reduce((s, p) => s + (parseFloat(p[field]) || 0), 0);
    const goals = getStat(teamPlayers, 'Gls');
    const assists = getStat(teamPlayers, 'Ast');
    const shots = getStat(teamPlayers, 'Sh');
    const tackles = getStat(teamPlayers, 'TklW');
    const interceptions = getStat(teamPlayers, 'Int');
    const cleanSheets = getStat(teamPlayers, 'CS');
    const yellowCards = getStat(teamPlayers, 'CrdY');
    const redCards = getStat(teamPlayers, 'CrdR');
    const xg = (shots * 0.12).toFixed(1);
    const disciplineScore = Math.max(0, 100 - (yellowCards * 2) - (redCards * 10));
    
    const topPlayers = teamPlayers
        .sort((a, b) => (b.Gls || 0) - (a.Gls || 0))
        .slice(0, 5)
        .map(p => ({ name: p.Player || p.name || 'Jogador', goals: p.Gls || 0, assists: p.Ast || 0 }));
    
    const ratings = calculateTeamRatings(teamPlayers);
    
    res.end(JSON.stringify({
        name: teamPlayers[0]?.Squad || teamName,
        stats: { goals, assists, shots, tackles, interceptions, cleanSheets, xg, disciplineScore },
        ratings,
        topPlayers,
        rankings: { attack: '-', defense: '-' },
        league: teamPlayers[0]?.Comp || 'Desconhecida'
    }));
}

function handleTeamStats(req, res, teamName) {
    if (!teamName) {
        res.end(JSON.stringify({ error: 'Nome do time necessário' }));
        return;
    }
    
    const players = getPlayers();
    const teamPlayers = players.filter(p => 
        (p.Squad || '').toLowerCase() === teamName.toLowerCase() ||
        (p.Squad || '').toLowerCase().includes(teamName.toLowerCase())
    );
    
    if (teamPlayers.length === 0) {
        res.end(JSON.stringify({ error: 'Time não encontrado' }));
        return;
    }
    
    const ratings = calculateTeamRatings(teamPlayers);
    
    const allPlayers = teamPlayers
        .sort((a, b) => {
            const posOrder = { 'GK': 1, 'DF': 2, 'MF': 3, 'FW': 4 };
            const aPos = posOrder[a.Pos?.[0]] || 5;
            const bPos = posOrder[b.Pos?.[0]] || 5;
            if (aPos !== bPos) return aPos - bPos;
            return (b.Gls || 0) - (a.Gls || 0);
        })
        .map(p => ({
            id: p.Player || `player_${teamPlayers.indexOf(p)}`,
            name: p.Player || 'Jogador',
            position: p.Pos || '?',
            nationality: p.Nation || '',
            age: p.Age || 0,
            goals: p.Gls || 0,
            assists: p.Ast || 0,
            shots: p.Sh || 0,
            minutes: p.Min || 0,
            matches: p.MP || 0,
            yellowCards: p.CrdY || 0,
            redCards: p.CrdR || 0,
            tackles: p.TklW || 0,
            interceptions: p.Int || 0,
            fouls: p.Fls || 0
        }));
    
    res.end(JSON.stringify({
        name: teamPlayers[0]?.Squad || teamName,
        league: teamPlayers[0]?.Comp || 'Unknown',
        ratings,
        players: teamPlayers.length,
        squad: allPlayers,
        recentMatches: findMatchesForTeam(teamName, 10)
    }));
}

function handlePlayer(req, res, name, team) {
    const players = getPlayers();
    let player;
    
    if (name) {
        player = players.find(p => 
            (p.Player || '').toLowerCase() === name.toLowerCase() ||
            (p.Player || '').toLowerCase().includes(name.toLowerCase())
        );
    }
    
    if (!player && team) {
        const teamPlayers = players.filter(p => (p.Squad || '').toLowerCase() === team.toLowerCase());
        player = teamPlayers[0];
    }
    
    if (!player) {
        res.end(JSON.stringify({ error: 'Jogador não encontrado' }));
        return;
    }
    
    const goalsPerMatch = player.MP > 0 ? (player.Gls / player.MP).toFixed(2) : 0;
    const assistsPerMatch = player.MP > 0 ? (player.Ast / player.MP).toFixed(2) : 0;
    
    res.end(JSON.stringify({
        name: player.Player || 'Jogador',
        team: player.Squad || 'Desconhecido',
        league: player.Comp || 'Desconhecida',
        position: player.Pos || '?',
        nationality: player.Nation || '',
        age: player.Age || 0,
        stats: {
            matches: player.MP || 0,
            minutes: player.Min || 0,
            goals: player.Gls || 0,
            assists: player.Ast || 0,
            goalsPerMatch,
            assistsPerMatch,
            shots: player.Sh || 0,
            shotsOnTarget: player.SoT || 0,
            tackles: player.TklW || 0,
            interceptions: player.Int || 0,
            fouls: player.Fls || 0,
            yellowCards: player.CrdY || 0,
            redCards: player.CrdR || 0,
            saves: player.Saves || 0,
            cleanSheets: player.CS || 0
        }
    }));
}

function handleHeadToHead(req, res, team1, team2) {
    if (!team1 || !team2) {
        res.end(JSON.stringify({ error: 'Parâmetros necessários: team1, team2' }));
        return;
    }
    
    const h2h = findHeadToHead(decodeURIComponent(team1), decodeURIComponent(team2));
    
    if (h2h.length === 0) {
        res.end(JSON.stringify({ error: 'Nenhum confronto encontrado', team1, team2 }));
        return;
    }
    
    const wins1 = h2h.filter(m => m.winner === 'home' && m.home.toLowerCase().includes(team1.toLowerCase())).length +
                  h2h.filter(m => m.winner === 'away' && m.away.toLowerCase().includes(team1.toLowerCase())).length;
    const wins2 = h2h.filter(m => m.winner === 'home' && m.home.toLowerCase().includes(team2.toLowerCase())).length +
                  h2h.filter(m => m.winner === 'away' && m.away.toLowerCase().includes(team2.toLowerCase())).length;
    const draws = h2h.filter(m => m.winner === 'draw').length;
    
    const goals1 = h2h.reduce((sum, m) => {
        return sum + (m.home.toLowerCase().includes(team1.toLowerCase()) ? m.homeScore : m.awayScore);
    }, 0);
    const goals2 = h2h.reduce((sum, m) => {
        return sum + (m.home.toLowerCase().includes(team2.toLowerCase()) ? m.homeScore : m.awayScore);
    }, 0);
    
    res.end(JSON.stringify({
        team1,
        team2,
        totalMatches: h2h.length,
        wins: { [team1]: wins1, [team2]: wins2, draws },
        goals: { [team1]: goals1, [team2]: goals2 },
        matches: h2h,
        summary: `${wins1} Vitórias ${team1} | ${draws} Empates | ${wins2} Vitórias ${team2}`
    }));
}

function handleTeamMatches(req, res, teamName, limit) {
    if (!teamName) {
        res.end(JSON.stringify({ error: 'Nome do time necessário' }));
        return;
    }
    
    const matches = findMatchesForTeam(decodeURIComponent(teamName), parseInt(limit) || 15);
    res.end(JSON.stringify({ team: teamName, matches }));
}

function handleValidatePredictions(req, res) {
    console.log('═'.repeat(50));
    console.log('📊 Validando previsões...');
    
    const historicalMatches = loadAllMatches();
    
    if (historicalMatches.length === 0) {
        res.end(JSON.stringify({ error: 'Sem dados históricos disponíveis', totalMatches: 0 }));
        return;
    }
    
    const results = {
        totalAnalyzed: 0,
        correctResults: 0,
        correctWinners: 0,
        correctOver25: 0,
        correctBTTS: 0,
        marketAccuracy: {},
        matchDetails: [],
        summary: {}
    };
    
    const analyzedMatches = historicalMatches.slice(0, 50);
    
    for (const match of analyzedMatches) {
        const homeTeam = match.home_team?.home_team_name;
        const awayTeam = match.away_team?.away_team_name;
        const homeScore = match.home_score;
        const awayScore = match.away_score;
        
        if (!homeTeam || !awayTeam || homeScore === undefined || awayScore === undefined) {
            continue;
        }
        
        try {
            const analysis = analyzeMatch(homeTeam, awayTeam);
            
            if (!analysis || !analysis.markets) continue;
            
            results.totalAnalyzed++;
            
            const actualWinner = homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw';
            const totalGoals = homeScore + awayScore;
            const bothScored = homeScore > 0 && awayScore > 0;
            
            for (const market of analysis.markets) {
                if (!results.marketAccuracy[market.type]) {
                    results.marketAccuracy[market.type] = { correct: 0, total: 0 };
                }
                results.marketAccuracy[market.type].total++;
                
                let prediction = '';
                let actual = '';
                
                if (market.type.includes('VITÓRIA') && market.type.includes(homeTeam.toUpperCase())) {
                    prediction = 'home';
                } else if (market.type.includes('VITÓRIA') && market.type.includes(awayTeam.toUpperCase())) {
                    prediction = 'away';
                } else if (market.type === 'EMPATE') {
                    prediction = 'draw';
                } else if (market.type.includes('OVER 2.5') || market.type.includes('2.5')) {
                    prediction = totalGoals > 2.5 ? 'over' : 'under';
                    actual = totalGoals > 2.5 ? 'over' : 'under';
                } else if (market.type.includes('AMBOS') || market.type.includes('BTTS')) {
                    prediction = bothScored ? 'yes' : 'no';
                    actual = bothScored ? 'yes' : 'no';
                }
                
                if (prediction === actual) {
                    results.marketAccuracy[market.type].correct++;
                }
            }
            
            const homeWinMarket = analysis.markets.find(m => m.type.includes('VITÓRIA') && m.type.includes(homeTeam.toUpperCase()));
            const awayWinMarket = analysis.markets.find(m => m.type.includes('VITÓRIA') && m.type.includes(awayTeam.toUpperCase()));
            const drawMarket = analysis.markets.find(m => m.type === 'EMPATE');
            
            let predictedWinner = 'draw';
            if (homeWinMarket && homeWinMarket.probability > awayWinMarket?.probability && homeWinMarket.probability > (drawMarket?.probability || 0)) {
                predictedWinner = 'home';
            } else if (awayWinMarket && awayWinMarket.probability > (homeWinMarket?.probability || 0) && awayWinMarket.probability > (drawMarket?.probability || 0)) {
                predictedWinner = 'away';
            }
            
            if (predictedWinner === actualWinner) {
                results.correctWinners++;
            }
            
            const over25Market = analysis.markets.find(m => m.type.includes('OVER') && m.type.includes('2.5'));
            if (over25Market) {
                const predictedOver25 = over25Market.probability > 0.5;
                if (predictedOver25 === (totalGoals > 2.5)) {
                    results.correctOver25++;
                }
            }
            
            const bttsMarket = analysis.markets.find(m => m.type.includes('AMBOS') || m.type.includes('BTTS'));
            if (bttsMarket) {
                const predictedBTTS = bttsMarket.probability > 0.5;
                if (predictedBTTS === bothScored) {
                    results.correctBTTS++;
                }
            }
            
            if (results.matchDetails.length < 10) {
                results.matchDetails.push({
                    home: homeTeam,
                    away: awayTeam,
                    score: `${homeScore}-${awayScore}`,
                    predictedWinner,
                    actualWinner,
                    correct: predictedWinner === actualWinner
                });
            }
            
        } catch (e) {
            console.log(`Erro ao analisar ${homeTeam} vs ${awayTeam}: ${e.message}`);
        }
    }
    
    results.summary = {
        winnerAccuracy: results.totalAnalyzed > 0 ? ((results.correctWinners / results.totalAnalyzed) * 100).toFixed(1) : 0,
        over25Accuracy: results.correctOver25 > 0 ? ((results.correctOver25 / results.totalAnalyzed) * 100).toFixed(1) : 0,
        bttsAccuracy: results.correctBTTS > 0 ? ((results.correctBTTS / results.totalAnalyzed) * 100).toFixed(1) : 0,
        totalMatches: results.totalAnalyzed
    };
    
    console.log(`✅ Analisados ${results.totalAnalyzed} jogos`);
    console.log(`📊 Acerto de favoritos: ${results.summary.winnerAccuracy}%`);
    console.log(`📊 Acerto Over 2.5: ${results.summary.over25Accuracy}%`);
    console.log('═'.repeat(50));
    
    res.end(JSON.stringify(results));
}

function handleBrazil(req, res) {
    const token = req.token;
    
    fetchUpcomingMatches(token).then(data => {
        const brazil = (data?.results || []).filter(m => 
            m.league?.cc === 'br' || 
            (m.league?.name && m.league.name.toLowerCase().includes('brazil'))
        );
        
        const matches = brazil.map(m => normalizeMatch(m));
        
        res.end(JSON.stringify({ 
            matches, 
            source: data.source || 'api',
            total: matches.length,
            warning: data.warning || null
        }));
    });
}

function handleBrazilStandings(req, res) {
    const standings = {
        'Brasileirão A': [
            { pos: 1, name: 'Palmeiras', pts: 31, p: 18, w: 9, d: 4, l: 5, gp: 28, gc: 19, sg: 9 },
            { pos: 2, name: 'Flamengo', pts: 30, p: 18, w: 8, d: 6, l: 4, gp: 26, gc: 17, sg: 9 },
            { pos: 3, name: 'Corinthians', pts: 29, p: 18, w: 8, d: 5, l: 5, gp: 24, gc: 18, sg: 6 },
            { pos: 4, name: 'São Paulo', pts: 28, p: 18, w: 8, d: 4, l: 6, gp: 22, gc: 18, sg: 4 },
            { pos: 5, name: 'Botafogo', pts: 27, p: 18, w: 7, d: 6, l: 5, gp: 23, gc: 20, sg: 3 },
            { pos: 6, name: 'Grêmio', pts: 26, p: 18, w: 7, d: 5, l: 6, gp: 20, gc: 19, sg: 1 },
            { pos: 7, name: 'Atlético Mineiro', pts: 25, p: 18, w: 7, d: 4, l: 7, gp: 22, gc: 22, sg: 0 },
            { pos: 8, name: 'Internacional', pts: 24, p: 18, w: 6, d: 6, l: 6, gp: 18, gc: 19, sg: -1 },
            { pos: 9, name: 'Cruzeiro', pts: 23, p: 18, w: 6, d: 5, l: 7, gp: 17, gc: 20, sg: -3 },
            { pos: 10, name: 'Athletico Paranaense', pts: 22, p: 18, w: 6, d: 4, l: 8, gp: 18, gc: 22, sg: -4 }
        ]
    };
    
    res.end(JSON.stringify({ standings }));
}

module.exports = {
    handleMatches,
    handleLive,
    handleMatchById,
    handleOdds,
    handleAnalyze,
    handleTeams,
    handleHealth,
    handleTeamProfile,
    handleTeamStats,
    handlePlayer,
    handleHeadToHead,
    handleTeamMatches,
    handleValidatePredictions,
    handleBrazil,
    handleBrazilStandings
};

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
const { getTeamData, getMatchAnalysis } = require('../engine/aggregator');
const { 
    getMatchEvents, 
    getMatchStatistics, 
    searchFixtureByTeams, 
    getLiveFixtures, 
    getFixtureById,
    getMatchStatisticsById,
    getTeamFormById,
    getLeagueStandingsById,
    getH2H,
    searchTeam,
    clearCache
} = require('../clients/footballapi');
const { getLiveMatches, getRecentMatches, getLineupsViaCurl } = require('../services/liveMatchService');
const mockData = require('../data/mock');
const { 
    cleanTeamName, 
    cleanLeagueName, 
    normalizeMatch, 
    extractOdds, 
    convertToBrazilTime 
} = require('../utils/helpers');

async function handleLiveFootballAPI(req, res) {
    console.log(`📡 [API] Buscando jogos ao vivo da API-Football`);
    
    try {
        const liveFixtures = await getLiveFixtures();
        
        if (liveFixtures && liveFixtures.length > 0) {
            console.log(`✅ [API] ${liveFixtures.length} jogos ao vivo encontrados`);
            res.end(JSON.stringify({
                success: true,
                matches: liveFixtures,
                source: 'api-football',
                total: liveFixtures.length
            }));
        } else {
            res.end(JSON.stringify({
                success: false,
                matches: [],
                source: 'api-football',
                warning: 'Nenhum jogo ao vivo encontrado'
            }));
        }
    } catch (e) {
        console.log(`❌ [API] Erro: ${e.message}`);
        res.end(JSON.stringify({ error: e.message }));
    }
}

async function handleMatchEventsFootball(req, res, matchId) {
    console.log(`📡 [API] Buscando eventos para partida ${matchId}`);
    
    try {
        const events = await getMatchEvents(matchId);
        const fixture = await getFixtureById(matchId);
        
        if (fixture) {
            res.end(JSON.stringify({
                success: true,
                fixtureId: matchId,
                home: fixture.home,
                away: fixture.away,
                homeGoals: fixture.homeGoals,
                awayGoals: fixture.awayGoals,
                score: `${fixture.homeGoals || 0}-${fixture.awayGoals || 0}`,
                status: fixture.status,
                statusLong: fixture.statusLong,
                elapsed: fixture.elapsed,
                period: getMatchPeriod(fixture.status),
                events: events,
                source: 'api-football'
            }));
        } else {
            res.end(JSON.stringify({
                success: false,
                error: 'Partida não encontrada',
                source: 'api-football'
            }));
        }
    } catch (e) {
        console.log(`❌ [API] Erro: ${e.message}`);
        res.end(JSON.stringify({ error: e.message }));
    }
}

async function handleMatches(req, res) {
    console.log('═'.repeat(50));
    console.log('📡 [API] handleMatches() - Buscando partidas');
    
    try {
        const data = await getRecentMatches();
        
        console.log(`✅ [API] ${data.total} partidas encontradas`);
        console.log(`📊 Fonte: ${data.source}`);
        console.log('═'.repeat(50));
        
        res.end(JSON.stringify(data));
    } catch (e) {
        console.log(`❌ [API] Erro em handleMatches: ${e.message}`);
        res.end(JSON.stringify({ 
            error: e.message,
            matches: [],
            source: 'error',
            total: 0
        }));
    }
}

async function handleLive(req, res) {
    console.log('═'.repeat(50));
    console.log('📡 [API] handleLive() - Buscando partidas ao vivo');
    
    try {
        const data = await getLiveMatches();
        
        console.log(`✅ [API] ${data.total} partidas ao vivo`);
        console.log(`📊 Fonte: ${data.source}`);
        console.log('═'.repeat(50));
        
        res.end(JSON.stringify(data));
    } catch (e) {
        console.log(`❌ [API] Erro em handleLive: ${e.message}`);
        res.end(JSON.stringify({ 
            error: e.message,
            matches: [],
            source: 'error',
            total: 0
        }));
    }
}

function handleMatchById(req, res, matchId) {
    const token = req.token;
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
    const homeTeam = urlObj.searchParams.get('home');
    const awayTeam = urlObj.searchParams.get('away');
    
    console.log(`📌 handleMatchById: id=${matchId}, home=${homeTeam}, away=${awayTeam}`);
    
    fetchMatchDetails(matchId, token).then(data => {
        if (data?.results) {
            const matchData = data.results;
            let match = normalizeMatch(matchData);
            console.log(`📌 API returned: ${match.home} vs ${match.away}, score: ${match.score}`);
            
            if (homeTeam && awayTeam) {
                match.home = homeTeam;
                match.away = awayTeam;
            }
            
            let events = [];
            if (matchData.incidents && matchData.incidents.length > 0) {
                events = matchData.incidents.map(e => ({
                    type: e.type === 'goal' ? 'GOOL' : e.type === 'yellowcard' ? 'CARTÃO' : e.type === 'redcard' ? 'CARTÃO VERMELHO' : 'EVENTO',
                    player: e.player || e.name,
                    time: e.time,
                    team: e.side === 'home' ? 'home' : 'away'
                }));
            } else {
                events = mockData.generateMatchEvents(match.home, match.away, match.score);
            }
            
            const stats = matchData.stats || mockData.generateMatchStats(match.home, match.away);
            
            res.end(JSON.stringify({
                success: true,
                match,
                events,
                stats,
                source: 'api'
            }));
        } else {
            const actualHome = homeTeam || 'Time Casa';
            const actualAway = awayTeam || 'Time Fora';
            
            console.log(`📌 No API data, using mock for: ${actualHome} vs ${actualAway}`);
            
            const mockMatch = mockData.generateLiveMatch(parseInt(matchId) || 1234567, actualHome, actualAway);
            const mockStats = mockData.generateMatchStats(actualHome, actualAway);
            const mockEvents = mockData.generateMatchEvents(actualHome, actualAway, mockMatch.ss);
            
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
    
    console.log('═'.repeat(50));
    console.log(`🔍 Analisando: ${homeDec} vs ${awayDec}`);
    
    let marketOdds = null;
    let matchInfo = null;
    let aggregatorData = null;
    
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
    
    try {
        console.log(`📡 Buscando dados do Aggregator (API-Football)...`);
        aggregatorData = await getMatchAnalysis(homeDec, awayDec);
        console.log(`✅ Aggregator: ${aggregatorData.home?._sources?.stats || 'unknown source'}`);
    } catch (e) {
        console.log(`⚠️ Aggregator error: ${e.message}`);
    }
    
    let analysis;
    let dataSource = 'mock';
    
    if (aggregatorData?.home?.stats) {
        console.log(`📊 Usando dados do Aggregator (API-Football)...`);
        analysis = buildAnalysisFromAggregator(aggregatorData, marketOdds, matchInfo);
        dataSource = aggregatorData.home._sources.stats || 'api-football';
    } else if (matchInfo && marketOdds) {
        console.log(`📊 Usando dados da BetsAPI...`);
        analysis = analyzeMatch(homeDec, awayDec, marketOdds);
        dataSource = 'api';
    } else {
        console.log(`📊 Usando dados mock realistas...`);
        analysis = mockData.generatePredictionForMatch(homeDec, awayDec, marketOdds);
        dataSource = 'mock';
    }
    
    analysis.source = dataSource;
    
    if (aggregatorData?.home) {
        analysis.teams = {
            home: {
                name: homeDec,
                stats: aggregatorData.home.stats,
                recentForm: aggregatorData.home.recentForm,
                players: aggregatorData.home.players?.slice(0, 5) || [],
                source: aggregatorData.home._sources.stats || 'unknown'
            },
            away: {
                name: awayDec,
                stats: aggregatorData.away.stats,
                recentForm: aggregatorData.away.recentForm,
                players: aggregatorData.away.players?.slice(0, 5) || [],
                source: aggregatorData.away._sources.stats || 'unknown'
            }
        };
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
        
        try {
            const matchStats = await getMatchStatisticsById(matchInfo.id);
            if (matchStats) {
                analysis.match_statistics = matchStats;
            }
        } catch (e) {
            console.log(`⚠️ Erro ao buscar estatísticas da partida: ${e.message}`);
        }
    }
    
    try {
        const homeTeamData = await searchTeam(homeDec);
        const awayTeamData = await searchTeam(awayDec);
        
        if (homeTeamData?.id) {
            const homeForm = await getTeamFormById(homeTeamData.id);
            if (homeForm) {
                analysis.home_form = homeForm;
            }
        }
        
        if (awayTeamData?.id) {
            const awayForm = await getTeamFormById(awayTeamData.id);
            if (awayForm) {
                analysis.away_form = awayForm;
            }
        }
        
        if (homeTeamData?.id && awayTeamData?.id) {
            const h2h = await getH2H(homeDec, awayDec);
            if (h2h) {
                analysis.h2h = h2h;
            }
        }
    } catch (e) {
        console.log(`⚠️ Erro ao buscar dados adicionais: ${e.message}`);
    }
    
    console.log('═'.repeat(50));
    res.end(JSON.stringify(analysis));
}

function buildAnalysisFromAggregator(aggregatorData, marketOdds, matchInfo) {
    const home = aggregatorData.home;
    const away = aggregatorData.away;
    
    const homeGoals = home.stats.avgGoalsFor || 1.2;
    const awayGoals = away.stats.avgGoalsFor || 1.0;
    const homeDefense = home.stats.avgGoalsAgainst || 1.2;
    const awayDefense = away.stats.avgGoalsAgainst || 1.2;
    
    const totalExpectedGoals = homeGoals + awayGoals;
    const homeWinProb = (homeGoals / (homeGoals + awayGoals + 0.5)) * 0.6 + (home.stats.formScore || 0.5) * 0.4;
    const awayWinProb = (awayGoals / (homeGoals + awayGoals + 0.5)) * 0.6 + (away.stats.formScore || 0.5) * 0.4;
    const drawProb = 1 - homeWinProb - awayWinProb;
    
    const over25Prob = 1 - Math.pow(2.718, -0.5 * totalExpectedGoals);
    const bttsProb = (1 - Math.pow(2.718, -homeGoals * 0.8)) * (1 - Math.pow(2.718, -awayGoals * 0.8));
    
    const homeRisk = classifyRisk(homeWinProb);
    const drawRisk = classifyRisk(drawProb);
    const awayRisk = classifyRisk(awayWinProb);
    const over25Risk = classifyRisk(over25Prob);
    const bttsRisk = classifyRisk(bttsProb);
    
    const confidence = Math.round((home.stats.formScore + away.stats.formScore) * 50 + 30);
    
    return {
        summary: {
            tendency: `${home.name} mostrando ${home.stats.formScore > 0.5 ? 'boa' : 'regular'} forma`,
            confidence: Math.min(95, Math.max(55, confidence)),
            totalGoalsExpected: totalExpectedGoals.toFixed(1),
            dataSource: 'api-football'
        },
        teams: {
            home: {
                name: home.name,
                avgGoals: homeGoals.toFixed(1),
                attackStrength: (home.stats.attackStrength || 3).toFixed(1),
                defensiveStrength: (home.stats.defenseStrength || 25).toFixed(0),
                possession: Math.round(45 + home.stats.formScore * 10),
                recentForm: home.recentForm || ['E', 'D', 'V', 'E', 'D']
            },
            away: {
                name: away.name,
                avgGoals: awayGoals.toFixed(1),
                attackStrength: (away.stats.attackStrength || 2).toFixed(1),
                defensiveStrength: (away.stats.defenseStrength || 28).toFixed(0),
                possession: Math.round(55 - away.stats.formScore * 10),
                recentForm: away.recentForm || ['E', 'D', 'V', 'E', 'D']
            }
        },
        markets: [
            { type: `VITÓRIA ${home.name.toUpperCase()}`, probability: homeWinProb, risk: homeRisk, insight: `Forma: ${home.stats.formString || 'N/A'}` },
            { type: 'EMPATE', probability: drawProb, risk: drawRisk, insight: 'Equilíbrio entre os times' },
            { type: `VITÓRIA ${away.name.toUpperCase()}`, probability: awayWinProb, risk: awayRisk, insight: `Forma: ${away.stats.formString || 'N/A'}` },
            { type: 'OVER 2.5 GOLS', probability: over25Prob, risk: over25Risk, insight: `Média: ${totalExpectedGoals.toFixed(1)} gols esperados` },
            { type: 'AMBOS MARCAM', probability: bttsProb, risk: bttsRisk, insight: 'Ambos times com capacidade ofensiva' }
        ],
        best_bet: selectBestBetFromAggregator(home, away, homeWinProb, awayWinProb, over25Prob, bttsProb, marketOdds),
        insights: generateAggregatorInsights(home, away),
        odds: marketOdds || { home: (1 / homeWinProb).toFixed(2), draw: (1 / drawProb).toFixed(2), away: (1 / awayWinProb).toFixed(2) }
    };
}

function selectBestBetFromAggregator(home, away, homeProb, awayProb, over25Prob, bttsProb, marketOdds) {
    const bets = [
        { market: `VITÓRIA ${home.name}`, prob: homeProb, odds: marketOdds?.home || (1 / homeProb).toFixed(2) },
        { market: 'EMPATE', prob: Math.min(homeProb, awayProb), odds: marketOdds?.draw || '3.30' },
        { market: 'OVER 2.5 GOLS', prob: over25Prob, odds: marketOdds?.over25 || '1.85' },
        { market: 'AMBOS MARCAM', prob: bttsProb, odds: marketOdds?.btts_yes || '1.75' }
    ];
    
    const best = bets.sort((a, b) => (b.prob * parseFloat(b.odds)) - (a.prob * parseFloat(a.odds)))[0];
    
    return {
        type: best.market,
        confidence: Math.round(best.prob * 100),
        odds: best.odds,
        reason: `Valor: ${(best.prob * parseFloat(best.odds)).toFixed(2)}`,
        value: best.prob * parseFloat(best.odds) > 1.05
    };
}

function generateAggregatorInsights(home, away) {
    const insights = [];
    
    if (home.stats.formScore > 0.6) {
        insights.push({ type: 'positive', text: `${home.name} em boa fase` });
    }
    if (away.stats.formScore > 0.6) {
        insights.push({ type: 'positive', text: `${away.name} em boa fase` });
    }
    if (home.stats.avgGoalsFor > 1.5) {
        insights.push({ type: 'positive', text: `${home.name} marca em média ${home.stats.avgGoalsFor.toFixed(1)} gols` });
    }
    if (away.stats.avgGoalsAgainst > 1.5) {
        insights.push({ type: 'warning', text: `${away.name} sofre muitos gols fora (${away.stats.avgGoalsAgainst.toFixed(1)})` });
    }
    
    return insights;
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

async function handleTeamData(req, res, teamName) {
    if (!teamName) {
        res.end(JSON.stringify({ error: 'Nome do time necessário' }));
        return;
    }
    
    const teamDec = decodeURIComponent(teamName);
    console.log(`📡 Buscando dados para: ${teamDec}`);
    
    try {
        const teamData = await getTeamData(teamDec);
        
        res.end(JSON.stringify({
            success: true,
            team: teamDec,
            data: {
                stats: teamData.stats,
                recentForm: teamData.recentForm,
                players: teamData.players?.slice(0, 15) || [],
                source: teamData._sources.stats || 'unknown',
                warnings: teamData._warnings || []
            }
        }));
    } catch (e) {
        console.log(`❌ Erro ao buscar dados do time: ${e.message}`);
        res.end(JSON.stringify({ error: e.message }));
    }
}

async function handleMatchEvents(req, res, matchId) {
    console.log(`📡 [API] Buscando eventos para partida: ${matchId}`);
    
    try {
        const events = await getMatchEvents(matchId);
        
        if (events && events.length > 0) {
            console.log(`✅ [API] ${events.length} eventos encontrados via API-Football`);
            res.end(JSON.stringify({
                success: true,
                events,
                source: 'api-football',
                total: events.length
            }));
        } else {
            console.log(`⚠️ [API] Nenhum evento da API, usando mock`);
            const urlObj = new URL(req.url, `http://localhost:3000`);
            const home = urlObj.searchParams.get('home') || 'Time Casa';
            const away = urlObj.searchParams.get('away') || 'Time Fora';
            const score = urlObj.searchParams.get('score') || '0-0';
            
            const mockEvents = mockData.generateMatchEvents(home, away, score);
            res.end(JSON.stringify({
                success: true,
                events: mockEvents,
                source: 'mock',
                total: mockEvents.length,
                warning: 'Eventos simulados - dados reais não disponíveis'
            }));
        }
    } catch (e) {
        console.log(`❌ [API] Erro ao buscar eventos: ${e.message}`);
        res.end(JSON.stringify({ error: e.message }));
    }
}

async function handleMatchLiveEvents(req, res, home, away) {
    console.log(`📡 [API] Buscando eventos ao vivo: ${home} vs ${away}`);
    
    try {
        const fixture = await searchFixtureByTeams(home, away);
        
        if (fixture && fixture.id) {
            console.log(`✅ [API] Partida encontrada: ${fixture.id}`);
            
            const fullFixture = await getFixtureById(fixture.id);
            const events = await getMatchEvents(fixture.id);
            
            const period = getMatchPeriod(fixture.status);
            
            if (events && events.length > 0) {
                res.end(JSON.stringify({
                    success: true,
                    fixtureId: fixture.id,
                    home: fixture.home,
                    away: fixture.away,
                    homeId: fixture.homeId,
                    awayId: fixture.awayId,
                    homeGoals: fixture.homeGoals,
                    awayGoals: fixture.awayGoals,
                    events,
                    score: `${fixture.homeGoals || 0}-${fixture.awayGoals || 0}`,
                    status: fixture.status,
                    statusLong: fullFixture?.statusLong || period,
                    elapsed: fixture.elapsed || 0,
                    period: period,
                    venue: fullFixture?.venue,
                    referee: fullFixture?.referee,
                    source: 'api-football'
                }));
            } else {
                const mockEvents = mockData.generateMatchEvents(home, away, `${fixture.homeGoals || 0}-${fixture.awayGoals || 0}`);
                res.end(JSON.stringify({
                    success: true,
                    fixtureId: fixture.id,
                    home: fixture.home,
                    away: fixture.away,
                    homeId: fixture.homeId,
                    awayId: fixture.awayId,
                    homeGoals: fixture.homeGoals,
                    awayGoals: fixture.awayGoals,
                    events: mockEvents,
                    score: `${fixture.homeGoals || 0}-${fixture.awayGoals || 0}`,
                    status: fixture.status,
                    statusLong: fullFixture?.statusLong || period,
                    elapsed: fixture.elapsed || 0,
                    period: period,
                    venue: fullFixture?.venue,
                    referee: fullFixture?.referee,
                    source: 'api-football'
                }));
            }
        } else {
            console.log(`⚠️ [API] Partida não encontrada na API-Football`);
            const mockEvents = mockData.generateMatchEvents(home, away, '0-0');
            res.end(JSON.stringify({
                success: false,
                home: home,
                away: away,
                homeGoals: 0,
                awayGoals: 0,
                events: mockEvents,
                score: '0-0',
                status: 'NS',
                statusLong: 'AGENDADO',
                elapsed: 0,
                period: 'AGENDADO',
                source: 'mock',
                warning: 'Partida não encontrada na API'
            }));
        }
    } catch (e) {
        console.log(`❌ [API] Erro: ${e.message}`);
        res.end(JSON.stringify({ error: e.message }));
    }
}

function getMatchPeriod(status) {
    const statusMap = {
        '1H': '1º TEMPO',
        '2H': '2º TEMPO',
        'HT': 'INTERVALO',
        'ET': 'PRORROGAÇÃO',
        'P': 'PENALTIS',
        'FT': 'FINALIZADO',
        'LIVE': 'AO VIVO',
        'NS': 'AGENDADO',
        'POST': 'ENCERRADO',
        'SUS': 'SUSPENSO',
        'CANC': 'CANCELADO',
        'INT': 'INTERROMPIDO'
    };
    return statusMap[status] || 'AGENDADO';
}

async function handleLiveMatchData(req, res, matchId) {
    console.log(`📡 [API] Buscando dados ao vivo para partida: ${matchId}`);
    
    try {
        const fixture = await getFixtureById(matchId);
        
        if (fixture && fixture.id) {
            console.log(`✅ [API] Partida encontrada: ${fixture.id} - ${fixture.home} vs ${fixture.away}`);
            
            const events = await getMatchEvents(matchId);
            
            res.end(JSON.stringify({
                success: true,
                fixtureId: fixture.id,
                home: fixture.home,
                away: fixture.away,
                homeId: fixture.homeId,
                awayId: fixture.awayId,
                homeLogo: fixture.homeLogo,
                awayLogo: fixture.awayLogo,
                homeGoals: fixture.homeGoals,
                awayGoals: fixture.awayGoals,
                events: events,
                score: `${fixture.homeGoals || 0}-${fixture.awayGoals || 0}`,
                status: fixture.status,
                statusLong: fixture.statusLong || getMatchPeriod(fixture.status),
                elapsed: fixture.elapsed || 0,
                period: getMatchPeriod(fixture.status),
                league: fixture.league,
                venue: fixture.venue,
                referee: fixture.referee,
                date: fixture.date,
                source: 'api-football'
            }));
        } else {
            console.log(`⚠️ [API] Partida não encontrada na API-Football: ${matchId}`);
            res.end(JSON.stringify({
                success: false,
                error: 'Partida não encontrada',
                source: 'api-football'
            }));
        }
    } catch (e) {
        console.log(`❌ [API] Erro: ${e.message}`);
        res.end(JSON.stringify({ error: e.message }));
    }
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
    handleBrazilStandings,
    handleTeamData,
    handleMatchEvents,
    handleMatchLiveEvents,
    handleLiveMatchData,
    handleLiveFootballAPI,
    handleMatchEventsFootball,
    handleLineups,
    handleMatchStats,
    handleTeamForm,
    handleLeagueStandings,
    handleHeadToHeadAPI,
    handleClearCache
};

async function handleLineups(req, res, fixtureId) {
    console.log('═'.repeat(50));
    console.log(`📡 [API] Buscando escalação para partida: ${fixtureId}`);
    
    try {
        const lineups = await getLineupsViaCurl(fixtureId);
        
        if (lineups && lineups.length > 0) {
            console.log(`✅ [API] Escalação encontrada: ${lineups.length} times`);
            console.log(`📊 Times: ${lineups.map(l => l.team).join(' vs ')}`);
            console.log('═'.repeat(50));
            
            res.end(JSON.stringify({
                success: true,
                fixtureId: parseInt(fixtureId),
                lineups: lineups,
                home: lineups[0]?.team || 'Time Casa',
                away: lineups[1]?.team || 'Time Fora',
                homeFormation: lineups[0]?.formation || '4-4-2',
                awayFormation: lineups[1]?.formation || '4-4-2',
                homeCoach: lineups[0]?.coach || '',
                awayCoach: lineups[1]?.coach || '',
                source: 'api-football'
            }));
        } else {
            console.log(`⚠️ [API] Escalação não disponível para partida ${fixtureId}`);
            console.log('═'.repeat(50));
            res.end(JSON.stringify({
                success: false,
                fixtureId: parseInt(fixtureId),
                lineups: [],
                source: 'api-football',
                warning: 'Escalação não disponível para esta partida'
            }));
        }
    } catch (e) {
        console.log(`❌ [API] Erro ao buscar escalação: ${e.message}`);
        console.log('═'.repeat(50));
        res.end(JSON.stringify({ error: e.message }));
    }
}

async function handleMatchStats(req, res, fixtureId) {
    console.log('═'.repeat(50));
    console.log(`📡 [API] Buscando estatísticas para partida: ${fixtureId}`);
    
    try {
        const stats = await getMatchStatisticsById(fixtureId);
        
        if (stats && Object.keys(stats).length > 0) {
            console.log(`✅ [API] Estatísticas encontradas`);
            console.log('═'.repeat(50));
            
            res.end(JSON.stringify({
                success: true,
                fixtureId: parseInt(fixtureId),
                statistics: stats,
                source: 'api-football'
            }));
        } else {
            console.log(`⚠️ [API] Estatísticas não disponíveis para partida ${fixtureId}`);
            console.log('═'.repeat(50));
            res.end(JSON.stringify({
                success: false,
                fixtureId: parseInt(fixtureId),
                statistics: null,
                source: 'api-football',
                warning: 'Estatísticas não disponíveis para esta partida'
            }));
        }
    } catch (e) {
        console.log(`❌ [API] Erro ao buscar estatísticas: ${e.message}`);
        console.log('═'.repeat(50));
        res.end(JSON.stringify({ error: e.message }));
    }
}

async function handleTeamForm(req, res, teamId) {
    console.log('═'.repeat(50));
    console.log(`📡 [API] Buscando forma do time: ${teamId}`);
    
    try {
        const form = await getTeamFormById(teamId);
        
        if (form) {
            console.log(`✅ [API] Forma do time encontrada: ${form.formString}`);
            console.log('═'.repeat(50));
            
            res.end(JSON.stringify({
                success: true,
                teamId: parseInt(teamId),
                form: form.formString,
                results: form.results,
                summary: form.summary,
                goalsFor: form.totalGoalsFor,
                goalsAgainst: form.totalGoalsAgainst,
                avgGoals: (form.totalGoalsFor / form.results.length).toFixed(2),
                source: 'api-football'
            }));
        } else {
            console.log(`⚠️ [API] Forma do time não disponível: ${teamId}`);
            console.log('═'.repeat(50));
            res.end(JSON.stringify({
                success: false,
                teamId: parseInt(teamId),
                form: null,
                source: 'api-football',
                warning: 'Forma do time não disponível'
            }));
        }
    } catch (e) {
        console.log(`❌ [API] Erro ao buscar forma do time: ${e.message}`);
        console.log('═'.repeat(50));
        res.end(JSON.stringify({ error: e.message }));
    }
}

async function handleLeagueStandings(req, res, leagueId) {
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
    const season = urlObj.searchParams.get('season') || '2025';
    
    console.log('═'.repeat(50));
    console.log(`📡 [API] Buscando classificação: ${leagueId} (temporada ${season})`);
    
    try {
        const standings = await getLeagueStandingsById(leagueId, parseInt(season));
        
        if (standings && standings.standings.length > 0) {
            console.log(`✅ [API] Classificação encontrada: ${standings.standings.length} times`);
            console.log('═'.repeat(50));
            
            res.end(JSON.stringify({
                success: true,
                leagueId: parseInt(leagueId),
                league: standings.league,
                season: parseInt(season),
                standings: standings.standings,
                source: 'api-football'
            }));
        } else {
            console.log(`⚠️ [API] Classificação não disponível para ${leagueId}`);
            console.log('═'.repeat(50));
            res.end(JSON.stringify({
                success: false,
                leagueId: parseInt(leagueId),
                standings: [],
                source: 'api-football',
                warning: 'Classificação não disponível'
            }));
        }
    } catch (e) {
        console.log(`❌ [API] Erro ao buscar classificação: ${e.message}`);
        console.log('═'.repeat(50));
        res.end(JSON.stringify({ error: e.message }));
    }
}

async function handleHeadToHeadAPI(req, res) {
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
    const headTeam = urlObj.searchParams.get('head');
    const awayTeam = urlObj.searchParams.get('away');
    
    console.log('═'.repeat(50));
    console.log(`📡 [API] Buscando H2H: ${headTeam} vs ${awayTeam}`);
    
    try {
        const h2h = await getH2H(headTeam, awayTeam);
        
        if (h2h && h2h.matches.length > 0) {
            console.log(`✅ [API] H2H encontrado: ${h2h.matches.length} confrontos`);
            console.log('═'.repeat(50));
            
            res.end(JSON.stringify({
                success: true,
                headTeam: h2h.headTeam,
                awayTeam: h2h.awayTeam,
                matches: h2h.matches,
                summary: h2h.summary,
                avgGoals: h2h.avgGoals,
                source: 'api-football'
            }));
        } else {
            console.log(`⚠️ [API] H2H não disponível`);
            console.log('═'.repeat(50));
            res.end(JSON.stringify({
                success: false,
                headTeam,
                awayTeam,
                matches: [],
                source: 'api-football',
                warning: 'Histórico de confrontos não disponível'
            }));
        }
    } catch (e) {
        console.log(`❌ [API] Erro ao buscar H2H: ${e.message}`);
        console.log('═'.repeat(50));
        res.end(JSON.stringify({ error: e.message }));
    }
}

function handleClearCache(req, res) {
    clearCache();
    res.end(JSON.stringify({ 
        success: true, 
        message: 'Cache limpo com sucesso',
        timestamp: new Date().toISOString()
    }));
}

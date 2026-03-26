const footballApi = require('../clients/footballapi');
const dataLoader = require('../utils/data_loader');

const CACHE = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

function getCached(key) {
    const cached = CACHE.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`📦 [Aggregator] Cache hit: ${key}`);
        return cached.data;
    }
    return null;
}

function setCache(key, data) {
    CACHE.set(key, { data, timestamp: Date.now() });
}

const LEAGUE_AVERAGES = {
    'Brasileirão': { avgGoals: 1.2, avgAgainst: 1.2, avgShots: 4.5, avgCorners: 9.5, avgCards: 3.5 },
    'Serie A': { avgGoals: 1.2, avgAgainst: 1.2, avgShots: 4.5, avgCorners: 9.5, avgCards: 3.5 },
    'Premier League': { avgGoals: 1.5, avgAgainst: 1.4, avgShots: 5.5, avgCorners: 10.5, avgCards: 3.0 },
    'La Liga': { avgGoals: 1.4, avgAgainst: 1.3, avgShots: 5.0, avgCorners: 9.0, avgCards: 3.5 },
    'Bundesliga': { avgGoals: 1.6, avgAgainst: 1.5, avgShots: 5.8, avgCorners: 10.0, avgCards: 3.2 },
    'Serie A': { avgGoals: 1.4, avgAgainst: 1.3, avgShots: 5.0, avgCorners: 9.0, avgCards: 3.8 },
    'Ligue 1': { avgGoals: 1.3, avgAgainst: 1.3, avgShots: 4.8, avgCorners: 9.5, avgCards: 3.3 }
};

async function getTeamData(teamName, league = 'Brasileirão') {
    const cacheKey = `team_${teamName}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const result = {
        name: teamName,
        league: league,
        stats: null,
        recentForm: [],
        players: [],
        h2h: [],
        _sources: {},
        _warnings: []
    };

    console.log(`\n🔍 [Aggregator] Getting data for: ${teamName}`);

    // 1. Try API-Football
    try {
        const footballData = await footballApi.searchTeam(teamName);
        if (footballData) {
            console.log(`✅ [Aggregator] Found in FootballAPI: ${footballData.name}`);
            result._sources.stats = 'api-football';
            
            const fixtures = await footballApi.getTeamFixtures(footballData.id, 10);
            if (fixtures.length > 0) {
                result.recentForm = fixtures.slice(0, 5).map(f => f.result);
                
                // Calculate stats from recent matches
                const avgGoals = fixtures.reduce((sum, f) => {
                    const isHome = f.home === teamName;
                    return sum + (isHome ? f.homeGoals : f.awayGoals);
                }, 0) / fixtures.length;
                
                const avgAgainst = fixtures.reduce((sum, f) => {
                    const isHome = f.home === teamName;
                    return sum + (isHome ? f.awayGoals : f.homeGoals);
                }, 0) / fixtures.length;
                
                result.stats = {
                    avgGoalsFor: avgGoals,
                    avgGoalsAgainst: avgAgainst,
                    recentWins: fixtures.slice(0, 5).filter(f => f.result === 'W').length,
                    recentDraws: fixtures.slice(0, 5).filter(f => f.result === 'D').length,
                    recentLosses: fixtures.slice(0, 5).filter(f => f.result === 'L').length,
                    formString: result.recentForm.join(''),
                    _fromFixtures: true
                };
            }
            
            const players = await footballApi.getPlayerStats(footballData.id);
            if (players.length > 0) {
                result.players = players;
                result._sources.players = 'api-football';
            }
        }
    } catch (e) {
        console.log(`⚠️ [Aggregator] FootballAPI failed: ${e.message}`);
        result._warnings.push(`FootballAPI: ${e.message}`);
    }

    // 2. If no stats, try local data
    if (!result.stats) {
        try {
            const localStats = dataLoader.getTeamStats(teamName);
            if (localStats && Object.keys(localStats).length > 0) {
                console.log(`✅ [Aggregator] Found in Local data`);
                result._sources.stats = 'local';
                result.stats = {
                    avgGoalsFor: localStats.avgGoals || 1.2,
                    avgGoalsAgainst: localStats.avgAgainst || 1.2,
                    avgShots: localStats.avgShots || 4.5,
                    avgCorners: localStats.avgCorners || 9.5,
                    _fromLocal: true
                };
            }
        } catch (e) {
            console.log(`⚠️ [Aggregator] Local data failed`);
        }
    }

    // 3. If still no stats, use league averages
    if (!result.stats) {
        console.log(`⚠️ [Aggregator] Using league averages for: ${teamName}`);
        result._sources.stats = 'fallback-league-avg';
        result._warnings.push('Using league averages');
        
        const leagueAvg = LEAGUE_AVERAGES[league] || LEAGUE_AVERAGES['Brasileirão'];
        result.stats = {
            avgGoalsFor: leagueAvg.avgGoals,
            avgGoalsAgainst: leagueAvg.avgAgainst,
            avgShots: leagueAvg.avgShots,
            avgCorners: leagueAvg.avgCorners,
            _fallback: true
        };
    }

    // Calculate derived metrics
    result.stats.attackStrength = result.stats.avgGoalsFor + (result.stats.avgShots * 0.3);
    result.stats.defenseStrength = result.stats.avgGoalsAgainst + (result.stats.tackles || 0) * 0.1;
    
    // Form score (0-1 scale)
    const recent = result.recentForm.slice(0, 5);
    const formScore = recent.reduce((acc, r) => {
        if (r === 'W') return acc + 3;
        if (r === 'D') return acc + 1;
        return acc;
    }, 0) / Math.max(recent.length, 1);
    result.stats.formScore = formScore / 3; // Normalize to 0-1

    setCache(cacheKey, result);
    console.log(`✅ [Aggregator] Complete for: ${teamName}`, result._sources);

    return result;
}

async function getMatchAnalysis(homeTeam, awayTeam, league = 'Brasileirão') {
    const [homeData, awayData] = await Promise.all([
        getTeamData(homeTeam, league),
        getTeamData(awayTeam, league)
    ]);

    // Get H2H from local data
    const h2h = dataLoader.getH2H(homeTeam, awayTeam);

    return {
        home: homeData,
        away: awayData,
        h2h: h2h || [],
        analysis: calculatePrediction(homeData, awayData)
    };
}

function calculatePrediction(home, away) {
    // Normalize values to 0-1
    const maxGoals = 4;
    const homeAttack = Math.min(home.stats.avgGoalsFor / maxGoals, 1);
    const awayDefense = 1 - Math.min(away.stats.avgGoalsAgainst / maxGoals, 1);
    const awayAttack = Math.min(away.stats.avgGoalsFor / maxGoals, 1);
    const homeDefense = 1 - Math.min(home.stats.avgGoalsAgainst / maxGoals, 1);

    // Attack comparison
    const attackComparison = (homeAttack + awayDefense) / 2;

    // Form difference (0-1 scale)
    const formDifference = (home.stats.formScore - away.stats.formScore + 1) / 2;

    // Expected goals
    const expectedGoals = (home.stats.avgGoalsFor + away.stats.avgGoalsFor) / 2;
    const goalExpectation = Math.min(expectedGoals / 3, 1);

    // Model probability for Over 2.5
    const modelProb = (attackComparison * 0.4) + (formDifference * 0.3) + (goalExpectation * 0.3);

    // Calculate different markets
    const over25Prob = 1 - Math.pow(1 - goalExpectation, 2.5);
    const bttsProb = (homeAttack * 0.8) * (awayAttack * 0.8);
    const homeWinProb = attackComparison * (home.stats.formScore + 0.3);

    return {
        confidence: Math.round(modelProb * 100),
        expectedGoals: expectedGoals.toFixed(1),
        
        over25: {
            probability: Math.round(over25Prob * 100),
            risk: over25Prob >= 0.7 ? 'low' : over25Prob >= 0.5 ? 'medium' : 'high'
        },
        
        btts: {
            probability: Math.round(bttsProb * 100),
            risk: bttsProb >= 0.7 ? 'low' : bttsProb >= 0.5 ? 'medium' : 'high'
        },
        
        homeWin: {
            probability: Math.round(homeWinProb * 100),
            risk: homeWinProb >= 0.7 ? 'low' : homeWinProb >= 0.5 ? 'medium' : 'high'
        },
        
        bestBet: selectBestBet([{ market: 'Over 2.5', prob: over25Prob, odds: 1.35 },
                               { market: 'BTTS Yes', prob: bttsProb, odds: 1.65 },
                               { market: 'Home Win', prob: homeWinProb, odds: 2.10 }]),
        
        insights: generateInsights(home, away)
    };
}

function selectBestBet(bets) {
    // Select bet with highest probability and good odds value
    const sorted = bets.sort((a, b) => b.prob - a.prob);
    const best = sorted[0];
    
    return {
        market: best.market,
        probability: Math.round(best.prob * 100),
        odds: best.odds,
        risk: best.prob >= 0.7 ? 'low' : best.prob >= 0.5 ? 'medium' : 'high'
    };
}

function generateInsights(home, away) {
    const insights = [];

    if (home.stats.avgGoalsFor > 1.3) {
        insights.push({
            type: 'positive',
            text: `${home.name} marca em média ${home.stats.avgGoalsFor.toFixed(1)} gols`
        });
    }

    if (away.stats.avgGoalsAgainst > 1.3) {
        insights.push({
            type: 'warning',
            text: `${away.name} sofre ${away.stats.avgGoalsAgainst.toFixed(1)} gols fora em média`
        });
    }

    const homeRecentWins = home.recentForm.slice(0, 5).filter(r => r === 'W').length;
    if (homeRecentWins >= 3) {
        insights.push({
            type: 'positive',
            text: `Boa fase: ${home.name} venceu ${homeRecentWins} dos últimos 5 jogos`
        });
    }

    if (home.stats.formScore > 0.6) {
        insights.push({
            type: 'positive',
            text: `Forma recente: ${Math.round(home.stats.formScore * 100)}% de aproveitamento`
        });
    }

    return insights;
}

module.exports = {
    getTeamData,
    getMatchAnalysis,
    calculatePrediction
};

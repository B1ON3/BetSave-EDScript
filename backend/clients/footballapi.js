const https = require('https');
const { execSync } = require('child_process');
const { loadEnv } = require('../utils/validateEnv');

loadEnv();

const API_KEY = process.env.API_FOOTBALL_KEY || 'ceae0ccefdebd8803ff5c20e4dc7a535';
const BASE_URL = 'v3.football.api-sports.io';

if (!API_KEY) {
    console.warn('⚠️  [FootballAPI] API_FOOTBALL_KEY not configured. Some features may not work.');
}

const CACHE = new Map();

const CACHE_DURATIONS = {
    live: 30 * 1000,           // 30 segundos
    events: 30 * 1000,          // 30 segundos
    matchStats: 60 * 60 * 1000, // 1 hora
    lineups: 60 * 60 * 1000,    // 1 hora
    teamStats: 30 * 60 * 1000,  // 30 minutos
    teamFixtures: 30 * 60 * 1000, // 30 minutos
    playerStats: 60 * 60 * 1000, // 1 hora
    standings: 6 * 60 * 60 * 1000, // 6 horas
    league: 2 * 60 * 60 * 1000,   // 2 horas
    default: 10 * 60 * 1000       // 10 minutos
};

function getCacheDuration(type) {
    return CACHE_DURATIONS[type] || CACHE_DURATIONS.default;
}

function getCached(key, type) {
    const cached = CACHE.get(key);
    if (cached && Date.now() - cached.timestamp < getCacheDuration(type)) {
        console.log(`📦 [FootballAPI] Cache hit: ${key} (${type})`);
        return cached.data;
    }
    return null;
}

function setCache(key, data, type) {
    CACHE.set(key, { data, timestamp: Date.now(), type });
    console.log(`💾 [FootballAPI] Cached: ${key} (${type})`);
}

function clearCache() {
    CACHE.clear();
    console.log('🗑️ [FootballAPI] Cache cleared');
}

function clearCacheByType(type) {
    for (const [key, value] of CACHE.entries()) {
        if (value.type === type) {
            CACHE.delete(key);
        }
    }
    console.log(`🗑️ [FootballAPI] Cache cleared by type: ${type}`);
}

function apiRequest(endpoint, bypassCache = false, cacheType = 'default') {
    return new Promise((resolve, reject) => {
        const cacheKey = `${endpoint}`;
        const cached = !bypassCache ? getCached(cacheKey, cacheType) : null;
        if (cached) {
            return resolve(cached);
        }

        const options = {
            hostname: BASE_URL,
            path: `/api/v3${endpoint}`,
            method: 'GET',
            headers: {
                'x-apisports-key': API_KEY
            }
        };

        console.log(`📡 [FootballAPI] Request: ${endpoint}`);

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.errors && Object.keys(parsed.errors).length > 0) {
                        console.log(`⚠️ [FootballAPI] Errors:`, parsed.errors);
                    }
                    setCache(cacheKey, parsed, cacheType);
                    resolve(parsed);
                } catch (e) {
                    console.error(`❌ [FootballAPI] Parse error: ${e.message}`);
                    reject(e);
                }
            });
        });

        req.on('error', (e) => {
            console.error(`❌ [FootballAPI] Network error: ${e.message}`);
            reject(e);
        });

        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

function curlViaChildProcess(endpoint, cacheType = 'default') {
    return new Promise((resolve, reject) => {
        try {
            const url = `https://${BASE_URL}${endpoint}`;
            const cmd = process.platform === 'win32' 
                ? `curl -s "${url}" -H "x-apisports-key: ${API_KEY}"`
                : `curl -s "${url}" -H "x-apisports-key: ${API_KEY}"`;
            
            const cached = getCached(endpoint, cacheType);
            if (cached) {
                return resolve(cached);
            }
            
            const output = execSync(cmd, { 
                encoding: 'utf8', 
                timeout: 15000,
                maxBuffer: 10 * 1024 * 1024
            });
            
            const data = JSON.parse(output);
            setCache(endpoint, data, cacheType);
            resolve(data);
        } catch (e) {
            console.log(`❌ [FootballAPI] curl error: ${e.message}`);
            resolve(null);
        }
    });
}

async function searchTeam(teamName) {
    try {
        const response = await apiRequest(`/teams?search=${encodeURIComponent(teamName)}`);
        if (response.response && response.response.length > 0) {
            return response.response[0].team;
        }
        return null;
    } catch (e) {
        console.log(`⚠️ [FootballAPI] Team search failed for: ${teamName}`);
        return null;
    }
}

async function getTeamStats(teamId) {
    try {
        const response = await apiRequest(`/teams?id=${teamId}`);
        if (response.response && response.response.length > 0) {
            return response.response[0];
        }
        return null;
    } catch (e) {
        console.log(`⚠️ [FootballAPI] Team stats failed for ID: ${teamId}`);
        return null;
    }
}

async function getTeamFixtures(teamId, last = 10) {
    try {
        const response = await apiRequest(`/fixtures?team=${teamId}&last=${last}&status=FT`);
        if (response.response) {
            return response.response.map(fix => ({
                date: fix.fixture.date,
                league: fix.league?.name,
                home: fix.teams?.home?.name,
                away: fix.teams?.away?.name,
                homeGoals: fix.goals?.home,
                awayGoals: fix.goals?.away,
                result: fix.goals?.home > fix.goals?.away ? 'W' : 
                        fix.goals?.home < fix.goals?.away ? 'L' : 'D'
            }));
        }
        return [];
    } catch (e) {
        console.log(`⚠️ [FootballAPI] Fixtures failed for team: ${teamId}`);
        return [];
    }
}

async function getLeagueStandings(leagueId, season = 2025) {
    try {
        const response = await apiRequest(`/standings?league=${leagueId}&season=${season}`);
        if (response.response) {
            const standings = [];
            response.response.forEach(item => {
                if (item.league?.standings) {
                    item.league.standings.forEach(group => {
                        group.forEach(team => {
                            standings.push({
                                rank: team.rank,
                                name: team.team?.name,
                                played: team.all?.played,
                                win: team.all?.win,
                                draw: team.all?.draw,
                                loss: team.all?.lose,
                                goalsFor: team.all?.goals?.for,
                                goalsAgainst: team.all?.goals?.against,
                                points: team.points
                            });
                        });
                    });
                }
            });
            return standings;
        }
        return [];
    } catch (e) {
        console.log(`⚠️ [FootballAPI] Standings failed for league: ${leagueId}`);
        return [];
    }
}

async function getLeagueByName(name) {
    const leagues = {
        'brasileirão': { id: 71, name: 'Serie A Brazil' },
        'brasileirao': { id: 71, name: 'Serie A Brazil' },
        'premier': { id: 39, name: 'Premier League' },
        'laliga': { id: 140, name: 'La Liga' },
        'bundesliga': { id: 78, name: 'Bundesliga' },
        'seriea': { id: 135, name: 'Serie A' },
        'ligue1': { id: 61, name: 'Ligue 1' },
        'champions': { id: 2, name: 'UEFA Champions League' },
        'libertadores': { id: 13, name: 'CONMEBOL Libertadores' }
    };

    const lowerName = name.toLowerCase();
    for (const [key, league] of Object.entries(leagues)) {
        if (lowerName.includes(key)) {
            return league;
        }
    }
    return null;
}

async function getPlayerStats(teamId) {
    try {
        const response = await apiRequest(`/players?team=${teamId}&season=2025&sort=DESC`);
        if (response.response) {
            return response.response.slice(0, 10).map(player => ({
                id: player.player?.id,
                name: player.player?.name,
                position: player.player?.position,
                goals: player.statistics?.[0]?.goals?.total || 0,
                assists: player.statistics?.[0]?.goals?.assists || 0,
                shots: player.statistics?.[0]?.shots?.total || 0,
                shotsOnTarget: player.statistics?.[0]?.shots?.on || 0,
                passes: player.statistics?.[0]?.passes?.total || 0,
                tackles: player.statistics?.[0]?.tackles?.total || 0,
                rating: player.player?.rating || null
            }));
        }
        return [];
    } catch (e) {
        console.log(`⚠️ [FootballAPI] Player stats failed for team: ${teamId}`);
        return [];
    }
}

async function getTeamForm(teamName) {
    const team = await searchTeam(teamName);
    if (!team) return null;
    
    const fixtures = await getTeamFixtures(team.id, 5);
    return {
        team,
        recentForm: fixtures.slice(0, 5).map(f => f.result),
        fixtures: fixtures.slice(0, 5)
    };
}

async function getMatchEvents(fixtureId) {
    try {
        const response = await apiRequest(`/fixtures/events?fixture=${fixtureId}`);
        if (response.response && response.response.length > 0) {
            return response.response.map(event => ({
                time: event.time?.elapsed + "'",
                type: mapEventType(event.type),
                team: event.team?.name,
                teamSide: event.team?.id,
                player: event.player?.name,
                assist: event.assist?.name,
                detail: event.detail,
                comment: event.comment
            }));
        }
        return [];
    } catch (e) {
        console.log(`⚠️ [FootballAPI] Events fetch failed for fixture: ${fixtureId}`);
        return [];
    }
}

async function getMatchStatistics(fixtureId) {
    try {
        const response = await apiRequest(`/fixtures/statistics?fixture=${fixtureId}`);
        if (response.response && response.response.length > 0) {
            const stats = {};
            response.response.forEach(team => {
                const teamName = team.team?.name;
                team.statistics.forEach(s => {
                    if (!stats[teamName]) stats[teamName] = {};
                    stats[teamName][s.type] = s.value;
                });
            });
            return stats;
        }
        return null;
    } catch (e) {
        console.log(`⚠️ [FootballAPI] Statistics fetch failed for fixture: ${fixtureId}`);
        return null;
    }
}

async function searchFixtureByTeams(homeTeam, awayTeam) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const dates = [
            today,
            new Date(Date.now() - 86400000).toISOString().split('T')[0],
            new Date(Date.now() + 86400000).toISOString().split('T')[0]
        ];
        
        for (const date of dates) {
            const response = await apiRequest(`/fixtures?team=${encodeURIComponent(homeTeam)}&date=${date}`);
            
            if (response.response && response.response.length > 0) {
                const match = response.response.find(f => {
                    const homeName = (f.teams?.home?.name || '').toLowerCase();
                    const awayName = (f.teams?.away?.name || '').toLowerCase();
                    const searchHome = homeTeam.toLowerCase();
                    const searchAway = awayTeam.toLowerCase();
                    
                    const homeMatch = homeName.includes(searchHome) || searchHome.includes(homeName) || 
                                     similarity(homeName, searchHome) > 0.6;
                    const awayMatch = awayName.includes(searchAway) || searchAway.includes(awayName) || 
                                     similarity(awayName, searchAway) > 0.6;
                    
                    return homeMatch && awayMatch;
                });
                
                if (match) {
                    console.log(`✅ [FootballAPI] Match found: ${match.teams?.home?.name} vs ${match.teams?.away?.name}`);
                    return {
                        id: match.fixture?.id,
                        home: match.teams?.home?.name,
                        away: match.teams?.away?.name,
                        homeId: match.teams?.home?.id,
                        awayId: match.teams?.away?.id,
                        homeGoals: match.goals?.home,
                        awayGoals: match.goals?.away,
                        status: match.fixture?.status?.short,
                        elapsed: match.fixture?.status?.elapsed
                    };
                }
            }
        }
        
        console.log(`⚠️ [FootballAPI] No match found for ${homeTeam} vs ${awayTeam}`);
        return null;
    } catch (e) {
        console.log(`⚠️ [FootballAPI] Fixture search failed: ${e.message}`);
        return null;
    }
}

function similarity(str1, str2) {
    const s1 = str1.split(' ')[0];
    const s2 = str2.split(' ')[0];
    if (s1 === s2) return 1;
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0) return 1;
    return (longer.length - editDistance(longer, shorter)) / longer.length;
}

function editDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[str2.length][str1.length];
}

function mapEventType(type) {
    const typeMap = {
        'Goal': 'GOAL',
        'Yellow Card': 'YELLOW_CARD',
        'Red Card': 'RED_CARD',
        'Second Yellow card': 'SECOND_YELLOW',
        'Substitution': 'SUBSTITUTION',
        'Penalty': 'PENALTY',
        'Missed Penalty': 'PENALTY_MISS',
        'Own Goal': 'OWN_GOAL',
        'Var': 'VAR',
        'Injuries': 'INJURY'
    };
    return typeMap[type] || type;
}

async function getLiveFixtures() {
    try {
        const response = await apiRequest(`/fixtures?live=all`, true);
        if (response.response && response.response.length > 0) {
            return response.response.map(fix => ({
                id: fix.fixture?.id,
                home: fix.teams?.home?.name,
                away: fix.teams?.away?.name,
                homeId: fix.teams?.home?.id,
                awayId: fix.teams?.away?.id,
                homeLogo: fix.teams?.home?.logo,
                awayLogo: fix.teams?.away?.logo,
                homeGoals: fix.goals?.home,
                awayGoals: fix.goals?.away,
                league: fix.league?.name,
                leagueLogo: fix.league?.logo,
                status: fix.fixture?.status?.short,
                statusLong: fix.fixture?.status?.long,
                elapsed: fix.fixture?.status?.elapsed,
                period: getPeriodFromStatus(fix.fixture?.status?.short),
                date: fix.fixture?.date,
                venue: fix.fixture?.venue?.name,
                referee: fix.fixture?.referee
            }));
        }
        return [];
    } catch (e) {
        console.log(`⚠️ [FootballAPI] Live fixtures fetch failed: ${e.message}`);
        return [];
    }
}

function getPeriodFromStatus(status) {
    const statusMap = {
        '1H': '1º TEMPO',
        '2H': '2º TEMPO',
        'HT': 'INTERVALO',
        'ET': 'PRORROGAÇÃO',
        'P': 'PENALTIS',
        'FT': 'FINALIZADO',
        'LIVE': 'AO VIVO',
        'NS': 'NÃO INICIADO',
        'POST': 'ENCERRADO',
        'SUS': 'SUSPENSO',
        'CANC': 'CANCELADO',
        'INT': 'INTERROMPIDO'
    };
    return statusMap[status] || status || 'AGENDADO';
}

async function getFixtureById(fixtureId) {
    try {
        const response = await apiRequest(`/fixtures?id=${fixtureId}`);
        if (response.response && response.response.length > 0) {
            const fix = response.response[0];
            return {
                id: fix.fixture?.id,
                home: fix.teams?.home?.name,
                away: fix.teams?.away?.name,
                homeId: fix.teams?.home?.id,
                awayId: fix.teams?.away?.id,
                homeLogo: fix.teams?.home?.logo,
                awayLogo: fix.teams?.away?.logo,
                homeGoals: fix.goals?.home,
                awayGoals: fix.goals?.away,
                league: fix.league?.name,
                status: fix.fixture?.status?.short,
                statusLong: fix.fixture?.status?.long,
                elapsed: fix.fixture?.status?.elapsed,
                period: getPeriodFromStatus(fix.fixture?.status?.short),
                date: fix.fixture?.date,
                venue: fix.fixture?.venue?.name,
                referee: fix.fixture?.referee,
                timestamp: fix.fixture?.timestamp
            };
        }
        return null;
    } catch (e) {
        console.log(`⚠️ [FootballAPI] Fixture by ID failed: ${e.message}`);
        return null;
    }
}

async function getTodayFinishedFixtures() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const response = await apiRequest(`/fixtures?date=${today}&status=FT,P`);
        
        if (response.response && response.response.length > 0) {
            return response.response.map(fix => ({
                id: fix.fixture?.id,
                home: fix.teams?.home?.name,
                away: fix.teams?.away?.name,
                homeId: fix.teams?.home?.id,
                awayId: fix.teams?.away?.id,
                homeLogo: fix.teams?.home?.logo,
                awayLogo: fix.teams?.away?.logo,
                homeGoals: fix.goals?.home,
                awayGoals: fix.goals?.away,
                league: fix.league?.name,
                leagueLogo: fix.league?.logo,
                status: 'FT',
                statusLong: 'FINALIZADO',
                elapsed: 90,
                date: fix.fixture?.date,
                venue: fix.fixture?.venue?.name,
                referee: fix.fixture?.referee
            }));
        }
        return [];
    } catch (e) {
        console.log(`⚠️ [FootballAPI] Today finished fixtures failed: ${e.message}`);
        return [];
    }
}

async function getMatchStatisticsById(fixtureId) {
    try {
        const response = await apiRequest(`/fixtures/statistics?fixture=${fixtureId}`, false, 'matchStats');
        if (response.response && response.response.length > 0) {
            const stats = {};
            response.response.forEach(team => {
                const teamName = team.team?.name;
                stats[teamName] = {};
                team.statistics.forEach(s => {
                    const value = s.value;
                    const numValue = typeof value === 'string' ? parseFloat(value.replace('%', '').replace('-', '0')) || 0 : value;
                    stats[teamName][normalizeStatName(s.type)] = {
                        value: numValue,
                        display: value
                    };
                });
            });
            return stats;
        }
        return null;
    } catch (e) {
        console.log(`⚠️ [FootballAPI] Match statistics failed: ${e.message}`);
        return null;
    }
}

function normalizeStatName(name) {
    const map = {
        'Ball Possession': 'possession',
        'Shots': 'shots',
        'Shots on Goal': 'shotsOnTarget',
        'Shots off Goal': 'shotsOffTarget',
        'Blocked Shots': 'shotsBlocked',
        'Corner Kicks': 'corners',
        'Offsides': 'offsides',
        'Goalkeeper Saves': 'saves',
        'Fouls': 'fouls',
        'Yellow Cards': 'yellowCards',
        'Red Cards': 'redCards',
        'Passes': 'passes',
        'Passes Accurate': 'passesAccurate',
        'Expected Goals': 'expectedGoals'
    };
    return map[name] || name.toLowerCase().replace(/\s+/g, '_');
}

async function getTeamFormById(teamId) {
    try {
        const response = await apiRequest(`/fixtures?team=${teamId}&last=10&status=FT`, false, 'teamFixtures');
        if (response.response && response.response.length > 0) {
            const results = response.response.slice(0, 10).map(fix => {
                const isHome = fix.teams?.home?.id === parseInt(teamId);
                const goalsFor = isHome ? fix.goals?.home : fix.goals?.away;
                const goalsAgainst = isHome ? fix.goals?.away : fix.goals?.home;
                const teamName = isHome ? fix.teams?.home?.name : fix.teams?.away?.name;
                const opponentName = isHome ? fix.teams?.away?.name : fix.teams?.home?.name;
                
                let result = 'D';
                if (goalsFor > goalsAgainst) result = 'W';
                else if (goalsFor < goalsAgainst) result = 'L';
                
                return {
                    date: fix.fixture?.date,
                    team: teamName,
                    opponent: opponentName,
                    result: result,
                    score: `${goalsFor}-${goalsAgainst}`,
                    home: isHome,
                    league: fix.league?.name
                };
            });
            
            const formString = results.map(r => r.result).join('');
            const wins = results.filter(r => r.result === 'W').length;
            const draws = results.filter(r => r.result === 'D').length;
            const losses = results.filter(r => r.result === 'L').length;
            
            return {
                teamId,
                formString,
                results,
                summary: { wins, draws, losses },
                totalGoalsFor: results.reduce((sum, r) => sum + parseInt(r.score.split('-')[0]), 0),
                totalGoalsAgainst: results.reduce((sum, r) => sum + parseInt(r.score.split('-')[1]), 0)
            };
        }
        return null;
    } catch (e) {
        console.log(`⚠️ [FootballAPI] Team form failed: ${e.message}`);
        return null;
    }
}

async function getLeagueStandingsById(leagueId, season = 2025) {
    try {
        const response = await apiRequest(`/standings?league=${leagueId}&season=${season}`, false, 'standings');
        if (response.response && response.response.length > 0) {
            const standings = [];
            response.response.forEach(item => {
                if (item.league?.standings) {
                    item.league.standings.forEach(group => {
                        group.forEach(team => {
                            standings.push({
                                rank: team.rank,
                                team: team.team?.name,
                                teamId: team.team?.id,
                                teamLogo: team.team?.logo,
                                played: team.all?.played,
                                win: team.all?.win,
                                draw: team.all?.draw,
                                lose: team.all?.lose,
                                goalsFor: team.all?.goals?.for,
                                goalsAgainst: team.all?.goals?.against,
                                goalDifference: team.all?.goals?.for - team.all?.goals?.against,
                                points: team.points,
                                form: team.form?.slice(-5) || ''
                            });
                        });
                    });
                }
            });
            
            return {
                leagueId,
                season,
                league: response.response[0]?.league?.name,
                standings
            };
        }
        return null;
    } catch (e) {
        console.log(`⚠️ [FootballAPI] League standings failed: ${e.message}`);
        return null;
    }
}

async function getH2H(headTeam, awayTeam) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const response = await apiRequest(`/fixtures?h2h=${headTeam}-${awayTeam}&date=${threeMonthsAgo}&next=20`, false, 'default');
        
        if (response.response && response.response.length > 0) {
            const matches = response.response.map(fix => ({
                date: fix.fixture?.date,
                home: fix.teams?.home?.name,
                away: fix.teams?.away?.name,
                homeGoals: fix.goals?.home,
                awayGoals: fix.goals?.away,
                league: fix.league?.name,
                status: fix.fixture?.status?.short
            }));
            
            const headWins = matches.filter(m => m.homeGoals > m.awayGoals && m.home === headTeam).length +
                           matches.filter(m => m.awayGoals > m.homeGoals && m.away === headTeam).length;
            const awayWins = matches.filter(m => m.homeGoals < m.awayGoals && m.home === awayTeam).length +
                            matches.filter(m => m.awayGoals < m.homeGoals && m.away === awayTeam).length;
            const draws = matches.filter(m => m.homeGoals === m.awayGoals).length;
            
            return {
                headTeam,
                awayTeam,
                matches,
                summary: {
                    headWins,
                    awayWins,
                    draws,
                    total: matches.length
                },
                avgGoals: (matches.reduce((sum, m) => sum + (m.homeGoals + m.awayGoals), 0) / matches.length).toFixed(2)
            };
        }
        return null;
    } catch (e) {
        console.log(`⚠️ [FootballAPI] H2H failed: ${e.message}`);
        return null;
    }
}

module.exports = {
    searchTeam,
    getTeamStats,
    getTeamFixtures,
    getLeagueStandings,
    getLeagueByName,
    getPlayerStats,
    getTeamForm,
    getMatchEvents,
    getMatchStatistics,
    searchFixtureByTeams,
    getLiveFixtures,
    getTodayFinishedFixtures,
    getFixtureById,
    getPeriodFromStatus,
    apiRequest,
    curlViaChildProcess,
    clearCache,
    clearCacheByType,
    getMatchStatisticsById,
    getTeamFormById,
    getLeagueStandingsById,
    getH2H
};

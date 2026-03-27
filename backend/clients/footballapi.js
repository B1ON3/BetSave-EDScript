const https = require('https');
const { loadEnv } = require('../utils/validateEnv');

loadEnv();

const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE_URL = 'v3.football.api-football.com';

if (!API_KEY) {
    console.warn('⚠️  [FootballAPI] API_FOOTBALL_KEY not configured. Some features may not work.');
}

const CACHE = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

function getCached(key) {
    const cached = CACHE.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`📦 [FootballAPI] Cache hit: ${key}`);
        return cached.data;
    }
    return null;
}

function setCache(key, data) {
    CACHE.set(key, { data, timestamp: Date.now() });
    console.log(`💾 [FootballAPI] Cached: ${key}`);
}

function apiRequest(endpoint) {
    return new Promise((resolve, reject) => {
        const cacheKey = `${endpoint}`;
        const cached = getCached(cacheKey);
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
                    setCache(cacheKey, parsed);
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

module.exports = {
    searchTeam,
    getTeamStats,
    getTeamFixtures,
    getLeagueStandings,
    getLeagueByName,
    getPlayerStats,
    getTeamForm,
    apiRequest
};

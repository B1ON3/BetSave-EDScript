const https = require('https');

const API_BASE = 'api.b365api.com';

function makeApiRequest(endpoint, params = {}, retries = 1, token) {
    return new Promise((resolve) => {
        const queryParams = { token, ...params };
        const queryString = Object.entries(queryParams)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');
        const url = `https://${API_BASE}${endpoint}?${queryString}`;
        
        console.log(`📡 Request: ${endpoint}`);
        
        const tryRequest = (attempt) => {
            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        console.log(`✅ Response ${endpoint}: ${parsed?.results?.length || 0} items`);
                        resolve(parsed);
                    } catch (e) {
                        console.log(`❌ Parse error ${endpoint}: ${e.message}`);
                        if (attempt < retries) {
                            console.log(`🔄 Retry ${attempt + 1}/${retries}...`);
                            setTimeout(() => tryRequest(attempt + 1), 1000);
                        } else {
                            resolve(null);
                        }
                    }
                });
            }).on('error', (e) => {
                console.log(`❌ Network error ${endpoint}: ${e.message}`);
                if (attempt < retries) {
                    console.log(`🔄 Retry ${attempt + 1}/${retries}...`);
                    setTimeout(() => tryRequest(attempt + 1), 1000);
                } else {
                    resolve(null);
                }
            });
        };
        
        tryRequest(1);
    });
}

async function fetchUpcomingMatches(token) {
    return await makeApiRequest('/v1/events/upcoming', { sport_id: 1 }, 2, token);
}

async function fetchLiveMatches(token) {
    return await makeApiRequest('/v1/events/inplay', { sport_id: 1 }, 1, token);
}

async function fetchMatchDetails(matchId, token) {
    return await makeApiRequest('/v1/events/view', { event_id: matchId }, 1, token);
}

async function fetchMatchOdds(matchId, token) {
    return await makeApiRequest('/v2/event/odds', { event_id: matchId }, 1, token);
}

async function searchMatch(team1, team2, token) {
    const data = await fetchUpcomingMatches(token);
    if (!data?.results) return null;
    
    const lower1 = team1.toLowerCase();
    const lower2 = team2.toLowerCase();
    
    const match = data.results.find(m => {
        const home = (m.home?.name || '').toLowerCase();
        const away = (m.away?.name || '').toLowerCase();
        return (home.includes(lower1) && away.includes(lower2)) ||
               (home.includes(lower2) && away.includes(lower1));
    });
    
    return match || null;
}

module.exports = {
    makeApiRequest,
    fetchUpcomingMatches,
    fetchLiveMatches,
    fetchMatchDetails,
    fetchMatchOdds,
    searchMatch
};

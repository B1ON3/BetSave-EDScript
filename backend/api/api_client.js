const https = require('https');
const fs = require('fs');
const path = require('path');
const { loadEnv } = require('../utils/validateEnv');

loadEnv();

const API_CONFIG = {
    baseUrl: 'api.b365api.com',
    token: process.env.BETSAPI_TOKEN,
    endpoints: {
        inplay: '/v1/events/inplay',
        upcoming: '/v1/events/upcoming',
        leagues: '/v1/league',
        eventOdds: '/v2/event/odds',
        preMatchOdds: '/v4/bet365/prematch',
        eventDetails: '/v1/bet365/event'
    }
};

function makeRequest(endpoint, params = {}) {
    return new Promise((resolve, reject) => {
        const queryParams = { token: API_CONFIG.token, ...params };
        const queryString = Object.entries(queryParams)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');
        const url = `https://${API_CONFIG.baseUrl}${endpoint}?${queryString}`;
        
        console.log(`📡 ${endpoint}`);
        
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.success === 0) {
                        console.log(`❌ ${json.error || 'Erro desconhecido'}`);
                        resolve(null);
                    } else {
                        console.log(`✅ OK`);
                        resolve(json);
                    }
                } catch (e) {
                    console.log(`❌ Parse error`);
                    resolve(null);
                }
            });
        }).on('error', (err) => {
            console.log(`❌ ${err.message}`);
            resolve(null);
        });
    });
}

async function fetchUpcomingMatches(sportId = 1, cc = null) {
    const params = { sport_id: sportId };
    if (cc) params.cc = cc;
    
    console.log('\n📅 Buscando jogos futuros...');
    return await makeRequest(API_CONFIG.endpoints.upcoming, params);
}

async function fetchLiveMatches(sportId = 1) {
    const params = { sport_id: sportId };
    console.log('\n🔴 Buscando jogos ao vivo...');
    return await makeRequest(API_CONFIG.endpoints.inplay, params);
}

async function fetchLeagues(sportId = 1, cc = null) {
    const params = { sport_id: sportId };
    if (cc) params.cc = cc;
    
    console.log('\n🏆 Buscando ligas...');
    return await makeRequest(API_CONFIG.endpoints.leagues, params);
}

async function fetchMatchOdds(eventId) {
    console.log(`\n📊 Buscando odds do evento ${eventId}...`);
    return await makeRequest(API_CONFIG.endpoints.eventOdds, { event_id: eventId });
}

async function fetchPreMatchOdds(fi) {
    console.log(`\n🎯 Buscando odds pré-jogo FI:${fi}...`);
    return await makeRequest(API_CONFIG.endpoints.preMatchOdds, { FI: fi });
}

async function fetchMatchDetails(eventId) {
    console.log(`\n📋 Buscando detalhes do evento ${eventId}...`);
    return await makeRequest(API_CONFIG.endpoints.eventDetails, { event_id: eventId });
}

async function getMatchFullData(eventId, fi) {
    console.log(`\n🔍 Buscando dados completos do jogo...`);
    
    const [odds, preOdds, details] = await Promise.all([
        fetchMatchOdds(eventId),
        fi ? fetchPreMatchOdds(fi) : Promise.resolve(null),
        fetchMatchDetails(eventId)
    ]);
    
    return { odds, preOdds, details };
}

async function getMatchesWithAnalysis() {
    console.log('\n=== BETSAVE - CARREGANDO DADOS ===\n');
    
    const [upcoming, leagues] = await Promise.all([
        fetchUpcomingMatches(1),
        fetchLeagues(1, 'br')
    ]);
    
    const matches = upcoming?.results || [];
    const leagueList = leagues?.results || [];
    
    const enrichedMatches = matches.slice(0, 20).map(match => ({
        id: match.id,
        time: match.time,
        league: leagueList.find(l => l.id === match.league?.id)?.name || match.league?.name || 'Desconhecida',
        home: {
            name: match.home?.name || match.home_name || 'Mandante',
            shortName: match.home?.short_name || match.home?.cc || '',
            imageId: match.home?.image_id || 0
        },
        away: {
            name: match.away?.name || match.away_name || 'Visitante',
            shortName: match.away?.short_name || match.away?.cc || '',
            imageId: match.away?.image_id || 0
        },
        score: match.score || { home: 0, away: 0 },
        status: match.time?.status || 'NS'
    }));
    
    console.log(`\n✅ ${enrichedMatches.length} jogos carregados`);
    
    return {
        matches: enrichedMatches,
        leagues: leagueList,
        timestamp: new Date().toISOString()
    };
}

function saveData(data, filename) {
    const dataDir = path.join(__dirname, '..', '..', 'data', 'api');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(
        path.join(dataDir, filename),
        JSON.stringify(data, null, 2)
    );
    console.log(`💾 Salvo em data/api/${filename}`);
}

module.exports = {
    makeRequest,
    fetchUpcomingMatches,
    fetchLiveMatches,
    fetchLeagues,
    fetchMatchOdds,
    fetchPreMatchOdds,
    fetchMatchDetails,
    getMatchFullData,
    getMatchesWithAnalysis,
    saveData,
    API_CONFIG
};

if (require.main === module) {
    getMatchesWithAnalysis().then(saveData);
}

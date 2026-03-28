const { execSync } = require('child_process');
const { getLiveFixtures, getTodayFinishedFixtures } = require('../clients/footballapi');
const { generateSmartOdds } = require('./oddsService');
const mockData = require('../data/mock');

const CACHE_DURATION = 60 * 1000;
let liveMatchesCache = null;
let lastFetchTime = 0;

function normalizeLiveMatch(fixture) {
    const odds = generateSmartOdds(fixture.home, fixture.away);
    
    return {
        id: fixture.id?.toString() || '',
        home: fixture.home || 'Time Casa',
        away: fixture.away || 'Time Fora',
        homeId: fixture.homeId?.toString() || '',
        awayId: fixture.awayId?.toString() || '',
        homeLogo: fixture.homeLogo || null,
        awayLogo: fixture.awayLogo || null,
        homeScore: fixture.homeGoals || 0,
        awayScore: fixture.awayGoals || 0,
        score: `${fixture.homeGoals || 0}-${fixture.awayGoals || 0}`,
        elapsed: fixture.elapsed || 0,
        time: fixture.elapsed ? `${fixture.elapsed}'` : '',
        status: fixture.status === 'LIVE' ? 'INPLAY' : fixture.status || 'NS',
        statusLong: fixture.statusLong || getStatusLong(fixture.status),
        league: fixture.league || 'Unknown League',
        leagueLogo: fixture.leagueLogo || null,
        country: fixture.country || '',
        venue: fixture.venue || '',
        referee: fixture.referee || '',
        date: fixture.date || new Date().toISOString(),
        odds: odds,
        source: 'api-football'
    };
}

function getStatusLong(status) {
    const statusMap = {
        '1H': '1º TEMPO',
        '2H': '2º TEMPO',
        'HT': 'INTERVALO',
        'ET': 'PRORROGAÇÃO',
        'P': 'PENALTIS',
        'FT': 'FINALIZADO',
        'LIVE': 'AO VIVO',
        'INPLAY': 'AO VIVO',
        'NS': 'AGENDADO',
        'POST': 'ENCERRADO',
        'SUS': 'SUSPENSO',
        'CANC': 'CANCELADO',
        'INT': 'INTERROMPIDO'
    };
    return statusMap[status] || 'AGENDADO';
}

function getLiveFixturesViaCurl() {
    return new Promise((resolve, reject) => {
        try {
            const apiKey = process.env.API_FOOTBALL_KEY || 'ceae0ccefdebd8803ff5c20e4dc7a535';
            const url = `https://v3.football.api-sports.io/fixtures?live=all`;
            
            const cmd = process.platform === 'win32' 
                ? `curl -s "${url}" -H "x-apisports-key: ${apiKey}"`
                : `curl -s "${url}" -H "x-apisports-key: ${apiKey}"`;
            
            const output = execSync(cmd, { 
                encoding: 'utf8', 
                timeout: 10000,
                maxBuffer: 10 * 1024 * 1024
            });
            
            const data = JSON.parse(output);
            
            if (data.response && data.response.length > 0) {
                const fixtures = data.response.map(fix => ({
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
                    period: getStatusLong(fix.fixture?.status?.short),
                    date: fix.fixture?.date,
                    venue: fix.fixture?.venue?.name,
                    referee: fix.fixture?.referee
                }));
                
                resolve(fixtures);
            } else {
                resolve([]);
            }
        } catch (e) {
            console.log(`❌ [LiveMatchService] Erro curl: ${e.message}`);
            resolve([]);
        }
    });
}

function filterEasterSports(matches) {
    return matches.filter(m => {
        const league = (m.league || '').toLowerCase();
        const home = (m.home || '').toLowerCase();
        const away = (m.away || '').toLowerCase();
        
        const isEsport = league.includes('e-sport') || 
                        league.includes('esport') || 
                        league.includes('e cup') ||
                        league.includes('🎮') ||
                        home.includes('esport') ||
                        away.includes('esport') ||
                        home.includes('e-sport') ||
                        away.includes('e-sport');
        
        return !isEsport;
    });
}

async function getLiveMatches() {
    console.log('📡 [LiveMatchService] Buscando partidas ao vivo...');
    
    const now = Date.now();
    
    if (liveMatchesCache && (now - lastFetchTime) < CACHE_DURATION) {
        console.log(`📦 [LiveMatchService] Usando cache (${Math.round((now - lastFetchTime) / 1000)}s)`);
        return liveMatchesCache;
    }
    
    try {
        console.log('🔄 [LiveMatchService] Tentando API-Football via curl...');
        const fixtures = await getLiveFixturesViaCurl();
        
        if (fixtures && fixtures.length > 0) {
            const filtered = filterEasterSports(fixtures);
            const normalized = filtered.map(normalizeLiveMatch);
            
            const categories = categorizeMatches(normalized);
            
            liveMatchesCache = {
                matches: normalized,
                categories: categories,
                counts: {
                    national: categories.national.length,
                    international: categories.international.length,
                    esoccer: categories.esoccer.length
                },
                source: 'api-football',
                total: normalized.length,
                cached: false
            };
            
            lastFetchTime = now;
            
            console.log(`✅ [LiveMatchService] ${normalized.length} partidas ao vivo (API-Football)`);
            return liveMatchesCache;
        }
        
        console.log('⚠️ [LiveMatchService] API-Football sem dados, usando fallback...');
    } catch (e) {
        console.log(`❌ [LiveMatchService] Erro na API-Football: ${e.message}`);
    }
    
    return getMockLiveMatches();
}

async function getRecentMatches() {
    console.log('📡 [LiveMatchService] Buscando partidas recentes/finalizadas...');
    
    try {
        const fixtures = await getTodayFinishedFixturesViaCurl();
        
        if (fixtures && fixtures.length > 0) {
            const filtered = filterEasterSports(fixtures);
            const normalized = filtered.map(f => ({
                ...normalizeLiveMatch(f),
                status: 'FINALIZADO',
                statusLong: 'FINALIZADO',
                elapsed: 90
            }));
            
            console.log(`✅ [LiveMatchService] ${normalized.length} partidas recentes (API-Football)`);
            return {
                matches: normalized,
                source: 'recent-api',
                total: normalized.length
            };
        }
    } catch (e) {
        console.log(`⚠️ [LiveMatchService] Erro ao buscar recentes: ${e.message}`);
    }
    
    return {
        matches: [],
        source: 'disabled',
        total: 0
    };
}

function getTodayFinishedFixturesViaCurl() {
    return new Promise((resolve, reject) => {
        try {
            const apiKey = process.env.API_FOOTBALL_KEY || 'ceae0ccefdebd8803ff5c20e4dc7a535';
            const today = new Date().toISOString().split('T')[0];
            const url = `https://v3.football.api-sports.io/fixtures?date=${today}`;
            
            const cmd = process.platform === 'win32' 
                ? `curl -s "${url}" -H "x-apisports-key: ${apiKey}"`
                : `curl -s "${url}" -H "x-apisports-key: ${apiKey}"`;
            
            const output = execSync(cmd, { 
                encoding: 'utf8', 
                timeout: 10000,
                maxBuffer: 10 * 1024 * 1024
            });
            
            const data = JSON.parse(output);
            
            if (data.response && data.response.length > 0) {
                const fixtures = data.response
                    .filter(fix => fix.fixture?.status?.short === 'FT' || fix.fixture?.status?.short === 'P')
                    .map(fix => ({
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
                
                resolve(fixtures);
            } else {
                resolve([]);
            }
        } catch (e) {
            console.log(`❌ [LiveMatchService] Erro curl recentes: ${e.message}`);
            resolve([]);
        }
    });
}

function getMockLiveMatches() {
    console.log('📦 [LiveMatchService] Gerando partidas mock...');
    
    const mockRaw = mockData.generateMockMatches(8, true);
    const mockMatches = mockRaw.map(m => {
        const odds = generateSmartOdds(m.home?.name || m.home, m.away?.name || m.away);
        
        return {
            id: m.id?.toString() || Math.random().toString(),
            home: m.home?.name || m.home || 'Time Casa',
            away: m.away?.name || m.away || 'Time Fora',
            homeScore: parseInt(m.ss?.split('-')[0]) || 0,
            awayScore: parseInt(m.ss?.split('-')[1]) || 0,
            score: m.ss || '0-0',
            elapsed: parseInt(m.timer?.replace("'", "")) || 0,
            time: m.timer || '',
            status: m.status === 'INPLAY' ? 'INPLAY' : 'NS',
            statusLong: m.status === 'INPLAY' ? 'AO VIVO' : 'AGENDADO',
            league: m.league?.name || m.league || 'Unknown League',
            country: m.league?.cc || '',
            odds: odds,
            source: 'mock'
        };
    });
    
    const categories = categorizeMatches(mockMatches);
    
    const result = {
        matches: mockMatches,
        categories: categories,
        counts: {
            national: categories.national.length,
            international: categories.international.length,
            esoccer: 0
        },
        source: 'mock',
        total: mockMatches.length,
        warning: 'Dados simulados - API indisponível',
        cached: false
    };
    
    liveMatchesCache = result;
    lastFetchTime = Date.now();
    
    console.log(`📦 [LiveMatchService] ${mockMatches.length} partidas mock geradas`);
    return result;
}

function categorizeMatches(matches) {
    const categories = {
        national: [],
        international: [],
        esoccer: []
    };
    
    const nationalLeagues = ['brasileirão', 'brasileirao', 'série a', 'copa do brasil', 'serie b'];
    const nationalCountries = ['br', 'brasil'];
    
    matches.forEach(m => {
        const league = (m.league || '').toLowerCase();
        const country = (m.country || '').toLowerCase();
        
        const isNational = nationalLeagues.some(l => league.includes(l)) || 
                         nationalCountries.some(c => country.includes(c));
        
        const isEsport = league.includes('e-sport') || league.includes('esport');
        
        if (isEsport) {
            categories.esoccer.push(m);
        } else if (isNational) {
            categories.national.push(m);
        } else {
            categories.international.push(m);
        }
    });
    
    return categories;
}

function clearCache() {
    liveMatchesCache = null;
    lastFetchTime = 0;
    console.log('🗑️ [LiveMatchService] Cache limpo');
}

function getLineupsViaCurl(fixtureId) {
    return new Promise((resolve, reject) => {
        try {
            const apiKey = process.env.API_FOOTBALL_KEY || 'ceae0ccefdebd8803ff5c20e4dc7a535';
            const url = `https://v3.football.api-sports.io/fixtures/lineups?fixture=${fixtureId}`;
            
            const cmd = process.platform === 'win32' 
                ? `curl -s "${url}" -H "x-apisports-key: ${apiKey}"`
                : `curl -s "${url}" -H "x-apisports-key: ${apiKey}"`;
            
            const output = execSync(cmd, { 
                encoding: 'utf8', 
                timeout: 10000,
                maxBuffer: 10 * 1024 * 1024
            });
            
            const data = JSON.parse(output);
            
            if (data.response && data.response.length > 0) {
                const lineups = data.response.map(team => ({
                    team: team.team?.name || 'Unknown',
                    teamLogo: team.team?.logo || '',
                    colors: team.team?.colors || {},
                    coach: team.coach?.name || '',
                    formation: team.formation || '4-4-2',
                    startXI: (team.startXI || []).map(p => ({
                        id: p.player?.id,
                        name: p.player?.name || 'Unknown',
                        number: p.player?.number || 0,
                        pos: mapPosition(p.player?.pos || 'M'),
                        grid: p.player?.grid || ''
                    })),
                    substitutes: (team.substitutes || []).map(p => ({
                        id: p.player?.id,
                        name: p.player?.name || 'Unknown',
                        number: p.player?.number || 0,
                        pos: mapPosition(p.player?.pos || 'M')
                    }))
                }));
                
                resolve(lineups);
            } else {
                resolve([]);
            }
        } catch (e) {
            console.log(`❌ [LiveMatchService] Erro lineups: ${e.message}`);
            resolve([]);
        }
    });
}

function mapPosition(pos) {
    const posMap = {
        'G': 'GOL',
        'D': 'DF',
        'M': 'MC',
        'F': 'MC',
        'A': 'ATA'
    };
    return posMap[pos] || pos || 'MC';
}

module.exports = {
    getLiveMatches,
    getRecentMatches,
    getMockLiveMatches,
    normalizeLiveMatch,
    filterEasterSports,
    clearCache,
    getLineupsViaCurl
};

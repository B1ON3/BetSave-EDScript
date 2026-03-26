const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

require('./loadEnv')();
const { analyzeMatch } = require('../engine/super_odds_engine');
const { 
    cleanTeamName, 
    cleanLeagueName, 
    normalizeMatch, 
    extractOdds, 
    generateMockMatches,
    convertToBrazilTime 
} = require('../utils/helpers');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = path.join(__dirname, '..', '..');
const API_TOKEN = process.env.API_TOKEN;
const API_BASE = 'api.b365api.com';

function parseCSV(content) {
    const lines = content.split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const values = line.split(',');
        const row = {};
        headers.forEach((header, i) => {
            const val = values[i]?.trim() || '';
            row[header] = isNaN(parseFloat(val)) ? val : parseFloat(val);
        });
        return row;
    });
}

let playersCache = null;
function getPlayers() {
    if (playersCache) return playersCache;
    const csvPath = path.join(ROOT_DIR, 'data', 'players_stats', 'players_data-2025_2026.csv');
    try {
        const content = fs.readFileSync(csvPath, 'utf-8');
        playersCache = parseCSV(content);
        return playersCache;
    } catch {
        return [];
    }
}

function findTeam(teamName, players) {
    const lower = teamName.toLowerCase();
    return players.filter(p => 
        (p.Squad || '').toLowerCase() === lower ||
        (p.Squad || '').toLowerCase().includes(lower) ||
        lower.includes((p.Squad || '').toLowerCase())
    );
}

function makeApiRequest(endpoint, params = {}, retries = 1) {
    return new Promise((resolve) => {
        const queryParams = { token: API_TOKEN, ...params };
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

async function fetchUpcomingMatches() {
    console.log('═'.repeat(50));
    console.log('📡 Buscando jogos upcoming...');
    
    let data = await makeApiRequest('/v1/events/upcoming', { sport_id: 1 }, 2);
    
    if (!data?.results || data.results.length === 0) {
        console.log('⚠️ API sem dados, usando fallback...');
        const mock = generateMockMatches();
        console.log(`✅ Fallback: ${mock.length} jogos mock`);
        return { results: mock, source: 'mock', warning: 'API indisponível - usando dados simulados' };
    }
    
    console.log(`✅ ${data.results.length} jogos encontrados`);
    console.log('═'.repeat(50));
    
    return { results: data.results, source: 'api' };
}

async function fetchLiveMatches() {
    console.log('📡 Buscando jogos live...');
    const data = await makeApiRequest('/v1/events/inplay', { sport_id: 1 });
    
    if (!data?.results || data.results.length === 0) {
        console.log('⚠️ Nenhum jogo live');
        return { results: [], source: 'api' };
    }
    
    console.log(`✅ ${data.results.length} jogos live`);
    return { results: data.results, source: 'api' };
}

async function fetchMatchOdds(matchId) {
    const data = await makeApiRequest('/v2/event/odds', { event_id: matchId });
    return data;
}

async function enrichMatchWithOdds(match) {
    if (!match || !match.id) return match;
    
    try {
        const oddsData = await fetchMatchOdds(match.id);
        if (oddsData?.results?.odds) {
            match.odds = extractOdds(oddsData.results.odds);
        }
    } catch (e) {
        console.log(`⚠️ Erro ao buscar odds para ${match.id}: ${e.message}`);
    }
    
    return match;
}

async function searchMatch(team1, team2) {
    const data = await fetchUpcomingMatches();
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

function classifyRisk(prob) {
    if (prob >= 0.71) return { level: 'BAIXO', emoji: '🟢', percentage: Math.round(prob * 100), riskLabel: 'Risco Baixo' };
    if (prob >= 0.41) return { level: 'MEDIO', emoji: '🟡', percentage: Math.round(prob * 100), riskLabel: 'Risco Médio' };
    return { level: 'ALTO', emoji: '🔴', percentage: Math.round(prob * 100), riskLabel: 'Risco Alto' };
}

function analyzeMatchFull(homeTeam, awayTeam) {
    const players = getPlayers();
    const homePlayers = findTeam(homeTeam, players);
    const awayPlayers = findTeam(awayTeam, players);
    
    if (homePlayers.length === 0 && awayPlayers.length === 0) {
        return { error: 'Times não encontrados no banco de dados' };
    }
    
    const getStat = (arr, field) => arr.reduce((s, p) => s + (parseFloat(p[field]) || 0), 0);
    const getAvg = (arr, field) => arr.length > 0 ? getStat(arr, field) / arr.length : 0;
    
    const homeGoals = getStat(homePlayers, 'Gls');
    const awayGoals = getStat(awayPlayers, 'Gls');
    const homeAssists = getStat(homePlayers, 'Ast');
    const awayAssists = getStat(awayPlayers, 'Ast');
    const homeShots = getStat(homePlayers, 'Sh');
    const awayShots = getStat(awayPlayers, 'Sh');
    const homeAge = getAvg(homePlayers, 'Age');
    const awayAge = getAvg(homePlayers, 'Age');
    const homeFouls = getStat(homePlayers, 'Fls');
    const awayFouls = getStat(awayPlayers, 'Fls');
    const homeCards = getStat(homePlayers, 'CrdY');
    const awayCards = getStat(awayPlayers, 'CrdY');
    const homeTackles = getStat(homePlayers, 'TklW');
    const awayTackles = getStat(awayPlayers, 'TklW');
    const homeInterceptions = getStat(homePlayers, 'Int');
    const awayInterceptions = getStat(awayPlayers, 'Int');
    const homePasses = getStat(homePlayers, 'Cmp');
    const awayPasses = getStat(awayPlayers, 'Cmp');
    const homeSaves = getStat(homePlayers, 'Save');
    const awaySaves = getStat(awayPlayers, 'Save');
    
    const homeXG = homeShots * 0.12;
    const awayXG = awayShots * 0.12;
    const homePerformanceScore = (homeGoals * 2) + (homeAssists * 1.5) + (homeTackles * 0.3) + (homePasses * 0.02);
    const awayPerformanceScore = (awayGoals * 2) + (awayAssists * 1.5) + (awayTackles * 0.3) + (awayPasses * 0.02);
    
    let homeProb = 0.33;
    let insights = [];
    let predictions = {
        corners: { 
            home: Math.round(4 + (homeShots / 50)), 
            away: Math.round(4 + (awayShots / 50)) 
        },
        cards: { 
            home: Math.round(1 + (homeFouls / 80)), 
            away: Math.round(1 + (awayFouls / 80)) 
        },
        fouls: { 
            home: Math.round(12 + (homeFouls / 30)), 
            away: Math.round(12 + (awayFouls / 30)) 
        },
        goals: {
            home: Math.round(homeXG / 2),
            away: Math.round(awayXG / 2)
        }
    };
    
    if (homeGoals > awayGoals + 5) { homeProb += 0.15; insights.push(`Ataque superior (${homeGoals} vs ${awayGoals} gols)`); }
    else if (homeGoals > awayGoals + 2) { homeProb += 0.08; insights.push(`Melhor ataque (${homeGoals} gols)`); }
    
    if (homeShots > awayShots + 30) { homeProb += 0.08; insights.push(`Mais finalizações (${homeShots} vs ${awayShots})`); }
    if (homeAssists > awayAssists + 5) { homeProb += 0.05; insights.push(`Melhor criação de jogo`); }
    if (awayAge - homeAge > 1.5) { homeProb += 0.05; insights.push(`Elenco mais jovem (${homeAge.toFixed(1)} vs ${awayAge.toFixed(1)} anos)`); }
    
    if (homePerformanceScore > awayPerformanceScore * 1.2) {
        homeProb += 0.06;
        insights.push(`Performance superior (score: ${homePerformanceScore.toFixed(0)})`);
    }
    
    if (homeTackles + homeInterceptions > awayTackles + awayInterceptions + 30) {
        homeProb += 0.04;
        insights.push(`Melhor defesa (${homeTackles + homeInterceptions} desarmes)`);
    }
    
    if (homeCards < awayCards - 10) {
        homeProb += 0.03;
        insights.push(`Melhor disciplina`);
    }
    
    homeProb = Math.min(homeProb, 0.78);
    homeProb = Math.max(homeProb, 0.18);
    
    const awayProb = (1 - homeProb) * 0.78;
    const drawProb = 1 - homeProb - awayProb;
    
    const homeTop = homePlayers.sort((a, b) => (b.Gls || 0) - (a.Gls || 0)).slice(0, 5);
    const awayTop = awayPlayers.sort((a, b) => (b.Gls || 0) - (a.Gls || 0)).slice(0, 5);
    
    return {
        match: { home: homeTeam, away: awayTeam },
        probabilities: {
            home: homeProb.toFixed(2),
            draw: drawProb.toFixed(2),
            away: awayProb.toFixed(2)
        },
        risks: {
            home: classifyRisk(homeProb),
            draw: classifyRisk(drawProb),
            away: classifyRisk(awayProb)
        },
        teamStats: {
            home: {
                goals: homeGoals, assists: homeAssists, shots: homeShots,
                fouls: homeFouls, cards: homeCards, avgAge: homeAge.toFixed(1),
                tackles: homeTackles, interceptions: homeInterceptions, xg: homeXG.toFixed(1),
                performance: homePerformanceScore.toFixed(0)
            },
            away: {
                goals: awayGoals, assists: awayAssists, shots: awayShots,
                fouls: awayFouls, cards: awayCards, avgAge: awayAge.toFixed(1),
                tackles: awayTackles, interceptions: awayInterceptions, xg: awayXG.toFixed(1),
                performance: awayPerformanceScore.toFixed(0)
            }
        },
        lineup: {
            home: homeTop.map(p => ({ name: p.Player || p.Squad, position: p.Pos || '?', goals: p.Gls || 0, assists: p.Ast || 0 })),
            away: awayTop.map(p => ({ name: p.Player || p.Squad, position: p.Pos || '?', goals: p.Gls || 0, assists: p.Ast || 0 }))
        },
        predictions,
        insights,
        recommendations: [
            homeProb > 0.42 ? { type: `VITÓRIA ${homeTeam.toUpperCase()}`, odd: (1/homeProb).toFixed(2), risk: classifyRisk(homeProb) } : null,
            awayProb > 0.32 ? { type: `VITÓRIA ${awayTeam.toUpperCase()}`, odd: (1/awayProb).toFixed(2), risk: classifyRisk(awayProb) } : null,
            drawProb > 0.28 ? { type: 'EMPATE', odd: (1/drawProb).toFixed(2), risk: classifyRisk(drawProb) } : null
        ].filter(Boolean)
    };
}

let matchesCache = null;
function loadStatsBombMatches() {
    if (matchesCache) return matchesCache;
    matchesCache = [];
    const matchesDir = path.join(ROOT_DIR, 'data', 'statsbomb', 'data', 'matches');
    
    if (!fs.existsSync(matchesDir)) return [];
    
    try {
        const seasons = fs.readdirSync(matchesDir);
        for (const season of seasons) {
            const seasonPath = path.join(matchesDir, season);
            if (!fs.statSync(seasonPath).isDirectory()) continue;
            
            const files = fs.readdirSync(seasonPath);
            for (const file of files) {
                try {
                    const content = fs.readFileSync(path.join(seasonPath, file), 'utf-8');
                    const matches = JSON.parse(content);
                    matchesCache.push(...matches);
                } catch {}
            }
        }
    } catch {}
    
    return matchesCache;
}

function findMatchesForTeam(teamName, limit = 20) {
    const allMatches = loadStatsBombMatches();
    const lower = teamName.toLowerCase();
    
    const teamMatches = allMatches.filter(m => {
        const home = (m.home_team?.home_team_name || '').toLowerCase();
        const away = (m.away_team?.away_team_name || '').toLowerCase();
        return home.includes(lower) || away.includes(lower) || 
               lower.includes(home) || lower.includes(away);
    });
    
    return teamMatches.slice(0, limit).map(m => ({
        date: m.match_date,
        home: m.home_team?.home_team_name || 'Unknown',
        away: m.away_team?.away_team_name || 'Unknown',
        homeScore: m.home_score,
        awayScore: m.away_score,
        league: m.competition?.competition_name || 'Unknown',
        season: m.season?.season_name || ''
    }));
}

function findHeadToHead(team1, team2, limit = 15) {
    const allMatches = loadStatsBombMatches();
    const lower1 = team1.toLowerCase();
    const lower2 = team2.toLowerCase();
    
    const h2h = allMatches.filter(m => {
        const home = (m.home_team?.home_team_name || '').toLowerCase();
        const away = (m.away_team?.away_team_name || '').toLowerCase();
        
        const t1Home = home.includes(lower1) || away.includes(lower1);
        const t2Home = home.includes(lower2) || away.includes(lower2);
        const t1Name = home.includes(lower1) || away.includes(lower1);
        const t2Name = home.includes(lower2) || away.includes(lower2);
        
        return t1Name && t2Name;
    });
    
    return h2h.slice(0, limit).map(m => {
        const home = m.home_team?.home_team_name || '';
        const away = m.away_team?.away_team_name || '';
        const isTeam1Home = home.toLowerCase().includes(lower1);
        
        return {
            date: m.match_date,
            home,
            away,
            homeScore: m.home_score,
            awayScore: m.away_score,
            league: m.competition?.competition_name || 'Unknown',
            season: m.season?.season_name || '',
            winner: m.home_score > m.away_score ? 'home' : 
                   m.home_score < m.away_score ? 'away' : 'draw'
        };
    });
}

function calculateTeamRatings(teamPlayers) {
    const getStat = (arr, field) => arr.reduce((s, p) => s + (parseFloat(p[field]) || 0), 0);
    const getAvg = (arr, field) => arr.length > 0 ? getStat(arr, field) / arr.length : 0;
    
    const goals = getStat(teamPlayers, 'Gls');
    const assists = getStat(teamPlayers, 'Ast');
    const shots = getStat(teamPlayers, 'Sh');
    const tackles = getStat(teamPlayers, 'TklW');
    const interceptions = getStat(teamPlayers, 'Int');
    const passes = getStat(teamPlayers, 'Cmp');
    const cards = getStat(teamPlayers, 'CrdY');
    const redCards = getStat(teamPlayers, 'CrdR');
    const saves = getStat(teamPlayers, 'Save');
    const savesPct = getAvg(teamPlayers.filter(p => p.Pos?.includes('GK')), 'Save%');
    
    const attackRating = Math.min(100, Math.round(
        (goals * 3) + (assists * 2) + (shots * 0.5) + (passes * 0.1)
    ));
    
    const defenseRating = Math.min(100, Math.round(
        (tackles * 1.5) + (interceptions * 1.2) + (saves * 0.5) + (100 - cards)
    ));
    
    const disciplineRating = Math.max(0, Math.min(100, Math.round(
        100 - (cards * 2) - (redCards * 10)
    )));
    
    const formRating = Math.round((attackRating + defenseRating + disciplineRating) / 3);
    
    return {
        attack: attackRating,
        defense: defenseRating,
        discipline: disciplineRating,
        overall: formRating,
        goals,
        assists,
        shots,
        tackles,
        interceptions,
        cards,
        passes
    };
}

function getMockMatches() {
    const today = new Date();
    const matches = [];
    
    const leagues = ['Premier League', 'La Liga', 'Serie A', 'Ligue 1', 'Bundesliga'];
    const matchups = [
        ['Manchester City', 'Liverpool'], ['Arsenal', 'Chelsea'], ['Real Madrid', 'Barcelona'],
        ['PSG', 'Marseille'], ['Bayern', 'Dortmund'], ['Inter', 'Milan'],
        ['Atletico Madrid', 'Sevilla'], ['Tottenham', 'Newcastle'], ['Juventus', 'Napoli'],
        ['Benfica', 'Porto'], ['Ajax', 'PSV'], ['Leipzig', 'Leverkusen']
    ];
    
    for (let day = 0; day < 7; day++) {
        const date = new Date(today);
        date.setDate(date.getDate() + day);
        
        const numMatches = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < numMatches; i++) {
            const matchup = matchups[Math.floor(Math.random() * matchups.length)];
            const hour = 12 + Math.floor(Math.random() * 10);
            const minute = Math.random() > 0.5 ? '00' : '30';
            
            const matchDate = new Date(date);
            matchDate.setHours(hour, parseInt(minute), 0, 0);
            
            matches.push({
                id: day * 100 + i,
                date: matchDate.toISOString().split('T')[0],
                time: `${hour}:${minute}`,
                timestamp: matchDate.getTime(),
                league: leagues[Math.floor(Math.random() * leagues.length)],
                home: matchup[0],
                away: matchup[1],
                status: 'upcoming'
            });
        }
    }
    
    for (let day = 1; day <= 5; day++) {
        const date = new Date(today);
        date.setDate(date.getDate() - day);
        date.setHours(15, 0, 0, 0);
        
        const numMatches = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numMatches; i++) {
            const matchup = matchups[Math.floor(Math.random() * matchups.length)];
            matches.push({
                id: -day * 100 - i,
                date: date.toISOString().split('T')[0],
                time: '15:00',
                timestamp: date.getTime(),
                league: leagues[Math.floor(Math.random() * leagues.length)],
                home: matchup[0],
                away: matchup[1],
                homeScore: Math.floor(Math.random() * 4),
                awayScore: Math.floor(Math.random() * 4),
                status: 'finished'
            });
        }
    }
    
    return matches;
}

async function getUpcomingMatches() {
    const data = await fetchUpcomingMatches();
    
    if (data?.results && data.results.length > 0) {
        const matches = data.results.map(m => {
            const timestamp = parseInt(m.time) * 1000;
            const date = new Date(timestamp);
            return {
                id: m.id,
                date: date.toISOString().split('T')[0],
                time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                timestamp: timestamp,
                league: cleanLeagueName(m.league?.name || 'Desconhecida'),
                home: cleanTeamName(m.home?.name || 'Mandante'),
                away: cleanTeamName(m.away?.name || 'Visitante'),
                status: 'upcoming'
            };
        });
        
        return { matches, source: 'api' };
    }
    
    console.log('📡 API indisponível, usando dados mock');
    return { matches: getMockMatches(), source: 'mock' };
}

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.url === '/') {
        fs.readFile(path.join(ROOT_DIR, 'frontend', 'index.html'), (err, data) => {
            if (err) { res.writeHead(500); res.end('{"error":"Homepage não encontrada"}'); return; }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
        return;
    }
    
    if (req.url === '/dashboard') {
        fs.readFile(path.join(ROOT_DIR, 'frontend', 'dashboard', 'index.html'), (err, data) => {
            if (err) { res.writeHead(500); res.end('{"error":"Dashboard não encontrado"}'); return; }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
        return;
    }
    
    if (req.url.startsWith('/css/')) {
        const cssFile = path.join(ROOT_DIR, 'frontend', req.url);
        fs.readFile(cssFile, (err, data) => {
            if (err) { res.writeHead(404); res.end('CSS not found'); return; }
            res.writeHead(200, { 'Content-Type': 'text/css' });
            res.end(data);
        });
        return;
    }
    
    if (req.url.startsWith('/js/')) {
        const jsFile = path.join(ROOT_DIR, 'frontend', req.url);
        fs.readFile(jsFile, (err, data) => {
            if (err) { res.writeHead(404); res.end('JS not found'); return; }
            res.writeHead(200, { 'Content-Type': 'application/javascript' });
            res.end(data);
        });
        return;
    }
    
    res.setHeader('Content-Type', 'application/json');
    
    if (req.url === '/brazil') {
        fs.readFile(path.join(ROOT_DIR, 'frontend', 'dashboard', 'brazil.html'), (err, data) => {
            if (err) { res.writeHead(500); res.end('{"error":"Página não encontrada"}'); return; }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
        return;
    }
    
    if (req.url === '/api/matches') {
        (async () => {
            const data = await fetchUpcomingMatches();
            
            const matches = (data.results || []).map(m => normalizeMatch(m));
            
            if (data.warning) {
                console.log(`⚠️ ${data.warning}`);
            }
            
            res.end(JSON.stringify({
                matches,
                source: data.source || 'unknown',
                total: matches.length,
                warning: data.warning || null
            }));
        })();
        return;
    }
    
    if (req.url === '/api/live') {
        fetchLiveMatches().then(data => {
            if (data?.results && data.results.length > 0) {
                const matches = data.results
                    .map(m => normalizeMatch(m));
                res.end(JSON.stringify({ matches, source: 'api', total: matches.length }));
            } else {
                res.end(JSON.stringify({ matches: [], source: 'api', total: 0 }));
            }
        });
        return;
    }
    
    if (req.url === '/api/brazil') {
        (async () => {
            const data = await fetchUpcomingMatches();
            
            const brazil = (data.results || []).filter(m => 
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
        })();
        return;
    }
    
    if (req.url.startsWith('/api/odds/')) {
        const matchId = req.url.split('/')[3];
        
        (async () => {
            const data = await makeApiRequest('/v2/event/odds', { event_id: matchId });
            
            if (data?.results?.odds) {
                const odds = extractOdds(data.results.odds);
                const bttsOdds = data.results.odds['17_1']?.[0] || {};
                
                res.end(JSON.stringify({
                    success: true,
                    odds,
                    btts: {
                        yes: bttsOdds.yes,
                        no: bttsOdds.no
                    }
                }));
            } else {
                res.end(JSON.stringify({ success: false, error: 'Odds não disponíveis' }));
            }
        })();
        return;
    }
    
    if (req.url.startsWith('/api/analyze')) {
        (async () => {
            const url = new URL(req.url, `http://localhost:${PORT}`);
            const home = url.searchParams.get('home');
            const away = url.searchParams.get('away');
            
            if (home && away) {
                const homeDec = decodeURIComponent(home);
                const awayDec = decodeURIComponent(away);
                
                let marketOdds = null;
                let matchInfo = null;
                
                console.log('═'.repeat(50));
                console.log(`🔍 Analisando: ${homeDec} vs ${awayDec}`);
                
                try {
                    matchInfo = await searchMatch(homeDec, awayDec);
                    if (matchInfo) {
                        console.log(`✅ Jogo encontrado: ${matchInfo.home?.name} vs ${matchInfo.away?.name}`);
                        const oddsData = await fetchMatchOdds(matchInfo.id);
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
                
                const analysis = analyzeMatch(homeDec, awayDec, marketOdds);
                
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
            } else {
                res.end(JSON.stringify({ error: 'Parâmetros necessários: home, away' }));
            }
        })();
        return;
    }
    
    if (req.url === '/api/teams') {
        const players = getPlayers();
        const teams = [...new Set(players.map(p => p.Squad).filter(Boolean))].sort();
        res.end(JSON.stringify({ teams }));
        return;
    }
    
    if (req.url === '/api/health') {
        res.end(JSON.stringify({ status: 'ok', players: getPlayers().length }));
        return;
    }
    
    if (req.url.startsWith('/api/team-profile')) {
        const urlObj = new URL(req.url, `http://localhost:${PORT}`);
        const teamName = urlObj.searchParams.get('team');
        if (teamName) {
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
                .map(p => ({
                    name: p.Player || p.name || 'Jogador',
                    goals: p.Gls || 0,
                    assists: p.Ast || 0
                }));
            
            const ratings = calculateTeamRatings(teamPlayers);
            
            res.end(JSON.stringify({
                name: teamPlayers[0]?.Squad || teamName,
                stats: { goals, assists, shots, tackles, interceptions, cleanSheets, xg, disciplineScore },
                ratings,
                topPlayers,
                rankings: { attack: '-', defense: '-' },
                league: teamPlayers[0]?.Comp || 'Desconhecida'
            }));
            return;
        }
        res.end(JSON.stringify({ error: 'Nome do time necessário' }));
        return;
    }
    
    if (req.url.startsWith('/api/team-stats')) {
        const urlObj = new URL(req.url, `http://localhost:${PORT}`);
        const teamName = urlObj.searchParams.get('team');
        if (teamName) {
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
            return;
        }
        res.end(JSON.stringify({ error: 'Nome do time necessário' }));
        return;
    }
    
    if (req.url.startsWith('/api/player')) {
        const urlObj = new URL(req.url, `http://localhost:${PORT}`);
        const name = urlObj.searchParams.get('name');
        const team = urlObj.searchParams.get('team');
        
        const players = getPlayers();
        let player;
        
        if (name) {
            player = players.find(p => 
                (p.Player || '').toLowerCase() === name.toLowerCase() ||
                (p.Player || '').toLowerCase().includes(name.toLowerCase())
            );
        }
        
        if (!player && team) {
            const teamPlayers = players.filter(p => 
                (p.Squad || '').toLowerCase() === team.toLowerCase()
            );
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
        return;
    }
    
    if (req.url.startsWith('/api/head-to-head')) {
        const urlObj = new URL(req.url, `http://localhost:${PORT}`);
        const team1 = urlObj.searchParams.get('team1');
        const team2 = urlObj.searchParams.get('team2');
        
        if (team1 && team2) {
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
            return;
        }
        res.end(JSON.stringify({ error: 'Parâmetros necessários: team1, team2' }));
        return;
    }
    
    if (req.url.startsWith('/api/team-matches')) {
        const urlObj = new URL(req.url, `http://localhost:${PORT}`);
        const teamName = urlObj.searchParams.get('team');
        const limit = parseInt(urlObj.searchParams.get('limit') || '15');
        
        if (teamName) {
            const matches = findMatchesForTeam(decodeURIComponent(teamName), limit);
            res.end(JSON.stringify({ team: teamName, matches }));
            return;
        }
        res.end(JSON.stringify({ error: 'Nome do time necessário' }));
        return;
    }
    
    if (req.url === '/api/brazil-standings') {
        const brazilianTeams = {
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
                { pos: 10, name: 'Athletico Paranaense', pts: 22, p: 18, w: 6, d: 4, l: 8, gp: 18, gc: 22, sg: -4 },
                { pos: 11, name: 'Fortaleza', pts: 21, p: 18, w: 5, d: 6, l: 7, gp: 15, gc: 18, sg: -3 },
                { pos: 12, name: 'Bahia', pts: 20, p: 18, w: 5, d: 5, l: 8, gp: 16, gc: 22, sg: -6 },
                { pos: 13, name: 'Fluminense', pts: 19, p: 18, w: 5, d: 4, l: 9, gp: 14, gc: 22, sg: -8 },
                { pos: 14, name: 'Vasco da Gama', pts: 18, p: 18, w: 4, d: 6, l: 8, gp: 15, gc: 25, sg: -10 },
                { pos: 15, name: 'Santos', pts: 17, p: 18, w: 4, d: 5, l: 9, gp: 13, gc: 24, sg: -11 },
                { pos: 16, name: 'Cuiabá', pts: 16, p: 18, w: 4, d: 4, l: 10, gp: 12, gc: 26, sg: -14 },
                { pos: 17, name: 'Red Bull Bragantino', pts: 15, p: 18, w: 3, d: 6, l: 9, gp: 11, gc: 24, sg: -13 },
                { pos: 18, name: 'Vitória', pts: 14, p: 18, w: 3, d: 5, l: 10, gp: 12, gc: 28, sg: -16 },
                { pos: 19, name: 'Criciúma', pts: 13, p: 18, w: 3, d: 4, l: 11, gp: 10, gc: 30, sg: -20 },
                { pos: 20, name: 'Atlético Goianiense', pts: 12, p: 18, w: 3, d: 3, l: 12, gp: 9, gc: 32, sg: -23 }
            ],
            'Brasileirão B': [
                { pos: 1, name: 'Sport', pts: 28, p: 15, w: 8, d: 4, l: 3, gp: 22, gc: 12, sg: 10 },
                { pos: 2, name: 'Novorizontino', pts: 26, p: 15, w: 7, d: 5, l: 3, gp: 20, gc: 14, sg: 6 },
                { pos: 3, name: 'Mirassol', pts: 25, p: 15, w: 7, d: 4, l: 4, gp: 19, gc: 15, sg: 4 },
                { pos: 4, name: 'Ceará', pts: 24, p: 15, w: 6, d: 6, l: 3, gp: 18, gc: 14, sg: 4 },
                { pos: 5, name: 'Vila Nova', pts: 23, p: 15, w: 6, d: 5, l: 4, gp: 17, gc: 15, sg: 2 },
                { pos: 6, name: 'Coritiba', pts: 22, p: 15, w: 6, d: 4, l: 5, gp: 16, gc: 16, sg: 0 },
                { pos: 7, name: 'Goiás', pts: 21, p: 15, w: 5, d: 6, l: 4, gp: 15, gc: 14, sg: 1 },
                { pos: 8, name: 'Avaí', pts: 20, p: 15, w: 5, d: 5, l: 5, gp: 14, gc: 16, sg: -2 },
                { pos: 9, name: 'Ponte Preta', pts: 19, p: 15, w: 5, d: 4, l: 6, gp: 13, gc: 17, sg: -4 },
                { pos: 10, name: 'CRB', pts: 18, p: 15, w: 5, d: 3, l: 7, gp: 14, gc: 20, sg: -6 },
                { pos: 11, name: 'América Mineiro', pts: 17, p: 15, w: 4, d: 5, l: 6, gp: 12, gc: 18, sg: -6 },
                { pos: 12, name: 'Chapecoense', pts: 16, p: 15, w: 4, d: 4, l: 7, gp: 11, gc: 19, sg: -8 },
                { pos: 13, name: 'Botafogo SP', pts: 15, p: 15, w: 4, d: 3, l: 8, gp: 10, gc: 20, sg: -10 },
                { pos: 14, name: 'Operário Ferroviário', pts: 14, p: 15, w: 3, d: 5, l: 7, gp: 9, gc: 18, sg: -9 },
                { pos: 15, name: 'Sampaio Corrêa', pts: 13, p: 15, w: 3, d: 4, l: 8, gp: 8, gc: 20, sg: -12 },
                { pos: 16, name: 'Ituano', pts: 12, p: 15, w: 3, d: 3, l: 9, gp: 8, gc: 22, sg: -14 },
                { pos: 17, name: 'Figueirense', pts: 11, p: 15, w: 2, d: 5, l: 8, gp: 7, gc: 20, sg: -13 },
                { pos: 18, name: 'Tombense', pts: 10, p: 15, w: 2, d: 4, l: 9, gp: 6, gc: 22, sg: -16 },
                { pos: 19, name: 'ABC', pts: 9, p: 15, w: 2, d: 3, l: 10, gp: 5, gc: 24, sg: -19 },
                { pos: 20, name: 'Náutico', pts: 8, p: 15, w: 2, d: 2, l: 11, gp: 4, gc: 25, sg: -21 }
            ],
            'Brasileirão C': [
                { pos: 1, name: 'Ferroviário', pts: 22, p: 12, w: 6, d: 4, l: 2, gp: 15, gc: 8, sg: 7 },
                { pos: 2, name: 'Paysandu', pts: 21, p: 12, w: 6, d: 3, l: 3, gp: 14, gc: 10, sg: 4 },
                { pos: 3, name: 'Treze', pts: 20, p: 12, w: 6, d: 2, l: 4, gp: 13, gc: 11, sg: 2 },
                { pos: 4, name: 'Botafogo PB', pts: 19, p: 12, w: 5, d: 4, l: 3, gp: 12, gc: 10, sg: 2 },
                { pos: 5, name: 'Sousa', pts: 18, p: 12, w: 5, d: 3, l: 4, gp: 11, gc: 10, sg: 1 },
                { pos: 6, name: 'Campinense', pts: 17, p: 12, w: 5, d: 2, l: 5, gp: 10, gc: 12, sg: -2 },
                { pos: 7, name: 'CSA', pts: 16, p: 12, w: 4, d: 4, l: 4, gp: 9, gc: 11, sg: -2 },
                { pos: 8, name: 'São José', pts: 15, p: 12, w: 4, d: 3, l: 5, gp: 8, gc: 12, sg: -4 },
                { pos: 9, name: 'Floresta', pts: 14, p: 12, w: 4, d: 2, l: 6, gp: 8, gc: 14, sg: -6 },
                { pos: 10, name: 'Altos', pts: 13, p: 12, w: 3, d: 4, l: 5, gp: 7, gc: 13, sg: -6 },
                { pos: 11, name: 'River Plate', pts: 12, p: 12, w: 3, d: 3, l: 6, gp: 6, gc: 14, sg: -8 },
                { pos: 12, name: 'Ypiranga', pts: 11, p: 12, w: 3, d: 2, l: 7, gp: 5, gc: 15, sg: -10 }
            ],
            'Brasileirão D': [
                { pos: 1, name: 'Manaus FC', pts: 20, p: 10, w: 6, d: 2, l: 2, gp: 14, gc: 6, sg: 8 },
                { pos: 2, name: 'São Raimundo PA', pts: 19, p: 10, w: 6, d: 1, l: 3, gp: 13, gc: 8, sg: 5 },
                { pos: 3, name: 'Remo', pts: 18, p: 10, w: 5, d: 3, l: 2, gp: 12, gc: 7, sg: 5 },
                { pos: 4, name: 'Tocantins', pts: 17, p: 10, w: 5, d: 2, l: 3, gp: 11, gc: 8, sg: 3 },
                { pos: 5, name: 'Inter de Limeira', pts: 16, p: 10, w: 5, d: 1, l: 4, gp: 10, gc: 9, sg: 1 },
                { pos: 6, name: 'Palmeiras B', pts: 15, p: 10, w: 4, d: 3, l: 3, gp: 9, gc: 8, sg: 1 },
                { pos: 7, name: 'Desportiva', pts: 14, p: 10, w: 4, d: 2, l: 4, gp: 8, gc: 9, sg: -1 },
                { pos: 8, name: 'Fast Club', pts: 13, p: 10, w: 4, d: 1, l: 5, gp: 8, gc: 11, sg: -3 },
                { pos: 9, name: 'Gama', pts: 12, p: 10, w: 3, d: 3, l: 4, gp: 7, gc: 10, sg: -3 },
                { pos: 10, name: 'Caxias', pts: 11, p: 10, w: 3, d: 2, l: 5, gp: 6, gc: 11, sg: -5 },
                { pos: 11, name: 'Vitória ES', pts: 10, p: 10, w: 3, d: 1, l: 6, gp: 5, gc: 13, sg: -8 },
                { pos: 12, name: 'Globo', pts: 9, p: 10, w: 2, d: 3, l: 5, gp: 4, gc: 12, sg: -8 }
            ]
        };
        
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ standings: brazilianTeams }));
        return;
    }
    
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Endpoint não encontrado' }));
});

server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════╗
║      BETSAVE - API + DASHBOARD          ║
╠═══════════════════════════════════════════╣
║  🌐 http://localhost:${PORT}              ║
╚═══════════════════════════════════════════╝`);
    const count = getPlayers().length;
    console.log(`✅ ${count} jogadores carregados\n`);
});

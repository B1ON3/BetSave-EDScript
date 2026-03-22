const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

require('./loadEnv')();

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

function makeApiRequest(endpoint, params = {}) {
    return new Promise((resolve) => {
        const queryParams = { token: API_TOKEN, ...params };
        const queryString = Object.entries(queryParams)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');
        const url = `https://${API_BASE}${endpoint}?${queryString}`;
        
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch { resolve(null); }
            });
        }).on('error', () => resolve(null));
    });
}

async function fetchUpcomingMatches() {
    return await makeApiRequest('/v1/events/upcoming', { sport_id: 1 });
}

async function fetchLiveMatches() {
    return await makeApiRequest('/v1/events/inplay', { sport_id: 1 });
}

function classifyRisk(prob) {
    if (prob >= 0.71) return { level: 'BAIXO', emoji: '🟢', percentage: Math.round(prob * 100) };
    if (prob >= 0.41) return { level: 'MEDIO', emoji: '🟡', percentage: Math.round(prob * 100) };
    return { level: 'ALTO', emoji: '🔴', percentage: Math.round(prob * 100) };
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
    const awayAge = getAvg(awayPlayers, 'Age');
    const homeFouls = getStat(homePlayers, 'Fls');
    const awayFouls = getStat(awayPlayers, 'Fls');
    const homeCards = getStat(homePlayers, 'CrdY');
    const awayCards = getStat(awayPlayers, 'CrdY');
    
    let homeProb = 0.33;
    let insights = [];
    let predictions = {
        corners: { home: Math.round(3 + Math.random() * 4), away: Math.round(2 + Math.random() * 4) },
        cards: { home: Math.round(1 + Math.random() * 2), away: Math.round(1 + Math.random() * 2) },
        fouls: { home: Math.round(12 + Math.random() * 10), away: Math.round(12 + Math.random() * 10) }
    };
    
    if (homeGoals > awayGoals + 5) { homeProb += 0.15; insights.push(`Ataque superior`); }
    if (homeShots > awayShots + 30) { homeProb += 0.08; insights.push(`Mais finalizações`); }
    if (homeAssists > awayAssists + 5) { homeProb += 0.05; insights.push(`Melhor criação de jogo`); }
    if (awayAge - homeAge > 1.5) { homeProb += 0.05; insights.push(`Elenco mais jovem`); }
    
    homeProb = Math.min(homeProb, 0.75);
    homeProb = Math.max(homeProb, 0.20);
    
    const awayProb = (1 - homeProb) * 0.75;
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
                fouls: homeFouls, cards: homeCards, avgAge: homeAge.toFixed(1)
            },
            away: {
                goals: awayGoals, assists: awayAssists, shots: awayShots,
                fouls: awayFouls, cards: awayCards, avgAge: awayAge.toFixed(1)
            }
        },
        lineup: {
            home: homeTop.map(p => ({ name: p.Player || p.Squad, position: p.Pos || '?', goals: p.Gls || 0, assists: p.Ast || 0 })),
            away: awayTop.map(p => ({ name: p.Player || p.Squad, position: p.Pos || '?', goals: p.Gls || 0, assists: p.Ast || 0 }))
        },
        predictions,
        insights,
        recommendations: [
            homeProb > 0.45 ? { type: `VITÓRIA ${homeTeam.toUpperCase()}`, odd: (1/homeProb).toFixed(2), risk: classifyRisk(homeProb) } : null,
            awayProb > 0.35 ? { type: `VITÓRIA ${awayTeam.toUpperCase()}`, odd: (1/awayProb).toFixed(2), risk: classifyRisk(awayProb) } : null,
            drawProb > 0.25 ? { type: 'EMPATE', odd: (1/drawProb).toFixed(2), risk: classifyRisk(drawProb) } : null
        ].filter(Boolean)
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
                league: m.league?.name || 'Desconhecida',
                home: m.home?.name || 'Mandante',
                away: m.away?.name || 'Visitante',
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
    res.setHeader('Content-Type', 'application/json');
    
    if (req.url === '/' || req.url === '/dashboard' || req.url === '/index.html') {
        fs.readFile(path.join(ROOT_DIR, 'dashboard', 'dashboard.html'), (err, data) => {
            if (err) { res.writeHead(500); res.end('{"error":"Dashboard não encontrado"}'); return; }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
        return;
    }
    
    if (req.url === '/brazil') {
        fs.readFile(path.join(ROOT_DIR, 'dashboard', 'brazil.html'), (err, data) => {
            if (err) { res.writeHead(500); res.end('{"error":"Página não encontrada"}'); return; }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
        return;
    }
    
    if (req.url === '/api/matches') {
        getUpcomingMatches().then(d => res.end(JSON.stringify(d)));
        return;
    }
    
    if (req.url === '/api/live') {
        fetchLiveMatches().then(data => {
            if (data?.results) {
                const matches = data.results.map(m => ({
                    id: m.id,
                    time: m.time,
                    score: m.ss,
                    league: m.league?.name || 'Desconhecida',
                    leaguecc: m.league?.cc,
                    home: m.home?.name || 'Mandante',
                    away: m.away?.name || 'Visitante',
                    status: 'live'
                }));
                res.end(JSON.stringify({ matches, source: 'api' }));
            } else {
                res.end(JSON.stringify({ matches: [], error: 'API indisponível' }));
            }
        });
        return;
    }
    
    if (req.url === '/api/brazil') {
        fetchLiveMatches().then(data => {
            if (data?.results) {
                const brazil = data.results.filter(m => 
                    m.league?.cc === 'br' || 
                    (m.league?.name && m.league.name.includes('Brazil'))
                );
                const matches = brazil.map(m => ({
                    id: m.id,
                    score: m.ss,
                    league: m.league?.name || 'Desconhecida',
                    home: m.home?.name || 'Mandante',
                    away: m.away?.name || 'Visitante',
                    homeId: m.home?.id,
                    awayId: m.away?.id
                }));
                res.end(JSON.stringify({ matches, source: 'api' }));
            } else {
                res.end(JSON.stringify({ matches: [], error: 'API indisponível' }));
            }
        });
        return;
    }
    
    if (req.url.startsWith('/api/odds/')) {
        const matchId = req.url.split('/')[3];
        makeApiRequest('/v2/event/odds', { event_id: matchId }).then(data => {
            if (data?.results?.odds) {
                const oddsData = data.results.odds;
                const mainOdds = oddsData['1_1']?.[0] || {};
                const bttsOdds = oddsData['17_1']?.[0] || {};
                res.end(JSON.stringify({
                    success: true,
                    score: mainOdds.ss,
                    time: mainOdds.time_str,
                    odds: {
                        home: mainOdds.home_od,
                        draw: mainOdds.draw_od,
                        away: mainOdds.away_od
                    },
                    btts: {
                        yes: bttsOdds.yes,
                        no: bttsOdds.no
                    }
                }));
            } else {
                res.end(JSON.stringify({ success: false }));
            }
        });
        return;
    }
    
    if (req.url.startsWith('/api/analyze')) {
        const url = new URL(req.url, `http://localhost:${PORT}`);
        const home = url.searchParams.get('home');
        const away = url.searchParams.get('away');
        if (home && away) {
            res.end(JSON.stringify(analyzeMatchFull(decodeURIComponent(home), decodeURIComponent(away))));
        } else {
            res.end(JSON.stringify({ error: 'Parâmetros necessários: home, away' }));
        }
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

const http = require('http');
const fs = require('fs');
const path = require('path');

require('./loadEnv')();

const PORT = process.env.PORT || 3000;
const ROOT_DIR = path.join(__dirname, '..', '..');
const API_TOKEN = process.env.BETSAPI_TOKEN || process.env.API_TOKEN;

const routes = require('../routes/api');

const routesMap = {
    '/api/matches': 'matches',
    '/api/live': 'live',
    '/api/brazil': 'brazil',
    '/api/teams': 'teams',
    '/api/health': 'health',
    '/api/brazil-standings': 'brazilStandings',
    '/api/validate-predictions': 'validatePredictions'
};

const handlers = {
    handleMatches: routes.handleMatches,
    handleLive: routes.handleLive,
    handleBrazil: routes.handleBrazil,
    handleTeams: routes.handleTeams,
    handleHealth: routes.handleHealth,
    handleBrazilStandings: routes.handleBrazilStandings,
    handleValidatePredictions: routes.handleValidatePredictions,
    handleTeamData: routes.handleTeamData
};

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
    
    const urlObj = new URL(req.url, `http://localhost:${PORT}`);
    
    if (req.url === '/api/matches') {
        handlers.handleMatches({ url: req.url, token: API_TOKEN }, res);
        return;
    }
    
    if (req.url === '/api/live') {
        handlers.handleLive({ url: req.url, token: API_TOKEN }, res);
        return;
    }
    
    if (req.url === '/api/brazil') {
        handlers.handleBrazil({ url: req.url, token: API_TOKEN }, res);
        return;
    }
    
    if (req.url === '/api/teams') {
        handlers.handleTeams({ url: req.url, token: API_TOKEN }, res);
        return;
    }
    
    if (req.url === '/api/health') {
        handlers.handleHealth({ url: req.url, token: API_TOKEN }, res);
        return;
    }
    
    if (req.url === '/api/brazil-standings') {
        handlers.handleBrazilStandings({ url: req.url, token: API_TOKEN }, res);
        return;
    }
    
    if (req.url === '/api/validate-predictions') {
        handlers.handleValidatePredictions({ url: req.url, token: API_TOKEN }, res);
        return;
    }
    
    if (req.url.startsWith('/api/match/')) {
        const matchId = req.url.split('/')[3];
        routes.handleMatchById({ url: req.url, token: API_TOKEN, headers: req.headers }, res, matchId);
        return;
    }
    
    if (req.url.startsWith('/api/odds/')) {
        const matchId = req.url.split('/')[3];
        routes.handleOdds({ url: req.url, token: API_TOKEN, headers: req.headers }, res, matchId);
        return;
    }
    
    if (req.url.startsWith('/api/analyze')) {
        const home = urlObj.searchParams.get('home');
        const away = urlObj.searchParams.get('away');
        routes.handleAnalyze({ url: req.url, token: API_TOKEN, headers: req.headers }, res, home, away);
        return;
    }
    
    if (req.url.startsWith('/api/team-profile')) {
        const teamName = urlObj.searchParams.get('team');
        routes.handleTeamProfile({ url: req.url, token: API_TOKEN, headers: req.headers }, res, teamName);
        return;
    }
    
    if (req.url.startsWith('/api/team-stats')) {
        const teamName = urlObj.searchParams.get('team');
        routes.handleTeamStats({ url: req.url, token: API_TOKEN }, res, teamName);
        return;
    }
    
    if (req.url.startsWith('/api/player')) {
        const name = urlObj.searchParams.get('name');
        const team = urlObj.searchParams.get('team');
        routes.handlePlayer({ url: req.url, token: API_TOKEN }, res, name, team);
        return;
    }
    
    if (req.url.startsWith('/api/head-to-head')) {
        const team1 = urlObj.searchParams.get('team1');
        const team2 = urlObj.searchParams.get('team2');
        routes.handleHeadToHead({ url: req.url, token: API_TOKEN }, res, team1, team2);
        return;
    }
    
    if (req.url.startsWith('/api/team-matches')) {
        const teamName = urlObj.searchParams.get('team');
        const limit = urlObj.searchParams.get('limit') || '15';
        routes.handleTeamMatches({ url: req.url, token: API_TOKEN }, res, teamName, limit);
        return;
    }
    
    if (req.url.startsWith('/api/team-data')) {
        const teamName = urlObj.searchParams.get('team');
        handlers.handleTeamData({ url: req.url, token: API_TOKEN }, res, teamName);
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
    
    const { getPlayers } = require('../services/dataService');
    const count = getPlayers().length;
    console.log(`✅ ${count} jogadores carregados\n`);
});

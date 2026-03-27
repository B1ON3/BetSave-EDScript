const leagues = [
    { id: 'br1', name: 'Brasileirão Série A', country: 'BR', cc: 'br' },
    { id: 'br2', name: 'Brasileirão Série B', country: 'BR', cc: 'br' },
    { id: 'eng1', name: 'Premier League', country: 'EN', cc: 'gb' },
    { id: 'esp1', name: 'La Liga', country: 'ES', cc: 'es' },
    { id: 'ita1', name: 'Serie A', country: 'IT', cc: 'it' },
    { id: 'ger1', name: 'Bundesliga', country: 'DE', cc: 'de' },
    { id: 'fra1', name: 'Ligue 1', country: 'FR', cc: 'fr' },
    { id: 'cl', name: 'UEFA Champions League', country: 'UEFA', cc: 'eu' },
    { id: 'el', name: 'UEFA Europa League', country: 'UEFA', cc: 'eu' },
    { id: 'copa_br', name: 'Copa do Brasil', country: 'BR', cc: 'br' }
];

const teamLogos = {
    'Flamengo': 1, 'Palmeiras': 2, 'Corinthians': 3, 'São Paulo': 4, 
    'Santos': 5, 'Grêmio': 6, 'Cruzeiro': 7, 'Internacional': 8,
    'Atlético Mineiro': 9, 'Botafogo': 10, 'Fluminense': 11, 'Vasco': 12,
    'Athletico Paranaense': 13, 'Fortaleza': 14, 'Bahia': 15, 'Ceará': 16
};

const teamNames = {
    'Flamengo': { name: 'Flamengo', short: 'FLA', cc: 'br' },
    'Palmeiras': { name: 'Palmeiras', short: 'PAL', cc: 'br' },
    'Corinthians': { name: 'Corinthians', short: 'COR', cc: 'br' },
    'São Paulo': { name: 'São Paulo', short: 'SAO', cc: 'br' },
    'Santos': { name: 'Santos', short: 'SAN', cc: 'br' },
    'Grêmio': { name: 'Grêmio', short: 'GRE', cc: 'br' },
    'Cruzeiro': { name: 'Cruzeiro', short: 'CRU', cc: 'br' },
    'Internacional': { name: 'Internacional', short: 'INT', cc: 'br' },
    'Atlético Mineiro': { name: 'Atlético Mineiro', short: 'CAM', cc: 'br' },
    'Botafogo': { name: 'Botafogo', short: 'BOT', cc: 'br' },
    'Fluminense': { name: 'Fluminense', short: 'FLU', cc: 'br' },
    'Vasco': { name: 'Vasco', short: 'VAS', cc: 'br' },
    'Fortaleza': { name: 'Fortaleza', short: 'FOR', cc: 'br' },
    'Bahia': { name: 'Bahia', short: 'BAH', cc: 'br' },
    'Manchester City': { name: 'Manchester City', short: 'MCI', cc: 'gb' },
    'Arsenal': { name: 'Arsenal', short: 'ARS', cc: 'gb' },
    'Liverpool': { name: 'Liverpool', short: 'LIV', cc: 'gb' },
    'Chelsea': { name: 'Chelsea', short: 'CHE', cc: 'gb' },
    'Manchester United': { name: 'Manchester United', short: 'MUN', cc: 'gb' },
    'Tottenham': { name: 'Tottenham', short: 'TOT', cc: 'gb' },
    'Real Madrid': { name: 'Real Madrid', short: 'RMA', cc: 'es' },
    'Barcelona': { name: 'Barcelona', short: 'BAR', cc: 'es' },
    'Atlético Madrid': { name: 'Atlético Madrid', short: 'ATM', cc: 'es' },
    'Sevilla': { name: 'Sevilla', short: 'SEV', cc: 'es' },
    'Bayern': { name: 'Bayern München', short: 'BAY', cc: 'de' },
    'Borussia Dortmund': { name: 'Borussia Dortmund', short: 'BVB', cc: 'de' },
    'Inter': { name: 'Inter Milan', short: 'INT', cc: 'it' },
    'Milan': { name: 'AC Milan', short: 'MIL', cc: 'it' },
    'Juventus': { name: 'Juventus', short: 'JUV', cc: 'it' },
    'PSG': { name: 'Paris Saint-Germain', short: 'PSG', cc: 'fr' },
    'Marseille': { name: 'Marseille', short: 'OM', cc: 'fr' }
};

function getMatchups(league) {
    const matchups = {
        'br1': [
            ['Flamengo', 'Palmeiras'], ['Corinthians', 'São Paulo'], ['Grêmio', 'Internacional'],
            ['Cruzeiro', 'Atlético Mineiro'], ['Botafogo', 'Fluminense'], ['Santos', 'Vasco'],
            ['Fortaleza', 'Bahia'], ['Athletico Paranaense', 'Corinthians']
        ],
        'eng1': [
            ['Manchester City', 'Liverpool'], ['Arsenal', 'Chelsea'], ['Manchester United', 'Tottenham'],
            ['Liverpool', 'Arsenal'], ['Chelsea', 'Manchester City'], ['Tottenham', 'Manchester United']
        ],
        'esp1': [
            ['Real Madrid', 'Barcelona'], ['Atlético Madrid', 'Sevilla'], ['Real Madrid', 'Atlético Madrid'],
            ['Barcelona', 'Sevilla']
        ],
        'ita1': [
            ['Inter', 'Milan'], ['Juventus', 'Inter'], ['Milan', 'Juventus']
        ],
        'ger1': [
            ['Bayern', 'Borussia Dortmund']
        ],
        'fra1': [
            ['PSG', 'Marseille']
        ],
        'cl': [
            ['Real Madrid', 'Manchester City'], ['Bayern', 'Arsenal'], ['Barcelona', 'PSG'],
            ['Liverpool', 'Inter'], ['Chelsea', 'Borussia Dortmund']
        ]
    };
    return matchups[league] || matchups['br1'];
}

function generateMatchId() {
    return Math.floor(Math.random() * 9000000) + 1000000;
}

function generateMockMatches(count = 20, includeLive = false) {
    const matches = [];
    const now = new Date();
    
    const allLeagues = Object.keys(getMatchups('br1')).map(() => leagues[Math.floor(Math.random() * leagues.length)]);
    
    for (let i = 0; i < count; i++) {
        const league = leagues[Math.floor(Math.random() * leagues.length)];
        const matchups = getMatchups(league.id) || getMatchups('br1');
        const matchup = matchups[Math.floor(Math.random() * matchups.length)];
        
        const home = teamNames[matchup[0]] || { name: matchup[0], short: matchup[0].substring(0, 3).toUpperCase(), cc: league.cc };
        const away = teamNames[matchup[1]] || { name: matchup[1], short: matchup[1].substring(0, 3).toUpperCase(), cc: league.cc };
        
        const hoursFromNow = Math.floor(Math.random() * 72) + 1;
        const matchTime = new Date(now.getTime() + hoursFromNow * 60 * 60 * 1000);
        
        const isLive = includeLive && Math.random() > 0.7;
        const liveMinute = isLive ? Math.floor(Math.random() * 90) + 1 : null;
        
        const homeScore = isLive ? Math.floor(Math.random() * 4) : (hoursFromNow > 24 ? null : Math.floor(Math.random() * 4));
        const awayScore = isLive ? Math.floor(Math.random() * 4) : (hoursFromNow > 24 ? null : Math.floor(Math.random() * 4));
        
        const match = {
            id: generateMatchId(),
            time: Math.floor(matchTime.getTime() / 1000),
            league: {
                id: league.id,
                name: league.name,
                cc: league.cc
            },
            home: {
                name: home.name,
                short_name: home.short,
                cc: home.cc,
                image_id: teamLogos[home.name] || Math.floor(Math.random() * 100)
            },
            away: {
                name: away.name,
                short_name: away.short,
                cc: away.cc,
                image_id: teamLogos[away.name] || Math.floor(Math.random() * 100)
            },
            ss: homeScore !== null ? `${homeScore}-${awayScore}` : null,
            timer: liveMinute ? `${liveMinute}'` : null,
            status: isLive ? 'INPLAY' : (homeScore !== null ? 'FT' : 'NS')
        };
        
        matches.push(match);
    }
    
    return matches.sort((a, b) => a.time - b.time);
}

function generateLiveMatch(matchId) {
    const leagues = ['Brasileirão Série A', 'Premier League', 'La Liga', 'Serie A'];
    const league = leagues[Math.floor(Math.random() * leagues.length)];
    
    const matchups = [
        { home: 'Flamengo', away: 'Palmeiras' },
        { home: 'Corinthians', away: 'São Paulo' },
        { home: 'Manchester City', away: 'Liverpool' },
        { home: 'Real Madrid', away: 'Barcelona' }
    ];
    const matchup = matchups[matchId % matchups.length];
    
    const homeInfo = teamNames[matchup.home] || { name: matchup.home, short: matchup.home.substring(0, 3), cc: 'br' };
    const awayInfo = teamNames[matchup.away] || { name: matchup.away, short: matchup.away.substring(0, 3), cc: 'br' };
    
    return {
        id: matchId,
        time: Math.floor(Date.now() / 1000) - 2700,
        league: {
            id: 'live',
            name: league,
            cc: 'br'
        },
        home: {
            name: homeInfo.name,
            short_name: homeInfo.short,
            cc: homeInfo.cc
        },
        away: {
            name: awayInfo.name,
            short_name: awayInfo.short,
            cc: awayInfo.cc
        },
        ss: '1-1',
        timer: '45\'',
        status: 'INPLAY'
    };
}

module.exports = {
    leagues,
    teamNames,
    teamLogos,
    getMatchups,
    generateMockMatches,
    generateLiveMatch,
    generateMatchId
};

const BIG_TEAMS = [
    'Flamengo', 'Palmeiras', 'Corinthians', 'São Paulo', 'Santos', 'Grêmio', 
    'Cruzeiro', 'Internacional', 'Atlético Mineiro', 'Botafogo', 'Fluminense',
    'Athletico Paranaense', 'Fortaleza', 'Bahia', 'Vasco',
    'Manchester City', 'Liverpool', 'Arsenal', 'Chelsea', 'Manchester United', 
    'Tottenham', 'Newcastle', 'Aston Villa',
    'Real Madrid', 'Barcelona', 'Atlético Madrid', 'Sevilla', 'Real Sociedad',
    'Bayern München', 'Borussia Dortmund', 'RB Leipzig', 'Bayer Leverkusen',
    'Inter Milan', 'AC Milan', 'Juventus', 'Napoli', 'Roma', 'Lazio',
    'Paris Saint-Germain', 'Marseille', 'Monaco', 'Lyon',
    'Porto', 'Benfica', 'Sporting CP',
    'Ajax', 'PSV', 'Feyenoord',
    'Galatasaray', 'Fenerbahçe', 'Beşiktaş'
];

const MEDIUM_TEAMS = [
    'Ceará', 'Sport', 'Vitória', 'Goiás', 'Santos', 'Operário',
    'Leicester City', 'West Ham', 'Everton', 'Brighton', 'Wolverhampton',
    'Real Betis', 'Villarreal', 'Athletic Bilbao', 'Valencia', 'Osasuna',
    'Eintracht Frankfurt', 'Wolfsburg', 'Borussia Mönchengladbach', 'Union Berlin',
    'Fiorentina', 'Atalanta', 'Torino', 'Sassuolo', 'Bologna',
    'Lille', 'Rennes', 'Nice', 'Strasbourg',
    'Shakhtar Donetsk', 'Dynamo Kyiv'
];

function getTeamStrength(teamName) {
    if (!teamName) return 1.0;
    
    const name = teamName.toLowerCase();
    
    for (const team of BIG_TEAMS) {
        if (name.includes(team.toLowerCase()) || team.toLowerCase().includes(name)) {
            return 1.4;
        }
    }
    
    for (const team of MEDIUM_TEAMS) {
        if (name.includes(team.toLowerCase()) || team.toLowerCase().includes(name)) {
            return 1.15;
        }
    }
    
    return 1.0;
}

function generateSmartOdds(homeTeam, awayTeam) {
    const homeStrength = getTeamStrength(homeTeam);
    const awayStrength = getTeamStrength(awayTeam);
    
    const strengthRatio = homeStrength / awayStrength;
    
    let homeProb, awayProb, drawProb;
    
    if (strengthRatio > 1.3) {
        homeProb = 0.50 + Math.random() * 0.15;
        awayProb = 0.20 + Math.random() * 0.12;
        drawProb = 0.18 + Math.random() * 0.10;
    } else if (strengthRatio > 1.1) {
        homeProb = 0.40 + Math.random() * 0.15;
        awayProb = 0.28 + Math.random() * 0.12;
        drawProb = 0.22 + Math.random() * 0.10;
    } else if (strengthRatio >= 0.9) {
        homeProb = 0.33 + Math.random() * 0.10;
        awayProb = 0.33 + Math.random() * 0.10;
        drawProb = 0.28 + Math.random() * 0.08;
    } else if (strengthRatio > 0.7) {
        homeProb = 0.28 + Math.random() * 0.12;
        awayProb = 0.40 + Math.random() * 0.15;
        drawProb = 0.22 + Math.random() * 0.10;
    } else {
        homeProb = 0.20 + Math.random() * 0.12;
        awayProb = 0.50 + Math.random() * 0.15;
        drawProb = 0.18 + Math.random() * 0.10;
    }
    
    const total = homeProb + awayProb + drawProb;
    homeProb /= total;
    awayProb /= total;
    drawProb = 1 - homeProb - awayProb;
    
    const homeOdds = parseFloat((1 / homeProb).toFixed(2));
    const drawOdds = parseFloat((1 / drawProb).toFixed(2));
    const awayOdds = parseFloat((1 / awayProb).toFixed(2));
    
    const totalGoalsExpected = 2.0 + Math.random() * 2.0;
    const over25Prob = 1 - Math.exp(-0.5 * totalGoalsExpected);
    const under25Prob = 1 - over25Prob;
    
    const bttsProb = 0.40 + Math.random() * 0.35;
    
    return {
        home: Math.min(15, Math.max(1.10, homeOdds)),
        draw: Math.min(12, Math.max(2.50, drawOdds)),
        away: Math.min(20, Math.max(1.10, awayOdds)),
        over25: Math.min(2.50, Math.max(1.20, parseFloat((1 / over25Prob).toFixed(2)))),
        under25: Math.min(3.00, Math.max(1.30, parseFloat((1 / under25Prob).toFixed(2)))),
        btts_yes: Math.min(2.50, Math.max(1.30, parseFloat((1 / bttsProb).toFixed(2)))),
        btts_no: Math.min(2.80, Math.max(1.40, parseFloat((1 / (1 - bttsProb)).toFixed(2))))
    };
}

function convertOddsToProbability(odds) {
    if (!odds || odds <= 0) return 0;
    return parseFloat((1 / odds).toFixed(4));
}

module.exports = {
    generateSmartOdds,
    convertOddsToProbability,
    getTeamStrength,
    BIG_TEAMS,
    MEDIUM_TEAMS
};

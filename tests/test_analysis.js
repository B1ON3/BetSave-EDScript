const { saveMockData } = require('./mock_data');
const { getAllMatches, formatAnalysis, getAnalysis } = require('./analysis_engine');

saveMockData();

console.log('═══════════════════════════════════════');
console.log('   BETSAVE - TESTE DO MOTOR DE ANÁLISE   ');
console.log('═══════════════════════════════════════\n');

// Listar todas as partidas
console.log('📋 PARTIDAS DISPONÍVEIS:\n');
const matches = getAllMatches();
matches.forEach((m, i) => {
    console.log(`${i + 1}. ${m.match.home} vs ${m.match.away}`);
    console.log(`   Liga: ${m.match.league}`);
    console.log(`   Placar: ${m.match.score} (${m.match.time})\n`);
});

// Análise completa da primeira partida
console.log('═══════════════════════════════════════');
console.log('📊 ANÁLISE COMPLETA - Flamengo vs Palmeiras\n');
const analysis = formatAnalysis(getAnalysis(123456));
console.log(analysis);

console.log('\n✅ Sistema funcionando com dados mock!');
console.log('📁 Quando baixar os datasets reais, substitua em mock_data.js');

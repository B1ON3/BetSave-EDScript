const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const API_ENDPOINT = "https://api.b365api.com/v1/events/inplay";
const TOKEN = "248558-x464EYT2kttm4b";

const url = `${API_ENDPOINT}?token=${TOKEN}`;

console.log('Conectando à API do EdScript...');
console.log(`URL: ${url}`);

function fetchUrl(targetUrl) {
    return new Promise((resolve, reject) => {
        const protocol = targetUrl.startsWith('https') ? https : http;
        
        protocol.get(targetUrl, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({ statusCode: res.statusCode, data: data });
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

fetchUrl(url)
    .then(result => {
        console.log(`Status: ${result.statusCode}`);
        
        try {
            const jsonData = JSON.parse(result.data);
            fs.writeFileSync(
                path.join(__dirname, 'dataset.json'),
                JSON.stringify(jsonData, null, 2),
                'utf-8'
            );
            
            console.log('\nDados salvos em dataset.json');
            console.log(`Tipo: ${typeof jsonData}`);
            
            if (Array.isArray(jsonData)) {
                console.log(`Registros: ${jsonData.length}`);
                if (jsonData.length > 0) {
                    console.log('\nEstrutura do primeiro registro:');
                    console.log(JSON.stringify(jsonData[0], null, 2));
                }
            } else if (typeof jsonData === 'object') {
                console.log(`Chaves: ${Object.keys(jsonData).join(', ')}`);
                console.log('\nPrimeiro registro:');
                console.log(JSON.stringify(jsonData, null, 2));
            }
        } catch (e) {
            console.log('\nResposta não é JSON válido');
            console.log(`Conteúdo (primeiros 1000 chars):\n${result.data.substring(0, 1000)}`);
        }
    })
    .catch(err => {
        console.error('Erro ao acessar API:', err.message);
    });

const fs = require('fs');
const path = require('path');

function loadEnv() {
    const envPath = path.join(__dirname, '..', '..', '.env');
    
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join('=').trim();
                    if (!process.env[key.trim()]) {
                        process.env[key.trim()] = value;
                    }
                }
            }
        });
        
        if (!process.env.BETSAPI_TOKEN && process.env.API_TOKEN) {
            console.warn('⚠️ [DEPRECATED] API_TOKEN is deprecated. Use BETSAPI_TOKEN instead.');
            process.env.BETSAPI_TOKEN = process.env.API_TOKEN;
        }
        
        console.log('✅ Variáveis de ambiente carregadas');
    } else {
        console.log('⚠️ Arquivo .env não encontrado');
        console.log('   Copie .env.example para .env e configure seu token');
    }
}

module.exports = loadEnv;
loadEnv();

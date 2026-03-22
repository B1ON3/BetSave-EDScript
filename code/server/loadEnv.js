const fs = require('fs');
const path = require('path');

function loadEnv() {
    const envPath = path.join(__dirname, '..', '..', '.env');
    const examplePath = path.join(__dirname, '..', '..', 'env.example');
    
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                const value = valueParts.join('=').trim();
                if (!process.env[key.trim()]) {
                    process.env[key.trim()] = value;
                }
            }
        });
        console.log('✅ Variáveis de ambiente carregadas');
    } else {
        console.log('⚠️ Arquivo .env não encontrado');
        console.log('   Copie env.example para .env e configure seu token');
    }
}

loadEnv();

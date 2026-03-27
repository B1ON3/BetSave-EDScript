const path = require('path');

function validateEnv() {
    const required = ['BETSAPI_TOKEN', 'API_FOOTBALL_KEY'];
    const missing = [];
    const deprecated = [];

    if (!process.env.BETSAPI_TOKEN) {
        if (process.env.API_TOKEN) {
            deprecated.push('API_TOKEN -> Use BETSAPI_TOKEN');
            process.env.BETSAPI_TOKEN = process.env.API_TOKEN;
        } else {
            missing.push('BETSAPI_TOKEN');
        }
    }

    if (!process.env.API_FOOTBALL_KEY) {
        missing.push('API_FOOTBALL_KEY');
    }

    if (deprecated.length > 0) {
        console.warn('⚠️  [ENV] Deprecated variables detected:');
        deprecated.forEach(d => console.warn(`   - ${d}`));
    }

    if (missing.length > 0) {
        console.error('❌ [ENV] Missing required environment variables:');
        missing.forEach(m => console.error(`   - ${m}`));
        console.error('\n📋 Copy .env.example to .env and fill in your values.');
        return false;
    }

    console.log('✅ [ENV] All required environment variables loaded');
    return true;
}

function loadEnv() {
    const envPath = path.join(__dirname, '..', '..', '.env');
    try {
        if (require('fs').existsSync(envPath)) {
            require('fs')
                .readFileSync(envPath, 'utf8')
                .split('\n')
                .forEach(line => {
                    const match = line.match(/^([^#=]+)=(.*)$/);
                    if (match) {
                        process.env[match[1].trim()] = match[2].trim();
                    }
                });
        }
    } catch (e) {
        console.warn('⚠️  [ENV] Could not load .env file:', e.message);
    }
}

module.exports = { validateEnv, loadEnv };

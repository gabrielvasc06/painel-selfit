// Arquivo: Backend/src/config/env.js

const { resolveEnvPath } = require('./env-file');

const envPath = resolveEnvPath();

if ((process.env.SELFIT_ENV_FILE || process.env.DOTENV_CONFIG_PATH) && !require('node:fs').existsSync(envPath)) {
    throw new Error(`Arquivo de ambiente configurado nao encontrado: ${envPath}`);
}

require('dotenv').config({ path: envPath, quiet: true });

module.exports = { envPath };

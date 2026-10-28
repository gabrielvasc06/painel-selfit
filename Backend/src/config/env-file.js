// Arquivo: Backend/src/config/env-file.js
// Serve para: resolver qual arquivo .env a API deve usar em local, homologacao ou producao.

const fs = require('fs');
const path = require('path');

function resolveEnvPath() {
    const configuredPath = process.env.SELFIT_ENV_FILE || process.env.DOTENV_CONFIG_PATH;

    if (configuredPath) {
        if (path.isAbsolute(configuredPath)) return configuredPath;

        const candidates = [
            path.resolve(process.cwd(), configuredPath),
            path.resolve(__dirname, '../..', configuredPath),
            path.resolve(__dirname, '../../..', configuredPath),
        ];

        const existingPath = candidates.find((candidate) => fs.existsSync(candidate));
        if (existingPath) return existingPath;

        return candidates[0];
    }

    // .env e o principal; .env.homolog exige
    // selecao explicita com SELFIT_ENV_FILE para evitar misturar os bancos.
    return path.resolve(__dirname, '../..', '.env');
}

module.exports = { resolveEnvPath };

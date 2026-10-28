// Arquivo: Backend/src/config/env.js

const { resolveEnvPath } = require('./env-file');

const envPath = resolveEnvPath();
const explicitFile = process.env.SELFIT_ENV_FILE || process.env.DOTENV_CONFIG_PATH;
const { error } = require('dotenv').config({ path: envPath, quiet: true });
// Variaveis do processo permitem executar sem o .env padrao. Um arquivo
// explicitamente selecionado ou ilegivel deve interromper a inicializacao.
if (error && (explicitFile || error.code !== 'ENOENT')) {
    throw new Error(`Nao foi possivel carregar o arquivo de ambiente: ${envPath} (${error.code || 'erro de leitura'}).`);
}

module.exports = { envPath };

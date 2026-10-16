// Arquivo: api-selfit/src/config/env.js
// Serve para: arquivo de codigo do sistema; participa da implementacao do painel Selfit.

const { resolveEnvPath } = require('./env-file');

const envPath = resolveEnvPath();

require('dotenv').config({ path: envPath, quiet: true });

module.exports = { envPath };

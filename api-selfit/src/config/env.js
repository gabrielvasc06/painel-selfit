// Arquivo: api-selfit/src/config/env.js
// Serve para: arquivo de codigo do sistema; participa da implementacao do painel Selfit.

const path = require('path');

const envPath = path.resolve(__dirname, '../../.env');

require('dotenv').config({ path: envPath, quiet: true });

module.exports = { envPath };

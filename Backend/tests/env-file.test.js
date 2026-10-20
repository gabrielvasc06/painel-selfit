const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { resolveEnvPath } = require('../src/config/env-file');

test('principal e o padrao e homologacao exige selecao explicita', () => {
    const previous = { NODE_ENV: process.env.NODE_ENV, SELFIT_ENV_FILE: process.env.SELFIT_ENV_FILE, DOTENV_CONFIG_PATH: process.env.DOTENV_CONFIG_PATH };
    try {
        delete process.env.SELFIT_ENV_FILE;
        delete process.env.DOTENV_CONFIG_PATH;
        process.env.NODE_ENV = 'production';
        assert.equal(path.basename(resolveEnvPath()), '.env');
        process.env.NODE_ENV = 'development';
        assert.equal(path.basename(resolveEnvPath()), '.env');
        process.env.SELFIT_ENV_FILE = path.resolve('Backend/.env.homolog');
        assert.equal(resolveEnvPath(), process.env.SELFIT_ENV_FILE);
    } finally {
        for (const [key, value] of Object.entries(previous)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    }
});

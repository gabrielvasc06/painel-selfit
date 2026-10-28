const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { spawnSync } = require('node:child_process');
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

test('arquivo selecionado ausente ou ilegivel interrompe o carregamento sem expor segredos', () => {
    for (const envFile of [path.join(__dirname, 'ambiente-inexistente.env'), __dirname]) {
        const child = spawnSync(process.execPath, ['-e', "require('./src/config/env')"], {
            cwd: path.resolve(__dirname, '..'),
            env: { ...process.env, SELFIT_ENV_FILE: envFile },
            encoding: 'utf8', windowsHide: true,
        });
        assert.equal(child.status, 1);
        assert.match(child.stderr, /Nao foi possivel carregar o arquivo de ambiente/);
    }
});

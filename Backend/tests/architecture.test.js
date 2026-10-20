const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const root = path.resolve(__dirname, '../src');
function files(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const file = path.join(directory, entry.name);
        return entry.isDirectory() ? files(file) : file.endsWith('.js') ? [file] : [];
    });
}
test('MVC separa rotas e controllers das regras e da persistencia dos models', () => {
    for (const folder of ['config', 'controllers', 'models', 'routes']) assert.ok(fs.statSync(path.join(root, folder)).isDirectory());
    for (const folder of ['routes', 'controllers']) {
        for (const file of files(path.join(root, folder))) {
            const source = fs.readFileSync(file, 'utf8');
            assert.doesNotMatch(source, /require\(['"](?:mysql2|knex)/, 'HTTP nao deve abrir conexoes SQL');
            assert.doesNotMatch(source, /\b(?:SELECT .+ FROM|INSERT INTO|DELETE FROM|UPDATE \w+ SET)\b/, 'SQL pertence aos models');
        }
    }
    for (const file of files(path.join(root, 'models'))) {
        const source = fs.readFileSync(file, 'utf8');
        assert.doesNotMatch(source, /require\(['"][^'"]*(?:controllers|routes)[/\\]/, 'Models nao dependem de controllers ou rotas');
        assert.doesNotMatch(source, /process\.env/, 'Configuracao de ambiente pertence a config');
    }
});

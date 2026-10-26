const path = require('node:path');
const { connectionOptions } = require('./src/config/database-options');
const fs = require('node:fs');
const migrationDirectory = path.join(__dirname, 'database/migrations');

// A base historica chama-se migrate.js. Ela precisa vir antes das migrations
// datadas em uma instalacao vazia, sem renomear o historico ja aplicado.
const migrationSource = {
    async getMigrations() {
        return fs.readdirSync(migrationDirectory).filter((name) => name.endsWith('.js'))
            .sort((left, right) => left === right ? 0 : left === 'migrate.js' ? -1 : right === 'migrate.js' ? 1 : left.localeCompare(right));
    },
    getMigrationName: (name) => name,
    getMigration: (name) => require(path.join(migrationDirectory, name)),
};

const config = {
    client: 'mysql2',
    connection: connectionOptions(),
    pool: { min: 0, max: 5 },
    migrations: {
        migrationSource,
        // Nao combinar com directory/loadExtensions: o Knex descartaria a fonte
        // personalizada e voltaria a ordenar migrate.js depois dos arquivos datados.
    },
};
module.exports = { development: config, staging: config, production: config };

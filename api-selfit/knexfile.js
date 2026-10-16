const path = require('node:path');
const { connectionOptions } = require('./src/config/database');

const config = {
    client: 'mysql2',
    connection: connectionOptions(),
    pool: { min: 0, max: 5 },
    migrations: {
        directory: path.join(__dirname, 'src/database/migrations'),
        // Preserva o nome historico migrate.js registrado nas bases existentes.
        loadExtensions: ['.js'],
    },
};
module.exports = { development: config, staging: config, production: config };

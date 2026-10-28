const path = require('node:path');
const { connectionOptions } = require('./src/config/database-options');
const fs = require('node:fs');
const migrationDirectory = path.join(__dirname, 'database/migrations');

// Os arquivos recebem nomes claros, mas o Knex continua usando as identidades
// ja registradas no banco. Assim, renomear nao reaplica migrations existentes.
const historicalNames = Object.freeze({
    '001_criar_tabelas_iniciais.js': 'migrate.js',
    '002_remover_campos_obsoletos_dos_equipamentos.js': '20260928193000_remove_obsolete_equipment_fields.js',
    '003_separar_tvs_cameras_e_equipamentos.js': '20260928202000_split_inventory_modules.js',
    '004_adicionar_tipo_da_unidade.js': '20260929143000_add_tipo_unidade.js',
    '005_validar_referencias_e_indexar_manutencoes.js': '20261020120000_align_maintenance_reference.js',
    '006_adicionar_serie_e_patrimonio_dos_ativos.js': '20261022120000_add_inventory_identifiers.js',
    '007_preencher_identificadores_ausentes.js': '20261022130000_fill_missing_inventory_identifiers.js',
});
const migrationSource = {
    async getMigrations() {
        return fs.readdirSync(migrationDirectory).filter((name) => name.endsWith('.js'))
            .sort();
    },
    getMigrationName: (name) => historicalNames[name] || name,
    getMigration: (name) => require(path.join(migrationDirectory, name)),
};

const config = {
    client: 'mysql2',
    connection: connectionOptions(),
    pool: { min: 0, max: 5 },
    migrations: {
        migrationSource,
        // Nao combinar com directory/loadExtensions: o Knex descartaria a fonte
        // personalizada e ignoraria a compatibilidade com os nomes historicos.
    },
};
module.exports = { development: config, staging: config, production: config };

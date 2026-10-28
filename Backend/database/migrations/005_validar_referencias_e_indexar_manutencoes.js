// Converge bases antigas para o contrato usado pela API, sem remover registros.
// MySQL executa DDL com commit implicito; valide referencias antes de ALTER TABLE.
exports.up = async function (knex) {
    if (!(await knex.schema.hasTable('manutencoes'))) return;
    const invalid = await knex('manutencoes').whereNull('item_id').count({ total: '*' }).first();
    if (Number(invalid.total)) {
        throw new Error('Existem manutencoes sem item_id. Corrija as referencias antes de migrar; nenhum registro foi removido.');
    }
    const [columns] = await knex.raw(`SELECT IS_NULLABLE FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'manutencoes' AND COLUMN_NAME = 'item_id'`);
    if (columns[0]?.IS_NULLABLE === 'YES') {
        await knex.raw('ALTER TABLE manutencoes MODIFY item_id BIGINT UNSIGNED NOT NULL');
    }
    const [indexes] = await knex.raw(`SELECT INDEX_NAME FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'manutencoes' AND INDEX_NAME = 'idx_manutencoes_status'`);
    if (!indexes.length) {
        await knex.schema.alterTable('manutencoes', (table) => {
            table.index(['status_manutencao', 'item_tipo', 'item_id'], 'idx_manutencoes_status');
        });
    }
};

// Padronizacao aditiva: retornar a versao anterior da API nao exige enfraquecer
// a referencia ou remover o indice. Restauracao de dados deve usar backup.
exports.down = async function () {};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    const hasColumn = await knex.schema.hasColumn('unidades', 'tipo_unidade');
    if (!hasColumn) {
        await knex.schema.alterTable('unidades', (table) => {
            table.string('tipo_unidade', 20).notNullable().defaultTo('PROPRIA').after('nome');
        });
    }

    await knex('unidades')
        .whereNull('tipo_unidade')
        .orWhere('tipo_unidade', '')
        .update({ tipo_unidade: 'PROPRIA' });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    const hasColumn = await knex.schema.hasColumn('unidades', 'tipo_unidade');
    if (hasColumn) {
        await knex.schema.alterTable('unidades', (table) => {
            table.dropColumn('tipo_unidade');
        });
    }
};

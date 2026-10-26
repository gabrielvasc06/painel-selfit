// Alteracao aditiva: registros existentes continuam validos e recebem NULL.
// Texto preserva zeros a esquerda, letras e hifens nos identificadores.
exports.up = async function (knex) {
    for (const name of ['equipamentos', 'tvs', 'cameras']) {
        if (!(await knex.schema.hasTable(name))) throw new Error(`Tabela ${name} ausente. Execute a migration inicial primeiro.`);
        const serialExists = await knex.schema.hasColumn(name, 'numero_serie');
        const assetExists = await knex.schema.hasColumn(name, 'numero_patrimonio');
        if (!serialExists || !assetExists) {
            await knex.schema.alterTable(name, (table) => {
                if (!serialExists) table.string('numero_serie', 100).nullable();
                if (!assetExists) table.string('numero_patrimonio', 100).nullable();
            });
        }
    }
};

// Reverter a versao da API nao exige apagar os dados destes campos.
exports.down = async function () {};

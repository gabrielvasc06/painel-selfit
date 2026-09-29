/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    // Importa o bcrypt para criptografar
    const bcrypt = require('bcrypt');

    // 1. Tabela Unidades
    await knex.schema.createTable('unidades', (table) => {
        table.increments('id').primary();
        table.string('nome', 100).notNullable();
        table.string('tipo_unidade', 20).notNullable().defaultTo('PROPRIA');
        table.string('cnpj', 20).unique().notNullable();
        table.string('cep', 10);
        table.string('uf', 2);
        table.string('bairro', 100);
        table.string('rua', 150);
        table.string('numero', 20);
        table.timestamps(true, true);

        // Rigidez: Apenas maiúsculas e sem espaços vazios (Requer MySQL 8.0+)
        table.check('nome = UPPER(nome) AND nome = TRIM(nome) AND LENGTH(TRIM(nome)) > 0');
        table.check('cnpj = UPPER(cnpj) AND cnpj = TRIM(cnpj) AND LENGTH(TRIM(cnpj)) > 0');
    });

    // 2. Tabela Usuarios
    await knex.schema.createTable('usuarios', (table) => {
        table.increments('id').primary();
        table.string('usuario', 100).unique().notNullable();
        table.string('senha_hash', 255).notNullable();
        table.boolean('senha_provisoria').notNullable().defaultTo(true);
        table.timestamps(true, true);

        table.check('usuario = UPPER(usuario) AND usuario = TRIM(usuario) AND LENGTH(TRIM(usuario)) > 0');
    });

    // Criação de usuário padrão!
    const usuarioPadrao = 'VANDERSON.GABRIEL';
    const senhaPlana = 'Selfit@2026'; // <--- Digite a senha que você quiser aqui!
    
    // O bcrypt gera o hash seguro na hora que a migration roda
    const saltRounds = 10;
    const senhaHashGerada = await bcrypt.hash(senhaPlana, saltRounds);

    await knex('usuarios').insert({
        usuario: usuarioPadrao,
        senha_hash: senhaHashGerada,
        senha_provisoria: false
    });

    // 3. Tabela Equipamentos
    await knex.schema.createTable('equipamentos', (table) => {
        table.bigIncrements('id').primary();

        table.integer('unidade_id').unsigned().notNullable()
            .references('id')
            .inTable('unidades')
            .onDelete('RESTRICT');

        table.string('nome_identificacao', 100).notNullable();
        table.string('categoria', 50).notNullable();
        table.string('marca', 50).notNullable();
        table.string('status', 50).notNullable().defaultTo('ATIVO');
        table.date('data_garantia').notNullable();

        // Soft Delete ativado
        table.timestamp('deleted_at').nullable();
        table.timestamps(true, true);

        // Regras de rigidez de dados
        table.check('nome_identificacao = UPPER(nome_identificacao) AND nome_identificacao = TRIM(nome_identificacao) AND LENGTH(TRIM(nome_identificacao)) > 0');
        table.check('categoria = UPPER(categoria) AND categoria = TRIM(categoria) AND LENGTH(TRIM(categoria)) > 0');
        table.check('marca = UPPER(marca) AND marca = TRIM(marca) AND LENGTH(TRIM(marca)) > 0');
        table.check('status = UPPER(status) AND status = TRIM(status) AND LENGTH(TRIM(status)) > 0');
    });

    // 4. Índices Compostos (Alternativa otimizada para MySQL lidar com Soft Delete)
    await knex.schema.alterTable('equipamentos', (table) => {
        table.index(['deleted_at', 'nome_identificacao'], 'idx_equip_nome_ativo');
        table.index(['deleted_at', 'categoria'], 'idx_equip_cat_ativo');
        table.index(['deleted_at', 'categoria', 'data_garantia'], 'idx_equip_garantia_cat');
    });

    await knex.schema.createTable('tvs', (table) => {
        table.bigIncrements('id').primary();
        table.integer('unidade_id').unsigned().notNullable()
            .references('id')
            .inTable('unidades')
            .onDelete('RESTRICT');
        table.string('nome_identificacao', 100).notNullable();
        table.string('categoria', 50).notNullable().defaultTo('TV');
        table.string('marca', 50).notNullable();
        table.string('status', 50).notNullable().defaultTo('ATIVO');
        table.date('data_garantia').notNullable();
        table.timestamp('deleted_at').nullable();
        table.timestamps(true, true);
        table.index(['deleted_at', 'nome_identificacao'], 'idx_tvs_nome_ativo');
        table.index(['deleted_at', 'data_garantia'], 'idx_tvs_garantia');
    });

    await knex.schema.createTable('cameras', (table) => {
        table.bigIncrements('id').primary();
        table.integer('unidade_id').unsigned().notNullable()
            .references('id')
            .inTable('unidades')
            .onDelete('RESTRICT');
        table.string('nome_identificacao', 100).notNullable();
        table.string('categoria', 50).notNullable().defaultTo('CAMERAS');
        table.string('marca', 50).notNullable();
        table.string('status', 50).notNullable().defaultTo('ATIVO');
        table.date('data_garantia').notNullable();
        table.timestamp('deleted_at').nullable();
        table.timestamps(true, true);
        table.index(['deleted_at', 'nome_identificacao'], 'idx_cameras_nome_ativo');
        table.index(['deleted_at', 'data_garantia'], 'idx_cameras_garantia');
    });

    // 5. Tabela Manutenções
    await knex.schema.createTable('manutencoes', (table) => {
        table.bigIncrements('id').primary();

        table.string('item_tipo', 20).notNullable().defaultTo('EQUIPAMENTO');
        table.bigInteger('item_id').unsigned().notNullable();

        table.text('descricao').notNullable();
        table.date('data_envio').notNullable();
        table.date('data_retorno').nullable();
        table.decimal('custo', 10, 2).nullable();
        table.string('status_manutencao', 50).notNullable().defaultTo('ABERTA');

        table.timestamps(true, true);

        table.index(['status_manutencao', 'item_tipo', 'item_id'], 'idx_manutencoes_status');

        table.check('descricao = UPPER(descricao) AND descricao = TRIM(descricao) AND LENGTH(TRIM(descricao)) > 0');
        table.check('status_manutencao = UPPER(status_manutencao) AND status_manutencao = TRIM(status_manutencao) AND LENGTH(TRIM(status_manutencao)) > 0');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.schema.dropTableIfExists('manutencoes');
    await knex.schema.dropTableIfExists('cameras');
    await knex.schema.dropTableIfExists('tvs');
    await knex.schema.dropTableIfExists('equipamentos');
    await knex.schema.dropTableIfExists('usuarios');
    await knex.schema.dropTableIfExists('unidades');
};

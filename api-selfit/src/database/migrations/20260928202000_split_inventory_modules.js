const removedEquipmentColumns = ['modelo', 'mac_address'];

async function hasColumn(knex, table, column) {
  const [rows] = await knex.raw(`
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
  `, [table, column]);
  return rows.length > 0;
}

async function createModuleTable(knex, tableName, defaultCategory) {
  const exists = await knex.schema.hasTable(tableName);
  if (exists) return;

  await knex.schema.createTable(tableName, (table) => {
    table.bigIncrements('id').primary();
    table.integer('unidade_id').unsigned().notNullable()
      .references('id')
      .inTable('unidades')
      .onDelete('RESTRICT');
    table.string('nome_identificacao', 100).notNullable();
    table.string('categoria', 50).notNullable().defaultTo(defaultCategory);
    table.string('marca', 50).notNullable();
    table.string('status', 50).notNullable().defaultTo('ATIVO');
    table.date('data_garantia').notNullable();
    table.timestamp('deleted_at').nullable();
    table.timestamps(true, true);

    table.index(['deleted_at', 'nome_identificacao'], `idx_${tableName}_nome_ativo`);
    table.index(['deleted_at', 'data_garantia'], `idx_${tableName}_garantia`);
  });
}

async function dropForeignKeysForColumn(knex, tableName, columnName) {
  const [constraints] = await knex.raw(`
    SELECT CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
      AND REFERENCED_TABLE_NAME IS NOT NULL
  `, [tableName, columnName]);

  for (const constraint of constraints) {
    await knex.raw('ALTER TABLE ?? DROP FOREIGN KEY ??', [tableName, constraint.CONSTRAINT_NAME]);
  }
}

async function dropChecksReferencing(knex, tableName, columns) {
  const [checks] = await knex.raw(`
    SELECT tc.CONSTRAINT_NAME, cc.CHECK_CLAUSE
    FROM information_schema.TABLE_CONSTRAINTS tc
    JOIN information_schema.CHECK_CONSTRAINTS cc
      ON cc.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA
      AND cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
    WHERE tc.TABLE_SCHEMA = DATABASE()
      AND tc.TABLE_NAME = ?
      AND tc.CONSTRAINT_TYPE = 'CHECK'
  `, [tableName]);

  for (const check of checks) {
    const clause = String(check.CHECK_CLAUSE).toLowerCase();
    if (columns.some((column) => clause.includes(column))) {
      await knex.raw('ALTER TABLE ?? DROP CHECK ??', [tableName, check.CONSTRAINT_NAME]);
    }
  }
}

async function dropIndexesReferencing(knex, tableName, columns) {
  const [indexes] = await knex.raw(`
    SELECT DISTINCT INDEX_NAME
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND INDEX_NAME <> 'PRIMARY'
      AND COLUMN_NAME IN (${columns.map(() => '?').join(',')})
  `, [tableName, ...columns]);

  for (const index of indexes) {
    await knex.raw('ALTER TABLE ?? DROP INDEX ??', [tableName, index.INDEX_NAME]);
  }
}

async function ensureMaintenanceColumns(knex) {
  await dropForeignKeysForColumn(knex, 'manutencoes', 'equipamento_id');

  if (await hasColumn(knex, 'manutencoes', 'equipamento_id')) {
    await knex.raw('ALTER TABLE manutencoes MODIFY equipamento_id BIGINT UNSIGNED NULL');
  }

  const hasItemType = await hasColumn(knex, 'manutencoes', 'item_tipo');
  const hasItemId = await hasColumn(knex, 'manutencoes', 'item_id');

  await knex.schema.alterTable('manutencoes', (table) => {
    if (!hasItemType) table.string('item_tipo', 20).notNullable().defaultTo('EQUIPAMENTO');
    if (!hasItemId) table.bigInteger('item_id').unsigned().nullable();
  });

  if (await hasColumn(knex, 'manutencoes', 'item_id') && await hasColumn(knex, 'manutencoes', 'equipamento_id')) {
    await knex.raw(`
      UPDATE manutencoes
      SET item_tipo = COALESCE(NULLIF(item_tipo, ''), 'EQUIPAMENTO'),
          item_id = COALESCE(item_id, equipamento_id)
      WHERE item_id IS NULL
        AND equipamento_id IS NOT NULL
    `);
  }
}

async function moveLegacyRows(knex, category, targetTable, targetType) {
  const [rows] = await knex.raw(`
    SELECT id, unidade_id, nome_identificacao, categoria, marca, status, data_garantia, deleted_at, created_at, updated_at
    FROM equipamentos
    WHERE categoria = ?
  `, [category]);

  for (const row of rows) {
    const [newId] = await knex(targetTable).insert({
      unidade_id: row.unidade_id,
      nome_identificacao: row.nome_identificacao,
      categoria: row.categoria,
      marca: row.marca,
      status: row.status,
      data_garantia: row.data_garantia,
      deleted_at: row.deleted_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });

    await knex('manutencoes')
      .where({ equipamento_id: row.id })
      .update({
        item_tipo: targetType,
        item_id: newId,
        equipamento_id: null,
      });
  }

  if (rows.length) {
    await knex('equipamentos').where({ categoria }).delete();
  }
}

exports.up = async function (knex) {
  const hasLegacyInventory = await knex.schema.hasTable('equipamentos');
  const hasMaintenance = await knex.schema.hasTable('manutencoes');
  if (!hasLegacyInventory || !hasMaintenance) return;

  await createModuleTable(knex, 'tvs', 'TV');
  await createModuleTable(knex, 'cameras', 'CAMERAS');
  await ensureMaintenanceColumns(knex);

  await moveLegacyRows(knex, 'TV', 'tvs', 'TV');
  await moveLegacyRows(knex, 'CAMERAS', 'cameras', 'CAMERA');

  if (await hasColumn(knex, 'manutencoes', 'tv_id')) {
    await knex.raw(`
      UPDATE manutencoes
      SET item_tipo = 'TV',
          item_id = tv_id
      WHERE tv_id IS NOT NULL
    `);
  }

  if (await hasColumn(knex, 'manutencoes', 'camera_id')) {
    await knex.raw(`
      UPDATE manutencoes
      SET item_tipo = 'CAMERA',
          item_id = camera_id
      WHERE camera_id IS NOT NULL
    `);
  }

  for (const column of ['equipamento_id', 'tv_id', 'camera_id']) {
    if (await hasColumn(knex, 'manutencoes', column)) {
      await dropForeignKeysForColumn(knex, 'manutencoes', column);
      await dropIndexesReferencing(knex, 'manutencoes', [column]);
      await knex.raw('ALTER TABLE ?? DROP COLUMN ??', ['manutencoes', column]);
    }
  }

  await dropChecksReferencing(knex, 'equipamentos', removedEquipmentColumns);
  await dropIndexesReferencing(knex, 'equipamentos', removedEquipmentColumns);

  for (const column of removedEquipmentColumns) {
    if (await hasColumn(knex, 'equipamentos', column)) {
      await knex.raw('ALTER TABLE ?? DROP COLUMN ??', ['equipamentos', column]);
    }
  }
};

exports.down = async function (knex) {
  const hasInventory = await knex.schema.hasTable('equipamentos');
  const hasMaintenance = await knex.schema.hasTable('manutencoes');
  if (!hasInventory || !hasMaintenance) {
    await knex.schema.dropTableIfExists('cameras');
    await knex.schema.dropTableIfExists('tvs');
    return;
  }

  const hasModelo = await hasColumn(knex, 'equipamentos', 'modelo');
  const hasMac = await hasColumn(knex, 'equipamentos', 'mac_address');

  await knex.schema.alterTable('equipamentos', (table) => {
    if (!hasModelo) table.string('modelo', 50).nullable();
    if (!hasMac) table.string('mac_address', 17).nullable();
  });

  const hasItemType = await hasColumn(knex, 'manutencoes', 'item_tipo');
  const hasItemId = await hasColumn(knex, 'manutencoes', 'item_id');

  if (hasItemType || hasItemId) {
    await knex.schema.alterTable('manutencoes', (table) => {
      if (hasItemType) table.dropColumn('item_tipo');
      if (hasItemId) table.dropColumn('item_id');
    });
  }

  await knex.schema.dropTableIfExists('cameras');
  await knex.schema.dropTableIfExists('tvs');
};

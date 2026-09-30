// Arquivo: api-selfit/src/database/migrations/20260928193000_remove_obsolete_equipment_fields.js
// Serve para: migration do banco; cria ou ajusta estrutura necessaria para a API.

const removedColumns = ['numero_serie', 'placa_patrimonio', 'localizacao', 'endereco_ip'];

exports.up = async function (knex) {
  const [checks] = await knex.raw(`
    SELECT tc.CONSTRAINT_NAME, cc.CHECK_CLAUSE
    FROM information_schema.TABLE_CONSTRAINTS tc
    JOIN information_schema.CHECK_CONSTRAINTS cc
      ON cc.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA
      AND cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
    WHERE tc.TABLE_SCHEMA = DATABASE()
      AND tc.TABLE_NAME = 'equipamentos'
      AND tc.CONSTRAINT_TYPE = 'CHECK'
  `);

  for (const check of checks) {
    const clause = String(check.CHECK_CLAUSE).toLowerCase();
    if (removedColumns.some((column) => clause.includes(column))) {
      await knex.raw('ALTER TABLE ?? DROP CHECK ??', ['equipamentos', check.CONSTRAINT_NAME]);
    }
  }

  const [indexes] = await knex.raw(`
    SELECT DISTINCT INDEX_NAME
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'equipamentos'
      AND INDEX_NAME <> 'PRIMARY'
      AND COLUMN_NAME IN (?, ?, ?, ?)
  `, removedColumns);

  for (const index of indexes) {
    await knex.raw('ALTER TABLE ?? DROP INDEX ??', ['equipamentos', index.INDEX_NAME]);
  }

  const [columns] = await knex.raw(`
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'equipamentos'
      AND COLUMN_NAME IN (?, ?, ?, ?)
  `, removedColumns);

  for (const column of columns) {
    await knex.raw('ALTER TABLE ?? DROP COLUMN ??', ['equipamentos', column.COLUMN_NAME]);
  }
};

exports.down = async function (knex) {
  const [columns] = await knex.raw(`
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'equipamentos'
      AND COLUMN_NAME IN (?, ?, ?, ?)
  `, removedColumns);
  const existing = new Set(columns.map((column) => column.COLUMN_NAME));

  await knex.schema.alterTable('equipamentos', (table) => {
    if (!existing.has('numero_serie')) table.string('numero_serie', 100).nullable();
    if (!existing.has('placa_patrimonio')) table.string('placa_patrimonio', 100).nullable();
    if (!existing.has('localizacao')) table.string('localizacao', 100).nullable();
    if (!existing.has('endereco_ip')) table.string('endereco_ip', 45).nullable();
  });

  const [indexes] = await knex.raw(`
    SELECT INDEX_NAME
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'equipamentos'
      AND INDEX_NAME IN ('idx_equip_serie_ativo', 'idx_patrimonio_ativo', 'equipamentos_numero_serie_unique', 'equipamentos_placa_patrimonio_unique')
  `);
  const existingIndexes = new Set(indexes.map((index) => index.INDEX_NAME));

  if (!existingIndexes.has('equipamentos_numero_serie_unique')) {
    await knex.schema.alterTable('equipamentos', (table) => table.unique(['numero_serie']));
  }
  if (!existingIndexes.has('equipamentos_placa_patrimonio_unique')) {
    await knex.schema.alterTable('equipamentos', (table) => table.unique(['placa_patrimonio']));
  }
  if (!existingIndexes.has('idx_equip_serie_ativo')) {
    await knex.schema.alterTable('equipamentos', (table) => table.index(['deleted_at', 'numero_serie'], 'idx_equip_serie_ativo'));
  }
  if (!existingIndexes.has('idx_patrimonio_ativo')) {
    await knex.schema.alterTable('equipamentos', (table) => table.index(['deleted_at', 'placa_patrimonio'], 'idx_patrimonio_ativo'));
  }
};

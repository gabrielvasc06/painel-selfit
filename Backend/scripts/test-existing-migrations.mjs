import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { mysql, connectionOptions, requireApi } from './database/context.mjs';
const { IDENTIFICADOR_NAO_INFORMADO } = requireApi('./src/models/regras/identificadores');

// Le a base selecionada, mas executa DDL e migrations exclusivamente numa copia
// temporaria criada por este processo. Os registros nunca sao impressos.
const options = { ...connectionOptions(), dateStrings: true };
const schema = `selfit_deploy_test_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
const source = await mysql.createConnection(options);
let target, knex, created = false;
try {
  const [[{ DEFAULT_COLLATION_NAME: collation }]] = await source.query(
    'SELECT DEFAULT_COLLATION_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = DATABASE()');
  await source.query('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE ??', [schema, collation]);
  created = true;
  target = await mysql.createConnection({ ...options, database: schema });
  const [tables] = await source.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME");
  await source.beginTransaction();
  await target.query('SET FOREIGN_KEY_CHECKS = 0');
  const snapshot = new Map();
  for (const { TABLE_NAME: table } of tables) {
    const [[ddl]] = await source.query('SHOW CREATE TABLE ??', [table]);
    await target.query(ddl['Create Table']);
    const [rows] = await source.query('SELECT * FROM ?? ORDER BY 1', [table]);
    if (!table.startsWith('knex_')) snapshot.set(table, rows);
    for (const row of rows) await target.query('INSERT INTO ?? SET ?', [table, row]);
  }
  await source.commit();
  await target.query('SET FOREIGN_KEY_CHECKS = 1');
  knex = requireApi('knex')({ client: 'mysql2', connection: { ...options, database: schema },
    migrations: requireApi('./knexfile').development.migrations });
  const [, applied] = await knex.migrate.latest();
  const [, repeated] = await knex.migrate.latest();
  assert.equal(repeated.length, 0, 'A segunda execucao deve ser idempotente');
  for (const [table, rows] of snapshot) {
    const [actual] = await target.query('SELECT * FROM ?? ORDER BY 1', [table]);
    // Comparamos os valores antigos, permitindo apenas a substituicao solicitada
    // de identificadores null/vazios pelo texto padrao. Numeros reais ficam intactos.
    const columns = rows.length ? Object.keys(rows[0]) : [];
    const previousValues = actual.map((row) => Object.fromEntries(columns.map((column) => [column, row[column]])));
    const inventory = ['equipamentos', 'tvs', 'cameras'].includes(table);
    const expected = rows.map((row) => Object.fromEntries(Object.entries(row).map(([column, value]) => [column,
      inventory && ['numero_serie', 'numero_patrimonio'].includes(column) && (value == null || value.trim() === '')
        ? IDENTIFICADOR_NAO_INFORMADO : value])));
    assert.deepEqual(previousValues, expected, `Somente identificadores ausentes de ${table} podem receber o texto padrao`);
    if (['equipamentos', 'tvs', 'cameras'].includes(table)) {
      for (const column of ['numero_serie', 'numero_patrimonio']) {
        if (!columns.includes(column)) assert.ok(actual.every((row) => row[column] === IDENTIFICADOR_NAO_INFORMADO), `${column} deve receber o texto padrao`);
        const [[metadata]] = await target.query('SELECT COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?', [table, column]);
        assert.equal(metadata.COLUMN_DEFAULT, IDENTIFICADOR_NAO_INFORMADO, `${column} deve ter default no MySQL`);
      }
    }
  }
  console.log(`OK: copia de ${options.database}; ${snapshot.size} tabelas conferidas; somente identificadores ausentes podem mudar; ${applied.length} migrations aplicadas; segunda execucao sem alteracoes.`);
} finally {
  if (knex) await knex.destroy();
  if (target) await target.end();
  // Somente o schema aleatorio criado acima pode ser removido pelo teste.
  if (created) await source.query('DROP DATABASE ??', [schema]);
  await source.end();
}

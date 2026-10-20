import { databaseTask } from './context.mjs';

// Somente leitura. Schemas internos do MySQL nunca sao candidatos a limpeza.
await databaseTask(async (db) => {
  const [schemas] = await db.query('SHOW DATABASES');
  const [tables] = await db.query(`SELECT TABLE_NAME, ENGINE, TABLE_COLLATION
    FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME`);
  const [migrations] = await db.query('SELECT name FROM knex_migrations ORDER BY id');
  const counts = {};
  for (const { TABLE_NAME } of tables) {
    const [[row]] = await db.query('SELECT COUNT(*) AS total FROM ??', [TABLE_NAME]);
    counts[TABLE_NAME] = Number(row.total);
  }
  console.log(JSON.stringify({ database: process.env.DB_DATABASE,
    schemas: schemas.map((row) => Object.values(row)[0]), tables, counts,
    migrations: migrations.map((row) => row.name) }, null, 2));
});

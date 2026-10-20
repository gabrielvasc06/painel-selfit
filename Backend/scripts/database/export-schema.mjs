import fs from 'node:fs/promises';
import path from 'node:path';
import { databaseTask, root } from './context.mjs';

const filename = process.argv[2];
if (!['principal.sql', 'homologacao.sql'].includes(filename)) {
  throw new Error('Informe principal.sql ou homologacao.sql como nome do snapshot.');
}

await databaseTask(async (db) => {
  const statements = [
    '-- Painel Selfit: snapshot estrutural, sem dados ou credenciais.',
    `-- Origem: ${process.env.DB_DATABASE.replace(/[^a-zA-Z0-9_]/g, '')}.`,
    '-- Referencia para revisao. Instale/atualize com npm run api:migrate.',
    '-- Nao importar sobre uma base existente. Historico Knex deliberadamente omitido.',
    'SET NAMES utf8mb4;',
  ];
  // Ordem explicita respeita as FKs. Tabelas internas do Knex nao sao modelo de negocio.
  for (const table of ['unidades', 'usuarios', 'equipamentos', 'tvs', 'cameras', 'manutencoes']) {
    const [[row]] = await db.query('SHOW CREATE TABLE ??', [table]);
    statements.push(row['Create Table'].replace(/ AUTO_INCREMENT=\d+/g, '') + ';');
  }
  const target = path.join(root, 'database/schemas', filename);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, statements.join('\n\n') + '\n');
  console.log(`Estrutura exportada: database/schemas/${filename}`);
});

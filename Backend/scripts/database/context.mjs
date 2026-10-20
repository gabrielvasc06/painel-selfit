import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const requireApi = createRequire(path.join(root, 'Backend/package.json'));
requireApi('./src/config/env');
export const mysql = requireApi('mysql2/promise');
export const { connectionOptions } = requireApi('./src/config/database-options');

export async function databaseTask(task) {
  let database;
  try {
    database = await mysql.createConnection(connectionOptions());
    await task(database);
  } catch (error) {
    // Nao imprimir objetos de conexao nem SQL com valores de usuarios.
    console.error('Operacao de banco falhou:', error.code || error.message);
    process.exitCode = 1;
  } finally {
    if (database) await database.end();
  }
}

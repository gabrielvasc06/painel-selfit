// Arquivo: scripts/fix-unidades-numeros.mjs
// Serve para: corrige numeros de unidades auditadas no banco.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const apiDir = path.join(rootDir, 'api-selfit');
const requireFromApi = createRequire(path.join(apiDir, 'package.json'));
const dotenv = requireFromApi('dotenv');
const mysql = requireFromApi('mysql2/promise');

dotenv.config({ path: path.join(apiDir, '.env'), quiet: true });

const updates = [
  { id: 152, nome: 'PARALELA', numero: '3056', origem: 'CNPJ 22.902.694/0004-38' },
  { id: 368, nome: 'DANIEL DE LA TOUCHE', numero: '1', origem: 'CNPJ 22.902.694/0051-54' },
  { id: 233, nome: 'TIMON', numero: '130', origem: 'CNPJ 22.902.694/0142-26' },
  { id: 278, nome: 'GUANABARA', numero: '141-A', origem: 'CNPJ 22.902.694/0189-90; KM 03 fica como complemento cadastral externo' },
  { id: 174, nome: 'SUPER FACIL', numero: '1443', origem: 'CNPJ 22.902.694/0062-07' },
  { id: 212, nome: 'INDIANOPOLIS', numero: '120', origem: 'CNPJ 22.902.694/0117-15' },
  { id: 253, nome: 'LOURIVAL PARENTE', numero: 'S/N', origem: 'CNPJ 22.902.694/0163-50 informa numero 0' },
  { id: 242, nome: 'PARNAIBA 1', numero: 'S/N', origem: 'CNPJ 22.902.694/0151-17 informa numero 00000' },
  { id: 243, nome: 'PARNAIBA 2', numero: 'S/N', origem: 'CNPJ 22.902.694/0152-06 informa numero 00000' },
  { id: 367, nome: 'BARAO DE ITAMBI', numero: '50', origem: 'CNPJ 22.902.694/0050-73' },
  { id: 379, nome: 'CONDE DO BONFIM', numero: '186', origem: 'CNPJ 22.902.694/0065-50' },
  { id: 377, nome: 'OLARIA', numero: '666', origem: 'CNPJ 22.902.694/0063-98' },
];

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

try {
  await connection.beginTransaction();

  const report = [];
  for (const item of updates) {
    const [rows] = await connection.query(
      'SELECT id, nome, uf, rua, numero FROM unidades WHERE id = ? FOR UPDATE',
      [item.id],
    );
    if (!rows.length) throw new Error(`Unidade id ${item.id} nao encontrada.`);

    const before = rows[0];
    await connection.query(
      'UPDATE unidades SET numero = ? WHERE id = ?',
      [item.numero, item.id],
    );

    report.push({
      id: item.id,
      nome_banco: before.nome,
      uf: before.uf,
      rua: before.rua,
      numero_anterior: before.numero,
      numero_corrigido: item.numero,
      origem: item.origem,
    });
  }

  await connection.commit();
  console.log(JSON.stringify({ status: 'OK', atualizadas: report.length, unidades: report }, null, 2));
} catch (error) {
  await connection.rollback();
  console.error(JSON.stringify({ status: 'FALHOU', erro: error.message }, null, 2));
  process.exitCode = 1;
} finally {
  await connection.end();
}

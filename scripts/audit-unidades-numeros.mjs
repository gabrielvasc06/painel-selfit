// Arquivo: scripts/audit-unidades-numeros.mjs
// Serve para: lista unidades com numero vazio, somente zeros ou zero a esquerda.

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

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

try {
  const [suspeitas] = await connection.query(`
    SELECT id, nome, cnpj, cep, uf, bairro, rua, numero
    FROM unidades
    WHERE numero IS NULL
       OR TRIM(numero) = ''
       OR numero REGEXP '^0+$'
       OR numero REGEXP '^0+[1-9]'
    ORDER BY uf, nome
  `);

  const [resumo] = await connection.query(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN numero IS NULL OR TRIM(numero) = '' THEN 1 ELSE 0 END) AS vazios,
      SUM(CASE WHEN numero REGEXP '^0+$' THEN 1 ELSE 0 END) AS somente_zeros,
      SUM(CASE WHEN numero REGEXP '^0+[1-9]' THEN 1 ELSE 0 END) AS zero_a_esquerda
    FROM unidades
  `);

  console.log(JSON.stringify({
    resumo: resumo[0],
    suspeitas_total: suspeitas.length,
    suspeitas,
  }, null, 2));
} finally {
  await connection.end();
}

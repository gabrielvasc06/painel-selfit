import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mysql = require('../api-selfit/node_modules/mysql2/promise');

function parseEnv(envPath) {
  const values = {};
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  return values;
}

async function one(db, sql, params = []) {
  const [rows] = await db.query(sql, params);
  return rows[0] ?? {};
}

async function all(db, sql, params = []) {
  const [rows] = await db.query(sql, params);
  return rows;
}

const env = parseEnv('./api-selfit/.env');
const db = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT ?? 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
});

const schema = env.DB_DATABASE;
const obsoleteEquipmentColumns = await all(db, `
  SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = ?
     AND TABLE_NAME = 'equipamentos'
     AND COLUMN_NAME IN ('modelo', 'mac_address', 'numero_serie', 'placa_patrimonio', 'localizacao', 'endereco_ip')
   ORDER BY COLUMN_NAME
`, [schema]);

const maintenanceColumns = await all(db, `
  SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = ?
     AND TABLE_NAME = 'manutencoes'
     AND COLUMN_NAME IN ('item_tipo', 'item_id', 'equipamento_id', 'tv_id', 'camera_id')
   ORDER BY COLUMN_NAME
`, [schema]);
const maintenanceColumnSet = new Set(maintenanceColumns.map((column) => column.COLUMN_NAME));
const hasMaintenanceItemColumns = maintenanceColumnSet.has('item_tipo') && maintenanceColumnSet.has('item_id');

const counts = {
  unidades: await one(db, "SELECT COUNT(*) AS total FROM unidades WHERE tipo_unidade = 'PROPRIA'"),
  unidades_invalidas: await all(db, `
    SELECT id, nome, tipo_unidade, uf
      FROM unidades
     WHERE tipo_unidade <> 'PROPRIA'
        OR uf IS NULL
        OR CHAR_LENGTH(TRIM(uf)) <> 2
        OR UPPER(nome) LIKE '%FRANQUIA%'
        OR UPPER(nome) LIKE '%HOLDING%'
        OR UPPER(nome) LIKE '%MATRIZ%'
        OR UPPER(nome) LIKE '%WEBURN%'
        OR UPPER(nome) LIKE '%WE BURN%'
        OR UPPER(nome) LIKE '%GALP%'
     ORDER BY nome
  `),
  tvs: await one(db, 'SELECT COUNT(*) AS total, SUM(deleted_at IS NULL) AS ativas, SUM(deleted_at IS NOT NULL) AS removidas FROM tvs'),
  equipamentos: await one(db, 'SELECT COUNT(*) AS total, SUM(deleted_at IS NULL) AS ativos, SUM(deleted_at IS NOT NULL) AS removidos FROM equipamentos'),
  cameras: await one(db, 'SELECT COUNT(*) AS total, SUM(deleted_at IS NULL) AS ativas, SUM(deleted_at IS NOT NULL) AS removidas FROM cameras'),
  manutencoes: await one(db, 'SELECT COUNT(*) AS total, SUM(status_manutencao = "ABERTA") AS abertas FROM manutencoes'),
};

const misplaced = {
  tvs_na_tabela_equipamentos: await all(db, `
    SELECT id, nome_identificacao, categoria, unidade_id, deleted_at
      FROM equipamentos
     WHERE categoria = 'TV'
     ORDER BY id
  `),
  cameras_na_tabela_equipamentos: await all(db, `
    SELECT id, nome_identificacao, categoria, unidade_id, deleted_at
      FROM equipamentos
     WHERE categoria IN ('CAMERA', 'CAMERAS')
     ORDER BY id
  `),
  categorias_invalidas_em_equipamentos: await all(db, `
    SELECT id, nome_identificacao, categoria, unidade_id, deleted_at
      FROM equipamentos
     WHERE categoria NOT IN ('TOTEM', 'CATRACA', 'LEITOR_FACIAL', 'ACCESS_POINT', 'IMPRESSORA', 'SWITCH', 'FIREWALL', 'ROTEADOR', 'NOBREAK')
     ORDER BY id
  `),
  categorias_invalidas_em_tvs: await all(db, `
    SELECT id, nome_identificacao, categoria, unidade_id, deleted_at
      FROM tvs
     WHERE categoria <> 'TV'
     ORDER BY id
  `),
  categorias_invalidas_em_cameras: await all(db, `
    SELECT id, nome_identificacao, categoria, unidade_id, deleted_at
      FROM cameras
     WHERE categoria <> 'CAMERAS'
     ORDER BY id
  `),
};

const orphanItems = {
  tvs_sem_unidade: await all(db, `
    SELECT t.id, t.nome_identificacao, t.unidade_id
      FROM tvs t
      LEFT JOIN unidades u ON u.id = t.unidade_id
     WHERE u.id IS NULL
     ORDER BY t.id
  `),
  equipamentos_sem_unidade: await all(db, `
    SELECT e.id, e.nome_identificacao, e.unidade_id
      FROM equipamentos e
      LEFT JOIN unidades u ON u.id = e.unidade_id
     WHERE u.id IS NULL
     ORDER BY e.id
  `),
  cameras_sem_unidade: await all(db, `
    SELECT c.id, c.nome_identificacao, c.unidade_id
      FROM cameras c
      LEFT JOIN unidades u ON u.id = c.unidade_id
     WHERE u.id IS NULL
     ORDER BY c.id
  `),
};

const maintenanceProblems = hasMaintenanceItemColumns
  ? {
      tipos_invalidos: await all(db, `
        SELECT id, item_tipo, item_id, descricao, status_manutencao
          FROM manutencoes
         WHERE item_tipo NOT IN ('EQUIPAMENTO', 'TV', 'CAMERA')
            OR item_id IS NULL
         ORDER BY id
      `),
      equipamento_inexistente: await all(db, `
        SELECT m.id, m.item_tipo, m.item_id, m.descricao
          FROM manutencoes m
          LEFT JOIN equipamentos e ON m.item_tipo = 'EQUIPAMENTO' AND m.item_id = e.id
         WHERE m.item_tipo = 'EQUIPAMENTO'
           AND e.id IS NULL
         ORDER BY m.id
      `),
      tv_inexistente: await all(db, `
        SELECT m.id, m.item_tipo, m.item_id, m.descricao
          FROM manutencoes m
          LEFT JOIN tvs t ON m.item_tipo = 'TV' AND m.item_id = t.id
         WHERE m.item_tipo = 'TV'
           AND t.id IS NULL
         ORDER BY m.id
      `),
      camera_inexistente: await all(db, `
        SELECT m.id, m.item_tipo, m.item_id, m.descricao
          FROM manutencoes m
          LEFT JOIN cameras c ON m.item_tipo = 'CAMERA' AND m.item_id = c.id
         WHERE m.item_tipo = 'CAMERA'
           AND c.id IS NULL
         ORDER BY m.id
      `),
      abertas_apontando_item_excluido: await all(db, `
        SELECT m.id, m.item_tipo, m.item_id, m.descricao, m.status_manutencao
          FROM manutencoes m
          LEFT JOIN equipamentos e ON m.item_tipo = 'EQUIPAMENTO' AND m.item_id = e.id
          LEFT JOIN tvs t ON m.item_tipo = 'TV' AND m.item_id = t.id
          LEFT JOIN cameras c ON m.item_tipo = 'CAMERA' AND m.item_id = c.id
         WHERE m.status_manutencao = 'ABERTA'
           AND (
             (m.item_tipo = 'EQUIPAMENTO' AND e.deleted_at IS NOT NULL)
             OR (m.item_tipo = 'TV' AND t.deleted_at IS NOT NULL)
             OR (m.item_tipo = 'CAMERA' AND c.deleted_at IS NOT NULL)
           )
         ORDER BY m.id
      `),
    }
  : {
      estrutura_incompativel: [{
        esperado: 'manutencoes.item_tipo e manutencoes.item_id',
        encontrado: maintenanceColumns.map((column) => column.COLUMN_NAME).join(', ') || 'nenhuma coluna de referencia',
        impacto: 'O backend atual registra e consulta manutencoes por item_tipo/item_id; sem essas colunas a API de manutencoes pode falhar.',
      }],
    };

const byUnit = await all(db, `
  SELECT u.id, u.nome, u.uf,
         COUNT(DISTINCT t.id) AS tvs_ativas,
         COUNT(DISTINCT e.id) AS equipamentos_ativos,
         COUNT(DISTINCT c.id) AS cameras_ativas
    FROM unidades u
    LEFT JOIN tvs t ON t.unidade_id = u.id AND t.deleted_at IS NULL
    LEFT JOIN equipamentos e ON e.unidade_id = u.id AND e.deleted_at IS NULL
    LEFT JOIN cameras c ON c.unidade_id = u.id AND c.deleted_at IS NULL
   WHERE u.tipo_unidade = 'PROPRIA'
   GROUP BY u.id, u.nome, u.uf
   ORDER BY u.nome
`);

function size(value) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') return Object.values(value).reduce((total, child) => total + size(child), 0);
  return 0;
}

const problems = {
  colunas_obsoletas_equipamentos: obsoleteEquipmentColumns,
  colunas_manutencao_presentes: maintenanceColumns,
  unidades_invalidas: counts.unidades_invalidas,
  itens_em_tabela_errada: misplaced,
  itens_sem_unidade: orphanItems,
  manutencoes_inconsistentes: maintenanceProblems,
};

const problemCount =
  obsoleteEquipmentColumns.length
  + (hasMaintenanceItemColumns ? 0 : 1)
  + counts.unidades_invalidas.length
  + size(misplaced)
  + size(orphanItems)
  + size(maintenanceProblems);

console.log(JSON.stringify({
  status: problemCount === 0 ? 'OK' : 'VERIFICAR',
  problemas_encontrados: problemCount,
  contagens: counts,
  problemas: problemCount === 0 ? 'Nenhuma divergencia encontrada.' : problems,
  unidades_com_itens_ativos: byUnit.filter((unit) => unit.tvs_ativas || unit.equipamentos_ativos || unit.cameras_ativas),
}, null, 2));

await db.end();

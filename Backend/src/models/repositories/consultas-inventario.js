
const { IDENTIFICADOR_NAO_INFORMADO } = require('../regras/identificadores');

// Os nomes SQL sao internos. Nunca interpolar uma tabela/coluna recebida do cliente.
const MODULES = [
    ['equipamentos', 'e', 'EQUIPAMENTO'],
    ['tvs', 't', 'TV'],
    ['cameras', 'c', 'CAMERA'],
];

function itemSelect(alias, type) {
    return `SELECT CONCAT('${type}:', ${alias}.id) AS id,
        ${alias}.id AS raw_id, '${type}' AS tipo_modulo, ${alias}.unidade_id,
        u.nome AS unidade_nome, u.cnpj AS unidade_cnpj, u.cep AS unidade_cep, u.uf,
        ${alias}.nome_identificacao, ${alias}.categoria, ${alias}.marca,
        ${alias}.numero_serie, ${alias}.numero_patrimonio,
        ${alias}.status, ${alias}.data_garantia, ${alias}.created_at, ${alias}.updated_at`;
}

function inventoryUnion() {
    // UNION ALL preserva itens diferentes com o mesmo ID numerico entre modulos.
    return MODULES.map(([table, alias, type]) => `
        ${itemSelect(alias, type)} FROM ${table} ${alias}
        JOIN unidades u ON ${alias}.unidade_id = u.id
        WHERE ${alias}.deleted_at IS NULL`).join(' UNION ALL ');
}

function maintenanceUnion() {
    return MODULES.map(([table, alias, type]) => `SELECT
        CONCAT('${type}:', ${alias}.id) AS id, ${alias}.id AS raw_id,
        '${type}' AS tipo_modulo, u.nome AS unidade_nome, u.cnpj AS unidade_cnpj,
        u.cep AS unidade_cep, u.uf, ${alias}.nome_identificacao, ${alias}.categoria,
        ${alias}.marca, ${alias}.status AS status_equipamento,
        ${alias}.numero_serie, ${alias}.numero_patrimonio,
        m.id AS manutencao_id, CONCAT('${type}:', ${alias}.id) AS equipamento_id,
        m.descricao AS descricao_manutencao, m.data_envio, m.data_retorno,
        m.custo, m.status_manutencao
        FROM manutencoes m
        JOIN ${table} ${alias} ON m.item_tipo = '${type}' AND m.item_id = ${alias}.id
        JOIN unidades u ON ${alias}.unidade_id = u.id
        WHERE ${alias}.deleted_at IS NULL`).join(' UNION ALL ');
}

async function listInventory(mysql, { busca = '', tipo = '', view = 'inventory' } = {}) {
    const maintenance = view === 'maintenance';
    const source = maintenance ? maintenanceUnion() : inventoryUnion();
    let query = `SELECT * FROM (${source}) inventario WHERE 1 = 1`;
    const params = [];
    if (tipo) {
        query += ' AND tipo_modulo = ?';
        params.push(tipo);
    }
    if (busca) {
        const columns = view === 'inventory'
            ? ['nome_identificacao', 'categoria', 'marca', 'unidade_nome', 'unidade_cep', 'unidade_cnpj', 'numero_serie', 'numero_patrimonio']
            : ['unidade_nome', 'unidade_cep', 'unidade_cnpj', 'numero_serie', 'numero_patrimonio'];
        const conditions = columns.map((column) => `${column} LIKE ?`);
        params.push(...columns.map(() => `%${busca}%`));
        const digits = busca.replace(/\D/g, '');
        if (digits.length >= 3) {
            conditions.push("REPLACE(REPLACE(REPLACE(unidade_cnpj, '.', ''), '/', ''), '-', '') LIKE ?");
            params.push(`%${digits}%`);
        }
        query += ` AND (${conditions.join(' OR ')})`;
    }
    const order = maintenance ? 'data_envio DESC' : view === 'warranties' ? 'data_garantia ASC' : 'nome_identificacao ASC';
    const [rows] = await mysql.query(`${query} ORDER BY ${order}`, params);
    // O banco guarda o texto solicitado. Na API, ausencia continua sendo null:
    // isso preserva o checkbox "Nao possui" e o contrato dos clientes atuais.
    return rows.map((row) => ({ ...row,
        numero_serie: row.numero_serie === IDENTIFICADOR_NAO_INFORMADO ? null : row.numero_serie,
        numero_patrimonio: row.numero_patrimonio === IDENTIFICADOR_NAO_INFORMADO ? null : row.numero_patrimonio,
    }));
}

module.exports = { listInventory };

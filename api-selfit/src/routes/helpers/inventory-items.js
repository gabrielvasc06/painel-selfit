// Arquivo: api-selfit/src/routes/helpers/inventory-items.js
// Serve para: resolve categorias, tabelas e ids prefixados de TV, camera e equipamento.

const ITEM_TABLES = {
    EQUIPAMENTO: {
        table: 'equipamentos',
        idColumn: 'equipamento_id',
        category: null,
    },
    TV: {
        table: 'tvs',
        idColumn: 'tv_id',
        category: 'TV',
    },
    CAMERA: {
        table: 'cameras',
        idColumn: 'camera_id',
        category: 'CAMERAS',
    },
};

// Categorias que pertencem ao modulo "Equipamentos".
// TV e CAMERA sao tratadas em tabelas proprias para nao misturar os modulos.
const EQUIPMENT_CATEGORIES = new Set([
    'TOTEM',
    'CATRACA',
    'LEITOR_FACIAL',
    'ACCESS_POINT',
    'IMPRESSORA',
    'SWITCH',
    'FIREWALL',
    'ROTEADOR',
    'NOBREAK',
]);

function normalizeText(value) {
    return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function resolveItemType(category) {
    const normalized = normalizeText(category);
    if (normalized === 'TV') return 'TV';
    if (normalized === 'CAMERAS' || normalized === 'CAMERA') return 'CAMERA';
    return 'EQUIPAMENTO';
}

function assertAllowedCategory(category) {
    const normalized = normalizeText(category);
    const type = resolveItemType(normalized);
    if (type === 'EQUIPAMENTO' && !EQUIPMENT_CATEGORIES.has(normalized)) {
        return false;
    }
    return Boolean(normalized);
}

function parseItemRef(value) {
    // O front trafega identificadores prefixados, ex.: TV:1, CAMERA:3.
    // Isso evita ambiguidade porque tabelas diferentes podem ter o mesmo id numerico.
    const text = String(value ?? '').trim().toUpperCase();
    const match = text.match(/^(TV|CAMERA|EQUIPAMENTO):(\d+)$/);
    if (match) return { tipo: match[1], id: Number(match[2]) };
    if (/^\d+$/.test(text)) return { tipo: 'EQUIPAMENTO', id: Number(text) };
    return null;
}

function prefixedId(type, id) {
    return `${type}:${id}`;
}

function tableForType(type) {
    return ITEM_TABLES[type] ?? null;
}

function itemSelect(tableAlias, unitAlias, type, categoryExpression) {
    return `
        SELECT
            CONCAT('${type}:', ${tableAlias}.id) AS id,
            ${tableAlias}.id AS raw_id,
            '${type}' AS tipo_modulo,
            ${tableAlias}.unidade_id,
            ${unitAlias}.nome AS unidade_nome,
            ${unitAlias}.cnpj AS unidade_cnpj,
            ${unitAlias}.cep AS unidade_cep,
            ${unitAlias}.uf,
            ${tableAlias}.nome_identificacao,
            ${categoryExpression} AS categoria,
            ${tableAlias}.marca,
            ${tableAlias}.status,
            ${tableAlias}.data_garantia,
            ${tableAlias}.created_at,
            ${tableAlias}.updated_at
        `;
}

module.exports = {
    EQUIPMENT_CATEGORIES,
    assertAllowedCategory,
    itemSelect,
    normalizeText,
    parseItemRef,
    prefixedId,
    resolveItemType,
    tableForType,
};

// Arquivo: Backend/src/models/regras/equipamentos.js
// Serve para: resolve categorias e ids prefixados de TV, camera e equipamento.

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
    if (match && Number.isSafeInteger(Number(match[2])) && Number(match[2]) > 0) return { tipo: match[1], id: Number(match[2]) };
    if (/^\d+$/.test(text) && Number.isSafeInteger(Number(text)) && Number(text) > 0) return { tipo: 'EQUIPAMENTO', id: Number(text) };
    return null;
}

module.exports = {
    EQUIPMENT_CATEGORIES,
    assertAllowedCategory,
    normalizeText,
    parseItemRef,
    resolveItemType,
};

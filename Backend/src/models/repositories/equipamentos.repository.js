const { listInventory } = require('./consultas-inventario');

// Apenas este adaptador conhece as tabelas fisicas. O dominio usa tipos de item.
const tables = Object.freeze({ EQUIPAMENTO: 'equipamentos', TV: 'tvs', CAMERA: 'cameras' });
function table(type) {
    if (!Object.hasOwn(tables, type)) throw new Error('Tipo de item invalido.');
    return tables[type];
}
function createInventoryRepository(database) {
    return {
        list: (filters) => listInventory(database, filters),
        async findActive(ref) {
            const [rows] = await database.query('SELECT id, unidade_id FROM ?? WHERE id = ? AND deleted_at IS NULL', [table(ref.tipo), ref.id]);
            return rows[0] ?? null;
        },
        async create(type, item) {
            const [result] = await database.query('INSERT INTO ?? SET ?', [table(type), item]);
            return result.insertId;
        },
        async update(ref, values) {
            await database.query('UPDATE ?? SET ? WHERE id = ? AND deleted_at IS NULL', [table(ref.tipo), values, ref.id]);
        },
        async softDelete(ref) {
            await database.query('UPDATE ?? SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL', [table(ref.tipo), ref.id]);
        },
    };
}
module.exports = { createInventoryRepository };

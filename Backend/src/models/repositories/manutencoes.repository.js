function createMaintenanceRepository(database) {
    return {
        async findById(id) {
            const [rows] = await database.query('SELECT id FROM manutencoes WHERE id = ?', [id]);
            return rows[0] ?? null;
        },
        async create(maintenance) {
            const [result] = await database.query('INSERT INTO manutencoes SET ?', [maintenance]);
            return result.insertId;
        },
        async update(id, values) {
            await database.query('UPDATE manutencoes SET ? WHERE id = ?', [values, id]);
        },
        async remove(id) {
            // Mantem o contrato existente: manutencao e excluida fisicamente;
            // ativos do inventario usam exclusao logica em outro repositorio.
            const [result] = await database.query('DELETE FROM manutencoes WHERE id = ?', [id]);
            return result.affectedRows > 0;
        },
    };
}
module.exports = { createMaintenanceRepository };

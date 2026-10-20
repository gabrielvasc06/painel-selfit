function createUserRepository(database) {
    return {
        async findByLogin(usuario) {
            const [rows] = await database.query('SELECT id, usuario, senha_hash FROM usuarios WHERE usuario = ? LIMIT 1', [usuario]);
            return rows[0] ?? null;
        },
        async exists(id, usuario) {
            const [rows] = await database.query('SELECT id FROM usuarios WHERE id = ? AND usuario = ? LIMIT 1', [id, usuario]);
            return rows.length > 0;
        },
        async create(user) {
            const [result] = await database.query('INSERT INTO usuarios SET ?', [user]);
            return result.insertId;
        },
    };
}
module.exports = { createUserRepository };

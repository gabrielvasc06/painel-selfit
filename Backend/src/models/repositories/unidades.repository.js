const { BusinessError } = require('../regras/erro-negocio');
const digits = (value) => String(value).replace(/\D/g, '');
const normalizedCnpj = "REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', '')";
const fields = ['nome', 'tipo_unidade', 'cnpj', 'cep', 'uf', 'bairro', 'rua', 'numero'];
// Nao encaminhar propriedades de req.body ao SQL: somente as colunas do contrato.
const record = (unit) => Object.fromEntries(fields.map((field) => [field, unit[field]]));

function createUnitRepository(database) {
    return {
        async findById(id) {
            const [rows] = await database.query('SELECT id FROM unidades WHERE id = ?', [id]);
            return rows[0] ?? null;
        },
        async findByName(name, uf) {
            const [rows] = await database.query(`SELECT id FROM unidades WHERE nome = ?${uf ? ' AND uf = ?' : ''}`, uf ? [name, uf] : [name]);
            return rows;
        },
        async findByCnpj(cnpj, exceptId) {
            const [rows] = await database.query(`SELECT id FROM unidades WHERE ${normalizedCnpj} = ?${exceptId ? ' AND id <> ?' : ''} LIMIT 1`, exceptId ? [digits(cnpj), exceptId] : [digits(cnpj)]);
            return rows[0] ?? null;
        },
        async list({ busca = '', prefixo = '', uf = '' } = {}) {
            const conditions = ["tipo_unidade = 'PROPRIA'"];
            const params = [], orderParams = [];
            if (prefixo) {
                conditions.push('nome LIKE ?'); params.push(`${prefixo}%`);
            } else if (busca) {
                const columns = ['nome', 'tipo_unidade', 'cnpj', 'cep', 'bairro', 'rua', 'numero'];
                const search = columns.map((column) => `${column} LIKE ?`);
                params.push(...columns.map(() => `%${busca}%`));
                const numeric = digits(busca);
                if (numeric.length >= 3) { search.push(`${normalizedCnpj} LIKE ?`); params.push(`%${numeric}%`); }
                conditions.push(`(${search.join(' OR ')})`);
                orderParams.push(`${busca}%`);
            }
            if (uf) { conditions.push('uf = ?'); params.push(uf); }
            const order = busca && !prefixo ? 'CASE WHEN nome LIKE ? THEN 0 ELSE 1 END, nome ASC' : 'nome ASC';
            const [rows] = await database.query(`SELECT id, nome, tipo_unidade, cnpj, cep, uf, bairro, rua, numero, created_at, updated_at
                FROM unidades WHERE ${conditions.join(' AND ')} ORDER BY ${order}`, [...params, ...orderParams]);
            return rows;
        },
        async create(unit) {
            const [result] = await database.query('INSERT INTO unidades SET ?', [record(unit)]);
            return result.insertId;
        },
        async update(id, unit) {
            await database.query('UPDATE unidades SET ? WHERE id = ?', [record(unit), id]);
        },
        async remove(id) {
            try {
                const [result] = await database.query('DELETE FROM unidades WHERE id = ?', [id]);
                return result.affectedRows > 0;
            } catch (error) {
                if (error.code === 'ER_ROW_IS_REFERENCED_2') throw new BusinessError('CONFLICT', 'A unidade possui equipamentos vinculados e nao pode ser removida.');
                throw error;
            }
        },
        async importBatch(units) {
            const connection = await database.getConnection();
            try {
                await connection.beginTransaction();
                const cnpjs = units.map((unit) => digits(unit.cnpj));
                const [existing] = await connection.query(`SELECT cnpj FROM unidades WHERE ${normalizedCnpj} IN (${cnpjs.map(() => '?').join(',')})`, cnpjs);
                if (existing.length) {
                    const registered = new Set(existing.map((unit) => digits(unit.cnpj)));
                    const duplicate = units.find((unit) => registered.has(digits(unit.cnpj)));
                    await connection.rollback();
                    return { duplicate };
                }
                // Todas as insercoes compartilham a conexao e a transacao. Uma
                // falha na ultima linha desfaz tambem as linhas anteriores.
                for (const unit of units) await connection.query('INSERT INTO unidades SET ?', [record(unit)]);
                await connection.commit();
                return { duplicate: null };
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally { connection.release(); }
        },
    };
}
module.exports = { createUnitRepository };

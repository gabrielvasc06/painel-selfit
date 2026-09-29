const express = require('express');
const mysql = require('../../config/db');
const { itemSelect } = require('../helpers/inventory-items');

const router = express.Router();

function inventoryUnion() {
    return `
        ${itemSelect('e', 'u', 'EQUIPAMENTO', 'e.categoria')}
        FROM equipamentos e
        JOIN unidades u ON e.unidade_id = u.id
        WHERE e.deleted_at IS NULL
        UNION ALL
        ${itemSelect('t', 'u', 'TV', 't.categoria')}
        FROM tvs t
        JOIN unidades u ON t.unidade_id = u.id
        WHERE t.deleted_at IS NULL
        UNION ALL
        ${itemSelect('c', 'u', 'CAMERA', 'c.categoria')}
        FROM cameras c
        JOIN unidades u ON c.unidade_id = u.id
        WHERE c.deleted_at IS NULL
    `;
}

router.get('/equipamentos/consultar', async (req, res) => {
    const busca = typeof req.query.busca === 'string' ? req.query.busca.trim().toUpperCase() : '';
    const tipo = typeof req.query.tipo === 'string' ? req.query.tipo.trim().toUpperCase() : '';

    try {
        let query = `SELECT * FROM (${inventoryUnion()}) inventario WHERE 1 = 1`;
        const params = [];

        if (tipo) {
            query += ' AND tipo_modulo = ?';
            params.push(tipo);
        }

        if (busca) {
            const term = `%${busca}%`;
            const digits = `%${busca.replace(/\D/g, '')}%`;
            query += ` AND (
                nome_identificacao LIKE ?
                OR categoria LIKE ?
                OR marca LIKE ?
                OR unidade_nome LIKE ?
                OR unidade_cep LIKE ?
                OR unidade_cnpj LIKE ?
                OR REPLACE(REPLACE(REPLACE(unidade_cnpj, '.', ''), '/', ''), '-', '') LIKE ?
            )`;
            params.push(term, term, term, term, term, term, digits);
        }

        query += ' ORDER BY nome_identificacao ASC';
        const [items] = await mysql.query(query, params);
        return res.status(200).json({ sucesso: true, total: items.length, dados: items });
    } catch (error) {
        console.error('ERRO NA CONSULTA DE INVENTARIO:', error);
        return res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
    }
});

module.exports = router;

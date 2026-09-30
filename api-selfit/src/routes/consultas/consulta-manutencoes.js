// Arquivo: api-selfit/src/routes/consultas/consulta-manutencoes.js
// Serve para: consulta manutencoes detalhadas por modulo e unidade.

const express = require('express');
const mysql = require('../../config/db');

const router = express.Router();

function maintenanceUnion() {
    return `
        SELECT
            CONCAT('EQUIPAMENTO:', e.id) AS id,
            e.id AS raw_id,
            'EQUIPAMENTO' AS tipo_modulo,
            u.nome AS unidade_nome,
            u.cnpj AS unidade_cnpj,
            u.cep AS unidade_cep,
            u.uf,
            e.nome_identificacao,
            e.categoria,
            e.marca,
            e.status AS status_equipamento,
            m.id AS manutencao_id,
            CONCAT('EQUIPAMENTO:', e.id) AS equipamento_id,
            m.descricao AS descricao_manutencao,
            m.data_envio,
            m.data_retorno,
            m.custo,
            m.status_manutencao
        FROM manutencoes m
        JOIN equipamentos e ON m.item_tipo = 'EQUIPAMENTO' AND m.item_id = e.id
        JOIN unidades u ON e.unidade_id = u.id
        WHERE e.deleted_at IS NULL
        UNION ALL
        SELECT
            CONCAT('TV:', t.id) AS id,
            t.id AS raw_id,
            'TV' AS tipo_modulo,
            u.nome AS unidade_nome,
            u.cnpj AS unidade_cnpj,
            u.cep AS unidade_cep,
            u.uf,
            t.nome_identificacao,
            t.categoria,
            t.marca,
            t.status AS status_equipamento,
            m.id AS manutencao_id,
            CONCAT('TV:', t.id) AS equipamento_id,
            m.descricao AS descricao_manutencao,
            m.data_envio,
            m.data_retorno,
            m.custo,
            m.status_manutencao
        FROM manutencoes m
        JOIN tvs t ON m.item_tipo = 'TV' AND m.item_id = t.id
        JOIN unidades u ON t.unidade_id = u.id
        WHERE t.deleted_at IS NULL
        UNION ALL
        SELECT
            CONCAT('CAMERA:', c.id) AS id,
            c.id AS raw_id,
            'CAMERA' AS tipo_modulo,
            u.nome AS unidade_nome,
            u.cnpj AS unidade_cnpj,
            u.cep AS unidade_cep,
            u.uf,
            c.nome_identificacao,
            c.categoria,
            c.marca,
            c.status AS status_equipamento,
            m.id AS manutencao_id,
            CONCAT('CAMERA:', c.id) AS equipamento_id,
            m.descricao AS descricao_manutencao,
            m.data_envio,
            m.data_retorno,
            m.custo,
            m.status_manutencao
        FROM manutencoes m
        JOIN cameras c ON m.item_tipo = 'CAMERA' AND m.item_id = c.id
        JOIN unidades u ON c.unidade_id = u.id
        WHERE c.deleted_at IS NULL
    `;
}

router.get('/equipamentos/manutencao', async (req, res) => {
    const busca = typeof req.query.busca === 'string' ? req.query.busca.trim().toUpperCase() : '';
    const tipo = typeof req.query.tipo === 'string' ? req.query.tipo.trim().toUpperCase() : '';

    try {
        let query = `SELECT * FROM (${maintenanceUnion()}) manutencoes_abertas WHERE 1 = 1`;
        const params = [];

        if (tipo) {
            query += ' AND tipo_modulo = ?';
            params.push(tipo);
        }
        if (busca) {
            const term = `%${busca}%`;
            const digits = `%${busca.replace(/\D/g, '')}%`;
            query += ` AND (
                unidade_nome LIKE ?
                OR unidade_cep LIKE ?
                OR unidade_cnpj LIKE ?
                OR REPLACE(REPLACE(REPLACE(unidade_cnpj, '.', ''), '/', ''), '-', '') LIKE ?
            )`;
            params.push(term, term, term, digits);
        }

        query += ' ORDER BY data_envio DESC';
        const [items] = await mysql.query(query, params);
        return res.status(200).json({ sucesso: true, total: items.length, dados: items });
    } catch (error) {
        console.error('ERRO AO CONSULTAR MANUTENCOES:', error);
        return res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
    }
});

module.exports = router;

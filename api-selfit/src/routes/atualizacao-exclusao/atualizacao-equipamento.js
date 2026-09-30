// Arquivo: api-selfit/src/routes/atualizacao-exclusao/atualizacao-equipamento.js
// Serve para: atualiza itens de inventario preservando a tabela correta pelo id prefixado.

const express = require('express');
const mysql = require('../../config/db');
const { assertAllowedCategory, normalizeText, parseItemRef, tableForType } = require('../helpers/inventory-items');

const router = express.Router();

const isDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const validarAtualizacaoEquipamento = (req, res, next) => {
    const allowed = new Set(['unidade_nome', 'nome_identificacao', 'categoria', 'marca', 'status', 'data_garantia']);
    const sentFields = Object.keys(req.body);
    if (sentFields.some((field) => !allowed.has(field))) {
        return res.status(400).json({ sucesso: false, mensagem: 'A requisicao contem campos que nao pertencem ao cadastro atual.' });
    }

    const { unidade_nome, nome_identificacao, categoria, marca, status, data_garantia } = req.body;
    if (unidade_nome !== undefined && (typeof unidade_nome !== 'string' || !unidade_nome.trim())) {
        return res.status(400).json({ sucesso: false, mensagem: 'O campo "unidade_nome" deve ser uma string valida.' });
    }
    if (nome_identificacao !== undefined && (typeof nome_identificacao !== 'string' || !nome_identificacao.trim())) {
        return res.status(400).json({ sucesso: false, mensagem: 'O campo "nome_identificacao" deve ser uma string valida.' });
    }
    if (categoria !== undefined && !assertAllowedCategory(categoria)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Categoria invalida.' });
    }
    if (marca !== undefined && (typeof marca !== 'string' || !marca.trim())) {
        return res.status(400).json({ sucesso: false, mensagem: 'O campo "marca" deve ser uma string valida.' });
    }
    if (status !== undefined && (typeof status !== 'string' || !status.trim())) {
        return res.status(400).json({ sucesso: false, mensagem: 'O campo "status" deve ser uma string valida.' });
    }
    if (data_garantia !== undefined && !isDate(data_garantia)) {
        return res.status(400).json({ sucesso: false, mensagem: 'O campo "data_garantia" deve usar o formato YYYY-MM-DD.' });
    }

    for (const field of ['unidade_nome', 'nome_identificacao', 'categoria', 'marca', 'status']) {
        if (req.body[field]) req.body[field] = normalizeText(req.body[field]);
    }

    next();
};

router.put('/equipamentos/:id', validarAtualizacaoEquipamento, async (req, res) => {
    const ref = parseItemRef(req.params.id);
    const target = ref ? tableForType(ref.tipo) : null;
    if (!ref || !target) return res.status(400).json({ sucesso: false, mensagem: 'Identificador invalido.' });

    const dadosAtualizacao = { ...req.body };

    try {
        const [items] = await mysql.query(
            `SELECT id FROM ${target.table} WHERE id = ? AND deleted_at IS NULL`,
            [ref.id]
        );
        if (!items.length) return res.status(404).json({ sucesso: false, mensagem: 'Item nao encontrado ou inativo.' });

        let unidadeId;
        if (dadosAtualizacao.unidade_nome) {
            const [unidades] = await mysql.query('SELECT id FROM unidades WHERE nome = ? LIMIT 1', [dadosAtualizacao.unidade_nome]);
            if (!unidades.length) return res.status(400).json({ sucesso: false, mensagem: 'A unidade informada nao esta cadastrada no sistema.' });
            unidadeId = unidades[0].id;
            delete dadosAtualizacao.unidade_nome;
        }

        const updates = [];
        const values = [];
        for (const [field, value] of Object.entries(dadosAtualizacao)) {
            updates.push(`${field} = ?`);
            values.push(value);
        }
        if (unidadeId !== undefined) {
            updates.push('unidade_id = ?');
            values.push(unidadeId);
        }
        if (!updates.length) return res.status(400).json({ sucesso: false, mensagem: 'Nenhum dado foi enviado para atualizacao.' });

        await mysql.query(`UPDATE ${target.table} SET ${updates.join(', ')} WHERE id = ?`, [...values, ref.id]);
        return res.status(200).json({ sucesso: true, mensagem: 'Item atualizado com sucesso!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
            return res.status(400).json({ sucesso: false, mensagem: 'Registro duplicado.' });
        }
        console.error('ERRO AO ATUALIZAR ITEM:', error);
        return res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
    }
});

module.exports = router;

// Arquivo: api-selfit/src/routes/atualizacao-exclusao/exclusao-equipamento.js
// Serve para: remove itens por exclusao logica usando deleted_at.

const express = require('express');
const mysql = require('../../config/db');
const { parseItemRef, tableForType } = require('../helpers/inventory-items');

const router = express.Router();

router.delete('/equipamentos/:id', async (req, res) => {
    const ref = parseItemRef(req.params.id);
    const target = ref ? tableForType(ref.tipo) : null;
    if (!ref || !target) return res.status(400).json({ sucesso: false, mensagem: 'Identificador invalido.' });

    try {
        const [item] = await mysql.query(
            `SELECT id FROM ${target.table} WHERE id = ? AND deleted_at IS NULL`,
            [ref.id]
        );

        if (!item.length) {
            return res.status(404).json({ sucesso: false, mensagem: 'Item nao encontrado ou ja foi excluido.' });
        }

        await mysql.query(`UPDATE ${target.table} SET deleted_at = NOW() WHERE id = ?`, [ref.id]);
        return res.status(200).json({ sucesso: true, mensagem: 'Item excluido com sucesso!' });
    } catch (error) {
        console.error('ERRO AO EXCLUIR ITEM:', error);
        return res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
    }
});

module.exports = router;

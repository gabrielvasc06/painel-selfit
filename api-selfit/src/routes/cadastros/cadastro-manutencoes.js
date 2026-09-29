const express = require('express');
const mysql = require('../../config/db');
const { normalizeText, parseItemRef, tableForType } = require('../helpers/inventory-items');

const router = express.Router();

function isDate(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeMaintenanceBody(req, res, next) {
    const { equipamento_id, descricao, data_envio, data_retorno, custo, status_manutencao } = req.body;
    if (equipamento_id !== undefined && !parseItemRef(equipamento_id)) {
        return res.status(400).json({ sucesso: false, message: 'equipamento_id deve ser um identificador valido.' });
    }
    if (descricao !== undefined && (typeof descricao !== 'string' || !descricao.trim())) {
        return res.status(400).json({ sucesso: false, message: 'descricao deve ser preenchida.' });
    }
    if (data_envio !== undefined && !isDate(data_envio)) {
        return res.status(400).json({ sucesso: false, message: 'data_envio deve usar o formato YYYY-MM-DD.' });
    }
    if (data_retorno !== undefined && data_retorno !== null && data_retorno !== '' && !isDate(data_retorno)) {
        return res.status(400).json({ sucesso: false, message: 'data_retorno deve usar o formato YYYY-MM-DD ou ser nula.' });
    }
    if (custo !== undefined && custo !== null && custo !== '' && (!Number.isFinite(Number(custo)) || Number(custo) < 0)) {
        return res.status(400).json({ sucesso: false, message: 'custo deve ser um numero maior ou igual a zero.' });
    }
    if (status_manutencao !== undefined && (typeof status_manutencao !== 'string' || !status_manutencao.trim())) {
        return res.status(400).json({ sucesso: false, message: 'status_manutencao deve ser preenchido.' });
    }
    if (descricao !== undefined) req.body.descricao = normalizeText(descricao);
    if (status_manutencao !== undefined) req.body.status_manutencao = normalizeText(status_manutencao);
    if (data_retorno === '') req.body.data_retorno = null;
    if (custo === '') req.body.custo = null;
    next();
}

async function assertItemExists(ref) {
    const target = tableForType(ref.tipo);
    if (!target) return false;
    const [rows] = await mysql.query(`SELECT id FROM ${target.table} WHERE id = ? AND deleted_at IS NULL`, [ref.id]);
    return rows.length > 0;
}

function maintenanceItemColumns(ref) {
    return {
        item_tipo: ref.tipo,
        item_id: ref.id,
    };
}

router.post('/manutencoes', normalizeMaintenanceBody, async (req, res) => {
    const { equipamento_id, descricao, data_envio, data_retorno = null, custo = null, status_manutencao = 'ABERTA' } = req.body;
    const ref = parseItemRef(equipamento_id);
    if (!ref || !descricao || !data_envio) {
        return res.status(400).json({ sucesso: false, message: 'equipamento_id, descricao e data_envio sao obrigatorios.' });
    }

    try {
        if (!(await assertItemExists(ref))) {
            return res.status(404).json({ sucesso: false, message: 'Item nao encontrado ou removido.' });
        }

        const item = maintenanceItemColumns(ref);
        const [result] = await mysql.query(
            `INSERT INTO manutencoes
             (item_tipo, item_id, descricao, data_envio, data_retorno, custo, status_manutencao)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [item.item_tipo, item.item_id, descricao, data_envio, data_retorno, custo, status_manutencao]
        );
        return res.status(201).json({ sucesso: true, message: 'Manutencao registrada com sucesso.', id: result.insertId });
    } catch (error) {
        console.error('ERRO AO REGISTRAR MANUTENCAO:', error);
        return res.status(500).json({ sucesso: false, message: 'Erro interno do servidor.' });
    }
});

router.put('/manutencoes/:id', normalizeMaintenanceBody, async (req, res) => {
    const allowedFields = ['equipamento_id', 'descricao', 'data_envio', 'data_retorno', 'custo', 'status_manutencao'];
    const requestedUpdates = Object.entries(req.body).filter(([key]) => allowedFields.includes(key));
    if (!requestedUpdates.length) return res.status(400).json({ sucesso: false, message: 'Nenhum campo valido foi enviado.' });

    try {
        const [existing] = await mysql.query('SELECT id FROM manutencoes WHERE id = ?', [req.params.id]);
        if (!existing.length) return res.status(404).json({ sucesso: false, message: 'Manutencao nao encontrada.' });

        const updates = {};
        for (const [key, value] of requestedUpdates) updates[key] = value;

        if (updates.equipamento_id !== undefined) {
            const ref = parseItemRef(updates.equipamento_id);
            if (!ref || !(await assertItemExists(ref))) {
                return res.status(404).json({ sucesso: false, message: 'Item nao encontrado ou removido.' });
            }
            Object.assign(updates, maintenanceItemColumns(ref));
            delete updates.equipamento_id;
        }

        const columns = Object.keys(updates).map((key) => `${key} = ?`).join(', ');
        await mysql.query(`UPDATE manutencoes SET ${columns} WHERE id = ?`, [...Object.values(updates), req.params.id]);
        return res.status(200).json({ sucesso: true, message: 'Manutencao atualizada com sucesso.' });
    } catch (error) {
        console.error('ERRO AO ATUALIZAR MANUTENCAO:', error);
        return res.status(500).json({ sucesso: false, message: 'Erro interno do servidor.' });
    }
});

router.delete('/manutencoes/:id', async (req, res) => {
    try {
        const [result] = await mysql.query('DELETE FROM manutencoes WHERE id = ?', [req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ sucesso: false, message: 'Manutencao nao encontrada.' });
        return res.status(200).json({ sucesso: true, message: 'Manutencao removida com sucesso.' });
    } catch (error) {
        console.error('ERRO AO REMOVER MANUTENCAO:', error);
        return res.status(500).json({ sucesso: false, message: 'Erro interno do servidor.' });
    }
});

module.exports = router;

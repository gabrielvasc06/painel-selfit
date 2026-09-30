// Arquivo: api-selfit/src/routes/cadastros/cadastro-equipamentos.js
// Serve para: rota unica de cadastro que direciona TV, camera ou equipamento para a tabela correta.

const express = require('express');
const mysql = require('../../config/db');
const {
    assertAllowedCategory,
    normalizeText,
    resolveItemType,
    tableForType,
} = require('../helpers/inventory-items');

const router = express.Router();

const isDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const validarEquipamento = (req, res, next) => {
    const {
        unidade_nome,
        unidade_uf,
        nome_identificacao,
        categoria,
        marca,
        status,
        data_garantia,
    } = req.body;

    if (!unidade_nome || typeof unidade_nome !== 'string' || !unidade_nome.trim()) {
        return res.status(400).json({ sucesso: false, mensagem: 'O campo "unidade_nome" e obrigatorio.' });
    }
    if (!unidade_uf || typeof unidade_uf !== 'string' || unidade_uf.trim().length !== 2) {
        return res.status(400).json({ sucesso: false, mensagem: 'O campo "unidade_uf" e obrigatorio e deve conter 2 letras.' });
    }
    if (!nome_identificacao || typeof nome_identificacao !== 'string' || !nome_identificacao.trim()) {
        return res.status(400).json({ sucesso: false, mensagem: 'O campo "nome_identificacao" e obrigatorio.' });
    }
    if (!assertAllowedCategory(categoria)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Categoria invalida para o cadastro atual.' });
    }
    if (!marca || typeof marca !== 'string' || !marca.trim()) {
        return res.status(400).json({ sucesso: false, mensagem: 'O campo "marca" e obrigatorio.' });
    }
    if (status !== undefined && (typeof status !== 'string' || !status.trim())) {
        return res.status(400).json({ sucesso: false, mensagem: 'O campo "status" deve ser uma string valida.' });
    }
    if (!isDate(data_garantia)) {
        return res.status(400).json({ sucesso: false, mensagem: 'O campo "data_garantia" deve usar o formato YYYY-MM-DD.' });
    }
    if ('modelo' in req.body || 'mac_address' in req.body) {
        return res.status(400).json({ sucesso: false, mensagem: 'modelo e mac_address nao pertencem mais ao cadastro.' });
    }

    req.body.unidade_nome = normalizeText(unidade_nome);
    req.body.unidade_uf = normalizeText(unidade_uf);
    req.body.nome_identificacao = normalizeText(nome_identificacao);
    req.body.categoria = normalizeText(categoria);
    req.body.marca = normalizeText(marca);
    req.body.status = status ? normalizeText(status) : 'ATIVO';

    next();
};

router.post('/register/equipamentos', validarEquipamento, async (req, res) => {
    const {
        unidade_nome,
        unidade_uf,
        nome_identificacao,
        categoria,
        marca,
        status,
        data_garantia,
    } = req.body;

    const itemType = resolveItemType(categoria);
    const target = tableForType(itemType);

    try {
        const [unidades] = await mysql.query(
            'SELECT id FROM unidades WHERE nome = ? AND uf = ?',
            [unidade_nome, unidade_uf]
        );

        if (unidades.length === 0) {
            return res.status(400).json({ sucesso: false, message: 'A unidade informada nao esta cadastrada no sistema.' });
        }

        await mysql.query(
            `INSERT INTO ${target.table}
             (unidade_id, nome_identificacao, categoria, marca, status, data_garantia)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [unidades[0].id, nome_identificacao, categoria, marca, status, data_garantia]
        );

        return res.status(201).json({
            sucesso: true,
            message: `${itemType === 'TV' ? 'TV' : itemType === 'CAMERA' ? 'Camera' : 'Equipamento'} cadastrado com sucesso!`,
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
            return res.status(400).json({ sucesso: false, message: 'Registro duplicado.' });
        }

        console.error('ERRO AO CADASTRAR ITEM:', error);
        return res.status(500).json({ sucesso: false, message: 'Erro interno do servidor.' });
    }
});

module.exports = router;

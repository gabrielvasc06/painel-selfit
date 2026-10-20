const { isDate } = require('../../models/regras/datas');
const { assertAllowedCategory, normalizeText } = require('../../models/regras/equipamentos');

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

module.exports = { validarEquipamento, validarAtualizacaoEquipamento };

const { isDate } = require('../../models/regras/datas');
const { normalizeText, parseItemRef } = require('../../models/regras/equipamentos');

function normalizeMaintenanceBody(req, res, next) {
    const { equipamento_id, unidade_id, descricao, data_envio, data_retorno, custo, status_manutencao } = req.body;
    if (equipamento_id !== undefined && !parseItemRef(equipamento_id)) {
        return res.status(400).json({ sucesso: false, message: 'equipamento_id deve ser um identificador valido.' });
    }
    if (unidade_id !== undefined && (!Number.isInteger(Number(unidade_id)) || Number(unidade_id) <= 0)) {
        return res.status(400).json({ sucesso: false, message: 'unidade_id deve ser um numero valido.' });
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
    if (unidade_id !== undefined) req.body.unidade_id = Number(unidade_id);
    if (status_manutencao !== undefined) req.body.status_manutencao = normalizeText(status_manutencao);
    if (data_retorno === '') req.body.data_retorno = null;
    if (custo === '') req.body.custo = null;
    next();
}

module.exports = { normalizeMaintenanceBody };

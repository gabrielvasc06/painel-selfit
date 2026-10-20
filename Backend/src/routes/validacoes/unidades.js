const { normalizeTipoUnidade, blockedOwnUnitCnpjs, isNonOperationalUnit, normalizeUnitName, normalizeUnitNumber } = require('../../models/regras/unidades');

const validarUnidade = (req, res, next) => {
    let { nome, tipo_unidade, cnpj, cep, uf, bairro, rua, numero } = req.body;

    // 1. Nome: string válida, sem espaços vazios nas pontas
    if (!nome || typeof nome !== 'string' || nome.trim() === '') {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'O campo "nome" é obrigatório e deve ser uma string válida.'
        });
    }

    const tipoUnidadeLimpo = normalizeTipoUnidade(tipo_unidade);
    if (!tipoUnidadeLimpo) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'O campo "tipo_unidade" deve ser PROPRIA. Franquias nao entram no sistema.'
        });
    }

    // 2. CNPJ: tratado como string, removendo caracteres não numéricos
    const cnpjStr = String(cnpj || '').trim();
    const cnpjLimpo = cnpjStr.replace(/\D/g, '');
    if (!cnpjLimpo || cnpjLimpo.length !== 14) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'O campo "cnpj" é obrigatório e deve conter exatamente 14 dígitos numéricos.'
        });
    }

    // 3. CEP: tratado como string, preservando zeros à esquerda e removendo traços/pontos
    const nomeLimpo = normalizeUnitName(nome);
    if (blockedOwnUnitCnpjs.has(cnpjLimpo) || isNonOperationalUnit(nomeLimpo)) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Esta unidade esta fora do escopo operacional e nao entra no sistema.'
        });
    }

    const cepStr = String(cep || '').trim();
    const cepLimpo = cepStr.replace(/\D/g, '');
    if (cepLimpo.length !== 8) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'O campo "cep" é obrigatório e deve conter exatamente 8 dígitos.'
        });
    }

    // 4. UF: string válida com exatamente 2 caracteres
    if (!uf || typeof uf !== 'string' || uf.trim().length !== 2) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'O campo "uf" é obrigatório e deve ter exatamente 2 caracteres (ex: SP, RJ).'
        });
    }

    // 5. Bairro: string válida, sem espaços vazios nas pontas
    if (!bairro || typeof bairro !== 'string' || bairro.trim() === '') {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'O campo "bairro" é obrigatório e deve ser uma string válida.'
        });
    }

    // 6. Rua: string válida, sem espaços vazios nas pontas
    if (!rua || typeof rua !== 'string' || rua.trim() === '') {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'O campo "rua" é obrigatório e deve ser uma string válida.'
        });
    }

    // 7. Número: tratado como string (aceita números, letras e "S/N")
    const numeroStr = normalizeUnitNumber(numero);
    if (!numeroStr) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'O campo "numero" é obrigatório e deve ser uma string válida.'
        });
    }

    // Sanitização e reatribuição limpa (tudo em string, pontas limpas e texto em maiúsculo)
    req.body.nome = nomeLimpo;
    req.body.tipo_unidade = tipoUnidadeLimpo;
    req.body.cnpj = cnpjLimpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    req.body.cep = cepLimpo;
    req.body.uf = uf.trim().toUpperCase();
    req.body.bairro = bairro.trim().toUpperCase();
    req.body.rua = rua.trim().toUpperCase();
    req.body.numero = numeroStr;

    next();
};

module.exports = { validarUnidade };

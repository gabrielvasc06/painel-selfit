// Arquivo: api-selfit/src/routes/cadastros/cadastro-unidades.js
// Serve para: rotas para cadastrar, importar, atualizar e excluir unidades proprias.

const express = require('express');
const mysql = require('../../config/db');
const router = express.Router();

const normalizeTipoUnidade = (value) => {
    const normalized = String(value || 'PROPRIA')
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    if (normalized === 'PROPRIA') return 'PROPRIA';
    return '';
};

const blockedOwnUnitCnpjs = new Set([
    '22902694006630', // LAR CENTER
    '22902694006983', // SANTA CLARA
    '22902694007017', // ARAPANES
]);

const normalizeSearchText = (value) => String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const isNonOperationalUnit = (value) => {
    const normalized = normalizeSearchText(value);
    return ['WEBURN', 'WE BURN', 'GALPAO', 'PRE OPERACIONAL', 'FECHADA', 'HOLDING', 'MATRIZ'].some((term) => normalized.includes(term));
};

const normalizeUnitName = (value) => String(value || '')
    .trim()
    .toUpperCase()
    .replace(/(^|[\s-])III(?=$|[\s-])/g, (_match, prefix) => `${prefix}3`)
    .replace(/(^|[\s-])II(?=$|[\s-])/g, (_match, prefix) => `${prefix}2`)
    .replace(/(^|[\s-])I(?=$|[\s-])/g, (_match, prefix) => `${prefix}1`)
    .replace(/\s+/g, ' ')
    .trim();

const normalizeUnitNumber = (value) => {
    const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, ' ');
    const normalized = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!raw) return '';
    if (/^(S\/?N|SEM NUMERO)$/.test(normalized)) return 'S/N';
    if (/^0+$/.test(raw)) return 'S/N';

    const padded = raw.match(/^0+([1-9]\d*[A-Z]?)$/);
    if (padded) return padded[1];

    return raw;
};

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

/**
 * @swagger
 * /unidades:
 *   get:
 *     summary: Lista unidades cadastradas
 *     tags: [Consultas]
 *     parameters:
 *       - in: query
 *         name: busca
 *         schema:
 *           type: string
 *         description: Busca por nome, CNPJ, CEP ou endereço.
 *       - in: query
 *         name: uf
 *         schema:
 *           type: string
 *           maxLength: 2
 *         description: Filtra pela UF.
 *     responses:
 *       200:
 *         description: Lista de unidades.
 *       500:
 *         description: Erro interno do servidor.
 */
router.get('/unidades', async (req, res) => {
    const busca = typeof req.query.busca === 'string' ? req.query.busca.trim().toUpperCase() : '';
    const prefixo = typeof req.query.prefixo === 'string' ? req.query.prefixo.trim().toUpperCase() : '';
    const uf = typeof req.query.uf === 'string' ? req.query.uf.trim().toUpperCase() : '';
    const conditions = [];
    const params = [];
    const orderParams = [];

    conditions.push("tipo_unidade = 'PROPRIA'");

    if (prefixo) {
        conditions.push('nome LIKE ?');
        params.push(`${prefixo}%`);
    } else if (busca) {
        const term = `%${busca}%`;
        const prefixTerm = `${busca}%`;
        const cnpjDigits = `%${busca.replace(/\D/g, '')}%`;
        conditions.push('(nome LIKE ? OR tipo_unidade LIKE ? OR cnpj LIKE ? OR cep LIKE ? OR bairro LIKE ? OR rua LIKE ? OR numero LIKE ? OR REPLACE(REPLACE(REPLACE(cnpj, \'.\', \'\'), \'/\', \'\'), \'-\', \'\') LIKE ?)');
        params.push(term, term, term, term, term, term, term, cnpjDigits);
        orderParams.push(prefixTerm);
    }
    if (uf) {
        conditions.push('uf = ?');
        params.push(uf);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = busca && !prefixo
        ? 'ORDER BY CASE WHEN nome LIKE ? THEN 0 ELSE 1 END, nome ASC'
        : 'ORDER BY nome ASC';
    try {
        const [unidades] = await mysql.query(
            `SELECT id, nome, tipo_unidade, cnpj, cep, uf, bairro, rua, numero, created_at, updated_at FROM unidades ${where} ${orderBy}`,
            [...params, ...orderParams]
        );
        return res.status(200).json({ sucesso: true, total: unidades.length, dados: unidades });
    } catch (error) {
        console.error('ERRO AO CONSULTAR UNIDADES:', error);
        return res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
    }
});

/**
 * @swagger
 * /register/unidades:
 *   post:
 *     summary: Cadastra uma nova unidade
 *     description: Recebe os dados da unidade como string, limpa espaços nas pontas, padroniza textos para maiúsculas e salva no MySQL.
 *     tags: [Cadastros]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - cnpj
 *               - cep
 *               - uf
 *               - bairro
 *               - rua
 *               - numero
 *             properties:
 *               nome:
 *                 type: string
 *                 description: Nome da unidade (convertido para maiúsculas).
 *                 example: "BOA VIAGEM II"
 *               cnpj:
 *                 type: string
 *                 description: CNPJ com ou sem pontuação; salvo no formato 00.000.000/0000-00.
 *                 example: "22.902.694/0001-95"
 *               cep:
 *                 type: string
 *                 description: CEP da unidade (apenas números, preservando zeros à esquerda).
 *                 example: "05020280"
 *               uf:
 *                 type: string
 *                 description: Sigla do estado com exatamente 2 caracteres.
 *                 example: "PE"
 *               bairro:
 *                 type: string
 *                 description: Nome do bairro (convertido para maiúsculas).
 *                 example: "BOA VIAGEM"
 *               rua:
 *                 type: string
 *                 description: Nome da rua ou avenida (convertido para maiúsculas).
 *                 example: "RUA BRUNO VELOSO"
 *               numero:
 *                 type: string
 *                 description: Número do endereço (pode conter números ou complementos como S/N).
 *                 example: "1000"
 *     responses:
 *       201:
 *         description: Unidade cadastrada com sucesso!
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Unidade cadastrada com sucesso!"
 *       400:
 *         description: Erro de validação ou registro duplicado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "O campo 'cnpj' é obrigatório e deve conter exatamente 14 dígitos numéricos."
 *       500:
 *         description: Erro interno do servidor.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Erro interno do servidor."
 */

router.post('/register/unidades', validarUnidade, async (req, res) => {
    const { nome, tipo_unidade, cnpj, cep, uf, bairro, rua, numero } = req.body;

    try {
        const cnpjNumerico = cnpj.replace(/\D/g, '');
        const [unidadesComCnpj] = await mysql.query(
            "SELECT id FROM unidades WHERE REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', '') = ? LIMIT 1",
            [cnpjNumerico]
        );

        if (unidadesComCnpj.length > 0) {
            return res.status(400).json({
                sucesso: false,
                message: 'Já existe uma unidade cadastrada com este CNPJ.'
            });
        }

        await mysql.query(
            'INSERT INTO unidades (nome, tipo_unidade, cnpj, cep, uf, bairro, rua, numero) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [nome, tipo_unidade, cnpj, cep, uf, bairro, rua, numero]
        );

        return res.status(201).json({
            sucesso: true,
            message: 'Unidade cadastrada com sucesso!'
        });
    } catch (error) {
        // Tratamento para dados duplicados (Erro 1062 do MySQL - Unique constraint)
        if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
            let mensagemErro = 'Registro duplicado.';

            // Identifica qual campo gerou a duplicidade se vier na mensagem do banco
            if (error.sqlMessage && error.sqlMessage.includes('cnpj')) {
                mensagemErro = 'Já existe uma unidade cadastrada com este CNPJ.';
            } else if (error.sqlMessage && error.sqlMessage.includes('nome')) {
                mensagemErro = 'Já existe uma unidade cadastrada com este nome.';
            } else {
                mensagemErro = 'Já existe uma unidade cadastrada com estes dados.';
            }

            return res.status(400).json({
                sucesso: false,
                message: mensagemErro
            });
        }

        console.error("ERRO DETALHADO:", error);

        return res.status(500).json({
            sucesso: false,
            message: 'Erro interno do servidor.'
        });
    }
});

/**
 * @swagger
 * /register/unidades/bulk:
 *   post:
 *     summary: Importa unidades em lote
 *     description: Valida e grava todas as unidades numa transacao; se uma linha falhar, nenhuma unidade do lote e gravada.
 *     tags: [Cadastros]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [unidades]
 *             properties:
 *               unidades:
 *                 type: array
 *                 maxItems: 500
 *                 items:
 *                   type: object
 *                   required: [nome, cnpj, cep, uf, bairro, rua, numero]
 *                   properties:
 *                     nome:
 *                       type: string
 *                       example: "BOA VIAGEM 2"
 *                     cnpj:
 *                       type: string
 *                       example: "22.902.694/0001-95"
 *                     cep:
 *                       type: string
 *                       example: "51020000"
 *                     uf:
 *                       type: string
 *                       example: "PE"
 *                     bairro:
 *                       type: string
 *                       example: "BOA VIAGEM"
 *                     rua:
 *                       type: string
 *                       example: "RUA BRUNO VELOSO"
 *                     numero:
 *                       type: string
 *                       example: "1000"
 *     responses:
 *       201:
 *         description: Unidades importadas.
 *       400:
 *         description: Planilha invalida ou CNPJ duplicado.
 */
router.post('/register/unidades/bulk', async (req, res) => {
    const unidades = req.body?.unidades;
    if (!Array.isArray(unidades) || unidades.length === 0 || unidades.length > 500) {
        return res.status(400).json({ sucesso: false, message: 'Envie entre 1 e 500 unidades no campo unidades.' });
    }

    const prepared = [];
    const cnpjRows = new Map();
    for (let index = 0; index < unidades.length; index += 1) {
        const row = unidades[index] ?? {};
        const nome = typeof row.nome === 'string' ? normalizeUnitName(row.nome) : '';
        const tipo_unidade = normalizeTipoUnidade(row.tipo_unidade);
        const cnpjDigits = String(row.cnpj ?? '').replace(/\D/g, '');
        const cepDigits = String(row.cep ?? '').replace(/\D/g, '');
        const uf = typeof row.uf === 'string' ? row.uf.trim().toUpperCase() : '';
        const bairro = typeof row.bairro === 'string' ? row.bairro.trim().toUpperCase() : '';
        const rua = typeof row.rua === 'string' ? row.rua.trim().toUpperCase() : '';
        const numero = normalizeUnitNumber(row.numero);
        const line = index + 2;

        const issue = !nome ? 'nome obrigatorio'
            : !tipo_unidade ? 'tipo_unidade deve ser PROPRIA. Franquias nao entram no sistema'
                : blockedOwnUnitCnpjs.has(cnpjDigits) || isNonOperationalUnit(nome) ? 'unidade fora do escopo operacional'
                    : cnpjDigits.length !== 14 ? 'CNPJ deve conter 14 digitos'
                        : cepDigits.length !== 8 ? 'CEP deve conter 8 digitos'
                            : uf.length !== 2 ? 'UF deve conter 2 letras'
                                : !bairro ? 'bairro obrigatorio'
                                    : !rua ? 'rua obrigatoria'
                                        : !numero ? 'numero obrigatorio'
                                            : undefined;
        if (issue) return res.status(400).json({ sucesso: false, message: `Linha ${line}: ${issue}.`, linha: line });

        const cnpj = cnpjDigits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
        if (cnpjRows.has(cnpjDigits)) {
            const firstLine = cnpjRows.get(cnpjDigits);
            return res.status(400).json({ sucesso: false, message: `CNPJ duplicado nas linhas ${firstLine} e ${line}.`, linha: line });
        }
        cnpjRows.set(cnpjDigits, line);
        prepared.push({ nome, tipo_unidade, cnpj, cep: cepDigits, uf, bairro, rua, numero });
    }

    let connection;
    try {
        connection = await mysql.getConnection();
        await connection.beginTransaction();
        const cnpjDigits = [...cnpjRows.keys()];
        const placeholders = cnpjDigits.map(() => '?').join(',');
        const [existing] = await connection.query(
            `SELECT cnpj FROM unidades WHERE REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', '') IN (${placeholders})`,
            cnpjDigits
        );
        if (existing.length) {
            const existingSet = new Set(existing.map((item) => String(item.cnpj).replace(/\D/g, '')));
            const duplicate = prepared.find((unit) => existingSet.has(unit.cnpj.replace(/\D/g, '')));
            await connection.rollback();
            return res.status(409).json({ sucesso: false, message: `CNPJ da unidade ${duplicate?.nome ?? ''} ja cadastrado.` });
        }

        for (const unidade of prepared) {
            await connection.query(
                'INSERT INTO unidades (nome, tipo_unidade, cnpj, cep, uf, bairro, rua, numero) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [unidade.nome, unidade.tipo_unidade, unidade.cnpj, unidade.cep, unidade.uf, unidade.bairro, unidade.rua, unidade.numero]
            );
        }
        await connection.commit();
        return res.status(201).json({ sucesso: true, message: 'Importacao concluida.', total: prepared.length });
    } catch (error) {
        if (connection) await connection.rollback();
        if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
            return res.status(409).json({ sucesso: false, message: 'O lote contem um nome ou CNPJ ja cadastrado.' });
        }
        console.error('ERRO AO IMPORTAR UNIDADES:', error);
        return res.status(500).json({ sucesso: false, message: 'Erro interno ao importar unidades.' });
    } finally {
        if (connection) connection.release();
    }
});

router.put('/unidades/:id', validarUnidade, async (req, res) => {
    const { id } = req.params;
    const { nome, tipo_unidade, cnpj, cep, uf, bairro, rua, numero } = req.body;
    try {
        const [existing] = await mysql.query('SELECT id FROM unidades WHERE id = ?', [id]);
        if (!existing.length) return res.status(404).json({ sucesso: false, message: 'Unidade nao encontrada.' });

        const cnpjDigits = cnpj.replace(/\D/g, '');
        const [duplicates] = await mysql.query(
            "SELECT id FROM unidades WHERE id <> ? AND REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', '') = ? LIMIT 1",
            [id, cnpjDigits]
        );
        if (duplicates.length) return res.status(400).json({ sucesso: false, message: 'Ja existe uma unidade cadastrada com este CNPJ.' });

        await mysql.query(
            'UPDATE unidades SET nome = ?, tipo_unidade = ?, cnpj = ?, cep = ?, uf = ?, bairro = ?, rua = ?, numero = ? WHERE id = ?',
            [nome, tipo_unidade, cnpj, cep, uf, bairro, rua, numero, id]
        );
        return res.status(200).json({ sucesso: true, message: 'Unidade atualizada com sucesso.' });
    } catch (error) {
        console.error('ERRO AO ATUALIZAR UNIDADE:', error);
        return res.status(500).json({ sucesso: false, message: 'Erro interno do servidor.' });
    }
});

router.delete('/unidades/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await mysql.query('DELETE FROM unidades WHERE id = ?', [id]);
        if (!result.affectedRows) return res.status(404).json({ sucesso: false, message: 'Unidade nao encontrada.' });
        return res.status(200).json({ sucesso: true, message: 'Unidade removida com sucesso.' });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
            return res.status(409).json({ sucesso: false, message: 'A unidade possui equipamentos vinculados e nao pode ser removida.' });
        }
        console.error('ERRO AO REMOVER UNIDADE:', error);
        return res.status(500).json({ sucesso: false, message: 'Erro interno do servidor.' });
    }
});

module.exports = router;

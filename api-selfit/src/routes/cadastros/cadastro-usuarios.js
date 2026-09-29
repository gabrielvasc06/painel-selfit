const express = require('express');
const mysql = require('../../config/db');
const bcrypt = require('bcrypt');
const router = express.Router();

const validarAutenticacao = (req, res, next) => {
    const { usuario, senha } = req.body;

    if (!usuario || typeof usuario !== 'string' || usuario.trim() === '') {
        return res.status(400).json({
            sucesso: false,
            message: 'O campo "usuario" é obrigatório e deve ser uma string válida.'
        });
    }

    if (!senha || typeof senha !== 'string' || senha.trim() === '') {
        return res.status(400).json({
            sucesso: false,
            message: 'O campo "senha" é obrigatório e deve ser uma string válida.'
        });
    }

    // Sanitização e reatribuição limpa (maiúsculas para o usuário)
    req.body.usuario = usuario.trim().toUpperCase();
    req.body.senha = senha.trim();

    next();
}

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Cadastra um novo usuário
 *     description: Recebe usuário e senha, padroniza em maiúsculas, criptografa a senha com bcrypt e salva no banco de dados MySQL.
 *     tags: [Cadastros]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - usuario
 *               - senha
 *             properties:
 *               usuario:
 *                 type: string
 *                 description: Nome de usuário para o cadastro (será convertido para maiúsculas).
 *                 example: "YVSON.JOSE"
 *               senha:
 *                 type: string
 *                 description: Senha do usuário (será criptografada).
 *                 example: "senha-ficticia"
 *     responses:
 *       201:
 *         description: Usuário cadastrado com sucesso!
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
 *                   example: "Usuário cadastrado com sucesso!"
 *       400:
 *         description: Erro de validação ou usuário já existente.
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
 *                   example: "Este nome de usuário já está em uso."
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

router.post('/register', validarAutenticacao, async (req, res) => {
    const { usuario, senha } = req.body;

    try {
        const senhaHash = await bcrypt.hash(senha, 10);

        await mysql.query('INSERT INTO usuarios (usuario, senha_hash) VALUES (?, ?)', [usuario, senhaHash]);

        return res.status(201).json({
            sucesso: true,
            message: 'Usuário cadastrado com sucesso!'
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
            return res.status(400).json({
                sucesso: false,
                message: 'Este nome de usuário já está em uso.'
            });
        }

        console.error("ERRO DETALHADO:", error);

        return res.status(500).json({
            sucesso: false,
            message: 'Erro interno do servidor.'
        });
    }
});

module.exports = router;


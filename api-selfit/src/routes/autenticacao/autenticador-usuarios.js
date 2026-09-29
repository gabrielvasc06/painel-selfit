const express = require('express');
const bcrypt = require('bcrypt');
const mysql = require('../../config/db');
const router = express.Router();

const jwt = require('jsonwebtoken');

const validarAutenticacao = (req, res, next) => {
    const { usuario, senha } = req.body;

    if (!usuario || typeof usuario !== 'string' || usuario.trim() === '') {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'O campo "usuario" é obrigatório e deve ser uma string válida.'
        });
    }

    if (!senha || typeof senha !== 'string' || senha.trim() === '') {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'O campo "senha" é obrigatório e deve ser uma string válida.'
        });
    }

    // Sanitização: Padroniza o usuário em maiúsculas e sem espaços extras
    req.body.usuario = usuario.trim().toUpperCase();
    req.body.senha = senha.trim();

    next();
}

/**
 * @swagger
 * /auth:
 *   post:
 *     summary: Faz autenticação dos usuários.
 *     description: Recebe os dados do login e valida com os cadastros da base de dados.
 *     tags: [Autenticação]
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
 *                 description: Nome do usuário.
 *                 example: "VANDERSON.GABRIEL"
 *               senha:
 *                 type: string
 *                 description: Senha do utilizador
 *                 example: "admin"
 *     responses:
 *       200:
 *         description: Autenticação realizada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso:
 *                   type: boolean
 *                   example: true
 *                 mensagem:
 *                   type: string
 *                   example: "Autenticação realizada com sucesso!"
 *       401:
 *         description: Usuário ou senha inválidos.
 */
router.post('/auth', validarAutenticacao, async (req, res) => {
    const { usuario, senha } = req.body;

    try {
        const [rows] = await mysql.query('SELECT * FROM usuarios WHERE usuario = ?', [usuario]);

        if (rows.length === 0) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Usuário ou senha inválidos.'
            });
        }

        const user = rows[0];

        const senhaValida = await bcrypt.compare(senha, user.senha_hash);

        if (!senhaValida) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Usuário ou senha inválidos.'
            });
        }

        // ... dentro da sua rota de login, após validar que a senha bateu:
        const token = jwt.sign(
            { id: user.id, usuario: user.usuario },
            process.env.JWT_SECRET,
            { expiresIn: '8h' } // O token expira em 8 horas
        );

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Autenticação realizada com sucesso!',
            token: token
        });

    } catch (error) {
        console.error('Erro no processo de autenticação:', error);
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno no servidor.',
            erro: error.message
        });
    }
});

module.exports = router;
const jwt = require('jsonwebtoken');
const mysql = require('../config/db');
const { isAllowedUser } = require('./access');

module.exports = async function verificarToken(req, res, next) {
    const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || '');
    const deny = () => res.status(401).json({ sucesso: false, mensagem: 'Sessao invalida ou expirada.' });
    if (!match) return deny();
    let decoded;
    try {
        decoded = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ['HS256'] });
        if (!decoded || typeof decoded !== 'object' || !Number.isInteger(decoded.id) || decoded.id <= 0 || !isAllowedUser(decoded.usuario)) return deny();
    } catch { return deny(); }
    try {
        // Excluir uma conta revoga seus tokens imediatamente, mesmo antes do prazo de expiracao.
        const [users] = await mysql.query('SELECT id FROM usuarios WHERE id = ? AND usuario = ? LIMIT 1', [decoded.id, decoded.usuario]);
        if (!users.length) return deny();
    } catch (error) {
        console.error('Falha ao validar sessao:', error.code || error.name);
        return res.status(503).json({ sucesso: false, mensagem: 'Servico de autenticacao temporariamente indisponivel.' });
    }
    req.usuarioLogado = decoded;
    next();
};

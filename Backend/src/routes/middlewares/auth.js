// O transporte extrai o Bearer; o model valida assinatura, conta e acesso.
module.exports = function authentication(auth) {
    return async function verifyToken(req, res, next) {
        const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || '');
        const deny = () => res.status(401).json({ sucesso: false, mensagem: 'Sessao invalida ou expirada.' });
        if (!match) return deny();
        try {
            const user = await auth.validateSession(match[1]);
            if (!user) return deny();
            req.usuarioLogado = user;
            next();
        } catch (error) {
            console.error('Falha ao validar sessao:', error.code || error.name);
            res.status(503).json({ sucesso: false, mensagem: 'Servico de autenticacao temporariamente indisponivel.' });
        }
    };
};

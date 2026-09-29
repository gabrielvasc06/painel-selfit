// middlewares/auth.js
const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({
            sucesso: false,
            mensagem: 'Token de autenticação não fornecido.'
        });
    }

    // O formato esperado é "Bearer <token>"
    const partes = authHeader.split(' ');
    if (partes.length !== 2) {
        return res.status(401).json({
            sucesso: false,
            mensagem: 'Erro no formato do token.'
        });
    }

    const [scheme, token] = partes;

    if (!/^Bearer$/i.test(scheme)) {
        return res.status(401).json({
            sucesso: false,
            mensagem: 'Token mal formatado.'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Token inválido ou expirado.'
            });
        }

        // Se o token for válido, salvamos os dados do usuário na requisição
        req.usuarioLogado = decoded;
        next();
    });
};

module.exports = verificarToken;
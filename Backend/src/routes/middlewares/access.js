const proxyaddr = require('proxy-addr');
const { parseList: list } = require('../../config/runtime');

function isAllowedUser(username, env = process.env) {
    const allowed = list(env.ACCESS_ALLOWED_USERS).map((item) => item.toUpperCase());
    if (!allowed.length) return env.NODE_ENV !== 'production';
    return typeof username === 'string' && allowed.includes(username.toUpperCase());
}

function networkAccess(env = process.env) {
    const ranges = list(env.ACCESS_ALLOWED_CIDRS);
    if (!ranges.length && env.NODE_ENV !== 'production') return (req, res, next) => next();
    const allowed = proxyaddr.compile(ranges.length ? ranges : ['loopback']);
    return (req, res, next) => {
        if (allowed(req.ip, 0)) return next();
        return res.status(403).json({ sucesso: false, mensagem: 'Acesso permitido somente pelas redes autorizadas.' });
    };
}

function userAdministration(req, res, next) {
    const admins = list(process.env.USER_ADMIN_USERS).map((item) => item.toUpperCase());
    if (admins.includes(req.usuarioLogado?.usuario?.toUpperCase())) return next();
    return res.status(403).json({ sucesso: false, mensagem: 'Operacao permitida somente aos administradores de usuarios.' });
}

module.exports = { list, isAllowedUser, networkAccess, userAdministration };

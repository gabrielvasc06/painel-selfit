// Controller traduz HTTP para chamadas do model e devolve o contrato existente.
module.exports = function createAuthController(auth) {
    return {
        async login(req, res) {
            const { usuario, senha } = req.body;
            if (typeof usuario !== 'string' || !usuario.trim() || typeof senha !== 'string' || !senha.trim()) {
                return res.status(400).json({ sucesso: false, mensagem: 'Usuario e senha sao obrigatorios.' });
            }
            const token = await auth.login({ usuario: usuario.trim().toUpperCase(), senha: senha.trim() });
            res.json({ sucesso: true, mensagem: 'Autenticacao realizada com sucesso!', token });
        },
    };
};

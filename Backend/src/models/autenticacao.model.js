const { BusinessError } = require('./regras/erro-negocio');

function createAuthModel({ userRepository, passwords, tokens, accessPolicy }) {
    return {
        async login({ usuario, senha }) {
            // Mesma resposta para conta inexistente, bloqueada ou senha incorreta.
            const invalid = () => new BusinessError('UNAUTHENTICATED', 'Usuario ou senha invalidos.');
            if (!accessPolicy.isAllowedUser(usuario)) throw invalid();
            const user = await userRepository.findByLogin(usuario);
            if (!user || !(await passwords.compare(senha, user.senha_hash))) throw invalid();
            return tokens.sign({ id: user.id, usuario: user.usuario });
        },
        async validateSession(token) {
            let decoded;
            try {
                decoded = tokens.verify(token);
                if (!decoded || typeof decoded !== 'object' || !Number.isInteger(decoded.id) || decoded.id <= 0 || !accessPolicy.isAllowedUser(decoded.usuario)) return null;
            } catch { return null; }
            // Excluir uma conta revoga JWTs ainda nao expirados.
            return await userRepository.exists(decoded.id, decoded.usuario) ? decoded : null;
        },
    };
}
module.exports = { createAuthModel };

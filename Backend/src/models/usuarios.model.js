const { BusinessError } = require('./regras/erro-negocio');
const { validateCredentials } = require('./regras/usuarios');

function createUserModel({ userRepository, passwords }) {
    return {
        async create({ usuario, senha }, { provisional = true } = {}) {
            const { usuario: username } = validateCredentials(usuario, senha);
            if (await userRepository.findByLogin(username)) throw new BusinessError('INVALID_INPUT', 'Este nome de usuario ja esta em uso. Nenhuma senha foi alterada.');
            await userRepository.create({ usuario: username, senha_hash: await passwords.hash(senha), senha_provisoria: provisional });
        },
    };
}
module.exports = { createUserModel };

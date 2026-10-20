const { BusinessError } = require('./erro-negocio');

function validateCredentials(usuario, senha) {
    const username = typeof usuario === 'string' ? usuario.trim().toUpperCase() : '';
    // Limite em bytes evita truncamento silencioso de senhas pelo bcrypt,
    // especialmente quando a senha tem caracteres acentuados.
    if (!username || username.length > 100 || typeof senha !== 'string' || senha.trim() !== senha || senha.length < 12 || new TextEncoder().encode(senha).length > 72) {
        throw new BusinessError('INVALID_INPUT', 'Usuario deve ter ate 100 caracteres e senha entre 12 e 72 bytes, sem espacos nas extremidades.');
    }
    return { usuario: username, senha };
}
module.exports = { validateCredentials };

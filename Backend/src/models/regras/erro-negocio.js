// Erros de negocio usam codigos, sem conhecer status HTTP, Express ou MySQL.
class BusinessError extends Error {
    constructor(code, message, details = {}) {
        super(message);
        this.name = 'BusinessError';
        this.code = code;
        this.details = details;
    }
}
module.exports = { BusinessError };

const { BusinessError } = require('./erro-negocio');
const IDENTIFICADOR_NAO_INFORMADO = 'NÃO INFORMADO';

function normalizarIdentificadores(input) {
    const values = {};
    for (const field of ['numero_serie', 'numero_patrimonio']) {
        // Omitir um campo na edicao nao apaga um identificador ja cadastrado.
        if (!Object.hasOwn(input, field)) continue;
        const value = input[field];
        if (value !== null && typeof value !== 'string') {
            throw new BusinessError('INVALID_INPUT', `${field} deve ser texto ou nulo.`);
        }
        // Persistimos a mesma indicacao exibida no painel quando nao ha numero.
        const normalized = value === null ? IDENTIFICADOR_NAO_INFORMADO : value.trim().toUpperCase() || IDENTIFICADOR_NAO_INFORMADO;
        if (normalized && normalized.length > 100) {
            throw new BusinessError('INVALID_INPUT', `${field} deve ter no maximo 100 caracteres.`);
        }
        values[field] = normalized;
    }
    return values;
}

module.exports = { normalizarIdentificadores, IDENTIFICADOR_NAO_INFORMADO };

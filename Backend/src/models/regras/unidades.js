const { BusinessError } = require('./erro-negocio');
// Regras de escopo e normalizacao de unidades, sem dependencia de HTTP ou MySQL.
const normalizeTipoUnidade = (value) => {
    const normalized = String(value || 'PROPRIA')
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    if (normalized === 'PROPRIA') return 'PROPRIA';
    return '';
};

const blockedOwnUnitCnpjs = new Set([
    '22902694006630', // LAR CENTER
    '22902694006983', // SANTA CLARA
    '22902694007017', // ARAPANES
]);

const normalizeSearchText = (value) => String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const isNonOperationalUnit = (value) => {
    const normalized = normalizeSearchText(value);
    return ['WEBURN', 'WE BURN', 'GALPAO', 'PRE OPERACIONAL', 'FECHADA', 'HOLDING', 'MATRIZ'].some((term) => normalized.includes(term));
};

const normalizeUnitName = (value) => String(value || '')
    .trim()
    .toUpperCase()
    .replace(/(^|[\s-])III(?=$|[\s-])/g, (_match, prefix) => `${prefix}3`)
    .replace(/(^|[\s-])II(?=$|[\s-])/g, (_match, prefix) => `${prefix}2`)
    .replace(/(^|[\s-])I(?=$|[\s-])/g, (_match, prefix) => `${prefix}1`)
    .replace(/\s+/g, ' ')
    .trim();

const normalizeUnitNumber = (value) => {
    const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, ' ');
    const normalized = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!raw) return '';
    if (/^(S\/?N|SEM NUMERO)$/.test(normalized)) return 'S/N';
    if (/^0+$/.test(raw)) return 'S/N';

    const padded = raw.match(/^0+([1-9]\d*[A-Z]?)$/);
    if (padded) return padded[1];

    return raw;
};


// Valida todo o lote antes de iniciar uma transacao; nenhuma linha parcial e salva.
function prepareUnitBatch(unidades) {
    if (!Array.isArray(unidades) || unidades.length === 0 || unidades.length > 500) {
        throw new BusinessError('INVALID_INPUT', 'Envie entre 1 e 500 unidades no campo unidades.');
    }
    const prepared = [];
    const cnpjRows = new Map();
    for (let index = 0; index < unidades.length; index += 1) {
        const row = unidades[index] ?? {};
        const nome = typeof row.nome === 'string' ? normalizeUnitName(row.nome) : '';
        const tipo_unidade = normalizeTipoUnidade(row.tipo_unidade);
        const cnpjDigits = String(row.cnpj ?? '').replace(/\D/g, '');
        const cepDigits = String(row.cep ?? '').replace(/\D/g, '');
        const uf = typeof row.uf === 'string' ? row.uf.trim().toUpperCase() : '';
        const bairro = typeof row.bairro === 'string' ? row.bairro.trim().toUpperCase() : '';
        const rua = typeof row.rua === 'string' ? row.rua.trim().toUpperCase() : '';
        const numero = normalizeUnitNumber(row.numero);
        const line = index + 2;

        const issue = !nome ? 'nome obrigatorio'
            : !tipo_unidade ? 'tipo_unidade deve ser PROPRIA. Franquias nao entram no sistema'
                : blockedOwnUnitCnpjs.has(cnpjDigits) || isNonOperationalUnit(nome) ? 'unidade fora do escopo operacional'
                    : cnpjDigits.length !== 14 ? 'CNPJ deve conter 14 digitos'
                        : cepDigits.length !== 8 ? 'CEP deve conter 8 digitos'
                            : uf.length !== 2 ? 'UF deve conter 2 letras'
                                : !bairro ? 'bairro obrigatorio'
                                    : !rua ? 'rua obrigatoria'
                                        : !numero ? 'numero obrigatorio'
                                            : undefined;
        if (issue) throw new BusinessError('INVALID_INPUT', `Linha ${line}: ${issue}.`, { linha: line });

        const cnpj = cnpjDigits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
        if (cnpjRows.has(cnpjDigits)) {
            const firstLine = cnpjRows.get(cnpjDigits);
            throw new BusinessError('INVALID_INPUT', `CNPJ duplicado nas linhas ${firstLine} e ${line}.`, { linha: line });
        }
        cnpjRows.set(cnpjDigits, line);
        prepared.push({ nome, tipo_unidade, cnpj, cep: cepDigits, uf, bairro, rua, numero });
    }

    return prepared;
}

module.exports = { prepareUnitBatch, normalizeTipoUnidade, blockedOwnUnitCnpjs, isNonOperationalUnit, normalizeUnitName, normalizeUnitNumber };

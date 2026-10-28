// Migration independente da regra atual da aplicacao para manter o historico
// reproduzivel. Identificadores reais e demais dados nao sao alterados.
const NOT_INFORMED = 'NÃO INFORMADO';
const TABLES = ['equipamentos', 'tvs', 'cameras'];
const FIELDS = ['numero_serie', 'numero_patrimonio'];

exports.up = async function (knex) {
    for (const table of TABLES) {
        for (const field of FIELDS) {
            await knex(table).where(function () {
                this.whereNull(field).orWhereRaw('TRIM(??) = ?', [field, '']);
            }).update({ [field]: NOT_INFORMED, updated_at: knex.ref('updated_at') });
            // DEFAULT atende insercoes que omitem a coluna; a API tambem
            // converte null/vazio explicitamente antes de gravar.
            await knex.raw('ALTER TABLE ?? ALTER COLUMN ?? SET DEFAULT ?', [table, field, NOT_INFORMED]);
        }
    }
};

exports.down = async function (knex) {
    for (const table of TABLES) {
        for (const field of FIELDS) {
            await knex.raw('ALTER TABLE ?? ALTER COLUMN ?? DROP DEFAULT', [table, field]);
        }
    }
    // Reverter o default nao apaga os valores ja gravados.
};

// Verifica o contrato estrutural sem modificar a base. O servico falha antes de
// aceitar requisicoes se faltar uma tabela/coluna esperada pela versao instalada.
async function verifySchema(database) {
    const schema = {
        usuarios: 'id, usuario, senha_hash, senha_provisoria',
        unidades: 'id, nome, tipo_unidade, cnpj, cep, uf, bairro, rua, numero',
        equipamentos: 'id, unidade_id, nome_identificacao, categoria, marca, status, data_garantia, deleted_at, created_at, updated_at',
        tvs: 'id, unidade_id, nome_identificacao, categoria, marca, status, data_garantia, deleted_at, created_at, updated_at',
        cameras: 'id, unidade_id, nome_identificacao, categoria, marca, status, data_garantia, deleted_at, created_at, updated_at',
        manutencoes: 'id, item_tipo, item_id, descricao, data_envio, data_retorno, custo, status_manutencao',
    };
    for (const [table, columns] of Object.entries(schema)) {
        await database.query({ sql: `SELECT ${columns} FROM ${table} LIMIT 0`, timeout: 10000 });
    }
}
module.exports = { verifySchema };

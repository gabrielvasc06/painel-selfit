// Adaptador HTTP: interpreta query strings e serializa a resposta. O SQL e as
// regras de consulta ficam atras do model, fora desta camada de entrada.
function readInventory(inventory, view) {
    return async (req, res) => {
        const busca = typeof req.query.busca === 'string' ? req.query.busca.trim().toUpperCase() : '';
        const tipo = typeof req.query.tipo === 'string' ? req.query.tipo.trim().toUpperCase() : '';
        const dados = await inventory.list({ busca, tipo, view });
        res.json({ sucesso: true, total: dados.length, dados });
    };
}
module.exports = { readInventory };

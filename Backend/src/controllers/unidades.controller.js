module.exports = function createUnitController(units) {
    return {
        async list(req, res) {
            const filters = Object.fromEntries(['busca', 'prefixo', 'uf'].map((key) => [key,
                typeof req.query[key] === 'string' ? req.query[key].trim().toUpperCase() : '']));
            const dados = await units.list(filters);
            res.json({ sucesso: true, total: dados.length, dados });
        },
        async create(req, res) {
            await units.create(req.body);
            res.status(201).json({ sucesso: true, message: 'Unidade cadastrada com sucesso!' });
        },
        async importBatch(req, res) {
            const total = await units.importBatch(req.body.unidades);
            res.status(201).json({ sucesso: true, message: 'Importacao concluida.', total });
        },
        async update(req, res) {
            await units.update(req.params.id, req.body);
            res.json({ sucesso: true, message: 'Unidade atualizada com sucesso.' });
        },
        async remove(req, res) {
            await units.remove(req.params.id);
            res.json({ sucesso: true, message: 'Unidade removida com sucesso.' });
        },
    };
};

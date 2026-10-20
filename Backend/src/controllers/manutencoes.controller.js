const { readInventory } = require('./consultas.controller');

module.exports = function createMaintenanceController(maintenance, inventory) {
    return {
        list: readInventory(inventory, 'maintenance'),
        async create(req, res) {
            const id = await maintenance.create(req.body);
            res.status(201).json({ sucesso: true, message: 'Manutencao registrada com sucesso.', id });
        },
        async update(req, res) {
            await maintenance.update(req.params.id, req.body);
            res.json({ sucesso: true, message: 'Manutencao atualizada com sucesso.' });
        },
        async remove(req, res) {
            await maintenance.remove(req.params.id);
            res.json({ sucesso: true, message: 'Manutencao removida com sucesso.' });
        },
    };
};

const { readInventory } = require('./consultas.controller');

module.exports = function createInventoryController(inventory) {
    return {
        list: readInventory(inventory, 'inventory'),
        warranties: readInventory(inventory, 'warranties'),
        async create(req, res) {
            const type = await inventory.create(req.body);
            res.status(201).json({ sucesso: true, message: `${type === 'TV' ? 'TV' : type === 'CAMERA' ? 'Camera' : 'Equipamento'} cadastrado com sucesso!` });
        },
        async update(req, res) {
            await inventory.update(req.params.id, req.body);
            res.json({ sucesso: true, mensagem: 'Item atualizado com sucesso!' });
        },
        async remove(req, res) {
            await inventory.remove(req.params.id);
            res.json({ sucesso: true, mensagem: 'Item excluido com sucesso!' });
        },
    };
};

const express = require('express');

// Rotas definem somente URL, middleware e controller; nao executam SQL.
module.exports = function routes(model, inventory) {
    const router = express.Router();
    const { normalizeMaintenanceBody } = require('./validacoes/manutencoes');
    const controller = require('../controllers/manutencoes.controller')(model, inventory);
    router.get('/equipamentos/manutencao', controller.list);
    router.post('/manutencoes', normalizeMaintenanceBody, controller.create);
    router.put('/manutencoes/:id', normalizeMaintenanceBody, controller.update);
    router.delete('/manutencoes/:id', controller.remove);
    return router;
};

const express = require('express');

// Rotas definem somente URL, middleware e controller; nao executam SQL.
module.exports = function routes(model) {
    const router = express.Router();
    const { validarUnidade } = require('./validacoes/unidades');
    const controller = require('../controllers/unidades.controller')(model);
    router.get('/unidades', controller.list);
    router.post('/register/unidades', validarUnidade, controller.create);
    router.post('/register/unidades/bulk', controller.importBatch);
    router.put('/unidades/:id', validarUnidade, controller.update);
    router.delete('/unidades/:id', controller.remove);
    return router;
};

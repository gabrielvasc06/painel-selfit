const express = require('express');

// Rotas definem somente URL, middleware e controller; nao executam SQL.
module.exports = function routes(model) {
    const router = express.Router();
    const { validarEquipamento, validarAtualizacaoEquipamento } = require('./validacoes/equipamentos');
    const controller = require('../controllers/equipamentos.controller')(model);
    router.get('/equipamentos/consultar', controller.list);
    router.post('/register/equipamentos', validarEquipamento, controller.create);
    router.put('/equipamentos/:id', validarAtualizacaoEquipamento, controller.update);
    router.delete('/equipamentos/:id', controller.remove);
    return router;
};

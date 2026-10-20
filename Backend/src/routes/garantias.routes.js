const express = require('express');

// Rotas definem somente URL, middleware e controller; nao executam SQL.
module.exports = function routes(model) {
    const router = express.Router();
    const controller = require('../controllers/equipamentos.controller')(model);
    router.get('/equipamentos/garantia', controller.warranties);
    return router;
};

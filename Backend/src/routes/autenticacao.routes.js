const express = require('express');

// Rotas definem somente URL, middleware e controller; nao executam SQL.
module.exports = function routes(model) {
    const router = express.Router();
    const controller = require('../controllers/autenticacao.controller')(model);
    router.post('/auth', controller.login);
    return router;
};
